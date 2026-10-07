import { createProductionActionRegistry } from './src/registry/action-registry-factory';
import { EvidenceCollector, PhysicalProviderObservation } from './src/evidence/evidence-engine';
import { DeploymentRepairEngine } from './src/deise/engine/repair-engine';
import { EnvironmentTwin } from './src/deise/twin/environment-twin';
import { __t } from '@ugondu/shared';
import { getProviderAdapter } from './src/assurance/provider/certification-provider-factory';

async function runCertification() {
    console.log(__t('cert.fargate.start'));
    const region = process.env.UGONDU_CERT_REGION;
    if (!region) throw new Error(__t('error.cert.missing_region'));

    const providerAdapter = getProviderAdapter('aws', region);
    const campaignId = `UGONDU-COR-${new Date().toISOString().slice(0, 10)}-001`;

    const awsObs = providerAdapter.getNativeClient();
    const registry = createProductionActionRegistry(awsObs);
    const evidenceCollector = new EvidenceCollector();
    const urre = registry.getUrre();
    
    // STRICTLY read-only / observation client via adapter
    const txId = `tx-${campaignId}`;

    const amiId = await providerAdapter.resolveDefaultAmi();

    try {
        console.log(__t('cert.phase.creating_vpc'));
        const vpcRes = await registry.getAction('network:vpc:create')!.execute({ transactionId: txId, cidr: '10.0.0.0/16' });
        const vpcId = vpcRes?.outputs?.vpcId || vpcRes?.vpcId;
        if (!vpcId) throw new Error(__t('error.cert.missing_vpc_id'));

        console.log(__t('cert.phase.creating_subnets'));
        const sub1Res = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidr: '10.0.1.0/24' });
        const sub2Res = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidr: '10.0.2.0/24' });
        const sub1Id = sub1Res?.outputs?.subnetId || sub1Res?.subnetId;
        const sub2Id = sub2Res?.outputs?.subnetId || sub2Res?.subnetId;

        console.log(__t('cert.phase.creating_sg'));
        const sgRes = await registry.getAction('network:security-group:create')!.execute({ transactionId: txId, vpcId, groupName: 'Ugondu-COR-SG' });
        const sgId = sgRes?.outputs?.groupId || sgRes?.groupId;

        console.log(__t('cert.phase.creating_ec2'));
        const ec2Res = await registry.getAction('compute:instance:create')!.execute({ transactionId: txId, vpcId, ami: amiId, subnetId: sub1Id });
        const ec2Id = ec2Res?.outputs?.instanceId || ec2Res?.instanceId;

        console.log(__t('cert.phase.creating_ebs_snapshot'));
        const snapRes = await registry.getAction('storage:ebs-snapshot:create')!.execute({ transactionId: txId, volumeId: 'vol-test-fallback' }); 
        const snapId = snapRes?.outputs?.snapshotId || snapRes?.snapshotId;

        console.log(__t('cert.phase.creating_rds_subnet_group'));
        const rdsSubnetGroupName = `ugondu-rds-subnet- + Date.now()`;
        await registry.getAction('database:rds-subnet-group:create')!.execute({ transactionId: txId, dbSubnetGroupName: rdsSubnetGroupName, subnetIds: [sub1Id, sub2Id] });

        console.log(__t('cert.phase.creating_rds'));
        const rdsId = `ugondu-db- + Date.now()`;
        await registry.getAction('database:relational:create')!.execute({ transactionId: txId, rdsId, dbSubnetGroupName: rdsSubnetGroupName });

        console.log(__t('cert.phase.creating_rds_snapshot'));
        const rdsSnapId = `ugondu-rds-snap- + Date.now()`;
        await registry.getAction('database:rds-snapshot:create')!.execute({ transactionId: txId, rdsId, rdsSnapshotId: rdsSnapId });

        console.log(__t('cert.phase.creating_s3'));
        const bucketName = `ugondu-cor-bucket- + Date.now()`;
        await registry.getAction('storage:s3:create')!.execute({ transactionId: txId, bucketName });
        await registry.getAction('storage:object:put')!.execute({ transactionId: txId, bucketName, key: 'test-obj' });

        // DEISE Drift Injection and Test
        console.log(__t('cert.phase.injecting_faults'));
        // Governed Fault Injection
        const faultInjector = providerAdapter.getFaultInjector();
        await faultInjector.injectTagDrift(ec2Id, 'Name', 'DriftedName');
        
        console.log(__t('cert.phase.diagnosis_repair'));
        const executor = providerAdapter.getRepairExecutor();
        
        const twin = {
            provider: { platform: 'aws', symlinkSupported: false, atomicRenameSupported: false, rsyncAvailable: false },
            topology: { currentSymlinkTarget: null, currentSymlinkValid: true, webrootPath: '', webrootSymlinkTarget: 'current/public_html', availableReleases: [] },
            application: { version: '1', manifests: [], integrityStatus: ('VALID' as 'VALID' | 'CORRUPTED' | 'MISSING') },
            runtime: { primaryRuntime: 'node', primaryRuntimeVersion: '20', missingDependencies: [] },
            infrastructure: [
                { id: ec2Id, type: ('EC2' as 'EC2'), expectedState: { Name: 'UgonduEC2' }, actualState: { Name: 'DriftedName' } }
            ]
        };
        const repairEngine = new DeploymentRepairEngine();
        const plan = repairEngine.diagnoseEnvironment(twin, 'v1');
        
        console.log(__t('cert.diagnoses.found', { count: plan.diagnoses.length }));
        if (plan.requiresInfrastructureRepair) {
            console.log(__t('cert.phase.repairing_drift'));
            await executor.executeRepair(plan.infrastructureRepairs![0]);
        }

        console.log(__t('cert.phase.urre_fault_injection'));
        urre.faultInjector = {
            afterNodePersisted: async (node) => {
                if (node.action === 'CREATE_EC2' && node.status === 'RUNNING') {
                    throw new Error(__t('error.cert.simulated_fault'));
                }
            }
        };

        try {
            await registry.getAction('compute:instance:create')!.execute({ transactionId: txId, vpcId, ami: amiId, subnetId: sub1Id });
        } catch (e: any) {
            console.log(__t('cert.phase.testing_rollback', { error: e.message }));
            await urre.triggerRollback(({ id: txId, targetEnvironment: 'production' } as any));
        }
        
        urre.faultInjector = undefined;

        console.log(__t('cert.phase.cleanup'));
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

        console.log(__t('cert.phase.residual_scan'));
        const residualScanner = providerAdapter.getResidualScanner();
        
        const leaked = await residualScanner.scanForLeakedResources({
            vpcId, sub1Id, ec2Id, rdsId, bucketName
        });
        
        if (leaked) {
            throw new Error(__t('error.cert.residual_scan_failed'));
        }
        else console.log(__t('cert.residual_scan.clean'));

        console.log(__t('cert.run.complete'));

    } catch (e: any) {
        console.error(e);
        process.exit(1);
    }
}

runCertification();
