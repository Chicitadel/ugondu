/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - cPanel Adapter
 * File           : cpanel.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import type { ProviderCapabilities } from '../contract/ProviderContract';
import type { ComputeCapability, ComputeConfig, ComputeResult, ComputeStatus, ProviderOptions } from '../capabilities/compute';
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
  getInstanceStatus?(id: string): Promise<ComputeStatus>;

  createDatabase(name: string, engine: string, capacity: number, credentialsRef?: string): Promise<{ id: string; endpoint: string }>;
  removeDatabase(id: string): Promise<void>;
  createSnapshot(req: any): Promise<string>;

  createAccountFilesystem(name: string): Promise<{ id: string; endpoint: string }>;
  removeAccountFilesystem(id: string): Promise<void>;
}

interface RegisteredInstanceRecord {
  id: string;
  state: 'provisioning' | 'running' | 'failed' | 'terminated';
  health: 'healthy' | 'unhealthy' | 'unknown';
  verifiedAt: number;
}

export class CpanelAdapter implements ComputeCapability, DatabaseCapability, StorageCapability {
  private readonly instanceRegistry = new Map<string, RegisteredInstanceRecord>();

  constructor(private client: IWhmClient) {}

  public async provisionInstance(config: ComputeConfig, _options: ProviderOptions): Promise<ComputeResult> {
    const instance = await this.client.createHostedApp(config.instanceName, config.osImage);
    const health = instance.state === 'running' ? 'healthy' : 'unhealthy';
    this.instanceRegistry.set(instance.id, {
      id: instance.id,
      state: instance.state,
      health,
      verifiedAt: Date.now(),
    });
    return {
      id: instance.id,
      state: instance.state,
      resolved: { mode: 'HOSTED_APP' },
    };
  }

  public async terminateInstance(id: string): Promise<void> {
    await this.client.removeHostedApp(id);
    this.instanceRegistry.delete(id);
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    if (!id || typeof id !== 'string') {
      return {
        id: String(id ?? ''),
        state: 'unknown' as ComputeStatus['state'],
        health: 'unverified' as ComputeStatus['health'],
      };
    }

    if (typeof this.client.getInstanceStatus === 'function') {
      try {
        const probed = await this.client.getInstanceStatus(id);
        if (probed && probed.state) {
          this.instanceRegistry.set(id, {
            id,
            state: probed.state,
            health: probed.health,
            verifiedAt: Date.now(),
          });
          return probed;
        }
      } catch {
        return {
          id,
          state: 'unknown' as ComputeStatus['state'],
          health: 'unverified' as ComputeStatus['health'],
        };
      }
    }

    const registered = this.instanceRegistry.get(id);
    if (!registered) {
      return {
        id,
        state: 'unknown' as ComputeStatus['state'],
        health: 'unverified' as ComputeStatus['health'],
      };
    }

    return {
      id: registered.id,
      state: registered.state,
      health: registered.health,
    };
  }

  public async provisionDatabase(config: DatabaseConfig, _options: ProviderOptions): Promise<DatabaseResult> {
    const db = await this.client.createDatabase(config.name, config.engine, config.capacity, config.credentialsRef);
    return { id: db.id, connectionString: db.endpoint, resolved: { engine: config.engine, mode: 'MYSQL' } };
  }

  public async deprovisionDatabase(id: string): Promise<void> {
    await this.client.removeDatabase(id);
  }

  public async createSnapshot(req: any): Promise<string> {
    return await this.client.createSnapshot(typeof req === 'string' ? req : req.resourceId);
  }

  public async provisionStorage(config: StorageConfig, _options: ProviderOptions): Promise<StorageResult> {
    const fs = await this.client.createAccountFilesystem(config.name);
    return { id: fs.id, endpoint: fs.endpoint, resolved: { storageClass: 'FILE', mode: 'ACCOUNT_FILESYSTEM' } };
  }

  public async deprovisionStorage(id: string): Promise<void> {
    await this.client.removeAccountFilesystem(id);
  }
}
