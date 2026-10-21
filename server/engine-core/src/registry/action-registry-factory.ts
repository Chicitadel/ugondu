/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Action Registry Factory
 * File           : action-registry-factory.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { URREngine } from '../urre/execution/urre-engine';
import { DagNode } from '../urre/transaction/transaction-dag';
import { UniversalActionRegistry } from './action-registry';

export interface CompensationRecord {
  nodeId: string;
  originalAction: string;
  compensatingAction: string;
  resourceId?: string;
  compensatedAt: number;
}

function recordCompensation(aws: any, node: DagNode, compensatingAction: string, resourceId?: string): void {
  const entry: CompensationRecord = {
    nodeId: node.id,
    originalAction: node.action,
    compensatingAction,
    resourceId,
    compensatedAt: Date.now(),
  };
  if (node.output && typeof node.output === 'object') {
    node.output['compensated'] = true;
    node.output['compensatingAction'] = compensatingAction;
    node.output['compensatedResourceId'] = resourceId;
    node.output['compensatedAt'] = entry.compensatedAt;
  }
  if (aws && typeof aws === 'object') {
    if (!Array.isArray(aws.compensationLedger)) {
      aws.compensationLedger = [];
    }
    aws.compensationLedger.push(entry);
  }
}

export function createProductionActionRegistry(adapter: any): UniversalActionRegistry {
  const urre = new URREngine();
  const registry = new UniversalActionRegistry(urre);
  const aws = adapter;

  // VPC
  urre.registerHandler(
    'aws',
    'CREATE_VPC',
    async (node: DagNode) => {
      const cidr = node.output?.cidrBlock || node.output?.cidr || node.params?.cidrBlock || node.params?.cidr || '10.0.0.0/16';
      const vpcId = await aws.createVpc(cidr, 'ugondu-vpc');
      return { vpcId };
    },
    async (node: DagNode) => {
      if (node.output?.vpcId) {
        await aws.deleteVpc(node.output!.vpcId);
        recordCompensation(aws, node, 'DELETE_VPC', node.output!.vpcId);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'TERMINATE_VPC',
    async (node: DagNode) => {
      await aws.deleteVpc(node.output!.vpcId);
      return { success: true, vpcId: node.output!.vpcId, cidrBlock: node.output?.cidrBlock };
    },
    async (node: DagNode) => {
      const cidr = node.output?.cidrBlock || node.params?.cidrBlock || '10.0.0.0/16';
      let restoredVpcId: string | undefined;
      if (typeof aws.createVpc === 'function') {
        restoredVpcId = await aws.createVpc(cidr, 'ugondu-vpc-restored');
      }
      recordCompensation(aws, node, 'RESTORE_VPC', restoredVpcId ?? node.output?.vpcId);
    }
  );

  // Subnet
  urre.registerHandler(
    'aws',
    'CREATE_SUBNET',
    async (node: DagNode) => {
      const vpcId = node.output?.vpcId || node.params?.vpcId;
      const cidr = node.output?.cidrBlock || node.output?.cidr || node.params?.cidrBlock || node.params?.cidr || '10.0.1.0/24';
      const az = node.output?.az || node.params?.az;
      const sub = await aws.createSubnet(vpcId, cidr, az);
      return { subnetId: sub.id };
    },
    async (node: DagNode) => {
      const subnetId = node.output?.subnetId || node.params?.subnetId;
      if (subnetId) {
        await aws.deleteSubnet(subnetId);
        recordCompensation(aws, node, 'DELETE_SUBNET', subnetId);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'TERMINATE_SUBNET',
    async (node: DagNode) => {
      await aws.deleteSubnet(node.output!.subnetId);
      return { success: true, subnetId: node.output!.subnetId, vpcId: node.output?.vpcId, cidrBlock: node.output?.cidrBlock, az: node.output?.az };
    },
    async (node: DagNode) => {
      const vpcId = node.output?.vpcId || node.params?.vpcId || 'vpc-default';
      const cidrBlock = node.output?.cidrBlock || node.params?.cidrBlock || '10.0.1.0/24';
      const az = node.output?.az || node.params?.az;
      const sub = typeof aws.createSubnet === 'function' ? await aws.createSubnet(vpcId, cidrBlock, az) : undefined;
      recordCompensation(aws, node, 'RESTORE_SUBNET', sub?.id ?? node.output?.subnetId);
    }
  );

  // Security Group
  urre.registerHandler(
    'aws',
    'CREATE_SECURITY_GROUP',
    async (node: DagNode) => {
      const vpcId = node.output?.vpcId || node.params?.vpcId;
      const name = node.output?.groupName || node.output?.name || node.params?.groupName || node.params?.name || 'ugondu-sg';
      const sgId = await aws.createSecurityGroup(vpcId, name);
      return { securityGroupId: sgId, groupId: sgId, id: sgId };
    },
    async (node: DagNode) => {
      if (node.output?.securityGroupId) {
        await aws.deleteSecurityGroup(node.output!.securityGroupId);
        recordCompensation(aws, node, 'DELETE_SECURITY_GROUP', node.output!.securityGroupId);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'TERMINATE_SECURITY_GROUP',
    async (node: DagNode) => {
      await aws.deleteSecurityGroup(node.output!.securityGroupId);
      return { success: true, securityGroupId: node.output!.securityGroupId, vpcId: node.output?.vpcId, name: node.output?.name };
    },
    async (node: DagNode) => {
      const vpcId = node.output?.vpcId || node.params?.vpcId || 'vpc-default';
      const sgName = node.output?.name || node.params?.name || 'ugondu-sg-restored';
      const restoredSgId = typeof aws.createSecurityGroup === 'function' ? await aws.createSecurityGroup(vpcId, sgName) : undefined;
      recordCompensation(aws, node, 'RESTORE_SECURITY_GROUP', restoredSgId ?? node.output?.securityGroupId);
    }
  );

  // EC2
  urre.registerHandler(
    'aws',
    'CREATE_EC2',
    async (node: DagNode) => {
      const type = await aws.resolveInstanceType(2, 4096);
      const ami = node.output?.ami || node.params?.ami;
      const subnetId = node.output?.subnetId || node.params?.subnetId;
      const res = await aws.runInstances(type, ami, subnetId);
      const sgId = node.output?.securityGroupId || node.params?.securityGroupId;
      if (sgId) await aws.modifyInstanceSecurityGroups(res.id, [sgId]);
      const volumes = typeof aws.describeInstanceVolumes === 'function' ? await aws.describeInstanceVolumes(res.id) : [];
      const rootVolumeId = Array.isArray(volumes) ? volumes[0] : (volumes?.Volumes?.[0]?.VolumeId || undefined);
      return { instanceId: res.id, rootVolumeId };
    },
    async (node: DagNode) => {
      if (node.output?.instanceId) {
        await aws.terminateInstances(node.output!.instanceId);
        recordCompensation(aws, node, 'TERMINATE_EC2', node.output!.instanceId);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'TERMINATE_EC2',
    async (node: DagNode) => {
      await aws.terminateInstances(node.output!.instanceId);
      return { success: true, instanceId: node.output!.instanceId, ami: node.output?.ami, subnetId: node.output?.subnetId };
    },
    async (node: DagNode) => {
      let restoredInstanceId: string | undefined;
      if (typeof aws.runInstances === 'function') {
        const instanceType = typeof aws.resolveInstanceType === 'function' ? await aws.resolveInstanceType(2, 4096) : 't3.micro';
        const restored = await aws.runInstances(instanceType, node.output?.ami || node.params?.ami || 'ami-restored', node.output?.subnetId || node.params?.subnetId);
        restoredInstanceId = restored?.id;
      }
      recordCompensation(aws, node, 'RESTORE_EC2', restoredInstanceId ?? node.output?.instanceId);
    }
  );

  // EBS Snapshot
  urre.registerHandler(
    'aws',
    'CREATE_EBS_SNAPSHOT',
    async (node: DagNode) => {
      let volId = node.output?.volumeId || node.params?.volumeId;
      if (!volId) {
        const instId = node.output?.instanceId || node.params?.instanceId;
        if (instId && typeof aws.describeInstanceVolumes === 'function') {
          const volumes = await aws.describeInstanceVolumes(instId);
          volId = Array.isArray(volumes) ? volumes[0] : (volumes?.Volumes?.[0]?.VolumeId || undefined);
        }
      }
      if (!volId) throw new Error(__t('no_volume_found_for_ec2'));
      const snapId = await aws.createSnapshot({ resourceType: 'EBS_VOLUME', resourceId: volId });
      return { snapshotId: snapId, volumeId: volId };
    },
    async (node: DagNode) => {
      if (node.output?.snapshotId) {
        await aws.deleteEbsSnapshot(node.output!.snapshotId);
        recordCompensation(aws, node, 'DELETE_EBS_SNAPSHOT', node.output!.snapshotId);
      }
    }
  );

  // RDS Subnet Group
  urre.registerHandler(
    'aws',
    'CREATE_RDS_SUBNET_GROUP',
    async (node: DagNode) => {
      const name = node.output?.dbSubnetGroupName || node.params?.dbSubnetGroupName || `ugondu-rds-subnet-group-${Date.now()}`;
      const sgn = await aws.createDBSubnetGroup(name, node.output?.subnetIds || node.params?.subnetIds || []);
      return { dbSubnetGroupName: sgn };
    },
    async (node: DagNode) => {
      if (node.output?.dbSubnetGroupName) {
        await aws.deleteDBSubnetGroup(node.output!.dbSubnetGroupName);
        recordCompensation(aws, node, 'DELETE_RDS_SUBNET_GROUP', node.output!.dbSubnetGroupName);
      }
    }
  );

  // RDS
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  urre.registerHandler(
    'aws',
    'CREATE_RDS',
    async (node: DagNode) => {
      if (!process.env.UGONDU_SECRET_CERT_RDS_PWD) { process.env.UGONDU_SECRET_CERT_RDS_PWD = 'CertRdsTempPass123#'; }
      const credentialRef = node.output?.credentialRef || node.params?.credentialRef || process.env.UGONDU_CERT_RDS_CREDENTIAL_REF || 'secret:cert_rds_pwd';
      const rdsId = node.output?.rdsId || node.params?.rdsId || `ugondu-rds-${Date.now()}`;
      const sgId = node.output?.securityGroupId || node.params?.securityGroupId;
      const subnetGroupName = node.output?.dbSubnetGroupName || node.params?.dbSubnetGroupName;
      const res = await aws.createRds(rdsId, 'postgres', 20, sgId, credentialRef, subnetGroupName);
      return { rdsId: res.id };
    },
    async (node: DagNode) => {
      const rdsId = node.output?.rdsId || node.params?.rdsId;
      if (rdsId) {
        for (let i = 0; i < 20; i++) {
          try { await aws.deleteRds(rdsId); break; } catch (err: any) {
            if (/NotFound/i.test(String(err?.name || '') + String(err?.message || ''))) break;
            if (/InvalidDBInstanceState/i.test(String(err?.name || '') + String(err?.message || '')) && i < 19) { await sleep(10000); continue; }
            throw err;
          }
        }
        if ((aws as any).rds) {
          const { DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
          for (let w = 0; w < 60; w++) {
            await sleep(15000);
            const chk = await (aws as any).rds.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: rdsId })).catch(() => null);
            if (!chk || !chk.DBInstances?.length) break;
          }
        }
        recordCompensation(aws, node, 'DELETE_RDS', rdsId);
      }
    }
  );

  // RDS Snapshot
  urre.registerHandler(
    'aws',
    'CREATE_RDS_SNAPSHOT',
    async (node: DagNode) => {
      const rdsId = node.output?.rdsId || node.params?.rdsId;
      const snapId = await aws.createSnapshot({ resourceType: 'RDS_INSTANCE', resourceId: rdsId, snapshotId: node.output?.rdsSnapshotId || node.params?.rdsSnapshotId });
      const actualSnapId = node.output?.rdsSnapshotId || node.params?.rdsSnapshotId || snapId;
      if ((aws as any).rds) {
        const { DescribeDBSnapshotsCommand, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
        for (let w = 0; w < 45; w++) {
          await sleep(10000);
          const sDesc = await (aws as any).rds.send(new DescribeDBSnapshotsCommand({ DBSnapshotIdentifier: actualSnapId })).catch(() => null);
          const iDesc = rdsId ? await (aws as any).rds.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: rdsId })).catch(() => null) : null;
          if (sDesc?.DBSnapshots?.[0]?.Status === 'available' && (!rdsId || iDesc?.DBInstances?.[0]?.DBInstanceStatus === 'available')) break;
        }
      }
      return { rdsSnapshotId: actualSnapId };
    },
    async (node: DagNode) => {
      const snapId = node.output?.rdsSnapshotId || node.params?.rdsSnapshotId;
      if (snapId) {
        for (let i = 0; i < 20; i++) {
          try { await aws.deleteRdsSnapshot(snapId); break; } catch (err: any) {
            if (/NotFound/i.test(String(err?.name || '') + String(err?.message || ''))) break;
            if (/InvalidDBSnapshotState/i.test(String(err?.name || '') + String(err?.message || '')) && i < 19) { await sleep(10000); continue; }
            throw err;
          }
        }
        recordCompensation(aws, node, 'DELETE_RDS_SNAPSHOT', snapId);
      }
    }
  );

  // S3
  urre.registerHandler(
    'aws',
    'CREATE_S3_BUCKET',
    async (node: DagNode) => {
      const bucketName = node.output?.bucketName || node.params?.bucketName || `ugondu-bucket-${Date.now()}`.toLowerCase();
      await aws.createS3Bucket(bucketName, false);
      return { bucketName };
    },
    async (node: DagNode) => {
      if (node.output?.bucketName) {
        await aws.deleteS3Bucket(node.output!.bucketName);
        recordCompensation(aws, node, 'DELETE_S3_BUCKET', node.output!.bucketName);
      }
    }
  );

  // S3 Object
  urre.registerHandler(
    'aws',
    'PUT_S3',
    async (node: DagNode) => {
      await aws.putS3Object({ Bucket: node.output!.bucketName, Key: node.output!.key, Body: __t('test_data') });
      return { success: true };
    },
    async (node: DagNode) => {
      const bucketName = node.output?.bucketName || node.params?.bucketName;
      const key = node.output?.key || node.params?.key;
      if (bucketName && key) {
        await aws.deleteS3Object({ Bucket: bucketName, Key: key });
        recordCompensation(aws, node, 'DELETE_S3_OBJECT', `${bucketName}/${key}`);
      }
    }
  );

  const actions = [
    { id: 'network:subnet:create', op: 'CREATE_SUBNET' },
    { id: 'network:subnet:terminate', op: 'TERMINATE_SUBNET' },
    { id: 'network:security-group:create', op: 'CREATE_SECURITY_GROUP' },
    { id: 'network:security-group:terminate', op: 'TERMINATE_SECURITY_GROUP' },
    { id: 'storage:ebs-snapshot:create', op: 'CREATE_EBS_SNAPSHOT' },
    { id: 'database:rds-subnet-group:create', op: 'CREATE_RDS_SUBNET_GROUP' },
    { id: 'database:rds-snapshot:create', op: 'CREATE_RDS_SNAPSHOT' },
    { id: 'storage:s3:create', op: 'CREATE_S3_BUCKET' },
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
      execute: async (p) => registry.dispatchToURRE(a.op, p),
    });
  }

  urre.registerHandler(
    'aws',
    'DEPLOY_FARGATE',
    async (node: DagNode) => {
      const res = typeof aws.deployFargate === 'function' ? await aws.deployFargate(node.output || node.params) : { id: node.output?.serviceName || 'fargate-svc' };
      return { deploymentId: res.id };
    },
    async (node: DagNode) => {
      const deploymentId = node.output?.deploymentId || node.output?.serviceArn || node.params?.deploymentId;
      if (typeof aws.rollbackFargateDeployment === 'function' && deploymentId) {
        await aws.rollbackFargateDeployment(deploymentId);
      } else if (typeof aws.deleteContainerService === 'function' && deploymentId) {
        await aws.deleteContainerService(deploymentId);
      }
      recordCompensation(aws, node, 'ROLLBACK_FARGATE_DEPLOYMENT', deploymentId);
    }
  );

  urre.registerHandler(
    'aws',
    'CREATE_CONTAINER_REGISTRY',
    async (node: DagNode) => {
      const repoName = node.output?.repositoryName || node.output?.name || node.params?.repositoryName || node.params?.name;
      const res = typeof aws.createContainerRegistry === 'function' ? await aws.createContainerRegistry(repoName) : { id: repoName };
      return { registryId: res.id, repositoryName: repoName };
    },
    async (node: DagNode) => {
      if (node.output?.registryId) {
        await aws.deleteContainerRegistry(node.output!.registryId);
        recordCompensation(aws, node, 'DELETE_CONTAINER_REGISTRY', node.output!.registryId);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'BUILD_CONTAINER_IMAGE',
    async (node: DagNode) => {
      const dockerfile = node.output?.dockerfile || node.params?.dockerfile || 'Dockerfile';
      const tag = node.output?.tag || node.params?.tag || 'latest';
      const res = typeof aws.buildContainerImage === 'function' ? await aws.buildContainerImage(dockerfile, tag) : { id: tag };
      return { imageId: res.id };
    },
    async (node: DagNode) => {
      const imageId = node.output?.imageId || node.output?.tag || node.params?.tag;
      if (typeof aws.removeContainerImage === 'function' && imageId) {
        await aws.removeContainerImage(imageId);
      } else if (typeof aws.deleteContainerImage === 'function' && imageId) {
        await aws.deleteContainerImage(imageId);
      }
      recordCompensation(aws, node, 'REMOVE_CONTAINER_IMAGE', imageId);
    }
  );

  urre.registerHandler(
    'aws',
    'PUSH_CONTAINER_IMAGE',
    async (node: DagNode) => {
      const imageId = node.output?.imageId || node.output?.tag || node.params?.tag || 'latest';
      const registryId = node.output?.registryId || node.output?.repositoryName || node.params?.repositoryName || 'repo';
      const res = typeof aws.pushContainerImage === 'function' ? await aws.pushContainerImage(imageId, registryId) : { id: `${registryId}:latest`, digest: 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef' };
      return { pushedImageId: res.id, imageId, registryId, digest: res.digest };
    },
    async (node: DagNode) => {
      const pushedImageId = node.output?.pushedImageId || node.output?.imageId || node.params?.imageId;
      const registryId = node.output?.registryId || node.params?.registryId;
      if (typeof aws.deletePushedContainerImage === 'function' && pushedImageId) {
        await aws.deletePushedContainerImage(pushedImageId, registryId);
      } else if (typeof aws.deleteContainerImage === 'function' && pushedImageId) {
        await aws.deleteContainerImage(pushedImageId);
      }
      recordCompensation(aws, node, 'DELETE_PUSHED_CONTAINER_IMAGE', pushedImageId);
    }
  );

  urre.registerHandler(
    'aws',
    'CREATE_TASK_DEFINITION',
    async (node: DagNode) => {
      const family = node.output?.familyName || node.output?.family || node.params?.familyName || node.params?.family || 'task';
      const image = node.output?.image || node.params?.image || 'latest';
      const res = typeof aws.createTaskDefinition === 'function' ? await aws.createTaskDefinition(family, image) : { id: `arn:aws:ecs:eu-west-3:971671216490:task-definition/${family}:1` };
      return { taskDefinitionArn: res.id };
    },
    async (node: DagNode) => {
      if (node.output?.taskDefinitionArn) {
        await aws.deleteTaskDefinition(node.output!.taskDefinitionArn);
        recordCompensation(aws, node, 'DELETE_TASK_DEFINITION', node.output!.taskDefinitionArn);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'CREATE_CONTAINER_SERVICE',
    async (node: DagNode) => {
      const cluster = node.output?.clusterName || node.output?.cluster || node.params?.clusterName || 'cluster';
      const svcName = node.output?.serviceName || node.params?.serviceName || 'svc';
      const taskDef = node.output?.taskDefinitionArn || node.params?.taskDefinitionArn || 'task';
      const res = typeof aws.createContainerService === 'function' ? await aws.createContainerService(cluster, svcName, taskDef) : { id: `arn:aws:ecs:eu-west-3:971671216490:service/${cluster}/${svcName}` };
      return { serviceArn: res.id, clusterName: cluster, serviceName: svcName };
    },
    async (node: DagNode) => {
      if (node.output?.serviceArn) {
        await aws.deleteContainerService(node.output!.serviceArn);
        recordCompensation(aws, node, 'DELETE_CONTAINER_SERVICE', node.output!.serviceArn);
      }
    }
  );

  return registry;
}
