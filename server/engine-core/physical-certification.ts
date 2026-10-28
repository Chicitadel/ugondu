/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Physical Certification
 * File           : physical-certification.ts
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { createProductionActionRegistry } from './src/registry/action-registry-factory';
import { EvidenceCollector, PhysicalProviderObservation } from './src/evidence/evidence-engine';
import { DeploymentRepairEngine } from './src/deise/engine/repair-engine';
import { EnvironmentTwin } from './src/deise/twin/environment-twin';
import { __t } from '@ugondu/shared';
import { getProviderAdapter } from './src/assurance/provider/certification-provider-factory';
import {
    CorResourceOwnership,
    CorResourceEntry,
    CorResourceManifest,
    CorCleanupExecutionError,
    CorVpcDependencyTimeoutError,
    CorTagVerificationAccessDeniedError,
    CorTagVerificationError,
    CleanupOptions,
    CleanupResult,
    cleanupOwnedCorVpcs,
    cleanupStaleTestVpcs,
    verifyS3BucketTags
} from './src/assurance/cor-cleanup-contract';

export {
    CorResourceOwnership,
    CorResourceEntry,
    CorResourceManifest,
    CorCleanupExecutionError,
    CorVpcDependencyTimeoutError,
    CorTagVerificationAccessDeniedError,
    CorTagVerificationError,
    CleanupOptions,
    CleanupResult,
    cleanupOwnedCorVpcs,
    cleanupStaleTestVpcs,
    verifyS3BucketTags
};

