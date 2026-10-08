import { AwsVpcReconciler } from '../../server/plugins/aws-vpc-adapter/src/aws-vpc-reconciler';
import { EC2Client, DescribeVpcsCommand } from '@aws-sdk/client-ec2';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import { __t } from '../../server/shared/i18n';

if (!process.env.AWS_REGION) {
    throw new Error('Safety Violation: AWS_REGION must be explicitly specified in the environment.');
}

const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
const stsClient = new STSClient({ region: process.env.AWS_REGION });

/**
 * Cloud Orphan Reconciler (COR) - AWS VPC Handler
 * Handles execution of untagged orphan VPC workflows.
 */
async function runVpcOrphanReconciliation() {
    console.log(__t('scripts.aws_vpc.msg_initiating_stream'));
    const reconciler = new AwsVpcReconciler();

    // Fetch real untagged VPCs from AWS
    const describeVpcsCommand = new DescribeVpcsCommand({});
    const vpcsResponse = await ec2Client.send(describeVpcsCommand);
    
    // Identify orphan VPCs (those without tags or without expected managed tags)
    const orphanVpcs = (vpcsResponse.Vpcs || []).filter(vpc => !vpc.Tags || vpc.Tags.length === 0);

    console.log(__t('scripts.aws_vpc.msg_found_orphans', orphanVpcs.length));

    // We will still pass historical graph if any exists from some external graph DB
    const historicalGraph = { nodes: orphanVpcs.map(v => v.VpcId) };

    for (const vpc of orphanVpcs) {
        if (!vpc.VpcId) continue;
        const vpcId = vpc.VpcId;
        try {
            console.log(__t('scripts.aws_vpc.msg_evaluating_orphan', vpcId));

            // Here we determine the action. For demo, we default to CLAIM.
            // Distinguish CLAIM from CLEANUP
            const action = process.env.COR_ACTION === 'CLEANUP' ? 'CLEANUP' : 'CLAIM';

            const evidence = await reconciler.handleOrphanVpc(vpcId, cloudTrailLogs, historicalGraph);
            console.log(__t('scripts.aws_vpc.msg_successfully_handled', vpcId), JSON.stringify(evidence, null, 2));
        } catch (error: any) {
            console.error(__t('scripts.aws_vpc.msg_reconciliation_aborted', vpcId, error.message));
        }
    }
}

runVpcOrphanReconciliation().catch(console.error);
