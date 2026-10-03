/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - Provider Adapters Tests
 * File           : adapters.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AwsAdapter, AwsContract } from '../../providers/aws';
import { KubernetesAdapter, KubernetesContract } from '../../providers/kubernetes';
import { LinuxAdapter, LinuxContract } from '../../providers/linux';
import { CpanelAdapter, CpanelContract } from '../../providers/cpanel';
import { FabricRegistry } from '../../registry';

declare var describe: any, it: any, expect: any;

describe('Provider Adapters Initialization', () => {
  it('registers all 4 provider adapters with their contracts', () => {
    const registry = new FabricRegistry();

    // 1. AWS
    const awsFakeClient = {
      resolveInstanceType: async () => 't3.micro',
      runInstances: async () => ({ id: 'i-123', ip: '1.1.1.1', state: 'running' as const }),
      terminateInstances: async () => {},
      createVpc: async () => 'vpc-123',
      deleteVpc: async () => {},
      createRds: async () => ({ id: 'rds-123', endpoint: 'db.example.com' }),
      deleteRds: async () => {},
      createS3Bucket: async () => ({ id: 'bucket-123', endpoint: 's3.example.com' }),
      deleteS3Bucket: async () => {}
    };
    const awsAdapter = new AwsAdapter(awsFakeClient);
    registry.registerProvider(AwsContract, {
      COMPUTE: awsAdapter,
      NETWORK: awsAdapter,
      DATABASE: awsAdapter,
      STORAGE: awsAdapter
    });

    // 2. Kubernetes
    const k8sFakeClient = {
      applyWorkload: async () => ({ id: 'deploy-1', state: 'running' as const }),
      deleteWorkload: async () => {},
      applyNetworkPolicy: async () => ({ id: 'np-1' }),
      deleteNetworkPolicy: async () => {},
      createPvc: async () => ({ id: 'pvc-1', endpoint: 'pvc' }),
      deletePvc: async () => {}
    };
    const k8sAdapter = new KubernetesAdapter(k8sFakeClient);
    registry.registerProvider(KubernetesContract, {
      COMPUTE: k8sAdapter,
      NETWORK: k8sAdapter,
      STORAGE: k8sAdapter
    });

    // 3. Linux
    const linuxFakeClient = {
      checkCapacity: async () => true,
      runProcess: async () => ({ id: 'proc-1', state: 'running' as const }),
      stopProcess: async () => {},
      configureNetwork: async () => ({ id: 'net-1' }),
      removeNetwork: async () => {},
      createDirectory: async () => ({ id: 'dir-1', endpoint: '/dir' }),
      removeDirectory: async () => {}
    };
    const linuxAdapter = new LinuxAdapter(linuxFakeClient);
    registry.registerProvider(LinuxContract, {
      COMPUTE: linuxAdapter,
      NETWORK: linuxAdapter,
      STORAGE: linuxAdapter
    });

    // 4. cPanel
    const cpanelFakeClient = {
      createHostedApp: async () => ({ id: 'app-1', state: 'running' as const }),
      removeHostedApp: async () => {},
      createDatabase: async () => ({ id: 'db-1', endpoint: 'db' }),
      removeDatabase: async () => {},
      createAccountFilesystem: async () => ({ id: 'fs-1', endpoint: 'fs' }),
      removeAccountFilesystem: async () => {}
    };
    const cpanelAdapter = new CpanelAdapter(cpanelFakeClient);
    registry.registerProvider(CpanelContract, {
      COMPUTE: cpanelAdapter,
      DATABASE: cpanelAdapter,
      STORAGE: cpanelAdapter
    });

    expect(registry.isRegistered('aws')).toBe(true);
    expect(registry.isRegistered('kubernetes')).toBe(true);
    expect(registry.isRegistered('linux')).toBe(true);
    expect(registry.isRegistered('cpanel')).toBe(true);
  });
});
