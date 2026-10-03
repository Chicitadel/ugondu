/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - Azure RBAC Adapter Lifecycle Tests
 * File           : azure-rbac.lifecycle.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AzureRbacAdapter } from '../adapters/azure-rbac/AzureRbacAdapter';
import type { AzureRoleDocument } from '../adapters/azure-rbac/AzureRbacHelpers';
import { fakeAzure, ctx, rule, SCOPE, RG, RG2, USER_ID, GROUP_ID, READER_ID } from './support/azureFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.azure.${key}`, params);

function setup() {
  const az = fakeAzure();
  return { ...az, adapter: new AzureRbacAdapter(async () => az.client) };
}
const op = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const failure = async (run: () => Promise<any>): Promise<string> => { try { await run(); return ''; } catch (e: any) { return e.message; } };

describe('Azure RBAC compilation', () => {
  it('builds one deterministic, order-independent custom role at the rules\' scope', async () => {
    const { adapter } = setup();
    const rules = [rule({ ruleId: 'a' }), rule({ ruleId: 'b', ...op('Microsoft.Storage/storageAccounts/listKeys/action', 'Microsoft.Storage/storageAccounts/read') })];
    const a = await adapter.generate(rules, ctx);
    const b = await adapter.generate([...rules].reverse(), ctx);
    const doc = a.nativeDocument as AzureRoleDocument;
    expect(doc.permissions).toEqual([{ actions: ['Microsoft.Storage/storageAccounts/listKeys/action', 'Microsoft.Storage/storageAccounts/read'], notActions: [], dataActions: [], notDataActions: [] }]);
    expect(doc.assignableScopes).toEqual([RG]);
    expect(doc.assignmentScope).toBe(RG);
    expect(/^ugondu-[a-f0-9]{12}$/.test(doc.roleName)).toBe(true);
    expect(a.providerId).toBe(b.providerId);
    expect(a.digest).toBe(b.digest);
    expect(a.digest.length).toBe(64);
    expect(new RegExp(`^${RG}/providers/Microsoft.Authorization/roleDefinitions/[0-9a-f-]{36}$`, 'i').test(a.providerId)).toBe(true);
    expect(doc.description).toBe(T('role_description', { digest: doc.roleName.slice('ugondu-'.length) }));
  });

  it('splits data-plane operations and encloses resource-level scopes in their resource group', async () => {
    const { adapter } = setup();
    const blob = `${RG}/providers/Microsoft.Storage/storageAccounts/acct`;
    const doc = (await adapter.generate([rule({ resource: { type: 't', scope: blob }, ...op('data:Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read', 'Microsoft.Storage/storageAccounts/read') })], ctx)).nativeDocument as AzureRoleDocument;
    expect(doc.permissions[0].actions).toEqual(['Microsoft.Storage/storageAccounts/read']);
    expect(doc.permissions[0].dataActions).toEqual(['Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read']);
    expect(doc.assignableScopes).toEqual([RG]);
    expect(doc.assignmentScope).toBe(blob);
  });

  it('defaults to the environment subscription when the rule has no scope', async () => {
    const { adapter } = setup();
    const doc = (await adapter.generate([rule({ resource: { type: 't', scope: '*' } })], ctx)).nativeDocument as AzureRoleDocument;
    expect(doc.assignmentScope).toBe(SCOPE);
    expect(doc.assignableScopes).toEqual([SCOPE]);
  });

  it('fails closed on everything Azure role assignments cannot express', async () => {
    const { adapter } = setup();
    const gen = (...rules: any[]) => failure(() => adapter.generate(rules, ctx));
    expect(await gen(rule({ ruleId: 'd', effect: 'DENY' }))).toBe(T('deny_unsupported', { ruleId: 'd' }));
    expect(await gen(rule({ ruleId: 'c', conditions: [{ type: 'TAG_MATCH', value: { key: 'k', value: 'v' } }] }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { requireMfa: true } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', resource: { type: 't', scope: RG, conditions: { env: 'prod' } } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'v', validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2030-01-01T00:00:00Z', type: 'TEMPORARY' } }))).toBe(T('validity_unsupported', { ruleId: 'v' }));
    expect(await gen(rule({ ruleId: 'e', ...op() }))).toBe(T('invalid_rule', { ruleId: 'e' }));
    expect(await gen()).toBe(T('no_rules'));
    expect(await gen(rule(), rule({ ruleId: 'other', resource: { type: 't', scope: RG2 } }))).toBe(T('mixed_scopes'));
    expect(await gen(rule({ resource: { type: 't', scope: 'not-a-scope' } }))).toBe(T('invalid_scope', { scope: 'not-a-scope' }));
  });
});

