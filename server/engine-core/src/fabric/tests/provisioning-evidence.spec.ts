/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Fabric / Evidence Tests
 * File           : provisioning-evidence.spec.ts
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

import { digestOf } from '../engine/PlanGraph';
import { NODE_HANDLERS } from '../engine/NodeHandlers';
import { FabricRegistry } from '../registry';
import { InMemoryProvisioningState, ProvisioningEngine, ProvisioningError } from '../provisioning-engine';
import type { ArchitectureIR } from '../provisioning-engine';
import { UpmExecutionGate } from '../../upm/policy-gate';
import { bucket, compute, fakeFabric, nativeContract } from './support/fakeCloud';

describe('ProvisioningEvidence Capture, Digest & Receipt Verification', () => {
  beforeAll(() => {
    process.env.UGONDU_UPM_SECRET = 'evidence-test-hmac-secret-key-2026';
  });

  const authorize = (ir: ArchitectureIR) =>
    UpmExecutionGate.evaluate({
      intentHash: 'intent-ev',
      twinHash: 'twin-ev',
      ir,
      policyVersion: '1.0.0',
      envelope: { edition: 'ENTERPRISE', allowedActions: ['aws'], tenantId: 'tenant-ev' },
      activePolicies: [],
    });

  it('captures requested and resolved evidence in dry-run previews, reports, and journal entries', async () => {
    const { registry, journal, entries, dryRuns } = fakeFabric(['aws']);
    const state = new InMemoryProvisioningState();
    const engine = new ProvisioningEngine(registry, journal, state);
    const ir: ArchitectureIR = { nodes: [compute('api-node', { cpuCores: 4, memoryMb: 8192 }), bucket('assets')], edges: [] };

    const preview = await engine.preview(ir);
    expect(preview.accepted).toBe(true);
    expect(preview.nodes[0]?.resolved).toEqual({ instanceType: 'fake-4x8192' });
    expect(dryRuns).toEqual(['aws:sizing:api-node']);

    const report = await engine.executePlan(ir, await authorize(ir));
    expect(report.created).toEqual(['api-node', 'assets']);
    expect(report.provisioned[0]?.evidence).toEqual({
      requested: { instanceName: 'api-node', cpuCores: 4, memoryMb: 8192, osImage: 'ubuntu-24.04' },
      resolved: { instanceType: 'fake-4x8192' },
    });
    const journalSuccess = entries.find((e) => e.nodeId === 'api-node' && e.status === 'success');
    expect(journalSuccess?.evidence?.resolved).toEqual({ instanceType: 'fake-4x8192' });
  });

  it('computes canonical key-order-independent digests and rejects drifted state records', async () => {
    const d1 = digestOf('COMPUTE', 'aws', { cpuCores: 2, instanceName: 'web', memoryMb: 2048, osImage: 'linux' }, { mode: 'INSTANCE' });
    const d2 = digestOf('COMPUTE', 'aws', { osImage: 'linux', memoryMb: 2048, instanceName: 'web', cpuCores: 2 }, { mode: 'INSTANCE' });
    const d3 = digestOf('COMPUTE', 'aws', { cpuCores: 4, instanceName: 'web', memoryMb: 2048, osImage: 'linux' }, { mode: 'INSTANCE' });
    expect(d1).toBe(d2);
    expect(d1).not.toBe(d3);

    const { registry, journal } = fakeFabric(['aws']);
    const state = new InMemoryProvisioningState();
    const engine = new ProvisioningEngine(registry, journal, state);

    const ir1: ArchitectureIR = { nodes: [compute('web', { cpuCores: 2 })], edges: [] };
    await engine.executePlan(ir1, await authorize(ir1));

    const irDrifted: ArchitectureIR = { nodes: [compute('web', { cpuCores: 8 })], edges: [] };
    await expect(engine.executePlan(irDrifted, await authorize(irDrifted))).rejects.toBeInstanceOf(ProvisioningError);
  });

  it('rejects missing provider resource IDs and tampered authorization seals fail-closed', async () => {
    const registry = new FabricRegistry();
    registry.registerProvider(nativeContract('aws'), {
      COMPUTE: {
        provisionInstance: async () => ({ id: '', state: 'running' as const }),
        terminateInstance: async () => {},
        getInstanceStatus: async () => ({ id: '', state: 'running' as const, health: 'healthy' as const }),
      },
      NETWORK: { createVirtualNetwork: async () => ({ id: 'n1', state: 'available' }), deleteVirtualNetwork: async () => {}, createSubnet: async () => ({ id: 's1', cidr: '10.0.0.0/24' }) },
      DATABASE: { provisionDatabase: async () => ({ id: 'd1', connectionString: 'db://d1' }), deprovisionDatabase: async () => {}, createSnapshot: async () => 'snap-1' },
      STORAGE: { provisionStorage: async () => ({ id: 'st1', endpoint: 's3://st1' }), deprovisionStorage: async () => {} },
    });

    await expect(
      NODE_HANDLERS.COMPUTE.provision(registry, 'aws', { instanceName: 'web', cpuCores: 2, memoryMb: 1024, osImage: 'linux' }, {})
    ).rejects.toThrow(/no_resource_id/);

    const { registry: reg2, journal } = fakeFabric(['aws']);
    const engine = new ProvisioningEngine(reg2, journal, new InMemoryProvisioningState());
    const ir: ArchitectureIR = { nodes: [compute('web')], edges: [] };
    const tamperedAuth = { ...(await authorize(ir)), cryptographicSeal: '0000000000000000' };
    await expect(engine.executePlan(ir, tamperedAuth)).rejects.toThrow();
  });
});
