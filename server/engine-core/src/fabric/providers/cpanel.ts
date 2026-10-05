/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - cPanel Adapter
 * File           : cpanel.ts
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
import type { DatabaseCapability, DatabaseConfig, DatabaseResult } from '../capabilities/database';
import type { StorageCapability, StorageConfig, StorageResult } from '../capabilities/storage';

export const CpanelContract: ProviderCapabilities = {
  provider: 'cpanel',
  kinds: {
    COMPUTE: { status: 'CONDITIONAL', modes: ['HOSTED_APP'] },
    NETWORK: { 
      status: 'UNSUPPORTED', 
      modes: [],
      reasonKey: 'fabric.contract.reason.cpanel_network'
    },
    DATABASE: { status: 'CONDITIONAL', modes: ['MYSQL'] },
    STORAGE: { status: 'CONDITIONAL', modes: ['ACCOUNT_FILESYSTEM'] },
  },
  databaseEngines: ['mysql'],
  storageClasses: ['FILE'],
  publicStorageClasses: [],
  supportsDryRun: true,
  supportsRollback: true,
  supportsIdempotency: true,
  supportsImport: false,
  supportsUpdate: false,
  supportsDelete: true,
};

export interface IWhmClient {
  createHostedApp(name: string, image: string): Promise<{ id: string; state: 'running' | 'failed' }>;
  removeHostedApp(id: string): Promise<void>;
  
  createDatabase(name: string, engine: string, capacity: number, credentialsRef?: string): Promise<{ id: string; endpoint: string }>;
  removeDatabase(id: string): Promise<void>;
  createSnapshot(req: any): Promise<string>;
  
  createAccountFilesystem(name: string): Promise<{ id: string; endpoint: string }>;
  removeAccountFilesystem(id: string): Promise<void>;
}

export class CpanelAdapter implements ComputeCapability, DatabaseCapability, StorageCapability {
  constructor(private client: IWhmClient) {}

  public async provisionInstance(config: ComputeConfig, options: ProviderOptions): Promise<ComputeResult> {
    const instance = await this.client.createHostedApp(config.instanceName, config.osImage);
    return {
      id: instance.id,
      state: instance.state,
      resolved: { mode: 'HOSTED_APP' },
    };
  }

  public async terminateInstance(id: string): Promise<void> {
    await this.client.removeHostedApp(id);
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    return { id, state: 'running', health: 'healthy' };
  }

  public async provisionDatabase(config: DatabaseConfig, options: ProviderOptions): Promise<DatabaseResult> {
    const db = await this.client.createDatabase(config.name, config.engine, config.capacity, config.credentialsRef);
    return { id: db.id, connectionString: db.endpoint, resolved: { engine: config.engine, mode: 'MYSQL' } };
  }

  public async deprovisionDatabase(id: string): Promise<void> {
    await this.client.removeDatabase(id);
  }

  public async createSnapshot(req: any): Promise<string> {
    return await this.client.createSnapshot(id);
  }

  public async provisionStorage(config: StorageConfig, options: ProviderOptions): Promise<StorageResult> {
    const fs = await this.client.createAccountFilesystem(config.name);
    return { id: fs.id, endpoint: fs.endpoint, resolved: { storageClass: 'FILE', mode: 'ACCOUNT_FILESYSTEM' } };
  }

  public async deprovisionStorage(id: string): Promise<void> {
    await this.client.removeAccountFilesystem(id);
  }
}
