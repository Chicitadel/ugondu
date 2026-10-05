import { AuthorizationPreflight, NormalizedCredential, AuthenticatedIdentity } from '../../core';
import { IAMClient, SimulatePrincipalPolicyCommand } from '@aws-sdk/client-iam';
import { Logger } from '@ugondu/shared';

export class AwsAuthorizationPreflight implements AuthorizationPreflight {
    public async preflight(credential: NormalizedCredential, identity: AuthenticatedIdentity, capabilities: string[]): Promise<Record<string, boolean>> {
        const iam = new IAMClient({
            region: identity.region || 'eu-west-3',
            credentials: {
                accessKeyId: credential.payload.accessKeyId,
                secretAccessKey: credential.payload.secretAccessKey
            }
        });

        // Translate abstract capabilities to AWS IAM actions
        const actions: string[] = [];
        if (capabilities.includes('ec2')) actions.push('ec2:RunInstances');
        if (capabilities.includes('vpc')) actions.push('ec2:CreateVpc');
        if (capabilities.includes('rds')) actions.push('rds:CreateDBSubnetGroup', 'rds:CreateDBInstance');
        if (capabilities.includes('s3')) actions.push('s3:CreateBucket');

        const results: Record<string, boolean> = {};
        capabilities.forEach(c => results[c] = false);

        if (actions.length === 0) return results;

        try {
            const simRes = await iam.send(new SimulatePrincipalPolicyCommand({
                PolicySourceArn: identity.principal,
                ActionNames: actions
            }));

            for (const res of simRes.EvaluationResults || []) {
                const action = res.EvalActionName || '';
                const allowed = res.EvalDecision === 'allowed';

                if (action.startsWith('ec2:Run')) results['ec2'] = allowed;
                if (action.startsWith('ec2:CreateVpc')) results['vpc'] = allowed;
                if (action.startsWith('rds:')) results['rds'] = allowed;
                if (action.startsWith('s3:')) results['s3'] = allowed;
            }
            return results;
        } catch (error: any) {
            Logger.error('AWS IAM SimulatePrincipalPolicy failed.');
            throw new Error('Authorization preflight failed due to missing simulate policy permissions or network error.');
        }
    }
}
