/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : CI
 * File           : residual-scanner.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-21
 * Classification : INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import { TransactionStore } from '../../server/engine-core/src/urre/transaction/transaction-store';
import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeInstancesCommand, DescribeSecurityGroupsCommand, DescribeSnapshotsCommand } from "@aws-sdk/client-ec2";
import { RDSClient, DescribeDBInstancesCommand, DescribeDBSubnetGroupsCommand, DescribeDBSnapshotsCommand } from "@aws-sdk/client-rds";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { ECSClient, DescribeServicesCommand, DescribeTaskDefinitionCommand } from "@aws-sdk/client-ecs";
import { ECRClient, DescribeRepositoriesCommand } from "@aws-sdk/client-ecr";

export enum ResidualClassification {
    ZERO_RESIDUAL = 'ZERO_RESIDUAL',
    FOREIGN_RESOURCES_PRESENT = 'FOREIGN_RESOURCES_PRESENT',
    UGONDU_RESIDUAL_PRESENT = 'UGONDU_RESIDUAL_PRESENT',
    UNKNOWN_RESOURCES_PRESENT = 'UNKNOWN_RESOURCES_PRESENT',
    SCAN_INCOMPLETE = 'SCAN_INCOMPLETE'
}

function isNotFound(err: any): boolean {
    const text = `${err?.name || ''} ${err?.Code || ''} ${err?.code || ''} ${err?.message || ''} ${err?.$metadata?.httpStatusCode || ''}`;
    return /not\s*found|does\s*not\s*exist|no\s*such|invalid.*notfound|unable to describe|404|403|forbidden/i.test(text);
}

