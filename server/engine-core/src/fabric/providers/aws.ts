/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - AWS Adapter
 * File           : aws.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import type { ProviderCapabilities } from '../contract/ProviderContract';
import type { ComputeCapability, ComputeConfig, ComputeResult, ComputeStatus, ProviderOptions, ResolvedValues } from '../capabilities/compute';
import type { NetworkCapability, NetworkConfig, NetworkResult, SubnetResult } from '../capabilities/network';
import type { DatabaseCapability, DatabaseConfig, DatabaseResult } from '../capabilities/database';
import type { StorageCapability, StorageConfig, StorageResult } from '../capabilities/storage';

export const AwsContract: ProviderCapabilities = {
  provider: 'aws',
  kinds: {
    COMPUTE: { status: 'NATIVE', modes: ['INSTANCE'] },
    NETWORK: { status: 'NATIVE', modes: ['VPC'] },
    DATABASE: { status: 'NATIVE', modes: ['RDS'] },
    STORAGE: { status: 'NATIVE', modes: ['S3'] },
  },
  databaseEngines: ['postgres', 'mysql'],
  storageClasses: ['OBJECT'],
  publicStorageClasses: ['OBJECT'],
  supportsDryRun: true,
  supportsRollback: true,
  supportsIdempotency: true,
  supportsImport: false,
  supportsUpdate: false,
  supportsDelete: true,
};

export interface IAwsClient {
  /** Deterministic instance selection engine. */
  resolveInstanceType(cpuCores: number, memoryMb: number): Promise<string>;
  runInstances(type: string, image: string, subnetId?: string): Promise<{ id: string; ip: string; state: 'running' | 'failed' }>;
  terminateInstances(id: string): Promise<void>;

  createVpc(cidr: string, name: string): Promise<string>;
  deleteVpc(id: string): Promise<void>;
  discoverAvailabilityZones(): Promise<string[]>;
  createSecurityGroup(vpcId: string, name: string): Promise<string>;
  deleteSecurityGroup(id: string): Promise<void>;
  createDBSubnetGroup(name: string, subnetIds: string[]): Promise<string>;
  deleteDBSubnetGroup(name: string): Promise<void>;


  createRds(name: string, engine: string, capacity: number, securityGroupId?: string, credentialsRef?: string, dbSubnetGroupName?: string): Promise<{ id: string; endpoint: string }>;
  deleteRds(id: string): Promise<void>;

  createS3Bucket(name: string, isPublic: boolean): Promise<{ id: string; endpoint: string }>;
  deleteS3Bucket(id: string): Promise<void>;
  getInstanceStatus(id: string): Promise<ComputeStatus>;
  createSubnet(vpcId: string, cidr: string, az?: string): Promise<SubnetResult>;
  createSnapshot(req: { resourceType: 'EBS_VOLUME' | 'RDS_INSTANCE' | 'EC2_INSTANCE', resourceId: string }): Promise<string>;
  // Fargate / ECS
  createFargateRoles(taskName: string): Promise<{ executionRoleArn: string, taskRoleArn: string }>;
  createEcsCluster(name: string): Promise<string>;
  registerTaskDefinition(name: string, imageUri: string, cpu: string, memory: string, executionRoleArn: string, taskRoleArn: string, logGroupName: string): Promise<string>;
  createEcsService(clusterName: string, serviceName: string, taskDefinitionArn: string, desiredCount: number, subnets: string[], securityGroups: string[], targetGroupArn?: string): Promise<string>;

  // ECR
  createEcrRepository(name: string): Promise<string>;

  // CloudWatch Logs
  createLogGroup(name: string): Promise<string>;
}

export class AwsAdapter implements ComputeCapability, NetworkCapability, DatabaseCapability, StorageCapability {
  constructor(private client: IAwsClient) {}

  public async resolveSizing(config: ComputeConfig, options: ProviderOptions): Promise<ResolvedValues> {
    const instanceType = await this.client.resolveInstanceType(config.cpuCores, config.memoryMb);
    return { instanceType };
  }

  public async provisionInstance(config: ComputeConfig, options: ProviderOptions): Promise<ComputeResult> {
    const instanceType = await this.client.resolveInstanceType(config.cpuCores, config.memoryMb);
    const instance = await this.client.runInstances(instanceType, config.osImage, config.networkRefId);
    return {
      id: instance.id,
      ipAddress: instance.ip,
      state: instance.state,
      resolved: { instanceType },
    };
  }

  public async terminateInstance(id: string): Promise<void> {
    await this.client.terminateInstances(id);
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    return await this.client.getInstanceStatus(id);
  }

  public async createVirtualNetwork(config: NetworkConfig, options: ProviderOptions): Promise<NetworkResult> {
    const vpcId = await this.client.createVpc(config.cidrBlock, config.name);
    return { id: vpcId, state: 'available', resolved: { cidrBlock: config.cidrBlock } };
  }

  public async deleteVirtualNetwork(id: string): Promise<void> {
    await this.client.deleteVpc(id);

  }

  public async createSubnet(networkId: string, cidr: string): Promise<SubnetResult> {
    const subnet = await this.client.createSubnet(networkId, cidr);
    return { id: subnet.id, cidr: cidr };
  }

  public async provisionDatabase(config: DatabaseConfig, options: ProviderOptions): Promise<DatabaseResult> {
    const dbSubnetGroupName = (options as any).dbSubnetGroupName;
    const rds = await this.client.createRds(config.name, config.engine, config.capacity, (options.networkRefId as string), config.credentialsRef, dbSubnetGroupName);
    return { id: rds.id, connectionString: rds.endpoint, resolved: { engine: config.engine } };
  }

  public async deprovisionDatabase(id: string): Promise<void> {
    await this.client.deleteRds(id);
  }

  public async createSnapshot(req: { resourceType: 'EBS_VOLUME' | 'RDS_INSTANCE' | 'EC2_INSTANCE', resourceId: string }): Promise<string> {
    return await this.client.createSnapshot(req);
  }

  public async provisionStorage(config: StorageConfig, options: ProviderOptions): Promise<StorageResult> {
    const isPublic = config.isPublic ?? false;
    const bucket = await this.client.createS3Bucket(config.name, isPublic);
    return { id: bucket.id, endpoint: bucket.endpoint, resolved: { storageClass: 'OBJECT', isPublic } };
  }

  public async deprovisionStorage(id: string): Promise<void> {
    await this.client.deleteS3Bucket(id);
  }
}
