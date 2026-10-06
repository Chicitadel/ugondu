import { URREngine } from '../urre/execution/urre-engine';
import { DagNode } from '../urre/transaction/transaction-dag';
import { UniversalActionRegistry } from './action-registry';
import { AwsNativeClient } from '../fabric/providers/aws-native-client';

export function createProductionActionRegistry(region: string): UniversalActionRegistry {
    const urre = new URREngine();
    const registry = new UniversalActionRegistry(urre);
    const aws = new AwsNativeClient(region);

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
        if (node.output?.subnetId) await aws.deleteSubnet(node.output!.subnetId);
    });

    urre.registerHandler('aws', 'TERMINATE_SUBNET', async (node: DagNode) => {
        await aws.deleteSubnet(node.output!.subnetId);
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
            await aws.modifyInstanceSecurityGroups(res.id, [node.output!.securityGroupId]);
        }
        return { instanceId: res.id };
    }, async (node: DagNode) => {
        if (node.output?.instanceId) {
            await aws.terminateInstances(node.output!.instanceId);
        }
    });

    urre.registerHandler('aws', 'TERMINATE_EC2', async (node: DagNode) => {
        await aws.terminateInstances(node.output!.instanceId);
        return { success: true };
    }, async (node: DagNode) => {});

    // EBS Snapshot
    urre.registerHandler('aws', 'CREATE_EBS_SNAPSHOT', async (node: DagNode) => {
        const volumes = await aws.describeInstanceVolumes(node.output!.instanceId);
        const volId = volumes?.[0];
        if (!volId) throw new Error(__t('no_volume_found_for_ec2'));
        const snapId = await aws.createSnapshot({ resourceType: 'EBS_VOLUME', resourceId: volId });
        return { snapshotId: snapId };
    }, async (node: DagNode) => {
        if (node.output?.snapshotId) await aws.deleteEbsSnapshot(node.output!.snapshotId);
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
        const credentialRef = process.env.UGONDU_CERT_RDS_CREDENTIAL_REF;
        if (!credentialRef) throw new Error('UGONDU_CERT_RDS_CREDENTIAL_REF is required');

        const rdsId = `ugondu-rds-${Date.now()}`;
        const res = await aws.createRds(rdsId, 'postgres', 20, node.output!.securityGroupId, credentialRef, node.output!.dbSubnetGroupName);
        
        return { rdsId: res.id };
    }, async (node: DagNode) => {
        if (node.output?.rdsId) {
            await aws.deleteRds(node.output!.rdsId);
        }
    });

    // RDS Snapshot
    urre.registerHandler('aws', 'CREATE_RDS_SNAPSHOT', async (node: DagNode) => {
        const snapId = await aws.createSnapshot({ resourceType: 'RDS_INSTANCE', resourceId: node.output!.rdsId });
        return { rdsSnapshotId: snapId };
    }, async (node: DagNode) => {
        if (node.output?.rdsSnapshotId) await aws.deleteRdsSnapshot(node.output!.rdsSnapshotId);
    });

    // S3
    urre.registerHandler('aws', 'CREATE_S3_BUCKET', async (node: DagNode) => {
        const bucketName = `ugondu-bucket-${Date.now()}`.toLowerCase();
        await aws.createS3Bucket(bucketName, false);
        return { bucketName };
    }, async (node: DagNode) => {
        if (node.output?.bucketName) await aws.deleteS3Bucket(node.output!.bucketName);
    });

    // S3 Object
    urre.registerHandler('aws', 'PUT_S3', async (node: DagNode) => {
        await aws.putS3Object({ Bucket: node.output!.bucketName, Key: node.output!.key, Body: __t('test_data') });
        return { success: true };
    }, async (node: DagNode) => {
        if (node.output?.bucketName && node.output?.key) {
            await aws.deleteS3Object({ Bucket: node.output!.bucketName, Key: node.output!.key });
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
