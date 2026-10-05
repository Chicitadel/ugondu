/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - Azure RBAC Adapter Analysis Tests
 * File           : azure-rbac.analysis.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AzureRbacAdapter } from '../adapters/azure-rbac/AzureRbacAdapter';
import { AZURE_RBAC_CONSTRAINTS } from '../adapters/azure-rbac/AzureRbacConstraints';
import { fakeAzure, ctx, rule, SCOPE, RG, RG2, USER_ID, GROUP_ID, SP_ID, READER_ID } from './support/azureFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.azure.${key}`, params);
const USER = `User:${USER_ID}`;
const STORAGE_READ = 'Microsoft.Storage/storageAccounts/read';
const EVERYONE = '00000000-0000-0000-0000-000000000000';
const op = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const failure = async (run: () => Promise<any>): Promise<string> => { try { await run(); return ''; } catch (e: any) { return e.message; } };

function setup() {
  const az = fakeAzure();
  return { ...az, adapter: new AzureRbacAdapter(async () => az.client) };
}
/** Generates the default storage-read role and assigns it to each principal. */
async function deploy(adapter: AzureRbacAdapter, ...principals: string[]) {
  const policy = await adapter.generate([rule()], ctx);
  for (const p of principals) await adapter.attach(policy, p, ctx);
  return policy;
}
const denyEverywhere = (id: string, scope: string) => ({
  id, scope, name: 'system-protected', principalIds: [EVERYONE], excludePrincipalIds: [],
  permissions: [{ actions: [STORAGE_READ], notActions: [], dataActions: [], notDataActions: [] }],
});

describe('Azure RBAC discovery', () => {
  it('reports roles, assignments, identities and groups from role assignments', async () => {
    const { adapter } = setup();
    const policy = await deploy(adapter, USER, `Group:${GROUP_ID}`, `ServicePrincipal:${SP_ID}`);
    const found = await adapter.discoverPolicies(ctx);
    expect(found.length).toBe(1);
    expect(found[0]).toMatchObject({ providerId: policy.providerId, providerType: 'AZURE_RBAC', digest: policy.digest });
    expect(await adapter.discoverAssignments(ctx)).toEqual({ [USER_ID]: [policy.providerId], [GROUP_ID]: [policy.providerId], [SP_ID]: [policy.providerId] });
    expect(await adapter.discoverIdentities(ctx)).toEqual([{ id: USER_ID, type: 'USER', displayName: USER_ID }, { id: SP_ID, type: 'SERVICEPRINCIPAL', displayName: SP_ID }]);
    expect(await adapter.discoverGroups(ctx)).toEqual([{ id: GROUP_ID, displayName: GROUP_ID, members: [] }]);
    const roles = await adapter.discoverRoles(ctx);
    expect(roles.map((r) => r.displayName).sort()).toEqual(['Reader', (policy.nativeDocument as any).roleName]);
    expect(roles.find((r) => r.displayName === 'Reader')!.policies).toEqual([READER_ID]);
  });

  it('skips assignments whose role no longer exists and propagates other failures', async () => {
    const { adapter, seed, client } = setup();
    seed.assign(RG, USER_ID, 'User', `${RG}/providers/Microsoft.Authorization/roleDefinitions/${GROUP_ID}`);
    expect(await adapter.discoverPolicies(ctx)).toEqual([]);
    const broken = new AzureRbacAdapter(async () => ({ ...client, getRoleDefinition: async () => { throw new Error('throttled'); } }));
    expect(await failure(() => broken.discoverPolicies(ctx))).toBe('throttled');
  });
});

