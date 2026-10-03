/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - Linux Adapter
 * File           : linux.ts
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
import type { StorageCapability, StorageConfig, StorageResult } from '../capabilities/storage';

export const LinuxContract: ProviderCapabilities = {
  provider: 'linux',
  kinds: {
    COMPUTE: { status: 'NATIVE', modes: ['SYSTEMD', 'CONTAINER'] },
    NETWORK: { 
      status: 'CONDITIONAL', 
      modes: ['EXISTING', 'NETWORKMANAGER', 'SYSTEMD_NETWORKD', 'NETPLAN'] 
    },
    DATABASE: { 
      status: 'UNSUPPORTED', 
      modes: [],
      reasonKey: 'fabric.contract.reason.linux_database'
    },
    STORAGE: { status: 'NATIVE', modes: ['DIRECTORY'] },
  },
  databaseEngines: [],
  storageClasses: ['FILE'],
  publicStorageClasses: [],
  supportsDryRun: true,
  supportsRollback: true,
  supportsIdempotency: true,
  supportsImport: false,
  supportsUpdate: false,
  supportsDelete: true,
};

export interface ILinuxClient {
  /** Allocatable capacity precheck engine. */
  checkCapacity(cpuCores: number, memoryMb: number): Promise<boolean>;
  runProcess(name: string, image: string, mode: string): Promise<{ id: string; state: 'running' | 'failed' }>;
  stopProcess(id: string): Promise<void>;
  
  configureNetwork(name: string, cidr: string, mode: string): Promise<{ id: string }>;
  removeNetwork(id: string): Promise<void>;
  
  createDirectory(name: string): Promise<{ id: string; endpoint: string }>;
  removeDirectory(id: string): Promise<void>;
}

export class LinuxAdapter implements ComputeCapability, NetworkCapability, StorageCapability {
  constructor(private client: ILinuxClient) {}

  public async provisionInstance(config: ComputeConfig, options: ProviderOptions): Promise<ComputeResult> {
    const hasCapacity = await this.client.checkCapacity(config.cpuCores, config.memoryMb);
    if (!hasCapacity) {
      throw new Error(`Insufficient capacity for ${config.cpuCores} CPU and ${config.memoryMb} MB`);
    }
    const mode = options.mode ?? 'SYSTEMD';
    const instance = await this.client.runProcess(config.instanceName, config.osImage, mode);
    return {
      id: instance.id,
      state: instance.state,
      resolved: { mode, cpuAllocated: config.cpuCores, memoryAllocated: config.memoryMb },
    };
  }

  public async terminateInstance(id: string): Promise<void> {
    await this.client.stopProcess(id);
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    return { id, state: 'running', health: 'healthy' };
  }

  public async createVirtualNetwork(config: NetworkConfig, options: ProviderOptions): Promise<NetworkResult> {
    const mode = options.mode ?? 'EXISTING';
    const net = await this.client.configureNetwork(config.name, config.cidrBlock, mode);
    return { id: net.id, state: 'available', resolved: { cidrBlock: config.cidrBlock, mode } };
  }

  public async deleteVirtualNetwork(id: string): Promise<void> {
    await this.client.removeNetwork(id);
  }

  public async createSubnet(networkId: string, cidr: string): Promise<SubnetResult> {
    throw new Error('Not implemented');
  }

  public async provisionStorage(config: StorageConfig, options: ProviderOptions): Promise<StorageResult> {
    const dir = await this.client.createDirectory(config.name);
    return { id: dir.id, endpoint: dir.endpoint, resolved: { storageClass: 'FILE', mode: 'DIRECTORY' } };
  }

  public async deprovisionStorage(id: string): Promise<void> {
    await this.client.removeDirectory(id);
  }
}
