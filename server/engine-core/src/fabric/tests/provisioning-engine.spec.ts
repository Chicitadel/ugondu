/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Fabric / Provisioning Engine Tests
 * File           : provisioning-engine.spec.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { FabricRegistry } from '../registry';
import { InMemoryProvisioningState, ProvisioningEngine } from '../provisioning-engine';
import type { ArchitectureIR } from '../provisioning-engine';
import { UpmExecutionGate } from '../../upm/policy-gate';
import { compute, database, fakeFabric, nativeContract, network } from './support/fakeCloud';

describe('ProvisioningEngine Lifecycle Dispatch & Registry Gate', () => {
  beforeAll(() => {
    process.env.UGONDU_UPM_SECRET = 'engine-test-hmac-secret-key-2026';
  });

  const authorize = (ir: ArchitectureIR, allowedActions = ['aws']) =>
    UpmExecutionGate.evaluate({
      intentHash: 'intent-eng',
      twinHash: 'twin-eng',
      ir,
      policyVersion: '1.0.0',
      envelope: { edition: 'ENTERPRISE', allowedActions, tenantId: 'tenant-eng' },
      activePolicies: [],
    });

  it('dispatches multi-wave plans in topological order, resolves references, and skips unchanged nodes on re-run', async () => {
    const { registry, journal, calls, live } = fakeFabric(['aws']);
    const state = new InMemoryProvisioningState();
    const engine = new ProvisioningEngine(registry, journal, state);

    const ir: ArchitectureIR = {
      nodes: [
        network('vpc-core', '10.20.0.0/16'),
        database('rds-main', { credentialsRef: 'secret:db_master_password' }),
        compute('web-srv', { networkRefId: 'ref:vpc-core' }),
      ],
      edges: [
        { from: 'vpc-core', to: 'web-srv' },
        { from: 'rds-main', to: 'web-srv' },
      ],
    };

    const firstRun = await engine.executePlan(ir, await authorize(ir));
    expect(firstRun.created).toEqual(['vpc-core', 'rds-main', 'web-srv']);
    expect(firstRun.unchanged).toEqual([]);

    const webLive = live.get('aws-compute-3');
    expect(webLive?.config.networkRefId).toBe('aws-network-1');

    const callCountAfterFirst = calls.length;
    const secondRun = await engine.executePlan(ir, await authorize(ir));
    expect(secondRun.created).toEqual([]);
    expect(secondRun.unchanged).toEqual(['vpc-core', 'rds-main', 'web-srv']);
    expect(calls.length).toBe(callCountAfterFirst);
  });

  it('rejects unregistered providers, duplicate provider registration, and missing execution authorization fail-closed', async () => {
    const emptyRegistry = new FabricRegistry();
    expect(emptyRegistry.isRegistered('unregistered-cloud')).toBe(false);
    expect(() => emptyRegistry.contractOf('unregistered-cloud')).toThrow(/provider_not_registered/);
    expect(() => emptyRegistry.resolveCompute('unregistered-cloud')).toThrow(/provider_not_registered/);

    const { registry, journal } = fakeFabric(['aws']);
    expect(() => registry.registerProvider(nativeContract('aws'), {})).toThrow();

    const engine = new ProvisioningEngine(registry, journal, new InMemoryProvisioningState());
    const unknownProviderIr: ArchitectureIR = {
      nodes: [compute('node-1', {}, 'unregistered-cloud')],
      edges: [],
    };

    await expect(engine.preview(unknownProviderIr)).rejects.toThrow(/provider_not_registered/);
    await expect(engine.executePlan(unknownProviderIr)).rejects.toThrow();

    const auth = await authorize(unknownProviderIr, ['unregistered-cloud']);
    await expect(engine.executePlan(unknownProviderIr, auth)).rejects.toThrow(/provider_not_registered/);
  });
});
