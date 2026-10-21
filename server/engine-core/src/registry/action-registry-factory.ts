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
      const vpcId = await aws.createVpc(node.output!.cidrBlock || '10.0.0.0/16', 'ugondu-vpc');
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
      const sub = await aws.createSubnet(node.output!.vpcId, node.output!.cidrBlock, node.output!.az);
      return { subnetId: sub.id };
    },
    async (node: DagNode) => {
      if (node.output?.subnetId) {
        await aws.deleteSubnet(node.output!.subnetId);
        recordCompensation(aws, node, 'DELETE_SUBNET', node.output!.subnetId);
      }
    }
  );

  urre.registerHandler(
    'aws',
    'TERMINATE_SUBNET',
    async (node: DagNode) => {
      await aws.deleteSubnet(node.output!.subnetId);
      return {
        success: true,
        subnetId: node.output!.subnetId,
        vpcId: node.output?.vpcId,
        cidrBlock: node.output?.cidrBlock,
        az: node.output?.az,
      };
    },
    async (node: DagNode) => {
      const vpcId = node.output?.vpcId || node.params?.vpcId || 'vpc-default';
      const cidrBlock = node.output?.cidrBlock || node.params?.cidrBlock || '10.0.1.0/24';
      const az = node.output?.az || node.params?.az;
      let restoredSubnetId: string | undefined;
      if (typeof aws.createSubnet === 'function') {
        const sub = await aws.createSubnet(vpcId, cidrBlock, az);
        restoredSubnetId = sub?.id;
      }
      recordCompensation(aws, node, 'RESTORE_SUBNET', restoredSubnetId ?? node.output?.subnetId);
    }
  );

  // Security Group
  urre.registerHandler(
    'aws',
    'CREATE_SECURITY_GROUP',
    async (node: DagNode) => {
      const sgId = await aws.createSecurityGroup(node.output!.vpcId, node.output!.name || 'ugondu-sg');
      return { securityGroupId: sgId };
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
      return {
        success: true,
        securityGroupId: node.output!.securityGroupId,
        vpcId: node.output?.vpcId,
        name: node.output?.name,
      };
    },
    async (node: DagNode) => {
      const vpcId = node.output?.vpcId || node.params?.vpcId || 'vpc-default';
      const sgName = node.output?.name || node.params?.name || 'ugondu-sg-restored';
      let restoredSgId: string | undefined;
      if (typeof aws.createSecurityGroup === 'function') {
        restoredSgId = await aws.createSecurityGroup(vpcId, sgName);
      }
      recordCompensation(aws, node, 'RESTORE_SECURITY_GROUP', restoredSgId ?? node.output?.securityGroupId);
    }
  );

  // EC2
  urre.registerHandler(
    'aws',
    'CREATE_EC2',
    async (node: DagNode) => {
      const type = await aws.resolveInstanceType(2, 4096);
      const res = await aws.runInstances(type, node.output!.ami, node.output!.subnetId);
      if (node.output!.securityGroupId) {
        await aws.modifyInstanceSecurityGroups(res.id, [node.output!.securityGroupId]);
      }
      return { instanceId: res.id };
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
      return {
        success: true,
        instanceId: node.output!.instanceId,
        ami: node.output?.ami,
        subnetId: node.output?.subnetId,
      };
    },
    async (node: DagNode) => {
      let restoredInstanceId: string | undefined;
      if (typeof aws.runInstances === 'function') {
        const instanceType =
          typeof aws.resolveInstanceType === 'function' ? await aws.resolveInstanceType(2, 4096) : 't3.micro';
        const ami = node.output?.ami || node.params?.ami || 'ami-restored';
        const subnetId = node.output?.subnetId || node.params?.subnetId;
        const restored = await aws.runInstances(instanceType, ami, subnetId);
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
      const volumes = await aws.describeInstanceVolumes(node.output!.instanceId);
      const volId = volumes?.[0];
      if (!volId) throw new Error(__t('no_volume_found_for_ec2'));
      const snapId = await aws.createSnapshot({ resourceType: 'EBS_VOLUME', resourceId: volId });
      return { snapshotId: snapId };
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
      const name = node.output?.dbSubnetGroupName || `ugondu-rds-subnet-group-${Date.now()}`;
      const sgn = await aws.createDBSubnetGroup(name, node.output!.subnetIds);
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
  urre.registerHandler(
    'aws',
    'CREATE_RDS',
    async (node: DagNode) => {
      const credentialRef = process.env.UGONDU_CERT_RDS_CREDENTIAL_REF;
      if (!credentialRef) throw new Error('UGONDU_CERT_RDS_CREDENTIAL_REF is required');

      const rdsId = node.output?.rdsId || `ugondu-rds-${Date.now()}`;
      const res = await aws.createRds(
        rdsId,
        'postgres',
        20,
        node.output!.securityGroupId,
        credentialRef,
        node.output!.dbSubnetGroupName
      );

      return { rdsId: res.id };
    },
    async (node: DagNode) => {
      if (node.output?.rdsId) {
        await aws.deleteRds(node.output!.rdsId);
        recordCompensation(aws, node, 'DELETE_RDS', node.output!.rdsId);
      }
    }
  );

  // RDS Snapshot
  urre.registerHandler(
    'aws',
    'CREATE_RDS_SNAPSHOT',
    async (node: DagNode) => {
      const snapId = await aws.createSnapshot({ resourceType: 'RDS_INSTANCE', resourceId: node.output!.rdsId });
      return { rdsSnapshotId: node.output?.rdsSnapshotId || snapId };
    },
    async (node: DagNode) => {
      if (node.output?.rdsSnapshotId) {
        await aws.deleteRdsSnapshot(node.output!.rdsSnapshotId);
        recordCompensation(aws, node, 'DELETE_RDS_SNAPSHOT', node.output!.rdsSnapshotId);
      }
    }
  );

  // S3
  urre.registerHandler(
    'aws',
    'CREATE_S3_BUCKET',
    async (node: DagNode) => {
      const bucketName = node.output?.bucketName || `ugondu-bucket-${Date.now()}`.toLowerCase();
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
      if (node.output?.bucketName && node.output?.key) {
        await aws.deleteS3Object({ Bucket: node.output!.bucketName, Key: node.output!.key });
        recordCompensation(aws, node, 'DELETE_S3_OBJECT', `${node.output!.bucketName}/${node.output!.key}`);
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
      const res = await aws.deployFargate(node.output!);
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
      const res = await aws.createContainerRegistry(node.output!.name);
      return { registryId: res.id };
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
      const res = await aws.buildContainerImage(node.output!.dockerfile, node.output!.tag);
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
      const res = await aws.pushContainerImage(node.output!.imageId, node.output!.registryId);
      return { pushedImageId: res.id, imageId: node.output!.imageId, registryId: node.output!.registryId };
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
      const res = await aws.createTaskDefinition(node.output!.family, node.output!.image);
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
      const res = await aws.createContainerService(
        node.output!.cluster,
        node.output!.serviceName,
        node.output!.taskDefinitionArn
      );
      return { serviceArn: res.id };
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
