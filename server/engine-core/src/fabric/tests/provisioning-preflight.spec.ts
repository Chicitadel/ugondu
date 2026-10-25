/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Fabric / Preflight Tests
 * File           : provisioning-preflight.spec.ts
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

import { preflight } from '../engine/Preflight';
import { InMemoryProvisioningState, PlanRejectedError, ProvisioningEngine } from '../provisioning-engine';
import { UpmExecutionGate } from '../../upm/policy-gate';
import { bucket, canonicalFabric, compute, database, fakeFabric, network } from './support/fakeCloud';

describe('ProvisioningPreflight Validation & Capability Gate', () => {
  beforeAll(() => {
    process.env.UGONDU_UPM_SECRET = 'preflight-test-hmac-secret-key-2026';
  });

  it('rejects unsupported resource kinds (KIND_UNSUPPORTED) and missing conditional modes before any mutation', async () => {
    const { registry, journal, entries, calls } = canonicalFabric();
    const engine = new ProvisioningEngine(registry, journal, new InMemoryProvisioningState());
    const ir = {
      nodes: [
        database('k8s-db', {}, 'kubernetes'),
        network('cp-net', '10.0.0.0/16', 'cpanel'),
        compute('cp-app', {}, 'cpanel'),
      ],
      edges: [],
    };

    const plan = await engine.preview(ir);
    expect(plan.accepted).toBe(false);
    expect(plan.rejections.map((r) => [r.nodeId, r.code])).toEqual([
      ['k8s-db', 'KIND_UNSUPPORTED'],
      ['cp-net', 'KIND_UNSUPPORTED'],
      ['cp-app', 'MODE_REQUIRED'],
    ]);
    expect(calls).toHaveLength(0);
    expect(entries).toHaveLength(0);

    const auth = await UpmExecutionGate.evaluate({
      intentHash: 'intent-1',
      twinHash: 'twin-1',
      ir,
      policyVersion: '1.0.0',
      envelope: { edition: 'ENTERPRISE', allowedActions: ['kubernetes', 'cpanel'], tenantId: 'tenant-1' },
      activePolicies: [],
    });

    await expect(engine.executePlan(ir, auth)).rejects.toBeInstanceOf(PlanRejectedError);
    expect(calls).toHaveLength(0);
    expect(entries.every((e) => e.status === 'rejected')).toBe(true);
  });

  it('rejects missing or invalid node configuration, raw secrets, and undeclared references fail-closed', () => {
    const { registry } = fakeFabric(['aws']);

    expect(() =>
      preflight({ nodes: [compute('web-1', { instanceName: '' })], edges: [] }, registry, {})
    ).toThrow(/invalid_config/);

    expect(() =>
      preflight({ nodes: [compute('web-2', { cpuCores: 0 })], edges: [] }, registry, {})
    ).toThrow(/invalid_config/);

    expect(() =>
      preflight({ nodes: [network('net-bad', '999.0.0.1/40')], edges: [] }, registry, {})
    ).toThrow(/invalid_config/);

    expect(() =>
      preflight({ nodes: [database('db-raw-secret', { credentialsRef: 'plain-password-123' })], edges: [] }, registry, {})
    ).toThrow(/secret_in_plan/);

    expect(() =>
      preflight({ nodes: [compute('web-orphan-ref', { networkRefId: 'ref:net-missing' })], edges: [] }, registry, {})
    ).toThrow(/reference_not_declared/);
  });

  it('enforces public storage policy and confirmation gates during preflight', () => {
    const { registry } = canonicalFabric();
    const unallowedIr = { nodes: [bucket('pub-bkt', { isPublic: true })], edges: [] };

    const prohibited = preflight(unallowedIr, registry, { allowPublicStorage: false });
    expect(prohibited.rejections.map((r) => r.code)).toEqual(['PUBLIC_STORAGE_PROHIBITED']);

    const unconfirmed = preflight(unallowedIr, registry, { allowPublicStorage: true });
    expect(unconfirmed.rejections.map((r) => r.code)).toEqual(['PUBLIC_STORAGE_UNCONFIRMED']);

    const confirmedIr = { nodes: [bucket('pub-bkt', { isPublic: true, publicAccessConfirmed: true })], edges: [] };
    const accepted = preflight(confirmedIr, registry, { allowPublicStorage: true });
    expect(accepted.rejections).toHaveLength(0);
  });
});
