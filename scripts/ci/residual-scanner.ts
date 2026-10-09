/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : CI
 * File           : residual-scanner.ts
 * Version        : 1.0.0
 * Author         : CI Residual Scanner Engineer
 * Organization   : Corporate
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
 * Classification : INTERNAL
 *
 * Governance:
 * - AI Governed
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
 * Copyright (c) 2026 Corporate
 * All Rights Reserved.
 ******************************************************************************/

import { TransactionStore } from '../../server/engine-core/src/urre/transaction/transaction-store';
import { EC2Client, DescribeVpcsCommand, DescribeSubnetsCommand, DescribeInstancesCommand, DescribeSecurityGroupsCommand, DescribeVolumesCommand, DescribeSnapshotsCommand } from "@aws-sdk/client-ec2";
import { RDSClient, DescribeDBInstancesCommand, DescribeDBSubnetGroupsCommand, DescribeDBSnapshotsCommand } from "@aws-sdk/client-rds";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { ECSClient, DescribeClustersCommand, DescribeServicesCommand, DescribeTaskDefinitionCommand } from "@aws-sdk/client-ecs";
import { ECRClient, DescribeRepositoriesCommand } from "@aws-sdk/client-ecr";

export enum ResidualClassification {
    ZERO_RESIDUAL = 'ZERO_RESIDUAL',
    FOREIGN_RESOURCES_PRESENT = 'FOREIGN_RESOURCES_PRESENT',
    UGONDU_RESIDUAL_PRESENT = 'UGONDU_RESIDUAL_PRESENT',
    UNKNOWN_RESOURCES_PRESENT = 'UNKNOWN_RESOURCES_PRESENT',
    SCAN_INCOMPLETE = 'SCAN_INCOMPLETE'
}

async function main() {
    const region = process.env.AWS_REGION;
    if (!region) throw new Error('Safety Violation: AWS_REGION must be explicitly provided.');
    
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
            // Check based on action
            const action = node.action.toLowerCase();
            const outputs = node.output || {};
            const params = node.params || {};
            
            try {
                if (action.includes('vpc') && (outputs.vpcId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeVpcsCommand({ VpcIds: [outputs.vpcId || outputs.id] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.Vpcs && r.Vpcs.length > 0) foundResiduals.push(outputs.vpcId || outputs.id);
                } else if (action.includes('subnet') && !action.includes('group') && (outputs.subnetId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeSubnetsCommand({ SubnetIds: [outputs.subnetId || outputs.id] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.Subnets && r.Subnets.length > 0) foundResiduals.push(outputs.subnetId || outputs.id);
                } else if (action.includes('security-group') && (outputs.groupId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeSecurityGroupsCommand({ GroupIds: [outputs.groupId || outputs.id] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.SecurityGroups && r.SecurityGroups.length > 0) foundResiduals.push(outputs.groupId || outputs.id);
                } else if (action.includes('instance:create') && (outputs.instanceId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeInstancesCommand({ InstanceIds: [outputs.instanceId || outputs.id] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.Reservations && r.Reservations.some(res => res.Instances?.some(i => i.State?.Name !== 'terminated'))) {
                        foundResiduals.push(outputs.instanceId || outputs.id);
                    }
                } else if (action.includes('ebs-snapshot') && (outputs.snapshotId || outputs.id)) {
                    const r = await ec2Client.send(new DescribeSnapshotsCommand({ SnapshotIds: [outputs.snapshotId || outputs.id] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.Snapshots && r.Snapshots.length > 0) foundResiduals.push(outputs.snapshotId || outputs.id);
                } else if (action.includes('rds-subnet-group') && params.dbSubnetGroupName) {
                    const r = await rdsClient.send(new DescribeDBSubnetGroupsCommand({ DBSubnetGroupName: params.dbSubnetGroupName })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.DBSubnetGroups && r.DBSubnetGroups.length > 0) foundResiduals.push(params.dbSubnetGroupName);
                } else if (action.includes('database:relational') && params.rdsId) {
                    const r = await rdsClient.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: params.rdsId })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.DBInstances && r.DBInstances.length > 0) foundResiduals.push(params.rdsId);
                } else if (action.includes('rds-snapshot') && params.rdsSnapshotId) {
                    const r = await rdsClient.send(new DescribeDBSnapshotsCommand({ DBSnapshotIdentifier: params.rdsSnapshotId })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.DBSnapshots && r.DBSnapshots.length > 0) foundResiduals.push(params.rdsSnapshotId);
                } else if (action.includes('storage:s3:create') && params.bucketName) {
                    const r = await s3Client.send(new HeadBucketCommand({ Bucket: params.bucketName })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r) foundResiduals.push(params.bucketName);
                } else if (action.includes('registry:create') && params.repositoryName) {
                    const r = await ecrClient.send(new DescribeRepositoriesCommand({ repositoryNames: [params.repositoryName] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.repositories && r.repositories.length > 0) foundResiduals.push(params.repositoryName);
                } else if (action.includes('task-definition:create') && (outputs.taskDefinitionArn || outputs.id)) {
                    const r = await ecsClient.send(new DescribeTaskDefinitionCommand({ taskDefinition: outputs.taskDefinitionArn || outputs.id })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.taskDefinition && r.taskDefinition.status !== 'INACTIVE') foundResiduals.push(outputs.taskDefinitionArn || outputs.id);
                } else if (action.includes('service:create') && params.clusterName && params.serviceName) {
                    const r = await ecsClient.send(new DescribeServicesCommand({ cluster: params.clusterName, services: [params.serviceName] })).catch(err => { if (err.name === 'NotFoundException' || err.name === 'ResourceNotFoundException' || err.message.includes('NotFound') || err.message.includes('does not exist')) { return null; } throw err; });
                    if (r && r.services && r.services.length > 0 && r.services[0].status !== 'INACTIVE') foundResiduals.push(params.serviceName);
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
