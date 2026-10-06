/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - GCP IAM Adapter Lifecycle Tests
 * File           : gcp-iam.lifecycle.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { GcpIamAdapter } from '../adapters/gcp-iam/GcpIamAdapter';
import type { GcpRoleDocument } from '../adapters/gcp-iam/GcpIamHelpers';
import { fakeGcp, ctx, rule, ORG, FOLDER, PROJECT, OTHER, USER, BOB, SA, GROUP, VIEWER } from './support/gcpFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.gcp.${key}`, params);

function setup(options: { roleLimit?: number } = {}) {
  const gcp = fakeGcp(options);
  return { ...gcp, adapter: new GcpIamAdapter(async () => gcp.client) };
}
const op = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const at = (scope: string) => ({ resource: { type: 't', scope } });
const timed = (notBefore?: string, notAfter?: string) => ({ conditions: [{ type: 'TIME_BOUND', value: { ...(notBefore ? { notBefore } : {}), ...(notAfter ? { notAfter } : {}) } }] });
const failure = async (run: () => Promise<any>): Promise<string> => { try { await run(); return ''; } catch (e: any) { return e.message; } };
const writes = (calls: string[], prefix: string): number => calls.filter((c) => c.startsWith(prefix)).length;

describe(__t('gcp_iam_compilation'), () => {
  it('builds one deterministic, order-independent custom role at the rules\' resource', async () => {
    const { adapter } = setup();
    const rules = [rule({ ruleId: 'a' }), rule({ ruleId: 'b', ...op('storage.objects.delete', 'storage.objects.get') })];
    const a = await adapter.generate(rules, ctx);
    const b = await adapter.generate([...rules].reverse(), ctx);
    const doc = a.nativeDocument as GcpRoleDocument;
    const id = a.digest.slice(0, 12);
    expect(doc.role.includedPermissions).toEqual(['storage.objects.delete', 'storage.objects.get', 'storage.objects.list']);
    expect(doc.role.name).toBe(`${PROJECT}/roles/ugondu_${id}`);
    expect(a.providerId).toBe(doc.role.name);
    expect(doc.resource).toBe(PROJECT);
    expect(doc.condition).toBeUndefined();
    expect(doc.role.title).toBe(T('role_title', { digest: id }));
    expect(doc.role.description).toBe(T('role_description', { digest: id }));
    expect(a.digest.length).toBe(64);
    expect(b.digest).toBe(a.digest);
    expect(b.providerId).toBe(a.providerId);
  });

  it(__t('defines_the_role_at_the_organi'), async () => {
    const { adapter } = setup();
    const folder = await adapter.generate([rule(at(FOLDER))], ctx);
    const org = await adapter.generate([rule(at(ORG))], ctx);
    expect((folder.nativeDocument as GcpRoleDocument).resource).toBe(FOLDER);
    expect(folder.providerId.startsWith(`${ORG}/roles/ugondu_`)).toBe(true);
    expect((org.nativeDocument as GcpRoleDocument).resource).toBe(ORG);
    expect(org.providerId.startsWith(`${ORG}/roles/ugondu_`)).toBe(true);
    expect(folder.digest === org.digest).toBe(false);
  });

  it('defaults to the environment project and accepts a projects/ prefixed environment id', async () => {
    const { adapter } = setup();
    expect(((await adapter.generate([rule(at('*'))], ctx)).nativeDocument as GcpRoleDocument).resource).toBe(PROJECT);
    expect(((await adapter.generate([rule(at('*'))], { ...ctx, environmentId: PROJECT })).nativeDocument as GcpRoleDocument).resource).toBe(PROJECT);
  });

  it(__t('compiles_time_bounds_and_expir'), async () => {
    const { adapter } = setup();
    const r = rule({
      ...timed('2026-01-01T00:00:00Z', '2026-12-01T00:00:00Z'),
      conditions: [...timed('2026-01-01T00:00:00Z', '2026-12-01T00:00:00Z').conditions, ...timed('2026-02-01T00:00:00Z').conditions],
      validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2026-06-01T00:00:00Z', type: 'TEMPORARY' },
    });
    const doc = (await adapter.generate([r], ctx)).nativeDocument as GcpRoleDocument;
    expect(doc.condition?.expression).toBe('request.time >= timestamp("2026-02-01T00:00:00.000Z") && request.time < timestamp("2026-06-01T00:00:00.000Z")');
    expect(doc.condition?.title).toBe(T('condition_title', { digest: doc.role.name.slice(`${PROJECT}/roles/ugondu_`.length) }));
    const expiry = (await adapter.generate([rule({ validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2026-06-01T00:00:00Z', type: 'TEMPORARY' } })], ctx)).nativeDocument as GcpRoleDocument;
    expect(expiry.condition?.expression).toBe('request.time < timestamp("2026-06-01T00:00:00.000Z")');
  });

  it(__t('fails_closed_on_everything_an_'), async () => {
    const { adapter } = setup();
    const gen = (...rules: any[]) => failure(() => adapter.generate(rules, ctx));
    expect(await gen(rule({ ruleId: 'd', effect: 'DENY' }))).toBe(T('deny_unsupported', { ruleId: 'd' }));
    expect(await gen(rule({ ruleId: 'c', conditions: [{ type: 'IP_BOUND', value: '10.0.0.0/8' }] }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { requireMfa: true } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { ipRange: '10.0.0.0/8' } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { maxCallsPerHour: 5 } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', resource: { type: 't', scope: PROJECT, conditions: { env: 'prod' } } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', ...timed('yesterday') }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'e', ...op() }))).toBe(T('invalid_rule', { ruleId: 'e' }));
    expect(await gen()).toBe(T('no_rules'));
    expect(await gen(rule(), rule({ ruleId: 'f', ...at(FOLDER) }))).toBe(T('mixed_scopes'));
    expect(await gen(rule(), rule({ ruleId: 'g', ...timed(undefined, '2030-01-01T00:00:00Z') }))).toBe(T('mixed_scopes'));
  });

  it('keeps every grant inside the environment\'s own hierarchy', async () => {
    const { adapter } = setup();
    const gen = (scope: string) => failure(() => adapter.generate([rule(at(scope))], ctx));
    expect(await gen(OTHER)).toBe(T('scope_outside_environment', { resource: OTHER }));
    expect(await gen('folders/999')).toBe(T('scope_outside_environment', { resource: 'folders/999' }));
    expect(await gen('buckets/x')).toBe(T('invalid_resource', { resource: 'buckets/x' }));
    expect(await failure(() => adapter.generate([rule()], { ...ctx, environmentId: 'missing' }))).toContain('unknown projects/missing');
  });
});

describe(__t('gcp_iam_validation'), () => {
  const check = async (patch: (d: GcpRoleDocument) => void) => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule()], ctx);
    patch(policy.nativeDocument as GcpRoleDocument);
    return adapter.validate({ ...policy, digest: '' }, ctx);
  };

  it(__t('accepts_a_generated_role_and_w'), async () => {
    const { adapter } = setup();
    expect((await adapter.validate(await adapter.generate([rule()], ctx), ctx))).toEqual({ valid: true, errors: [], warnings: [] });
    const risky = await adapter.generate([rule(op('resourcemanager.projects.setIamPolicy', 'iam.serviceAccounts.actAs', 'storage.objects.get'))], ctx);
    const res = await adapter.validate(risky, ctx);
    expect(res.valid).toBe(true);
    expect(res.warnings).toEqual([T('validate.escalating_permission', { permission: 'iam.serviceAccounts.actAs' }), T('validate.escalating_permission', { permission: 'resourcemanager.projects.setIamPolicy' })]);
  });

  it(__t('rejects_malformed_roles_with_o'), async () => {
    expect((await check((d) => { d.role.includedPermissions = []; })).errors).toEqual([T('validate.no_permissions')]);
    expect((await check((d) => { d.role.includedPermissions = ['read']; })).errors).toEqual([T('validate.invalid_permission', { permission: 'read' })]);
    expect((await check((d) => { d.role.name = __t('bad_name'); })).errors).toEqual([T('validate.invalid_role_name', { name: __t('bad_name') })]);
    expect((await check((d) => { d.resource = 'buckets/x'; })).errors).toEqual([T('invalid_resource', { resource: 'buckets/x' })]);
    expect((await check((d) => { d.role.title = 'x'.repeat(101); })).errors).toEqual([T('validate.text_too_long', { title: 100, description: 300 })]);
    expect((await check((d) => { d.condition = { title: 't', expression: 'x'.repeat(3001) }; })).errors).toEqual([T('validate.expression_too_long', { limit: 3000 })]);
    expect((await check((d) => { d.role.includedPermissions = Array.from({ length: 3001 }, (_, i) => `svc.res.v${i}`); })).errors).toEqual([T('validate.too_many_permissions', { count: 3001, limit: 3000 })]);
  });

  it(__t('detects_a_digest_that_no_longe'), async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule()], ctx);
    (policy.nativeDocument as GcpRoleDocument).role.includedPermissions.push('storage.objects.delete');
    expect((await adapter.validate(policy, ctx)).errors).toEqual([T('validate.digest_mismatch')]);
  });
});