describe('Azure RBAC validation', () => {
  it('accepts a generated role and warns on family wildcards', async () => {
    const { adapter } = setup();
    expect((await adapter.validate(await adapter.generate([rule()], ctx), ctx)).valid).toBe(true);
    const wide = await adapter.generate([rule(op('Microsoft.Compute/*'))], ctx);
    const res = await adapter.validate(wide, ctx);
    expect(res.valid).toBe(true);
    expect(res.warnings).toEqual([T('validate.broad_wildcard', { action: 'Microsoft.Compute/*' })]);
  });

  it('rejects the all-operations wildcard, malformed operations, and inconsistent scopes', async () => {
    const { adapter } = setup();
    const check = async (patch: (d: AzureRoleDocument) => void) => {
      const policy = await adapter.generate([rule()], ctx);
      patch(policy.nativeDocument as AzureRoleDocument);
      return adapter.validate({ ...policy, digest: '' }, ctx);
    };
    expect((await check((d) => { d.permissions[0].actions = ['*']; })).errors).toEqual([T('validate.admin_wildcard')]);
    expect((await check((d) => { d.permissions[0].actions = ['read']; })).errors).toEqual([T('validate.invalid_action', { action: 'read' })]);
    expect((await check((d) => { d.permissions = []; })).errors).toEqual([T('validate.no_permissions')]);
    expect((await check((d) => { d.assignableScopes = []; d.assignmentScope = ''; })).errors).toEqual([T('validate.no_assignable_scopes')]);
    const blob = `${RG}/providers/Microsoft.Storage/storageAccounts/acct`;
    expect((await check((d) => { d.assignableScopes = [blob]; d.assignmentScope = blob; })).errors).toEqual([T('validate.resource_assignable', { scope: blob })]);
    expect((await check((d) => { d.assignmentScope = RG2; })).errors).toEqual([T('validate.assignment_outside', { scope: RG2 })]);
  });

  it('detects a digest that no longer matches the document', async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule()], ctx);
    (policy.nativeDocument as AzureRoleDocument).permissions[0].actions.push('Microsoft.Storage/storageAccounts/delete');
    expect((await adapter.validate(policy, ctx)).errors).toEqual([T('validate.digest_mismatch')]);
  });
});

