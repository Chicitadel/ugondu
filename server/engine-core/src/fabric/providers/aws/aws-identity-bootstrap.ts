import * as fs from 'fs';
import * as keytar from 'keytar';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { IAMClient, SimulatePrincipalPolicyCommand } from '@aws-sdk/client-iam';
import { Logger } from '@ugondu/shared';

const UGONDU_KEYTAR_SERVICE = 'UgonduAWSProvider';
const UGONDU_KEYTAR_ACCOUNT = 'physical-certification-credentials';

export interface AwsIdentity {
    accountId: string;
    principalArn: string;
    userId: string;
    region: string;
}

export interface AwsPermissionPreflightResult {
    identity: AwsIdentity;
    capabilities: Record<string, boolean>;
    ready: boolean;
}

export class AwsIdentityBootstrap {

    /**
     * Parses an AWS IAM CSV file locally.
     * Guaranteed to process strictly in memory and detect headers case-insensitively.
     */
    public parseCredentialsCsv(csvContent: string): { accessKeyId: string; secretAccessKey: string } {
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            throw new Error('Invalid AWS CSV format. Expected at least two lines.');
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        
        let accessKeyIdx = -1;
        let secretKeyIdx = -1;

        headers.forEach((h, idx) => {
            if (h.includes('access key id')) accessKeyIdx = idx;
            if (h.includes('secret access key')) secretKeyIdx = idx;
        });

        if (accessKeyIdx === -1 || secretKeyIdx === -1) {
            throw new Error('CSV must contain "Access key ID" and "Secret access key" columns.');
        }

        const values = lines[1].split(',').map(v => v.trim());
        return {
            accessKeyId: values[accessKeyIdx],
            secretAccessKey: values[secretKeyIdx]
        };
    }

    /**
     * Verifies the provided credentials using AWS STS.
     */
    public async verifyIdentity(credentials: { accessKeyId: string; secretAccessKey: string }, region: string = 'eu-west-3'): Promise<AwsIdentity> {
        const sts = new STSClient({ region, credentials });
        try {
            const res = await sts.send(new GetCallerIdentityCommand({}));
            return {
                accountId: res.Account!,
                principalArn: res.Arn!,
                userId: res.UserId!,
                region
            };
        } catch (error: any) {
            // Explicitly prevent secret leaks from STS error payloads
            Logger.error('AWS STS Verification failed. Check your access key or network connectivity.');
            throw new Error('AWS STS Verification failed. Identity could not be verified.');
        }
    }

    /**
     * Secures the credentials natively in the OS Keystore (Windows Credential Manager / macOS Keychain / Linux Secret Service)
     */
    public async storeCredentialsLocally(credentials: { accessKeyId: string; secretAccessKey: string }): Promise<void> {
        const payload = JSON.stringify(credentials);
        await keytar.setPassword(UGONDU_KEYTAR_SERVICE, UGONDU_KEYTAR_ACCOUNT, payload);
        Logger.info('Credentials secured in OS Keychain/DPAPI.');
    }

    /**
     * securely retrieves credentials from the OS Keystore
     */
    public async getStoredCredentials(): Promise<{ accessKeyId: string; secretAccessKey: string } | null> {
        const payload = await keytar.getPassword(UGONDU_KEYTAR_SERVICE, UGONDU_KEYTAR_ACCOUNT);
        if (!payload) return null;
        try {
            return JSON.parse(payload);
        } catch {
            return null;
        }
    }

    /**
     * securely deletes credentials from the OS Keystore (rotation/revocation support)
     */
    public async deleteStoredCredentials(): Promise<void> {
        await keytar.deletePassword(UGONDU_KEYTAR_SERVICE, UGONDU_KEYTAR_ACCOUNT);
        Logger.info('Credentials deleted from OS Keychain/DPAPI.');
    }

    /**
     * Real preflight capability checker using IAM SimulatePrincipalPolicy
     */
    public async preflightPermissions(credentials: { accessKeyId: string; secretAccessKey: string }, region: string): Promise<AwsPermissionPreflightResult> {
        const identity = await this.verifyIdentity(credentials, region);
        
        const iam = new IAMClient({ region, credentials });
        
        // Define exact IAM actions required for P0-PHYS AWS
        const actionNames = [
            'ec2:RunInstances',
            'ec2:CreateVpc',
            'rds:CreateDBSubnetGroup',
            's3:CreateBucket'
        ];

        let ready = true;
        const capabilities: Record<string, boolean> = {
            'ec2': false,
            'vpc': false,
            'rds': false,
            's3': false
        };

        try {
            const simRes = await iam.send(new SimulatePrincipalPolicyCommand({
                PolicySourceArn: identity.principalArn,
                ActionNames: actionNames
            }));

            const evalResults = simRes.EvaluationResults || [];
            
            for (const res of evalResults) {
                const action = res.EvalActionName || '';
                const allowed = res.EvalDecision === 'allowed';
                if (!allowed) ready = false;

                if (action.startsWith('ec2:Run')) capabilities['ec2'] = allowed;
                if (action.startsWith('ec2:CreateVpc')) capabilities['vpc'] = allowed;
                if (action.startsWith('rds:Create')) capabilities['rds'] = allowed;
                if (action.startsWith('s3:Create')) capabilities['s3'] = allowed;
            }

        } catch (error: any) {
            // Mask any internal AWS signature exceptions to prevent logging secrets
            Logger.error('Permission preflight via IAM simulation failed.');
            throw new Error('Permission preflight failed. User may lack iam:SimulatePrincipalPolicy permission.');
        }

        return {
            identity,
            capabilities,
            ready
        };
    }

    /**
     * Generates a deterministic least-privilege IAM policy.
     */
    public generatePolicy(capabilities: string[], region: string, accountId: string = '*'): object {
        const statements: any[] = [];

        // Required for preflight
        statements.push({
            Sid: 'UgonduPreflight',
            Effect: 'Allow',
            Action: ['iam:SimulatePrincipalPolicy'],
            Resource: '*'
        });

        if (capabilities.includes('ec2')) {
            statements.push({
                Sid: 'EC2Lifecycle',
                Effect: 'Allow',
                Action: ['ec2:RunInstances', 'ec2:TerminateInstances', 'ec2:DescribeInstances'],
                Resource: '*' // Production-hardening: restrict by tags or ARNs
            });
        }
        if (capabilities.includes('vpc')) {
            statements.push({
                Sid: 'NetworkLifecycle',
                Effect: 'Allow',
                Action: ['ec2:CreateVpc', 'ec2:DeleteVpc', 'ec2:CreateSubnet', 'ec2:DeleteSubnet'],
                Resource: '*'
            });
        }
        if (capabilities.includes('rds')) {
            statements.push({
                Sid: 'RDSLifecycle',
                Effect: 'Allow',
                Action: ['rds:CreateDBInstance', 'rds:DeleteDBInstance', 'rds:CreateDBSubnetGroup'],
                Resource: '*'
            });
        }
        if (capabilities.includes('s3')) {
            statements.push({
                Sid: 'S3Lifecycle',
                Effect: 'Allow',
                Action: ['s3:CreateBucket', 's3:DeleteBucket', 's3:PutObject', 's3:DeleteObject'],
                Resource: '*'
            });
        }

        return {
            Version: '2012-10-17',
            Statement: statements
        };
    }
}
