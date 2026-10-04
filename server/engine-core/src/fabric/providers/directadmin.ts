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
  removeAccountFILE(id: string): Promise<void>;
}

export class DirectAdminAdapter implements ComputeCapability, DatabaseCapability, StorageCapability {
  constructor(private client: IDirectAdminClient) {}

  public async provisionInstance(config: ComputeConfig, options: ProviderOptions): Promise<ComputeResult> {
    const instance = await this.client.createHostedApp(config.instanceName || 'app', config.osImage);
    return {
      id: instance.id,
      state: instance.state as any,
      resolved: { mode: 'HOSTED_APP' },
    };
  }

  public async terminateInstance(id: string): Promise<void> {
    await this.client.removeHostedApp(id);
  }

  public async getInstanceStatus(id: string): Promise<ComputeStatus> {
    return await this.client.getInstanceStatus(id);
  }

  public async provisionDatabase(config: DatabaseConfig, options: ProviderOptions): Promise<DatabaseResult> {
    const db = await this.client.createDatabase(config.name, config.engine);
    return {
      id: db.id,
      connectionString: `${db.id}.local`,
    };
  }

  public async deprovisionDatabase(id: string): Promise<void> {
    await this.client.removeDatabase(id);
  }

  public async createSnapshot(id: string): Promise<string> {
    return 'snap-' + id;
  }

  public async provisionStorage(config: StorageConfig, options: ProviderOptions): Promise<StorageResult> {
    const fs = await this.client.createAccountFILE(config.name);
    return {
      id: fs.id,
      endpoint: `file://${fs.id}`,
    };
  }

  public async deprovisionStorage(id: string): Promise<void> {
    await this.client.removeAccountFILE(id);
  }
}
