import { AwsVpcReconciler } from '../../server/plugins/aws-vpc-adapter/src/aws-vpc-reconciler';
import { EC2Client, DescribeVpcsCommand } from '@aws-sdk/client-ec2';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

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
    console.log('Initiating AWS VPC Orphan Reconciliation Stream...');
    
    // Verify STS identity before execution
    const identityCommand = new GetCallerIdentityCommand({});
    const identity = await stsClient.send(identityCommand);
    console.log(`Authenticated as STS Identity: ${identity.Arn} (Account: ${identity.Account})`);

    const reconciler = new AwsVpcReconciler();

    // Fetch real untagged VPCs from AWS
    const describeVpcsCommand = new DescribeVpcsCommand({});
    const vpcsResponse = await ec2Client.send(describeVpcsCommand);
    
    // Identify orphan VPCs (those without tags or without expected managed tags)
    const orphanVpcs = (vpcsResponse.Vpcs || []).filter(vpc => !vpc.Tags || vpc.Tags.length === 0);

    console.log(`Found ${orphanVpcs.length} real untagged orphan VPC(s).`);

    // We will still pass historical graph if any exists from some external graph DB
    const historicalGraph = { nodes: orphanVpcs.map(v => v.VpcId) };

    for (const vpc of orphanVpcs) {
        if (!vpc.VpcId) continue;
        const vpcId = vpc.VpcId;
        try {
            console.log(`Evaluating orphan VPC: ${vpcId}`);

            // Here we determine the action. For demo, we default to CLAIM.
            // Distinguish CLAIM from CLEANUP
            const action = process.env.COR_ACTION === 'CLEANUP' ? 'CLEANUP' : 'CLAIM';

            const evidence = await reconciler.handleOrphanVpc(vpcId, action, historicalGraph);
            console.log(`Successfully handled VPC: ${vpcId} with action ${action}. Evidence:`, JSON.stringify(evidence, null, 2));
        } catch (error: any) {
            console.error(`Reconciliation aborted for ${vpcId}: ${error.message}`);
        }
    }
}

runVpcOrphanReconciliation().catch(console.error);
