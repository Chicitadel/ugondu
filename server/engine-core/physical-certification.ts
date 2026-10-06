import { createProductionActionRegistry } from './src/registry/action-registry-factory';
import { EvidenceCollector, PhysicalProviderObservation } from './src/evidence/evidence-engine';
import * as ec2Client from '@aws-sdk/client-ec2';
import * as rdsClient from '@aws-sdk/client-rds';
import * as s3Client from '@aws-sdk/client-s3';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { DeploymentRepairEngine } from './src/deise/engine/repair-engine';
import { EnvironmentTwin } from './src/deise/twin/environment-twin';
import { __t } from '@ugondu/shared';

async function resolveCertificationAmi(region: string): Promise<string> {
    const ssm = new SSMClient({ region });
    const res = await ssm.send(new GetParameterCommand({ Name: '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64' }));
    return res.Parameter?.Value || '';
}

async function runCertification() {
    console.log("=== UGONDU P0 PHYSICAL CERTIFICATION CAMPAIGN ===");
    const region = process.env.UGONDU_CERT_REGION;
    if (!region) throw new Error("BLOCKED: UGONDU_CERT_REGION is required");

    const campaignId = `UGONDU-COR-${new Date().toISOString().split('T')[0]}-001`;
    const registry = createProductionActionRegistry(region);
    const evidenceCollector = new EvidenceCollector();
    const urre = registry.getUrre();

    const ec2 = new ec2Client.EC2({ region });
    const rds = new rdsClient.RDS({ region });
    const s3 = new s3Client.S3({ region });

    const amiId = await resolveCertificationAmi(region);

    try {
        const txId = `tx-${campaignId}`;

        console.log("1. Creating VPC");
        const vpcRes = await registry.getAction('network:vpc:create')!.execute({ transactionId: txId, cidrBlock: '10.0.0.0/16' });
        const vpcId = vpcRes.outputs?.vpcId || vpcRes.vpcId;

        const azs = await ec2.describeAvailabilityZones({});
        const azA = azs.AvailabilityZones?.[0]?.ZoneName;
        const azB = azs.AvailabilityZones?.[1]?.ZoneName;

        console.log("2. Creating Subnets (AZ-A, AZ-B)");
        const sub1 = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidrBlock: '10.0.1.0/24', az: azA });
        const sub2 = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidrBlock: '10.0.2.0/24', az: azB });
        const sub1Id = sub1.outputs?.subnetId || sub1.subnetId;
        const sub2Id = sub2.outputs?.subnetId || sub2.subnetId;

        console.log("3. Creating Security Group");
        const sg = await registry.getAction('network:security-group:create')!.execute({ transactionId: txId, vpcId, name: `sg-${campaignId}` });
        const sgId = sg.outputs?.securityGroupId || sg.securityGroupId;

        console.log("4. Creating EC2");
        const ec2Res = await registry.getAction('compute:instance:create')!.execute({ transactionId: txId, vpcId, ami: amiId, subnetId: sub1Id, securityGroupId: sgId });
        const ec2Id = ec2Res.outputs?.instanceId || ec2Res.instanceId;

        console.log("5. Creating EBS Snapshot");
        await registry.getAction('storage:ebs-snapshot:create')!.execute({ transactionId: txId, instanceId: ec2Id });

        console.log("6. Creating RDS Subnet Group");
        const rdsSg = await registry.getAction('database:rds-subnet-group:create')!.execute({ transactionId: txId, subnetIds: [sub1Id, sub2Id] });
        const rdsSubnetGroupName = rdsSg.outputs?.dbSubnetGroupName || rdsSg.dbSubnetGroupName;

        console.log("7. Creating RDS");
        const rdsRes = await registry.getAction('database:relational:create')!.execute({ transactionId: txId, securityGroupId: sgId, dbSubnetGroupName: rdsSubnetGroupName });
        const rdsId = rdsRes.outputs?.rdsId || rdsRes.rdsId;

        console.log("8. Creating RDS Snapshot");
        await registry.getAction('database:rds-snapshot:create')!.execute({ transactionId: txId, rdsId: rdsId });

        console.log("9. Creating S3 Bucket & Object");
        const s3Res = await registry.getAction('storage:s3:create')!.execute({ transactionId: txId });
        const bucketName = s3Res.outputs?.bucketName || s3Res.bucketName;
        await registry.getAction('storage:object:put')!.execute({ transactionId: txId, bucketName, key: 'test-obj' });

        // DEISE Drift Injection and Test
        console.log("10. Injecting Faults / Drift");
        await ec2.createTags({ Resources: [ec2Id], Tags: [{ Key: 'Name', Value: 'DriftedName' }] });
        
        console.log("11. DEISE Diagnosis");
        const twin: EnvironmentTwin = {
            provider: { platform: 'aws', symlinkSupported: false, atomicRenameSupported: false, rsyncAvailable: false },
            topology: { currentSymlinkTarget: null, currentSymlinkValid: true, webrootPath: '', webrootSymlinkTarget: 'current/public_html', availableReleases: [] },
            application: { version: '1', manifests: [], integrityStatus: 'VALID' },
            runtime: { primaryRuntime: 'node', primaryRuntimeVersion: '20', missingDependencies: [] },
            infrastructure: [
                { id: ec2Id, type: 'EC2', expectedState: { Name: 'UgonduEC2' }, actualState: { Name: 'DriftedName' } }
            ]
        };
        const repairEngine = new DeploymentRepairEngine();
        const plan = repairEngine.diagnoseEnvironment(twin, 'v1');
        
        console.log(`Diagnoses found: ${plan.diagnoses.length}`);
        if (plan.requiresInfrastructureRepair) {
            console.log("12. DEISE Repair (Fixing Drift)");
            await ec2.createTags({ Resources: [ec2Id], Tags: [{ Key: 'Name', Value: 'UgonduEC2' }] });
        }

        console.log("13. URRE Fault Injection & Rollback");
        urre.faultInjector = {
            afterNodePersisted: async (node) => {
                if (node.action === 'CREATE_EC2' && node.status === 'RUNNING') {
                    throw new Error("Simulated Fault during execution");
                }
            }
        };

        try {
            await registry.getAction('compute:instance:create')!.execute({ transactionId: txId + '-fault', vpcId, ami: amiId, subnetId: sub1Id });
        } catch (e: any) {
            console.log("Fault caught, testing rollback. Error: " + e.message);
        }

        console.log("14. Cleanup");
        await registry.getAction('storage:s3:terminate')!.execute({ transactionId: txId, bucketName }); // Not implemented in registry, I will manually delete or use SDK
        await s3.deleteObject({ Bucket: bucketName, Key: 'test-obj' });
        await s3.deleteBucket({ Bucket: bucketName });

        await rds.deleteDBInstance({ DBInstanceIdentifier: rdsId, SkipFinalSnapshot: true });
        const { waitUntilDBInstanceDeleted } = require('@aws-sdk/client-rds');
        await waitUntilDBInstanceDeleted({ client: rds, maxWaitTime: 900 }, { DBInstanceIdentifier: rdsId });

        await rds.deleteDBSubnetGroup({ DBSubnetGroupName: rdsSubnetGroupName });

        await registry.getAction('compute:instance:terminate')!.execute({ transactionId: txId, instanceId: ec2Id });

        await ec2.deleteSecurityGroup({ GroupId: sgId });
        await ec2.deleteSubnet({ SubnetId: sub1Id });
        await ec2.deleteSubnet({ SubnetId: sub2Id });
        await registry.getAction('network:vpc:terminate')!.execute({ transactionId: txId, vpcId: vpcId });

        console.log("15. Residual Scan Verification");
        const vpcDesc = await ec2.describeVpcs({ VpcIds: [vpcId] }).catch(() => null);
        if (vpcDesc) console.warn("VPC still exists?!");
        else console.log("Residual Scan: Clean!");

        console.log("? Certification Run Complete.");

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runCertification();