async function main() {
    const region = process.env.AWS_REGION || process.env.UGONDU_CERT_REGION;
    if (!region) throw new Error('Safety Violation: AWS_REGION or UGONDU_CERT_REGION must be explicitly provided.');
    
    const transactionId = process.env.UGONDU_TRANSACTION_ID;
    if (!transactionId) throw new Error('Safety Violation: UGONDU_TRANSACTION_ID must be explicitly provided.');

    console.log(`[Residual Scanner] Starting transaction-bound ledger scan for ${transactionId}...`);

    const ec2Client = new EC2Client({ region });
    const rdsClient = new RDSClient({ region });
    const s3Client = new S3Client({ region });
    const ecsClient = new ECSClient({ region });
    const ecrClient = new ECRClient({ region });

    let classification: ResidualClassification = ResidualClassification.ZERO_RESIDUAL;
    let foundResiduals: string[] = [];

    try {
        const store = new TransactionStore();
        const tx = await store.load(transactionId);
        
        if (!tx) {
            console.error(`[Residual Scanner] Transaction ${transactionId} not found in ledger. Scan incomplete.`);
            process.exit(1);
        }

        const nodes = tx.nodes;
        
        if (nodes.length === 0) {
            console.error(`[Residual Scanner] SCAN_INCOMPLETE: Ledger empty for ${transactionId}. Expected evidence of resources.`);
            process.exit(1);
        }

        for (const node of nodes) {
            const action = node.action.toLowerCase().replace(/_/g, '-');
            const outputs = node.output || {};
            const params = node.params || {};
            const ignoreNotFound = (err: any) => { if (isNotFound(err)) return null; throw err; };
            
            try {
                if (action.includes('put') || action.includes('image') || action.includes('deploy')) {
                    continue;
                } else if (action.includes('vpc') && (outputs.vpcId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeVpcsCommand({ VpcIds: [outputs.vpcId || outputs.id] })).catch(ignoreNotFound);
                    if (r && r.Vpcs && r.Vpcs.length > 0) foundResiduals.push(outputs.vpcId || outputs.id);
                } else if (action.includes('subnet') && !action.includes('group') && (outputs.subnetId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeSubnetsCommand({ SubnetIds: [outputs.subnetId || outputs.id] })).catch(ignoreNotFound);
                    if (r && r.Subnets && r.Subnets.length > 0) foundResiduals.push(outputs.subnetId || outputs.id);
                } else if (action.includes('security-group') && (outputs.groupId || outputs.securityGroupId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupIds: [outputs.groupId || outputs.securityGroupId || outputs.id] })).catch(ignoreNotFound);
                    if (r && r.SecurityGroups && r.SecurityGroups.length > 0) foundResiduals.push(outputs.groupId || outputs.securityGroupId || outputs.id);
                } else if (action.includes('instance') || action.includes('ec2')) {
                    const instId = outputs.instanceId || outputs.id;
                    if (!instId) continue;
                    const r = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [instId] })).catch(ignoreNotFound);
                    if (r && r.Reservations && r.Reservations.some(res => res.Instances?.some(i => i.State?.Name !== 'terminated'))) {
                        foundResiduals.push(instId);
                    }
                } else if (action.includes('ebs-snapshot') && (outputs.snapshotId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeSnapshotsCommand({ SnapshotIds: [outputs.snapshotId || outputs.id] })).catch(ignoreNotFound);
                    if (r && r.Snapshots && r.Snapshots.length > 0) foundResiduals.push(outputs.snapshotId || outputs.id);
                } else if (action.includes('rds-subnet-group') && (params.dbSubnetGroupName || outputs.dbSubnetGroupName || outputs.id)) {
                    const sgName = params.dbSubnetGroupName || outputs.dbSubnetGroupName || outputs.id;
                    const r = await rdsClient.send(new DescribeDBSubnetGroupsCommand({ DBSubnetGroupName: sgName })).catch(ignoreNotFound);
                    if (r && r.DBSubnetGroups && r.DBSubnetGroups.length > 0) foundResiduals.push(sgName);
                } else if ((action.includes('database') || action.includes('rds')) && !action.includes('snapshot') && !action.includes('subnet') && (params.rdsId || outputs.rdsId || outputs.id)) {
                    const rdsId = params.rdsId || outputs.rdsId || outputs.id;
                    const r = await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: rdsId })).catch(ignoreNotFound);
                    if (r && r.DBInstances && r.DBInstances.some(db => db.DBInstanceStatus !== 'deleting')) foundResiduals.push(rdsId);
                } else if (action.includes('rds-snapshot') && (params.rdsSnapshotId || outputs.rdsSnapshotId || outputs.id)) {
                    const snapId = params.rdsSnapshotId || outputs.rdsSnapshotId || outputs.id;
                    const r = await rdsClient.send(new DescribeDBSnapshotsCommand({ DBSnapshotIdentifier: snapId })).catch(ignoreNotFound);
                    if (r && r.DBSnapshots && r.DBSnapshots.length > 0) foundResiduals.push(snapId);
                } else if ((action.includes('s3') || action.includes('bucket')) && (params.bucketName || outputs.bucketName || outputs.id)) {
                    const bucket = params.bucketName || outputs.bucketName || outputs.id;
                    const r = await s3Client.send(new HeadBucketCommand({ Bucket: bucket })).catch(ignoreNotFound);
                    if (r) foundResiduals.push(bucket);
                } else if ((action.includes('registry') || action.includes('ecr')) && (params.repositoryName || outputs.repositoryName || outputs.id)) {
                    const repo = params.repositoryName || outputs.repositoryName || outputs.id;
                    const r = await ecrClient.send(new DescribeRepositoriesCommand({ repositoryNames: [repo] })).catch(ignoreNotFound);
                    if (r && r.repositories && r.repositories.length > 0) foundResiduals.push(repo);
                } else if (action.includes('task-definition') && (outputs.taskDefinitionArn || outputs.id)) {
                    const tdArn = outputs.taskDefinitionArn || outputs.id;
                    const r = await ecsClient.send(new DescribeTaskDefinitionCommand({ taskDefinition: tdArn })).catch(ignoreNotFound);
                    if (r && r.taskDefinition && r.taskDefinition.status !== 'INACTIVE') foundResiduals.push(tdArn);
                } else if ((action.includes('container-service') || action.includes('service:create')) && params.clusterName && params.serviceName) {
                    const r = await ecsClient.send(new DescribeServicesCommand({ cluster: params.clusterName, services: [params.serviceName] })).catch(ignoreNotFound);
                    if (r && r.services && r.services.length > 0 && r.services[0].status !== 'INACTIVE') foundResiduals.push(params.serviceName);
                } else {
                    console.warn(`[Residual Scanner] Unsupported resource type for node ${node.id} (${action})`);
                    classification = ResidualClassification.SCAN_INCOMPLETE;
                }
            } catch (err) {
                console.warn(`[Residual Scanner] Could not scan resource for node ${node.id} (${action}):`, err);
                classification = ResidualClassification.SCAN_INCOMPLETE;
            }
        }

        if (foundResiduals.length > 0) {
            classification = ResidualClassification.UGONDU_RESIDUAL_PRESENT;
            console.error(`\n[Residual Scanner] FAILED: Found ${foundResiduals.length} residual resources. This is a violation of zero-residual cleanup.`);
            foundResiduals.forEach(r => console.error(`  - ${r}`));
            process.exit(1);
        } else if (classification === ResidualClassification.SCAN_INCOMPLETE) {
            console.error(`\n[Residual Scanner] SCAN_INCOMPLETE: Ledger scan finished but some provider APIs failed.`);
            process.exit(1);
        } else {
            console.log(`\n[Residual Scanner] SUCCESS: ZERO_RESIDUAL resources verified.`);
            process.exit(0);
        }

    } catch (error) {
        console.error(`[Residual Scanner] Error during scan: ${error}`);
        process.exit(1);
    }
}

main();
