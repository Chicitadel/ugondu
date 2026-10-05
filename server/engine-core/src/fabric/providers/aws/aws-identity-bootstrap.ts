import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { Logger, __t } from '@ugondu/shared';

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

    private readonly configDir: string;
    private readonly credentialsPath: string;

    constructor() {
        this.configDir = path.join(os.homedir(), '.ugondu', 'aws');
        this.credentialsPath = path.join(this.configDir, 'credentials.json');
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    /**
     * Parses an AWS IAM CSV file. It recognizes the headers regardless of column order.
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
            throw new Error(`AWS STS Verification failed: ${error.message}`);
        }
    }

    /**
     * Secures the credentials locally in Ugondu's isolated keystore.
     */
    public storeCredentialsLocally(credentials: { accessKeyId: string; secretAccessKey: string }): void {
        // In a real OS keystore scenario, this would interface with Keychain/Credential Manager.
        // For local bootstrap, we use isolated 0600 file permissions.
        fs.writeFileSync(this.credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
        Logger.info('Credentials secured locally.');
    }

    public getStoredCredentials(): { accessKeyId: string; secretAccessKey: string } | null {
        if (!fs.existsSync(this.credentialsPath)) return null;
        try {
            const data = fs.readFileSync(this.credentialsPath, 'utf8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    /**
     * Preflight capability checker (currently simulates dry-run capabilities)
     */
    public async preflightPermissions(credentials: { accessKeyId: string; secretAccessKey: string }, region: string): Promise<AwsPermissionPreflightResult> {
        const identity = await this.verifyIdentity(credentials, region);
        // Note: Real preflight would use IAM SimulatePrincipalPolicy or dry-run AWS API calls.
        return {
            identity,
            capabilities: {
                'vpc': true,
                'ec2': true,
                'rds': true,
                's3': true
            },
            ready: true
        };
    }

    /**
     * Generates a deterministic least-privilege IAM policy.
     */
    public generatePolicy(capabilities: string[], region: string, accountId: string = '*'): object {
        const statements: any[] = [];

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
