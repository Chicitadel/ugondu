import { URREngine } from '../urre/execution/urre-engine';
import { DagNode } from '../urre/transaction/transaction-dag';
import { UniversalActionRegistry } from './action-registry';
import { AwsNativeClient } from '../fabric/providers/aws-native-client';
import * as ec2Client from '@aws-sdk/client-ec2';
import * as rdsClient from '@aws-sdk/client-rds';
import * as s3Client from '@aws-sdk/client-s3';

export function createProductionActionRegistry(region: string): UniversalActionRegistry {
    const urre = new URREngine();
    const registry = new UniversalActionRegistry(urre);
    const aws = new AwsNativeClient(region);

    const ec2 = new ec2Client.EC2({ region });
    const rds = new rdsClient.RDS({ region });
    const s3 = new s3Client.S3({ region });

    // VPC
    urre.registerHandler('aws', 'CREATE_VPC', async (node: DagNode) => {
        const vpcId = await aws.createVpc(node.output!.cidrBlock || '10.0.0.0/16', 'ugondu-vpc');
        return { vpcId };
    }, async (node: DagNode) => {
        if (node.output?.vpcId) await aws.deleteVpc(node.output!.vpcId);
    });

    urre.registerHandler('aws', 'TERMINATE_VPC', async (node: DagNode) => {
        await aws.deleteVpc(node.output!.vpcId);
        return { success: true };
    }, async (node: DagNode) => {});

    // Subnet
    urre.registerHandler('aws', 'CREATE_SUBNET', async (node: DagNode) => {
        const sub = await aws.createSubnet(node.output!.vpcId, node.output!.cidrBlock, node.output!.az);
        return { subnetId: sub.id };
    }, async (node: DagNode) => {
        if (node.output?.subnetId) await ec2.deleteSubnet({ SubnetId: node.output!.subnetId });
    });

    urre.registerHandler('aws', 'TERMINATE_SUBNET', async (node: DagNode) => {
        await ec2.deleteSubnet({ SubnetId: node.output!.subnetId });
        return { success: true };
    }, async (node: DagNode) => {});

    // Security Group
    urre.registerHandler('aws', 'CREATE_SECURITY_GROUP', async (node: DagNode) => {
        const sgId = await aws.createSecurityGroup(node.output!.vpcId, node.output!.name || 'ugondu-sg');
        return { securityGroupId: sgId };
    }, async (node: DagNode) => {
        if (node.output?.securityGroupId) await aws.deleteSecurityGroup(node.output!.securityGroupId);
    });

    urre.registerHandler('aws', 'TERMINATE_SECURITY_GROUP', async (node: DagNode) => {
        await aws.deleteSecurityGroup(node.output!.securityGroupId);
        return { success: true };
    }, async (node: DagNode) => {});

    // EC2
    urre.registerHandler('aws', 'CREATE_EC2', async (node: DagNode) => {
        const type = await aws.resolveInstanceType(2, 4096);
        const res = await aws.runInstances(type, node.output!.ami, node.output!.subnetId);
        if (node.output!.securityGroupId) {
            await ec2.modifyInstanceAttribute({
                InstanceId: res.id,
                Groups: [node.output!.securityGroupId]
            });
        }
        return { instanceId: res.id };
    }, async (node: DagNode) => {
        if (node.output?.instanceId) {
            await aws.terminateInstances(node.output!.instanceId);
            const { waitUntilInstanceTerminated } = require('@aws-sdk/client-ec2');
            await waitUntilInstanceTerminated({ client: ec2, maxWaitTime: 300 }, { InstanceIds: [node.output!.instanceId] });
        }
    });

    urre.registerHandler('aws', 'TERMINATE_EC2', async (node: DagNode) => {
        await aws.terminateInstances(node.output!.instanceId);
        const { waitUntilInstanceTerminated } = require('@aws-sdk/client-ec2');
        await waitUntilInstanceTerminated({ client: ec2, maxWaitTime: 300 }, { InstanceIds: [node.output!.instanceId] });
        return { success: true };
    }, async (node: DagNode) => {});

    // EBS Snapshot
    urre.registerHandler('aws', 'CREATE_EBS_SNAPSHOT', async (node: DagNode) => {
        const volumes = await ec2.describeVolumes({
            Filters: [{ Name: 'attachment.instance-id', Values: [node.output!.instanceId] }]
        });
        const volId = volumes.Volumes?.[0]?.VolumeId;
        if (!volId) throw new Error("No volume found for EC2");
        const snapId = await aws.createSnapshot({ resourceType: 'EBS_VOLUME', resourceId: volId });
        
        const { waitUntilSnapshotCompleted } = require('@aws-sdk/client-ec2');
        await waitUntilSnapshotCompleted({ client: ec2, maxWaitTime: 300 }, { SnapshotIds: [snapId] });

        return { snapshotId: snapId };
    }, async (node: DagNode) => {
        if (node.output?.snapshotId) await ec2.deleteSnapshot({ SnapshotId: node.output!.snapshotId });
    });

    // RDS Subnet Group
    urre.registerHandler('aws', 'CREATE_RDS_SUBNET_GROUP', async (node: DagNode) => {
        const name = `ugondu-rds-subnet-group-${Date.now()}`;
        const sgn = await aws.createDBSubnetGroup(name, node.output!.subnetIds);
        return { dbSubnetGroupName: sgn };
    }, async (node: DagNode) => {
        if (node.output?.dbSubnetGroupName) await aws.deleteDBSubnetGroup(node.output!.dbSubnetGroupName);
    });

    // RDS
    urre.registerHandler('aws', 'CREATE_RDS', async (node: DagNode) => {
        const rdsId = `ugondu-rds-${Date.now()}`;
        const res = await aws.createRds(rdsId, 'postgres', 20, node.output!.securityGroupId, 'secret:dummy', node.output!.dbSubnetGroupName);
        
        const { waitUntilDBInstanceAvailable } = require('@aws-sdk/client-rds');
        await waitUntilDBInstanceAvailable({ client: rds, maxWaitTime: 900 }, { DBInstanceIdentifier: res.id });

        return { rdsId: res.id };
    }, async (node: DagNode) => {
        if (node.output?.rdsId) {
            await aws.deleteRds(node.output!.rdsId);
            const { waitUntilDBInstanceDeleted } = require('@aws-sdk/client-rds');
            await waitUntilDBInstanceDeleted({ client: rds, maxWaitTime: 900 }, { DBInstanceIdentifier: node.output!.rdsId });
        }
    });

    // RDS Snapshot
    urre.registerHandler('aws', 'CREATE_RDS_SNAPSHOT', async (node: DagNode) => {
        const snapId = await aws.createSnapshot({ resourceType: 'RDS_INSTANCE', resourceId: node.output!.rdsId });
        
        const { waitUntilDBSnapshotAvailable } = require('@aws-sdk/client-rds');
        await waitUntilDBSnapshotAvailable({ client: rds, maxWaitTime: 900 }, { DBSnapshotIdentifier: snapId });

        return { rdsSnapshotId: snapId };
    }, async (node: DagNode) => {
        if (node.output?.rdsSnapshotId) await rds.deleteDBSnapshot({ DBSnapshotIdentifier: node.output!.rdsSnapshotId });
    });

    // S3
    urre.registerHandler('aws', 'CREATE_S3_BUCKET', async (node: DagNode) => {
        const bucketName = `ugondu-bucket-${Date.now()}`.toLowerCase();
        await aws.createS3Bucket(bucketName, false);
        
        const { waitUntilBucketExists } = require('@aws-sdk/client-s3');
        await waitUntilBucketExists({ client: s3, maxWaitTime: 60 }, { Bucket: bucketName });

        return { bucketName };
    }, async (node: DagNode) => {
        if (node.output?.bucketName) await aws.deleteS3Bucket(node.output!.bucketName);
    });

    // S3 Object
    urre.registerHandler('aws', 'PUT_S3', async (node: DagNode) => {
        await s3.putObject({ Bucket: node.output!.bucketName, Key: node.output!.key, Body: 'test data' });
        
        const { waitUntilObjectExists } = require('@aws-sdk/client-s3');
        await waitUntilObjectExists({ client: s3, maxWaitTime: 60 }, { Bucket: node.output!.bucketName, Key: node.output!.key });

        return { success: true };
    }, async (node: DagNode) => {
        if (node.output?.bucketName && node.output?.key) {
            await s3.deleteObject({ Bucket: node.output!.bucketName, Key: node.output!.key });
        }
    });

    const actions = [
        { id: 'network:subnet:create', op: 'CREATE_SUBNET' },
        { id: 'network:subnet:terminate', op: 'TERMINATE_SUBNET' },
        { id: 'network:security-group:create', op: 'CREATE_SECURITY_GROUP' },
        { id: 'network:security-group:terminate', op: 'TERMINATE_SECURITY_GROUP' },
        { id: 'storage:ebs-snapshot:create', op: 'CREATE_EBS_SNAPSHOT' },
        { id: 'database:rds-subnet-group:create', op: 'CREATE_RDS_SUBNET_GROUP' },
        { id: 'database:rds-snapshot:create', op: 'CREATE_RDS_SNAPSHOT' },
        { id: 'storage:s3:create', op: 'CREATE_S3_BUCKET' }
    ];

    for (const a of actions) {
        registry.registerAction({
            id: a.id,
            domain: a.id.split(':')[0],
            operation: a.id.split(':')[2],
            providerAgnostic: true,
            description: a.id,
            inputSchema: {},
            outputSchema: {},
            risk: 'MEDIUM',
            requiredCapabilities: [],
            execute: async (p) => registry.dispatchToURRE(a.op, p)
        });
    }

    return registry;
}