describe(__t('gcp_iam_attach'), () => {
  it('creates the role and the binding on the rules\' resource', async () => {
    const { adapter, policyOf, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const res = await adapter.attach(policy, USER, ctx);
    expect(res.errors).toEqual([]);
    expect(res.success).toBe(true);
    expect(res.providerRef).toBe(`${PROJECT}#${policy.providerId}#${USER}`);
    expect(policyOf(PROJECT).bindings).toEqual([{ role: policy.providerId, members: [USER] }]);
    expect(roles.get(policy.providerId)?.includedPermissions).toEqual(['storage.objects.get', 'storage.objects.list']);
    expect(policyOf(FOLDER).bindings).toEqual([]);
  });

  it(__t('is_idempotent_and_merges_furth'), async () => {
    const { adapter, policyOf, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    expect((await adapter.attach(policy, USER.toUpperCase().replace('USER:', 'user:'), ctx)).success).toBe(true);
    expect(writes(calls, 'createRole')).toBe(1);
    expect(writes(calls, 'setPolicy')).toBe(1);
    await adapter.attach(policy, SA, ctx);
    await adapter.attach(policy, GROUP, ctx);
    expect(policyOf(PROJECT).bindings).toEqual([{ role: policy.providerId, members: [USER, SA, GROUP] }]);
  });

  it(__t('binds_conditionally_keeping_co'), async () => {
    const { adapter, policyOf } = setup();
    const open = await adapter.generate([rule()], ctx);
    const timedPolicy = await adapter.generate([rule(timed(undefined, '2030-01-01T00:00:00Z'))], ctx);
    await adapter.attach(timedPolicy, USER, ctx);
    const doc = timedPolicy.nativeDocument as GcpRoleDocument;
    expect(policyOf(PROJECT).bindings).toEqual([{ role: timedPolicy.providerId, members: [USER], condition: { title: doc.condition?.title, expression: doc.condition?.expression } }]);
    await adapter.attach(open, USER, ctx);
    expect(open.providerId === timedPolicy.providerId).toBe(false);
    expect(policyOf(PROJECT).bindings).toHaveLength(2);
  });

  it(__t('grants_folder_level_access_thr'), async () => {
    const { adapter, policyOf, client } = setup();
    const policy = await adapter.generate([rule(at(FOLDER))], ctx);
    expect((await adapter.attach(policy, USER, ctx)).success).toBe(true);
    expect(policyOf(FOLDER).bindings).toEqual([{ role: policy.providerId, members: [USER] }]);
    expect(policyOf(PROJECT).bindings).toEqual([]);
    expect(await client.troubleshoot('alice@example.com', PROJECT, 'storage.objects.get')).toBe('GRANTED');
    expect(await client.troubleshoot('alice@example.com', OTHER, 'storage.objects.get')).toBe('NOT_GRANTED');
  });

  it(__t('grants_a_predefined_role_that_'), async () => {
    const { adapter, policyOf } = setup();
    const native = (name: string) => ({ providerId: name, providerType: 'GCP_IAM' as const, digest: '', nativeDocument: { role: { name, title: 't', description: 'd', stage: 'GA', includedPermissions: ['storage.objects.get'] }, resource: PROJECT } });
    expect((await adapter.attach(native(VIEWER), BOB, ctx)).success).toBe(true);
    expect(policyOf(PROJECT).bindings).toEqual([{ role: VIEWER, members: [BOB] }]);
    const missing = await adapter.attach(native('roles/nothing.here'), BOB, ctx);
    expect(missing.success).toBe(false);
    expect(missing.errors).toEqual([T('attach_error', { error: 'no role roles/nothing.here' })]);
  });

  it(__t('refuses_invalid_members_invali'), async () => {
    const { adapter, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    for (const member of ['alice@example.com', 'allUsers', 'allAuthenticatedUsers', 'user:']) {
      expect((await adapter.attach(policy, member, ctx)).errors).toEqual([T('attach_error', { error: T('invalid_member', { member }) })]);
    }
    const broken = { ...policy, digest: '', nativeDocument: { ...(policy.nativeDocument as GcpRoleDocument), role: { ...(policy.nativeDocument as GcpRoleDocument).role, includedPermissions: [] } } };
    expect((await adapter.attach(broken, USER, ctx)).errors).toEqual([T('validate.no_permissions')]);
    const foreign = { ...policy, digest: '', nativeDocument: { ...(policy.nativeDocument as GcpRoleDocument), resource: OTHER } };
    expect((await adapter.attach(foreign, USER, ctx)).errors).toEqual([T('attach_error', { error: T('scope_outside_environment', { resource: OTHER }) })]);
    const foreignRole = { ...policy, digest: '', nativeDocument: { ...(policy.nativeDocument as GcpRoleDocument), role: { ...(policy.nativeDocument as GcpRoleDocument).role, name: `${OTHER}/roles/ugondu_abc` } } };
    expect((await adapter.attach(foreignRole, USER, ctx)).errors).toEqual([T('attach_error', { error: T('scope_outside_environment', { resource: OTHER }) })]);
    expect(calls).toEqual([]);
  });

  it(__t('never_replaces_a_role_of_the_s'), async () => {
    const { adapter, seed, calls, policyOf, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    seed.role(policy.providerId, ['storage.objects.get']);
    const res = await adapter.attach(policy, USER, ctx);
    expect(res.errors).toEqual([T('attach_error', { error: T('role_exists_different', { name: policy.providerId }) })]);
    expect(calls).toEqual([]);
    expect(policyOf(PROJECT).bindings).toEqual([]);
    expect(roles.get(policy.providerId)?.includedPermissions).toEqual(['storage.objects.get']);
  });

  it(__t('revives_an_identical_soft_dele'), async () => {
    const { adapter, seed, roles, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    seed.role(policy.providerId, ['storage.objects.get', 'storage.objects.list'], { deleted: true });
    expect((await adapter.attach(policy, USER, ctx)).success).toBe(true);
    expect(roles.get(policy.providerId)?.deleted).toBe(false);
    expect(calls).toContain(`undeleteRole:${policy.providerId}`);
  });

  it(__t('retries_a_concurrent_edit_on_a'), async () => {
    const { adapter, seed, calls, policyOf } = setup();
    const policy = await adapter.generate([rule()], ctx);
    seed.bind(PROJECT, VIEWER, [BOB]);
    seed.abortNext(2);
    expect((await adapter.attach(policy, USER, ctx)).success).toBe(true);
    expect(writes(calls, 'setPolicy')).toBe(3);
    expect(policyOf(PROJECT).bindings).toHaveLength(2);
    const other = await adapter.generate([rule({ ...op('storage.buckets.get') })], ctx);
    seed.abortNext(5);
    expect((await adapter.attach(other, USER, ctx)).errors).toEqual([T('attach_error', { error: T('policy_conflict', { resource: PROJECT }) })]);
    expect(policyOf(PROJECT).bindings.some((b) => b.role === other.providerId)).toBe(false);
    expect(policyOf(PROJECT).bindings.some((b) => b.role === VIEWER && b.members.includes(BOB))).toBe(true);
  });

  it('stops at the principal limit and at the provider\'s role quota, reporting the provider\__t('s_reason'), async () => {
    const { adapter, seed, policyOf } = setup();
    seed.bind(PROJECT, VIEWER, Array.from({ length: 1500 }, (_, i) => `user:u${i}@example.com`));
    const policy = await adapter.generate([rule()], ctx);
    expect((await adapter.attach(policy, USER, ctx)).errors).toEqual([T('attach_error', { error: T('policy_full', { limit: 1500 }) })]);
    expect(policyOf(PROJECT).bindings).toHaveLength(1);
    const limited = setup({ roleLimit: 1 });
    await limited.adapter.attach(await limited.adapter.generate([rule()], ctx), USER, ctx);
    const second = await limited.adapter.attach(await limited.adapter.generate([rule(op('storage.buckets.get'))], ctx), USER, ctx);
    expect(second.errors).toEqual([T('attach_error', { error: __t('role_quota') })]);
  });

  it(__t('builds_the_client_once_per_env'), async () => {
    const gcp = fakeGcp();
    let builds = 0;
    const adapter = new GcpIamAdapter(async () => { builds++; if (builds === 1) throw new Error('offline'); return gcp.client; });
    expect(await failure(() => adapter.discoverPolicies(ctx))).toBe('offline');
    await adapter.discoverPolicies(ctx);
    await adapter.discoverAssignments(ctx);
    await adapter.discoverPolicies({ ...ctx, environmentId: 'app-prod' });
    expect(builds).toBe(2);
  });
});

describe(__t('gcp_iam_detach'), () => {
  it('removes only the member from the role\'s bindings and drops bindings left empty', async () => {
    const { adapter, policyOf, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    await adapter.attach(policy, BOB, ctx);
    seed.bind(PROJECT, VIEWER, [USER]);
    expect((await adapter.detach(policy.providerId, USER, ctx)).success).toBe(true);
    expect(policyOf(PROJECT).bindings).toEqual([{ role: policy.providerId, members: [BOB] }, { role: VIEWER, members: [USER] }]);
    await adapter.detach(policy.providerId, BOB, ctx);
    expect(policyOf(PROJECT).bindings).toEqual([{ role: VIEWER, members: [USER] }]);
  });

  it(__t('detaches_from_every_resource_o'), async () => {
    const { adapter, policyOf, seed, calls } = setup();
    const policy = await adapter.generate([rule(at(ORG))], ctx);
    await adapter.attach(policy, USER, ctx);
    seed.bind(FOLDER, policy.providerId, [USER, BOB]);
    seed.bind(PROJECT, policy.providerId, [USER]);
    seed.bind(OTHER, policy.providerId, [USER]);
    const before = writes(calls, 'setPolicy');
    expect((await adapter.detach(policy.providerId, USER, ctx)).success).toBe(true);
    expect(writes(calls, 'setPolicy') - before).toBe(3);
    expect(policyOf(ORG).bindings).toEqual([]);
    expect(policyOf(FOLDER).bindings).toEqual([{ role: policy.providerId, members: [BOB] }]);
    expect(policyOf(PROJECT).bindings).toEqual([]);
    expect(policyOf(OTHER).bindings).toEqual([{ role: policy.providerId, members: [USER] }]);
  });

  it(__t('writes_nothing_when_the_member'), async () => {
    const { adapter, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    expect((await adapter.detach(policy.providerId, USER, ctx)).success).toBe(true);
    expect(calls).toEqual([]);
    expect((await adapter.detach(policy.providerId, 'nobody', ctx)).errors).toEqual([T('detach_error', { error: T('invalid_member', { member: 'nobody' }) })]);
  });
});
