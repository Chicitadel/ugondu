/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Fabric / Rollback Tests
 * File           : provisioning-rollback.spec.ts
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

import { InMemoryProvisioningState, ProvisioningEngine, ProvisioningError } from '../provisioning-engine';
import type { ArchitectureIR } from '../provisioning-engine';
import { UpmExecutionGate } from '../../upm/policy-gate';
import { compute, database, fakeFabric, network } from './support/fakeCloud';

describe('ProvisioningRollback Reverse Execution & Fail-Closed Handling', () => {
  beforeAll(() => {
    process.env.UGONDU_UPM_SECRET = 'rollback-test-hmac-secret-key-2026';
  });

  const authorize = (ir: ArchitectureIR) =>
    UpmExecutionGate.evaluate({
      intentHash: 'intent-rb',
      twinHash: 'twin-rb',
      ir,
      policyVersion: '1.0.0',
      envelope: { edition: 'ENTERPRISE', allowedActions: ['aws'], tenantId: 'tenant-rb' },
      activePolicies: [],
    });

  it('rolls back created resources in strict reverse dependency order when a downstream wave fails', async () => {
    const { registry, journal, clouds, calls, live } = fakeFabric(['aws']);
    const state = new InMemoryProvisioningState();
    const engine = new ProvisioningEngine(registry, journal, state);

    const ir: ArchitectureIR = {
      nodes: [
        network('vpc-1', '10.10.0.0/16'),
        compute('app-1', { networkRefId: 'ref:vpc-1' }),
        database('db-fail'),
      ],
      edges: [
        { from: 'vpc-1', to: 'app-1' },
        { from: 'app-1', to: 'db-fail' },
      ],
    };

    clouds.aws.failCreate('database', 'db-fail');
    const auth = await authorize(ir);

    let caught: ProvisioningError | undefined;
    try {
      await engine.executePlan(ir, auth);
    } catch (err) {
      caught = err as ProvisioningError;
    }

    expect(caught).toBeInstanceOf(ProvisioningError);
    expect(caught!.rolledBack).toEqual(['app-1', 'vpc-1']);
    expect(caught!.rollbackFailures).toEqual([]);
    expect(live.size).toBe(0);
    expect(await state.get('app-1')).toBeUndefined();
    expect(await state.get('vpc-1')).toBeUndefined();
    expect(calls).toEqual([
      'aws:create:network:vpc-1',
      'aws:create:compute:app-1',
      'aws:create:database:db-fail',
      'aws:delete:compute:aws-compute-2',
      'aws:delete:network:aws-network-1',
    ]);
  });

  it('surfaces rollbackFailures fail-closed when deprovisioning fails or compute reports failed state', async () => {
    const { registry, journal, entries, clouds } = fakeFabric(['aws']);
    const state = new InMemoryProvisioningState();
    const engine = new ProvisioningEngine(registry, journal, state);

    const ir: ArchitectureIR = {
      nodes: [network('vpc-stuck'), compute('app-broken', { osImage: 'broken' })],
      edges: [{ from: 'vpc-stuck', to: 'app-broken' }],
    };

    clouds.aws.failDelete('aws-network-1');
    const auth = await authorize(ir);

    let caught: ProvisioningError | undefined;
    try {
      await engine.executePlan(ir, auth);
    } catch (err) {
      caught = err as ProvisioningError;
    }

    expect(caught).toBeInstanceOf(ProvisioningError);
    expect(caught!.rolledBack).toEqual([]);
    expect(caught!.rollbackFailures).toHaveLength(1);
    expect(caught!.rollbackFailures[0]).toMatchObject({
      nodeId: 'vpc-stuck',
      resourceId: 'aws-network-1',
    });
    expect(entries.some((e) => e.action === 'deprovision' && e.status === 'failed' && e.nodeId === 'vpc-stuck')).toBe(true);
  });
});
