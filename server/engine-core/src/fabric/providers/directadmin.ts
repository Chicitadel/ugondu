import type { ProviderCapabilities } from '../contract/ProviderContract';
import type { ComputeCapability, ComputeConfig, ComputeResult, ComputeStatus, ProviderOptions, ResolvedValues } from '../capabilities/compute';
import type { DatabaseCapability, DatabaseConfig, DatabaseResult } from '../capabilities/database';
import type { StorageCapability, StorageConfig, StorageResult } from '../capabilities/storage';

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
  supportsRollback: true, supportsIdempotency: false, supportsImport: false, supportsUpdate: false, supportsDelete: true,



};

export interface IDirectAdminClient {
  createHostedApp(name: string, image: string): Promise<{ id: string; state: string }>;
  removeHostedApp(id: string): Promise<void>;
  getInstanceStatus(id: string): Promise<{ id: string; state: 'running' | 'failed' | 'failed'; health: 'healthy' | 'unhealthy' }>;
  createDatabase(name: string, type: string): Promise<{ id: string; state: string }>;
  removeDatabase(id: string): Promise<void>;
  createAccountFILE(name: string): Promise<{ id: string; state: string }>;
  createSnapshot(req: any): Promise<string>;
  removeAccountFILE(id: string): Promise<void>;
}

export class DirectAdminAdapter implements ComputeCapability, DatabaseCapability, StorageCapability {
  constructor(private client: IDirectAdminClient) {}

  public async provisionInstance(config: ComputeConfig, options: ProviderOptions): Promise<ComputeResult> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async terminateInstance(id: string): Promise<void> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async provisionDatabase(config: DatabaseConfig, options: ProviderOptions): Promise<DatabaseResult> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async deprovisionDatabase(id: string): Promise<void> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async createSnapshot(req: any): Promise<string> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async provisionStorage(config: StorageConfig, options: ProviderOptions): Promise<StorageResult> {
    throw new Error('Capability not implemented and fails closed by default.');
  }

  public async deprovisionStorage(id: string): Promise<void> {
    throw new Error('Capability not implemented and fails closed by default.');
  }
}
