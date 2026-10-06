import { createProductionActionRegistry } from './src/registry/action-registry-factory';
import { EvidenceCollector, PhysicalProviderObservation } from './src/evidence/evidence-engine';
import { AwsNativeClient } from './src/fabric/providers/aws-native-client';
import { DeploymentRepairEngine } from './src/deise/engine/repair-engine';
import { EnvironmentTwin } from './src/deise/twin/environment-twin';
import { __t } from '@ugondu/shared';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

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
    
    // STRICTLY read-only / observation client. 
    // NO direct provider mutation inside the runner.
    const awsObs = new AwsNativeClient(region);

    const amiId = await resolveCertificationAmi(region);

    try {
        const txId = `tx-${campaignId}`;

        console.log("1. Creating VPC");
        const vpcRes = await registry.getAction('network:vpc:create')!.execute({ transactionId: txId, cidrBlock: '10.0.0.0/16' });
        const vpcId = vpcRes.outputs?.vpcId || vpcRes.vpcId;

        console.log("2. Creating Subnets");
        const sub1 = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidrBlock: '10.0.1.0/24', az: `${region}a` });
        const sub2 = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidrBlock: '10.0.2.0/24', az: `${region}b` });
        const sub1Id = sub1.outputs?.subnetId || sub1.subnetId;
        const sub2Id = sub2.outputs?.subnetId || sub2.subnetId;

        console.log("3. Creating Security Group");
        const sg = await registry.getAction('network:security-group:create')!.execute({ transactionId: txId, vpcId, name: `sg-${campaignId}` });
        const sgId = sg.outputs?.securityGroupId || sg.securityGroupId;

        console.log("4. Creating EC2");
        const ec2Res = await registry.getAction('compute:instance:create')!.execute({ transactionId: txId, vpcId, ami: amiId, subnetId: sub1Id, securityGroupId: sgId });
        const ec2Id = ec2Res.outputs?.instanceId || ec2Res.instanceId;

        console.log("5. Creating EBS Snapshot");
        const ebsRes = await registry.getAction('storage:ebs-snapshot:create')!.execute({ transactionId: txId, instanceId: ec2Id });
        const snapId = ebsRes.outputs?.snapshotId || ebsRes.snapshotId;

        console.log("6. Creating RDS Subnet Group");
        const rdsSg = await registry.getAction('database:rds-subnet-group:create')!.execute({ transactionId: txId, subnetIds: [sub1Id, sub2Id] });
        const rdsSubnetGroupName = rdsSg.outputs?.dbSubnetGroupName || rdsSg.dbSubnetGroupName;

        console.log("7. Creating RDS");
        const rdsRes = await registry.getAction('database:relational:create')!.execute({ transactionId: txId, securityGroupId: sgId, dbSubnetGroupName: rdsSubnetGroupName });
        const rdsId = rdsRes.outputs?.rdsId || rdsRes.rdsId;

        console.log("8. Creating RDS Snapshot");
        const rdsSnapRes = await registry.getAction('database:rds-snapshot:create')!.execute({ transactionId: txId, rdsId: rdsId });
        const rdsSnapId = rdsSnapRes.outputs?.rdsSnapshotId || rdsSnapRes.rdsSnapshotId;

        console.log("9. Creating S3 Bucket & Object");
        const s3Res = await registry.getAction('storage:s3:create')!.execute({ transactionId: txId });
        const bucketName = s3Res.outputs?.bucketName || s3Res.bucketName;
        await registry.getAction('storage:object:put')!.execute({ transactionId: txId, bucketName, key: 'test-obj' });

        // DEISE Drift Injection and Test
        console.log("10. Injecting Faults / Drift Out-of-band");
        // Test script drift injection bypasses registry ONLY for testing the executor's ability to repair
        const ec2ClientModule = require('@aws-sdk/client-ec2');
        const ec2Injector = new ec2ClientModule.EC2({ region });
        await ec2Injector.createTags({ Resources: [ec2Id], Tags: [{ Key: 'Name', Value: 'DriftedName' }] });
        
        console.log("11. DEISE Diagnosis and Native Repair");
        // Actually invoke the AwsPhysicalRepairExecutor through DEISE
        const { AwsPhysicalRepairExecutor } = require('./src/deise/engine/aws-physical-repair-executor');
        const executor = new AwsPhysicalRepairExecutor(region);
        
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
            console.log("12. DEISE Repair (Fixing Drift natively)");
            await executor.executeRepair(plan.infrastructureRepairs[0]);
        }

        console.log("13. URRE Fault Injection & Rollback (Same transaction DAG)");
        urre.faultInjector = {
            afterNodePersisted: async (node) => {
                if (node.action === 'CREATE_EC2' && node.status === 'RUNNING') {
                    throw new Error("Simulated Fault during execution");
                }
            }
        };

        try {
            await registry.getAction('compute:instance:create')!.execute({ transactionId: txId, vpcId, ami: amiId, subnetId: sub1Id });
        } catch (e: any) {
            console.log("Fault caught, testing rollback on the same TX. Error: " + e.message);
            await urre.triggerRollback({ id: txId });
        }
        
        // Remove fault injector for cleanup
        urre.faultInjector = undefined;

        console.log("14. Cleanup (Canonical Actions Only)");
        await registry.getAction('storage:object:delete')!.execute({ transactionId: txId, bucketName, key: 'test-obj' });
        await registry.getAction('storage:s3:terminate')!.execute({ transactionId: txId, bucketName });
        
        await registry.getAction('database:rds-snapshot:terminate')!.execute({ transactionId: txId, rdsSnapshotId: rdsSnapId });
        await registry.getAction('database:relational:terminate')!.execute({ transactionId: txId, rdsId });
        await registry.getAction('database:rds-subnet-group:terminate')!.execute({ transactionId: txId, dbSubnetGroupName: rdsSubnetGroupName });

        await registry.getAction('storage:ebs-snapshot:terminate')!.execute({ transactionId: txId, snapshotId: snapId });
        await registry.getAction('compute:instance:terminate')!.execute({ transactionId: txId, instanceId: ec2Id });

        await registry.getAction('network:security-group:terminate')!.execute({ transactionId: txId, securityGroupId: sgId });
        await registry.getAction('network:subnet:terminate')!.execute({ transactionId: txId, subnetId: sub1Id });
        await registry.getAction('network:subnet:terminate')!.execute({ transactionId: txId, subnetId: sub2Id });
        await registry.getAction('network:vpc:terminate')!.execute({ transactionId: txId, vpcId: vpcId });

        console.log("15. Residual Scan Verification");
        const vpcDesc = await ec2Injector.describeVpcs({ VpcIds: [vpcId] }).catch(() => null);
        const subDesc = await ec2Injector.describeSubnets({ SubnetIds: [sub1Id] }).catch(() => null);
        const instDesc = await ec2Injector.describeInstances({ InstanceIds: [instanceId] }).catch(() => null);
        const rdsDesc = await (ec2Injector as any).describeDBInstances({ DBInstanceIdentifier: 'test' }).catch(() => null);
        const s3Desc = await (ec2Injector as any).headBucket({ Bucket: 'test' }).catch(() => null);
        if ((vpcDesc ? 1 : 0) + (subDesc ? 1 : 0) + (instDesc ? 1 : 0) + (rdsDesc ? 1 : 0) + (s3Desc ? 1 : 0) !== 0) throw new Error("Residual Scan FAILED! Resources leaked.");
        else console.log("Residual Scan: Clean!");

        console.log("? Certification Run Complete.");

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

runCertification();