describe('Azure RBAC effective authority and evaluation', () => {
  it('combines inherited and local assignments, applying them only where they reach', async () => {
    const { adapter, seed } = setup();
    seed.assign(SCOPE, USER_ID, 'User', READER_ID);
    const policy = await deploy(adapter, USER);
    const atRg = await adapter.discoverEffectiveAuthority(USER, RG, ctx);
    expect(atRg.evaluationMethod).toBe('PARTIAL_MODEL');
    expect(atRg.permissions.map((p) => p.capability)).toEqual(['*/read', STORAGE_READ]);
    expect(atRg.permissions[1].sourcePolicies.slice().sort()).toEqual([READER_ID, policy.providerId].sort());
    expect(atRg.permissions.every((p) => p.state === 'GRANTED' && p.confidence === 'MEDIUM')).toBe(true);
    const atRg2 = await adapter.discoverEffectiveAuthority(USER, RG2, ctx);
    expect(atRg2.permissions.map((p) => p.capability)).toEqual(['*/read']);
  });

  it('marks operations removed by a deny assignment, and wildcards it only partly covers', async () => {
    const { adapter, seed } = setup();
    seed.assign(SCOPE, USER_ID, 'User', READER_ID);
    await deploy(adapter, USER);
    seed.deny(denyEverywhere('deny-1', SCOPE));
    const result = await adapter.discoverEffectiveAuthority(USER, RG, ctx);
    expect(result.permissions.find((p) => p.capability === STORAGE_READ)).toMatchObject({ state: 'DENIED', denyPolicies: ['deny-1'] });
    expect(result.permissions.find((p) => p.capability === '*/read')).toMatchObject({ state: 'CONDITIONALLY_GRANTED', confidence: 'LOW', denyPolicies: ['deny-1'] });
  });

  it('ignores deny assignments that exclude the principal', async () => {
    const { adapter, seed } = setup();
    await deploy(adapter, USER);
    seed.deny({ ...denyEverywhere('deny-x', SCOPE), excludePrincipalIds: [USER_ID.toUpperCase()] });
    const result = await adapter.discoverEffectiveAuthority(USER, RG, ctx);
    expect(result.permissions.map((p) => p.state)).toEqual(['GRANTED']);
  });

  it('evaluates a rule as GRANTED when held, DENIED under a deny assignment, otherwise UNKNOWN', async () => {
    const { adapter, seed } = setup();
    expect(await adapter.evaluate(rule(), ctx)).toBe('UNKNOWN');
    await deploy(adapter, USER);
    expect(await adapter.evaluate(rule(), ctx)).toBe('GRANTED');
    expect(await adapter.evaluate(rule(op(STORAGE_READ, 'Microsoft.Storage/storageAccounts/write')), ctx)).toBe('UNKNOWN');
    expect(await adapter.evaluate(rule(op('Microsoft.Storage/*')), ctx)).toBe('UNKNOWN');
    expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'not-a-guid' } }), ctx)).toBe('UNKNOWN');
    seed.deny(denyEverywhere('deny-1', RG));
    expect(await adapter.evaluate(rule(), ctx)).toBe('DENIED');
  });

  it('honors role exclusions: notActions remove operations that a wildcard would grant', async () => {
    const { adapter, client, seed } = setup();
    const role = await client.createOrUpdateRoleDefinition(RG, SP_ID, {
      roleName: 'storage-no-delete', description: '', assignableScopes: [RG],
      permissions: [{ actions: ['Microsoft.Storage/*'], notActions: ['Microsoft.Storage/storageAccounts/delete'], dataActions: [], notDataActions: [] }],
    });
    seed.assign(RG, USER_ID, 'User', role.id);
    expect(await adapter.evaluate(rule(op(STORAGE_READ)), ctx)).toBe('GRANTED');
    expect(await adapter.evaluate(rule(op('Microsoft.Storage/storageAccounts/delete')), ctx)).toBe('UNKNOWN');
  });

  it('does not count access inherited through group membership, which Azure does not expose here', async () => {
    const { adapter } = setup();
    await deploy(adapter, `Group:${GROUP_ID}`);
    expect(await adapter.evaluate(rule(), ctx)).toBe('UNKNOWN');
    expect(await adapter.evaluate(rule({ subject: { type: 'GROUP', id: `Group:${GROUP_ID}` } }), ctx)).toBe('GRANTED');
  });
});