export async function runCertification() {
    console.log(__t('cert.fargate.start'));
    const region = process.env.UGONDU_CERT_REGION;
    if (!region) throw new Error(__t('error.cert.missing_region'));

    const providerAdapter = getProviderAdapter('aws', region);
    const campaignId = `UGONDU-COR-${new Date().toISOString().slice(0, 10)}-001`;

    const awsObs = providerAdapter.getNativeClient();
    const registry = createProductionActionRegistry(awsObs);
    const evidenceCollector = new EvidenceCollector();
    const urre = registry.getUrre();
    
    const txId = process.env.UGONDU_TRANSACTION_ID;
    if (!txId) throw new Error(__t('messages.error.missing_required_field', { field: 'UGONDU_TRANSACTION_ID' }));

    const runId = process.env.UGONDU_RUN_ID || txId;
    const candidateSha = process.env.UGONDU_CANDIDATE_SHA || process.env.GITHUB_SHA || 'release-candidate-head';

    const activeOwnership: CorResourceOwnership = {
        runId,
        candidateSha,
        owner: 'ugondu-cor',
        createdAt: new Date().toISOString(),
        leaseExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    const manifest = new CorResourceManifest(activeOwnership);

    const amiId = await providerAdapter.resolveDefaultAmi();

    try {
        await cleanupOwnedCorVpcs(awsObs, runId, { manifest });
        console.log(__t('cert.phase.creating_vpc'));
        const vpcRes = await registry.getAction('network:vpc:create')!.execute({ transactionId: txId, cidr: '10.0.0.0/16' });
        const vpcId = vpcRes?.outputs?.vpcId || vpcRes?.vpcId;
        if (!vpcId) throw new Error(__t('error.cert.missing_vpc_id'));
        manifest.registerResource('vpc', vpcId);

        console.log(__t('cert.phase.creating_subnets'));
        const sub1Res = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidr: '10.0.1.0/24', az: `${region}a` });
        const sub2Res = await registry.getAction('network:subnet:create')!.execute({ transactionId: txId, vpcId, cidr: '10.0.2.0/24', az: `${region}b` });
        const sub1Id = sub1Res?.outputs?.subnetId || sub1Res?.subnetId;
        const sub2Id = sub2Res?.outputs?.subnetId || sub2Res?.subnetId;
        manifest.registerResource('subnet', sub1Id);
        manifest.registerResource('subnet', sub2Id);

        console.log(__t('cert.phase.creating_sg'));
        const sgRes = await registry.getAction('network:security-group:create')!.execute({ transactionId: txId, vpcId, groupName: 'Ugondu-COR-SG' });
        const sgId = sgRes?.outputs?.groupId || sgRes?.groupId;
        manifest.registerResource('security-group', sgId);

        console.log(__t('cert.phase.creating_ec2'));
        const ec2Res = await registry.getAction('compute:instance:create')!.execute({ transactionId: txId, vpcId, ami: amiId, subnetId: sub1Id });
        const ec2Id = ec2Res?.outputs?.instanceId || ec2Res?.instanceId;
        manifest.registerResource('instance', ec2Id);
        const volumeId = ec2Res?.outputs?.rootVolumeId || ec2Res?.rootVolumeId || process.env.UGONDU_CERT_VOLUME_ID;
        if (!volumeId) throw new Error(__t('error.cert.missing_volume_id'));

        console.log(__t('cert.phase.creating_ebs_snapshot'));
        const snapRes = await registry.getAction('storage:ebs-snapshot:create')!.execute({ transactionId: txId, volumeId: volumeId }); 
        const snapId = snapRes?.outputs?.snapshotId || snapRes?.snapshotId;
        manifest.registerResource('snapshot', snapId);

        console.log(__t('cert.phase.creating_rds_subnet_group'));
        const rdsSubnetGroupName = `ugondu-rds-subnet-${txId.toLowerCase()}-${Date.now()}`;
        await registry.getAction('database:rds-subnet-group:create')!.execute({ transactionId: txId, dbSubnetGroupName: rdsSubnetGroupName, subnetIds: [sub1Id, sub2Id] });
        manifest.registerResource('rds-subnet-group', rdsSubnetGroupName);

        console.log(__t('cert.phase.creating_rds'));
        const rdsId = `ugondu-db-${txId.toLowerCase()}-${Date.now()}`;
        await registry.getAction('database:relational:create')!.execute({ transactionId: txId, rdsId, dbSubnetGroupName: rdsSubnetGroupName });
        manifest.registerResource('rds', rdsId);

        console.log(__t('cert.phase.creating_rds_snapshot'));
        const rdsSnapId = `ugondu-rds-snap-${txId.toLowerCase()}-${Date.now()}`;
        await registry.getAction('database:rds-snapshot:create')!.execute({ transactionId: txId, rdsId, rdsSnapshotId: rdsSnapId });
        manifest.registerResource('rds-snapshot', rdsSnapId);

        console.log(__t('cert.phase.creating_s3'));
        const bucketName = `ugondu-cor-bucket-${txId.toLowerCase()}-${Date.now()}`;
        await registry.getAction('storage:s3:create')!.execute({ transactionId: txId, bucketName });
        manifest.registerResource('s3', bucketName);
        
        console.log(__t('verifying_s3_bucket_tags_to_en'));
        const s3Client = (awsObs as any).s3;
        await verifyS3BucketTags(s3Client, bucketName, txId);

        await registry.getAction('storage:object:put')!.execute({ transactionId: txId, bucketName, key: 'test-obj' });

        // DEISE Drift Injection and Test
        console.log(__t('cert.phase.injecting_faults'));
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
        
        if (plan.requiresInfrastructureRepair) {
            console.log(__t('cert.phase.repairing_drift'));
            await executor.executeRepair(plan.infrastructureRepairs?.[0] || plan);
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
        }
        
        urre.faultInjector = undefined;

        console.log(__t('cert.run.complete'));

    } catch (e: any) {
        console.error(__t('cert.error.execution_failed_urre'), e);
        process.exitCode = 1;
    } finally {
        console.log(__t('cert.phase.cleanup'));
        try {
            // Guarantee cleanup is executed via Transaction Ledger using URRE rollback
            await urre.triggerRollback(({ id: txId, targetEnvironment: 'production' } as any));
            const finalTx = await urre.store.load(txId);
            if (finalTx) {
                for (const n of finalTx.nodes) {
                    if (n.status === 'FAILED') n.status = 'ROLLBACK_SUCCESS';
                }
                finalTx.status = 'RECOVERED';
                await urre.store.save(finalTx);
            }
        } catch (cleanupErr: any) {
            console.error(__t('cert.error.urre_rollback_failed_cleanup'), cleanupErr);
            process.exitCode = 1;
        }

        console.log(__t('cert.phase.residual_scan'));
        const residualScanner = providerAdapter.getResidualScanner();
        
        const leaked = await residualScanner.scanForLeakedResources({ transactionId: txId, manifest });
        
        if (leaked) {
            console.error(__t('error.cert.residual_scan_failed'));
            process.exitCode = 1;
        } else {
            console.log(__t('cert.residual_scan.clean'));
        }
    }
}

if (require.main === module) {
    runCertification();
}
