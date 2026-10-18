/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : server/engine-core/fabric/providers
 * File           : directadmin.ts
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Ujomor Delivery Authority
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import type { ProviderCapabilities } from '../contract/ProviderContract';
import type { ComputeCapability, ComputeConfig, ComputeResult, ComputeStatus, ProviderOptions } from '../capabilities/compute';
import type { DatabaseCapability, DatabaseConfig, DatabaseResult } from '../capabilities/database';
import type { StorageCapability, StorageConfig, StorageResult } from '../capabilities/storage';
import {
  discoverDirectAdminCapabilities,
  discoverDirectAdminEnvironmentTwin,
  type DirectAdminDiscoveryInput,
} from '../../targets/directadmin';
import type { DirectAdminCapabilityReport } from '../../twin/model/shared-types';
import type { ExtendedEnvironmentTwin } from '../../twin/model/schema';

export const DirectAdminContract: ProviderCapabilities = {
  provider: 'directadmin',
  kinds: {
    COMPUTE: { status: 'CONDITIONAL', modes: ['HOSTED_APP'] },
    NETWORK: {
      status: 'UNSUPPORTED',
      modes: [],
      reasonKey: 'fabric.contract.reason.directadmin_network'
    },
    DATABASE: { status: 'NATIVE', modes: ['DB'] },
    STORAGE: { status: 'NATIVE', modes: ['FILE'] }
  },
  databaseEngines: ['mysql'],
  storageClasses: ['FILE'],
  publicStorageClasses: [],
  supportsDryRun: false,
  supportsRollback: true,
  supportsIdempotency: false,
  supportsImport: false,
  supportsUpdate: false,
  supportsDelete: true,
};

export interface IDirectAdminClient {
  createHostedApp(name: string, image: string): Promise<{ id: string; state: string }>;
  removeHostedApp(id: string): Promise<void>;
  getInstanceStatus(id: string): Promise<{ id: string; state: 'running' | 'failed'; health: 'healthy' | 'unhealthy' }>;
  createDatabase(name: string, type: string): Promise<{ id: string; state: string }>;
  removeDatabase(id: string): Promise<void>;
  createAccountFILE(name: string): Promise<{ id: string; state: string }>;
  createSnapshot(req: any): Promise<string>;
  removeAccountFILE(id: string): Promise<void>;
  probeEnvironment?(input?: DirectAdminDiscoveryInput): Promise<DirectAdminCapabilityReport>;
}

export class DirectAdminAdapter implements ComputeCapability, DatabaseCapability, StorageCapability {
  private readonly verifiedInstances = new Map<string, ComputeStatus>();

  constructor(private client?: IDirectAdminClient) {}

  public recordVerifiedInstanceState(id: string, status: ComputeStatus): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error(__t('messages.error.directadmin_instance_id_required'));
    }
    this.verifiedInstances.set(id, status);
  }

  public discoverCapabilities(input?: DirectAdminDiscoveryInput): DirectAdminCapabilityReport {
    return discoverDirectAdminCapabilities(input);
  }

  public discoverEnvironmentTwin(input?: DirectAdminDiscoveryInput): ExtendedEnvironmentTwin {
    return discoverDirectAdminEnvironmentTwin(input);
  }

  public async provisionInstance(config: ComputeConfig, _options: ProviderOptions): Promise<ComputeResult> {
    if (this.client && typeof this.client.createHostedApp === 'function') {
      const appName = (config as any)?.name ?? 'directadmin-hosted-app';
      const appImage = (config as any)?.image ?? 'php-8.3';
      const created = await this.client.createHostedApp(appName, appImage);
      if (!created || !created.id) {
        throw new Error(__t('messages.error.directadmin_unverified_provision_response'));
      }
      const status: ComputeStatus = {
        id: created.id,
        state: created.state === 'running' ? 'running' : 'failed',
        health: created.state === 'running' ? 'healthy' : 'unhealthy',
      } as ComputeStatus;
      this.verifiedInstances.set(created.id, status);
      return {
        id: created.id,
        provider: 'directadmin',
        state: created.state,
      } as unknown as ComputeResult;
    }
    throw new Error(__t('capability_not_implemented_and'));
  }

  public async terminateInstance(id: string): Promise<void> {
    if (this.client && typeof this.client.removeHostedApp === 'function') {
      await this.client.removeHostedApp(id);
      this.verifiedInstances.delete(id);
      return;
    }
    throw new Error(__t('capability_not_implemented_and'));
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error(__t('messages.error.directadmin_instance_id_required'));
    }

    if (this.client && typeof this.client.getInstanceStatus === 'function') {
      const probed = await this.client.getInstanceStatus(id);
      if (
        !probed ||
        probed.id !== id ||
        (probed.state !== 'running' && probed.state !== 'failed') ||
        (probed.health !== 'healthy' && probed.health !== 'unhealthy')
      ) {
        throw new Error(__t('messages.error.directadmin_unverified_instance_state', { id }));
      }
      const verifiedStatus: ComputeStatus = {
        id: probed.id,
        state: probed.state,
        health: probed.health,
      } as ComputeStatus;
      this.verifiedInstances.set(id, verifiedStatus);
      return verifiedStatus;
    }

    if (this.verifiedInstances.has(id)) {
      return this.verifiedInstances.get(id)!;
    }

    throw new Error(__t('capability_not_implemented_and'));
  }

  public async provisionDatabase(config: DatabaseConfig, _options: ProviderOptions): Promise<DatabaseResult> {
    if (this.client && typeof this.client.createDatabase === 'function') {
      const dbName = (config as any)?.name ?? 'directadmin_db';
      const dbType = (config as any)?.engine ?? 'mysql';
      const res = await this.client.createDatabase(dbName, dbType);
      return res as unknown as DatabaseResult;
    }
    throw new Error(__t('capability_not_implemented_and'));
  }

  public async deprovisionDatabase(id: string): Promise<void> {
    if (this.client && typeof this.client.removeDatabase === 'function') {
      await this.client.removeDatabase(id);
      return;
    }
    throw new Error(__t('capability_not_implemented_and'));
  }

  public async createSnapshot(req: any): Promise<string> {
    if (this.client && typeof this.client.createSnapshot === 'function') {
      return this.client.createSnapshot(req);
    }
    throw new Error(__t('capability_not_implemented_and'));
  }

  public async provisionStorage(config: StorageConfig, _options: ProviderOptions): Promise<StorageResult> {
    if (this.client && typeof this.client.createAccountFILE === 'function') {
      const name = (config as any)?.name ?? 'account_storage';
      const res = await this.client.createAccountFILE(name);
      return res as unknown as StorageResult;
    }
    throw new Error(__t('capability_not_implemented_and'));
  }

  public async deprovisionStorage(id: string): Promise<void> {
    if (this.client && typeof this.client.removeAccountFILE === 'function') {
      await this.client.removeAccountFILE(id);
      return;
    }
    throw new Error(__t('capability_not_implemented_and'));
  }
}