describe('Azure RBAC simulation, conflicts and reconciliation', () => {
  it('separates access that would be added from access already held, never above MEDIUM confidence', async () => {
    const { adapter } = setup();
    await deploy(adapter, USER);
    const res = await adapter.simulate([rule({ ruleId: 'held' }), rule({ ruleId: 'new', ...op('Microsoft.Storage/storageAccounts/write') })], ctx);
    expect(res.allowed).toEqual([`${USER}:${RG}:Microsoft.Storage/storageAccounts/write`]);
    expect(res.unchanged).toEqual([`${USER}:${RG}:${STORAGE_READ}`]);
    expect(res.denied).toEqual([]);
    expect(res.confidence).toBe('MEDIUM');
    expect(res.blastRadius).toMatchObject({ dependentActors: [USER], blastRadius: 'LIMITED' });
  });

  it('treats a group subject as a broad change and unrealisable rules as unchanged with LOW confidence', async () => {
    const { adapter } = setup();
    const group = await adapter.simulate([rule({ subject: { type: 'GROUP', id: `Group:${GROUP_ID}` } })], ctx);
    expect(group.blastRadius.blastRadius).toBe('BROAD');
    const deny = await adapter.simulate([rule({ effect: 'DENY' }), rule({ ...op('Microsoft.Storage/*') })], ctx);
    expect(deny.allowed).toEqual([]);
    expect(deny.unchanged.length).toBe(2);
    expect(deny.confidence).toBe('LOW');
  });

  it('reports a Deny rule that overlaps an Allow of the same subject as ambiguous', async () => {
    const { adapter } = setup();
    const allow = rule({ ruleId: 'allow' });
    const deny = rule({ ruleId: 'deny', effect: 'DENY' });
    const { conflicts } = await adapter.findConflicts([allow, deny], ctx);
    expect(conflicts).toEqual([{ ruleA: 'allow', ruleB: 'deny', conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS', explanation: T('conflict_explanation', { subject: USER, allowScope: RG, denyScope: RG }) }]);
    expect((await adapter.findConflicts([allow, rule({ ruleId: 'd2', effect: 'DENY', resource: { type: 't', scope: RG2 } })], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, rule({ ruleId: 'd3', effect: 'DENY', subject: { type: 'USER', id: `User:${GROUP_ID}` } })], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, rule({ ruleId: 'd4', effect: 'DENY', ...op('Microsoft.Compute/virtualMachines/read') })], ctx)).conflicts).toEqual([]);
  });

  it('diffs desired rules against deployed roles', async () => {
    const { adapter } = setup();
    await deploy(adapter, USER);
    const observed = await adapter.discoverPolicies(ctx);
    const key = `Allow|${RG.toLowerCase()}`;
    expect(await adapter.reconcile([rule()], observed, ctx)).toEqual({ toAdd: [], toRemove: [], toUpdate: [], noChange: [key] });
    const grown = await adapter.reconcile([rule(op(STORAGE_READ, 'Microsoft.Storage/storageAccounts/write'))], observed, ctx);
    expect(grown.toUpdate.map((u) => [u.ruleId, u.newRule.action.operations])).toEqual([[key, [STORAGE_READ, 'Microsoft.Storage/storageAccounts/write']]]);
    const moved = await adapter.reconcile([rule({ resource: { type: 't', scope: RG2 } })], observed, ctx);
    expect(moved.toAdd.length).toBe(1);
    expect(moved.toRemove).toEqual([key]);
    expect(await failure(() => adapter.reconcile([rule({ ruleId: 'd', effect: 'DENY' })], observed, ctx))).toBe(T('reconcile_error', { error: T('deny_unsupported', { ruleId: 'd' }) }));
  });
});

describe('Azure RBAC dependencies and usage', () => {
  it('lists the principals that depend on a role and sizes the blast radius', async () => {
    const { adapter } = setup();
    const policy = await deploy(adapter, USER, `ServicePrincipal:${SP_ID}`);
    expect(await adapter.findDependencies(policy.providerId, ctx)).toEqual({
      policyId: policy.providerId, dependentRoles: [], dependentActors: [`User/${USER_ID}`], dependentServices: [`ServicePrincipal/${SP_ID}`], blastRadius: 'LIMITED',
    });
    await adapter.attach(policy, `Group:${GROUP_ID}`, ctx);
    expect((await adapter.findDependencies(policy.providerId, ctx)).blastRadius).toBe('BROAD');
  });

  it('counts only the assignments of the role in question', async () => {
    const { adapter } = setup();
    await deploy(adapter, USER);
    const other = await adapter.generate([rule(op('Microsoft.Storage/storageAccounts/write'))], ctx);
    await adapter.attach(other, `ServicePrincipal:${SP_ID}`, ctx);
    await adapter.detach(other.providerId, SP_ID, ctx);
    expect(await adapter.findDependencies(other.providerId, ctx)).toMatchObject({ dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' });
    expect((await adapter.observeUsage(other.providerId, { startAt: '2026-01-01T00:00:00Z', endAt: '2026-10-01T00:00:00Z' }, ctx)).classification).toBe('UNUSED');
    expect((await adapter.retire({ policyId: other.providerId, approvedBy: 'ops' } as any, ctx)).success).toBe(true);
  });

  it('reports unused roles honestly: unassigned is UNUSED, assigned is UNKNOWN', async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule({ resource: { type: 't', scope: SCOPE } })], ctx);
    await adapter.attach(policy, USER, ctx);
    const window = { startAt: '2026-01-01T00:00:00Z', endAt: '2026-10-01T00:00:00Z' };
    expect((await adapter.observeUsage(policy.providerId, window, ctx)).classification).toBe('UNKNOWN');
    expect(await adapter.detectUnused(ctx, 90)).toEqual([]);
    await adapter.detach(policy.providerId, USER, ctx);
    expect(await adapter.observeUsage(policy.providerId, window, ctx)).toMatchObject({ policyId: policy.providerId, observedUsages: 0, classification: 'UNUSED' });
    expect((await adapter.detectUnused(ctx, 90)).map((u) => u.policyId)).toEqual([policy.providerId]);
  });

  it('cannot see an unassigned role that is defined for a single resource group (documented limit)', async () => {
    const { adapter } = setup();
    const policy = await deploy(adapter, USER);
    await adapter.detach(policy.providerId, USER, ctx);
    expect(await adapter.detectUnused(ctx, 90)).toEqual([]);
    expect(await adapter.discoverPolicies(ctx)).toEqual([]);
    expect((await adapter.observeUsage(policy.providerId, { startAt: '2026-01-01T00:00:00Z', endAt: '2026-10-01T00:00:00Z' }, ctx)).classification).toBe('UNUSED');
  });

  it('declares limits and constraints, with usage and effective authority marked as limited', async () => {
    const { adapter } = setup();
    expect(await adapter.getConstraints(ctx)).toBe(AZURE_RBAC_CONSTRAINTS);
    expect(AZURE_RBAC_CONSTRAINTS.maxPoliciesPerRole).toMatchObject({ value: 5000 });
    expect(adapter.capabilities.observeUsage).toBe('SUPPORTED_WITH_LIMITS');
    expect(adapter.capabilities.discoverEffectiveAuthority).toBe('SUPPORTED_WITH_LIMITS');
    expect(adapter.capabilities.simulate).toBe('SUPPORTED_WITH_LIMITS');
  });
});

describe('Azure RBAC client lifecycle', () => {
  it('creates the client lazily, caches it per credential identity, and retries after a factory failure', async () => {
    const az = fakeAzure();
    let calls = 0;
    let failNext = true;
    const adapter = new AzureRbacAdapter(async () => { calls++; if (failNext) { failNext = false; throw new Error('no sdk'); } return az.client; });
    expect(calls).toBe(0);
    expect(await failure(() => adapter.discoverRoles(ctx))).toBe('no sdk');
    await adapter.discoverRoles(ctx);
    await adapter.discoverRoles(ctx);
    expect(calls).toBe(2);
    await adapter.discoverRoles({ ...ctx, credentials: { tenantId: 'other', clientId: 'app' } });
    expect(calls).toBe(3);
  });
});
