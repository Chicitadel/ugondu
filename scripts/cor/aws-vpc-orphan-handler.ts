import { AwsVpcReconciler } from '../../server/plugins/aws-vpc-adapter/src/aws-vpc-reconciler';
import { EC2Client, DescribeVpcsCommand } from '@aws-sdk/client-ec2';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';

const ec2Client = new EC2Client({ region: process.env.AWS_REGION || 'us-east-1' });
const cloudTrailClient = new CloudTrailClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Cloud Orphan Reconciler (COR) - AWS VPC Handler
 * Handles execution of untagged orphan VPC workflows.
 */
async function runVpcOrphanReconciliation() {
    console.log('Initiating AWS VPC Orphan Reconciliation Stream...');
    const reconciler = new AwsVpcReconciler();

    // Fetch real untagged VPCs from AWS
    const describeVpcsCommand = new DescribeVpcsCommand({});
    const vpcsResponse = await ec2Client.send(describeVpcsCommand);
    
    // Identify orphan VPCs (those without tags or without expected managed tags)
    const orphanVpcs = (vpcsResponse.Vpcs || []).filter(vpc => !vpc.Tags || vpc.Tags.length === 0);

    console.log(`Found ${orphanVpcs.length} real untagged orphan VPC(s).`);

    // We will still pass historical graph if any exists from some external graph DB
    // For this handler, we will simulate the external graph source as it represents historical architecture DB, not AWS.
    const historicalGraph = { nodes: orphanVpcs.map(v => v.VpcId) };

    for (const vpc of orphanVpcs) {
        if (!vpc.VpcId) continue;
        const vpcId = vpc.VpcId;
        try {
            console.log(`Evaluating orphan VPC: ${vpcId}`);

            // Fetch real CloudTrail evidence for the VPC
            const lookupEventsCommand = new LookupEventsCommand({
                LookupAttributes: [
                    { AttributeKey: 'ResourceName', AttributeValue: vpcId }
                ]
            });
            const cloudTrailResponse = await cloudTrailClient.send(lookupEventsCommand);
            
            const cloudTrailLogs = (cloudTrailResponse.Events || []).map(event => ({
                resourceId: vpcId,
                action: event.EventName
            }));

            const evidence = await reconciler.handleOrphanVpc(vpcId, cloudTrailLogs, historicalGraph);
            console.log(`Successfully handled VPC: ${vpcId} with evidence:`, JSON.stringify(evidence, null, 2));
        } catch (error: any) {
            console.error(`Reconciliation aborted for ${vpcId}: ${error.message}`);
        }
    }
}

runVpcOrphanReconciliation().catch(console.error);
