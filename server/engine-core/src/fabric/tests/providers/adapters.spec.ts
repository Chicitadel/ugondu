import { AwsAdapter, IAwsClient } from '../../../fabric/providers/aws';
import { KubernetesAdapter, IKubernetesClient } from '../../../fabric/providers/kubernetes';
import { LinuxAdapter, ILinuxClient } from '../../../fabric/providers/linux';
import { CpanelAdapter, IWhmClient } from '../../../fabric/providers/cpanel';

describe('Provider Adapters (FAB-11)', () => {
  it('AwsAdapter formats results according to the fabric contract', async () => {
    const mockClient: IAwsClient = {
      resolveInstanceType: async () => 't3.micro',
      runInstances: async () => ({ id: 'i-123', ip: '10.0.0.5', state: 'running' }),
      terminateInstances: async () => {},
      createVpc: async () => ({ id: 'vpc-1', cidr: '10.0.0.0/16' }),
      deleteVpc: async () => {},
      createRdsInstance: async () => ({ id: 'db-1', endpoint: 'db-1.aws.com' }),
      deleteRdsInstance: async () => {},
      createS3Bucket: async () => ({ id: 'b-1', url: 's3://b-1' }),
      deleteS3Bucket: async () => {},
      getInstanceStatus: async () => ({ id: 'i-123', state: 'running' as any, health: 'healthy' }),
      createSubnet: async () => ({ id: 'sub-1', cidr: '10.0.0.0/24' }),
      createSnapshot: async () => ('snap-1'),
    };
    const adapter = new AwsAdapter(mockClient);
    const result = await adapter.provisionInstance({ instanceName: 'web', osImage: 'ami-1' }, {});
    expect(result.id).toBe('i-123');
    expect(result.state).toBe('running');
  });

  it('KubernetesAdapter formats results according to the fabric contract', async () => {
    const mockClient: IKubernetesClient = {
      applyWorkload: async () => ({ id: 'deploy-1', state: 'running' }),
      deleteWorkload: async () => {},
      applyNetworkPolicy: async () => ({ id: 'net-1' }),
      deleteNetworkPolicy: async () => {},
      createPvc: async () => ({ id: 'pvc-1' }),
      deletePvc: async () => {},
      getInstanceStatus: async () => ({ id: 'deploy-1', state: 'running' as any, health: 'healthy' }),
      createSubnet: async () => ({ id: 'sub-1', cidr: '10.0.0.0/24' }),
    };
    const adapter = new KubernetesAdapter(mockClient);
    const result = await adapter.provisionInstance({ instanceName: 'web', osImage: 'nginx' }, {});
    expect(result.id).toBe('deploy-1');
  });

  it('LinuxAdapter formats results according to the fabric contract', async () => {
    const mockClient: ILinuxClient = {
      checkCapacity: async () => true,
      runProcess: async () => ({ id: 'pid-1', state: 'running' }),
      stopProcess: async () => {},
      configureNetwork: async () => ({ id: 'if-1' }),
      removeNetwork: async () => {},
      createDirectory: async () => ({ id: '/opt/data' }),
      removeDirectory: async () => {},
      createSubnet: async () => ({ id: 'sub-1', cidr: '10.0.0.0/24' }),
    };
    const adapter = new LinuxAdapter(mockClient);
    const result = await adapter.provisionInstance({ instanceName: 'web', osImage: 'nginx' }, {});
    expect(result.id).toBe('pid-1');
  });

  it('CpanelAdapter formats results according to the fabric contract', async () => {
    const mockClient: IWhmClient = {
      createHostedApp: async () => ({ id: 'app-1', state: 'running' }),
      removeHostedApp: async () => {},
      createDatabase: async () => ({ id: 'db-1', endpoint: 'localhost' }),
      removeDatabase: async () => {},
      createAccountFilesystem: async () => ({ id: 'fs-1' }),
      removeAccountFilesystem: async () => {},
      createSnapshot: async () => ('snap-1'),
    };
    const adapter = new CpanelAdapter(mockClient);
    const result = await adapter.provisionInstance({ instanceName: 'web', osImage: 'php' }, {});
    expect(result.id).toBe('app-1');
  });
});