describe('Azure RBAC attach and detach', () => {
  it('creates the role and the assignment once, and is idempotent', async () => {
    const { adapter, calls, roles, assignments } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const first = await adapter.attach(policy, `User:${USER_ID}`, ctx);
    const second = await adapter.attach(policy, `User:${USER_ID}`, ctx);
    expect(first.success).toBe(true);
    expect(second.providerRef).toBe(first.providerRef);
    expect(calls.filter((c) => c.startsWith('putRole')).length).toBe(1);
    expect(calls.filter((c) => c.startsWith('assign')).length).toBe(1);
    expect(roles.size).toBe(2); // the seeded built-in plus the new custom role
    expect([...assignments.values()][0]).toMatchObject({ scope: RG, principalId: USER_ID, principalType: 'User', roleDefinitionId: policy.providerId });
  });

  it('accepts an identical assignment that already exists under another name', async () => {
    const { adapter, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, GROUP_ID, ctx);
    seed.assign(RG, USER_ID, 'User', policy.providerId, 'portal-made');
    const res = await adapter.attach(policy, USER_ID, ctx);
    expect(res.success).toBe(true);
    expect(res.providerRef.endsWith('/roleAssignments/portal-made')).toBe(true);
  });

  it('assigns an existing built-in role without redefining it', async () => {
    const { adapter, calls } = setup();
    const doc: AzureRoleDocument = { roleName: 'Reader', description: '', permissions: [{ actions: ['*/read'], notActions: [], dataActions: [], notDataActions: [] }], assignableScopes: [SCOPE], assignmentScope: SCOPE };
    const res = await adapter.attach({ providerId: READER_ID, providerType: 'AZURE_RBAC', nativeDocument: doc, digest: '' }, `ServicePrincipal:${USER_ID}`, ctx);
    expect(res.success).toBe(true);
    expect(calls.filter((c) => c.startsWith('putRole')).length).toBe(0);
  });

  it('refuses a role id that already holds different permissions', async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    roles.set(policy.providerId.toLowerCase(), { id: policy.providerId, name: 'x', roleName: 'someone-elses', description: '', roleType: 'CustomRole', assignableScopes: [RG], permissions: [{ actions: ['Microsoft.Storage/*'], notActions: [], dataActions: [], notDataActions: [] }] });
    const res = await adapter.attach(policy, USER_ID, ctx);
    expect(res.success).toBe(false);
    expect(res.errors).toEqual([T('attach_error', { error: T('role_exists_different', { id: policy.providerId }) })]);
  });

  it('reports invalid principals and invalid documents without calling Azure', async () => {
    const { adapter, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    expect((await adapter.attach(policy, 'not-a-guid', ctx)).errors).toEqual([T('attach_error', { error: T('invalid_principal', { principal: 'not-a-guid' }) })]);
    (policy.nativeDocument as AzureRoleDocument).permissions[0].actions = ['*'];
    expect((await adapter.attach({ ...policy, digest: '' }, USER_ID, ctx)).errors).toEqual([T('validate.admin_wildcard')]);
    expect(calls.length).toBe(0);
  });

  it('detaches only the named principal, and detaching twice is harmless', async () => {
    const { adapter, assignments } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    await adapter.attach(policy, GROUP_ID, ctx);
    expect((await adapter.detach(policy.providerId, USER_ID, ctx)).success).toBe(true);
    expect((await adapter.detach(policy.providerId, USER_ID, ctx)).success).toBe(true);
    expect([...assignments.values()].map((a) => a.principalId)).toEqual([GROUP_ID]);
  });

  it('treats a missing role as already detached and rejects malformed ids', async () => {
    const { adapter } = setup();
    expect((await adapter.detach(`${RG}/providers/Microsoft.Authorization/roleDefinitions/${USER_ID}`, USER_ID, ctx)).success).toBe(true);
    const bad = await adapter.detach('nope', USER_ID, ctx);
    expect(bad.errors).toEqual([T('detach_error', { error: T('invalid_role_id', { id: 'nope' }) })]);
  });
});

describe('Azure RBAC update and clone', () => {
  it('replaces the permissions of a custom role in place and keeps its name and assignments', async () => {
    const { adapter, roles, assignments } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    const res = await adapter.update(policy.providerId, [rule(op('Microsoft.Storage/storageAccounts/write'))], ctx);
    expect(res.success).toBe(true);
    expect(/^[a-f0-9]{12}$/.test(res.version)).toBe(true);
    const role = roles.get(policy.providerId.toLowerCase())!;
    expect(role.permissions[0].actions).toEqual(['Microsoft.Storage/storageAccounts/write']);
    expect(role.roleName).toBe((policy.nativeDocument as AzureRoleDocument).roleName);
    expect(assignments.size).toBe(1);
  });

  it('refuses to update built-in roles or to move a role outside its assignable scopes', async () => {
    const { adapter } = setup();
    expect((await adapter.update(READER_ID, [rule()], ctx)).errors).toEqual([T('update_error', { error: T('protected_role', { id: READER_ID }) })]);
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    const moved = await adapter.update(policy.providerId, [rule({ resource: { type: 't', scope: RG2 } })], ctx);
    expect(moved.errors).toEqual([T('update_error', { error: T('update_scope_change', { id: policy.providerId }) })]);
  });

  it('rejects updates that do not validate', async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    expect((await adapter.update(policy.providerId, [rule(op('*'))], ctx)).errors).toEqual([T('validate.admin_wildcard')]);
  });

  it('clones custom and built-in roles idempotently under a new name', async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    const one = await adapter.clone(policy.providerId, 'Storage reader copy', ctx);
    const two = await adapter.clone(policy.providerId, 'Storage reader copy', ctx);
    expect(one.success).toBe(true);
    expect(two.clonedId).toBe(one.clonedId);
    expect(roles.get(one.clonedId.toLowerCase())!.roleName).toBe('Storage reader copy');
    const builtin = await adapter.clone(READER_ID, 'Reader copy', ctx);
    expect(roles.get(builtin.clonedId.toLowerCase())).toMatchObject({ roleType: 'CustomRole', assignableScopes: [SCOPE] });
  });

  it('refuses a clone name that belongs to a different role and invalid names', async () => {
    const { adapter } = setup();
    const a = await adapter.generate([rule()], ctx);
    const b = await adapter.generate([rule(op('Microsoft.Storage/storageAccounts/write'))], ctx);
    await adapter.attach(a, USER_ID, ctx);
    await adapter.attach(b, USER_ID, ctx);
    await adapter.clone(a.providerId, 'shared name', ctx);
    const clash = await adapter.clone(b.providerId, 'shared name', ctx);
    expect(clash.success).toBe(false);
    expect((await adapter.clone(a.providerId, '   ', ctx)).errors).toEqual([T('clone_error', { error: T('invalid_name', { limit: 512 }) })]);
  });
});

