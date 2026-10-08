import { AwsVpcReconciler } from '../../server/plugins/aws-vpc-adapter/src/aws-vpc-reconciler';
import { EC2Client, DescribeVpcsCommand } from '@aws-sdk/client-ec2';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { __t } from '../../server/shared/i18n';

if (!process.env.AWS_REGION) {
    throw new Error('Safety Violation: AWS_REGION must be explicitly specified in the environment.');
}

const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
const stsClient = new STSClient({ region: process.env.AWS_REGION });
const cloudTrailClient = new CloudTrailClient({ region: process.env.AWS_REGION });

/**
 * Cloud Orphan Reconciler (COR) - AWS VPC Handler
 * Handles execution of untagged orphan VPC workflows.
 */
async function runVpcOrphanReconciliation() {
    console.log(__t('scripts.aws_vpc.msg_initiating_stream'));
    const reconciler = new AwsVpcReconciler();

    const identity = await stsClient.send(new GetCallerIdentityCommand({}));
    const accountId = identity.Account;
    const principalArn = identity.Arn;

    if (!accountId || !principalArn) {
        throw new Error('Failed to resolve AWS Caller Identity.');
    }

    const describeVpcsCommand = new DescribeVpcsCommand({});
    const vpcsResponse = await ec2Client.send(describeVpcsCommand);
    
    const orphanVpcs = (vpcsResponse.Vpcs || []).filter(vpc => !vpc.Tags || vpc.Tags.length === 0);

    console.log(__t('scripts.aws_vpc.msg_found_orphans', orphanVpcs.length));

    for (const vpc of orphanVpcs) {
        if (!vpc.VpcId) continue;
        const vpcId = vpc.VpcId;
        try {
            console.log(__t('scripts.aws_vpc.msg_evaluating_orphan', vpcId));

            const eventsResponse = await cloudTrailClient.send(new LookupEventsCommand({
                LookupAttributes: [{ AttributeKey: 'ResourceName', AttributeValue: vpcId }],
                MaxResults: 50
            }));
            
            const cloudTrailLogs = (eventsResponse.Events || []).map(e => ({
                eventId: e.EventId,
                eventName: e.EventName,
                eventTime: e.EventTime,
                resourceId: vpcId,
                principalArn: e.Username ? `arn:aws:iam::${accountId}:user/${e.Username}` : principalArn,
                accountId: accountId,
                region: process.env.AWS_REGION
            }));

            const action = process.env.COR_ACTION === 'CLEANUP' ? 'CLEANUP' : 'RECOVER';
            
            const envelope = {
                principalArn,
                accountId,
                region: process.env.AWS_REGION!,
                resourceId: vpcId,
                action: action,
                classification: 'ORPHANED_RESOURCE',
                transactionId: `tx-${Date.now()}`,
                intentHash: 'simulated-hash-for-now',
                policyVersion: '1.0',
                expiration: Date.now() + 60000
            };

            const evidence = await reconciler.handleOrphanVpc(
                vpcId,
                action as 'RECOVER' | 'CLEANUP',
                cloudTrailLogs,
                envelope,
                ['simulated-signature-1', 'simulated-signature-2']
            );
            console.log(__t('scripts.aws_vpc.msg_successfully_handled', vpcId), JSON.stringify(evidence, null, 2));
        } catch (error: any) {
            console.error(__t('scripts.aws_vpc.msg_reconciliation_aborted', vpcId, error.message));
        }
    }
}

runVpcOrphanReconciliation().catch(console.error);