describe('Azure RBAC retirement and restore', () => {
  const plan = (policyId: string): any => ({ policyId, reason: 'test', approvedBy: 'ops', approvedAt: '2026-10-03T00:00:00Z' });

  it('refuses to retire a role that is still assigned, then retires it with a rollback snapshot', async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    expect((await adapter.retire(plan(policy.providerId), ctx)).errors).toEqual([T('retire_error', { error: T('retire_in_use', { id: policy.providerId, count: 1 }) })]);
    await adapter.detach(policy.providerId, USER_ID, ctx);
    const res = await adapter.retire(plan(policy.providerId), ctx);
    expect(res.success).toBe(true);
    expect(roles.has(policy.providerId.toLowerCase())).toBe(false);
    expect(JSON.parse(res.rollbackReference!).id).toBe(policy.providerId);
    expect(JSON.parse(res.detachmentEvidence!)).toMatchObject({ policy: policy.providerId, assignments: 0, approvedBy: 'ops' });
  });

  it('never retires built-in roles', async () => {
    const { adapter } = setup();
    expect((await adapter.retire(plan(READER_ID), ctx)).errors).toEqual([T('retire_error', { error: T('protected_role', { id: READER_ID }) })]);
  });

  it('restores a retired role under its original id, idempotently', async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    await adapter.detach(policy.providerId, USER_ID, ctx);
    const retired = await adapter.retire(plan(policy.providerId), ctx);
    const cert: any = { policyId: policy.providerId, rollbackReference: retired.rollbackReference };
    const back = await adapter.restore(cert, ctx);
    expect(back).toEqual({ success: true, restoredId: policy.providerId, errors: [] });
    expect(roles.get(policy.providerId.toLowerCase())!.permissions[0].actions).toEqual(['Microsoft.Storage/storageAccounts/read']);
    expect((await adapter.restore(cert, ctx)).restoredId).toBe(policy.providerId);
  });

  it('rejects missing, mismatched, unsafe and conflicting snapshots', async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER_ID, ctx);
    await adapter.detach(policy.providerId, USER_ID, ctx);
    const retired = await adapter.retire(plan(policy.providerId), ctx);
    const snapshot = JSON.parse(retired.rollbackReference!);
    const run = (cert: any) => adapter.restore(cert, ctx);
    expect((await run({ policyId: policy.providerId })).errors).toEqual([T('restore_no_reference')]);
    expect((await run({ policyId: `${RG2}/providers/Microsoft.Authorization/roleDefinitions/${USER_ID}`, rollbackReference: retired.rollbackReference })).errors)
      .toEqual([T('restore_error', { error: T('restore_invalid_snapshot', { id: `${RG2}/providers/Microsoft.Authorization/roleDefinitions/${USER_ID}` }) })]);
    snapshot.payload.permissions[0].actions = ['*'];
    expect((await run({ policyId: policy.providerId, rollbackReference: JSON.stringify(snapshot) })).errors).toEqual([T('restore_error', { error: T('validate.admin_wildcard') })]);
    expect((await run({ policyId: policy.providerId, rollbackReference: '{broken' })).success).toBe(false);
    roles.set(policy.providerId.toLowerCase(), { id: policy.providerId, name: 'x', roleName: 'squatter', description: '', roleType: 'CustomRole', assignableScopes: [RG], permissions: [{ actions: ['Microsoft.Storage/*'], notActions: [], dataActions: [], notDataActions: [] }] });
    expect((await run({ policyId: policy.providerId, rollbackReference: retired.rollbackReference })).errors).toEqual([T('restore_error', { error: T('role_exists_different', { id: policy.providerId }) })]);
  });
});
