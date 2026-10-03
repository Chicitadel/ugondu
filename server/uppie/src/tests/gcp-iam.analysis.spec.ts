/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - GCP IAM Adapter Analysis Tests
 * File           : gcp-iam.analysis.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { GcpIamAdapter } from '../adapters/gcp-iam/GcpIamAdapter';
import { GCP_IAM_CONSTRAINTS } from '../adapters/gcp-iam/GcpIamConstraints';
import type { GcpRoleDocument } from '../adapters/gcp-iam/GcpIamHelpers';
import { fakeGcp, ctx, rule, ORG, FOLDER, PROJECT, OTHER, USER, BOB, SA, GROUP, VIEWER } from './support/gcpFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.gcp.${key}`, params);
const COND = { title: 'until 2030', expression: 'request.time < timestamp("2030-01-01T00:00:00.000Z")' };

function setup() {
  const gcp = fakeGcp();
  return { ...gcp, adapter: new GcpIamAdapter(async () => gcp.client) };
}
const op = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const by = (id: string) => ({ subject: { type: 'USER', id } });
const failure = async (run: () => Promise<any>): Promise<string> => { try { await run(); return ''; } catch (e: any) { return e.message; } };

describe('GCP IAM discovery', () => {
  it('lists the custom roles of the project and organization as native policies', async () => {
    const { adapter, seed } = setup();
    const own = await adapter.generate([rule()], ctx);
    await adapter.attach(own, USER, ctx);
    seed.role(`${ORG}/roles/org_role`, ['storage.buckets.get']);
    seed.role(`${PROJECT}/roles/gone`, ['storage.buckets.get'], { deleted: true });
    seed.role(`${OTHER}/roles/elsewhere`, ['storage.buckets.get']);
    const found = await adapter.discoverPolicies(ctx);
    expect(found.map((p) => p.providerId).sort()).toEqual([own.providerId, `${ORG}/roles/org_role`].sort());
    const org = found.find((p) => p.providerId === `${ORG}/roles/org_role`) as any;
    expect(org.providerType).toBe('GCP_IAM');
    expect((org.nativeDocument as GcpRoleDocument).resource).toBe(ORG);
    expect((org.nativeDocument as GcpRoleDocument).role.includedPermissions).toEqual(['storage.buckets.get']);
    expect(org.digest.length).toBe(64);
  });

  it('maps members to roles across the whole hierarchy without duplicates', async () => {
    const { adapter, seed } = setup();
    seed.bind(PROJECT, VIEWER, [USER, SA]);
    seed.bind(FOLDER, VIEWER, [USER]);
    seed.bind(ORG, 'roles/storage.objectAdmin', [USER, GROUP]);
    seed.bind(OTHER, 'roles/storage.objectAdmin', [BOB]);
    expect(await adapter.discoverAssignments(ctx)).toEqual({ [USER]: [VIEWER, 'roles/storage.objectAdmin'], [SA]: [VIEWER], [GROUP]: ['roles/storage.objectAdmin'] });
  });

  it('separates individual identities from groups, domains and principal sets', async () => {
    const { adapter, seed } = setup();
    seed.bind(PROJECT, VIEWER, [USER, SA, GROUP, 'domain:example.com']);
    seed.bind(ORG, VIEWER, ['principalSet://iam.googleapis.com/projects/1/locations/global/workloadIdentityPools/p/*']);
    const identities = await adapter.discoverIdentities(ctx);
    expect(identities).toEqual([{ id: USER, type: 'USER', displayName: 'alice@example.com' }, { id: SA, type: 'SERVICEACCOUNT', displayName: 'ci@app-prod.iam.gserviceaccount.com' }]);
    const groups = await adapter.discoverGroups(ctx);
    expect(groups.map((g) => g.id)).toEqual([GROUP, 'domain:example.com', 'principalSet://iam.googleapis.com/projects/1/locations/global/workloadIdentityPools/p/*']);
    expect(groups.every((g) => g.members.length === 0)).toBe(true);
  });

  it('lists granted and defined roles, skipping bindings to roles that no longer exist', async () => {
    const { adapter, seed } = setup();
    seed.role(`${PROJECT}/roles/mine`, ['storage.objects.get'], { title: 'Mine' });
    seed.bind(PROJECT, VIEWER, [USER]);
    seed.role(`${PROJECT}/roles/ghost`, ['storage.objects.get']);
    seed.bind(PROJECT, `${PROJECT}/roles/ghost`, [USER]);
    seed.purge(`${PROJECT}/roles/ghost`);
    seed.role(`${PROJECT}/roles/soft`, ['storage.objects.get']);
    seed.bind(PROJECT, `${PROJECT}/roles/soft`, [USER]);
    seed.role(`${PROJECT}/roles/soft`, ['storage.objects.get'], { deleted: true });
    expect(await adapter.discoverRoles(ctx)).toEqual([
      { id: `${PROJECT}/roles/mine`, displayName: 'Mine', policies: [`${PROJECT}/roles/mine`] },
      { id: VIEWER, displayName: 'Viewer', policies: [VIEWER] },
    ]);
  });
});

describe('GCP IAM dependencies', () => {
  it('names the members holding a role across the hierarchy and sizes the blast radius', async () => {
    const { adapter, seed } = setup();
    const policy = await adapter.generate([rule(at(ORG))], ctx);
    await adapter.attach(policy, USER, ctx);
    let report = await adapter.findDependencies(policy.providerId, ctx);
    expect(report).toEqual({ policyId: policy.providerId, dependentRoles: [], dependentActors: [USER], dependentServices: [], blastRadius: 'LIMITED' });
    seed.bind(PROJECT, policy.providerId, [SA, BOB]);
    seed.bind(OTHER, policy.providerId, ['user:elsewhere@example.com']);
    report = await adapter.findDependencies(policy.providerId, ctx);
    expect(report.dependentActors.sort()).toEqual([BOB, USER].sort());
    expect(report.dependentServices).toEqual([SA]);
    expect(report.blastRadius).toBe('LIMITED');
    seed.bind(FOLDER, policy.providerId, ['user:c@example.com', 'user:d@example.com']);
    expect((await adapter.findDependencies(policy.providerId, ctx)).blastRadius).toBe('SIGNIFICANT');
  });

  it('is MINIMAL for an unbound role and BROAD as soon as a group depends on it', async () => {
    const { adapter, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    await adapter.detach(policy.providerId, USER, ctx);
    expect((await adapter.findDependencies(policy.providerId, ctx)).blastRadius).toBe('MINIMAL');
    seed.bind(PROJECT, policy.providerId, [GROUP]);
    expect((await adapter.findDependencies(policy.providerId, ctx)).blastRadius).toBe('BROAD');
  });
});

function at(scope: string) { return { resource: { type: 't', scope } }; }

describe('GCP IAM effective authority (model)', () => {
  it('merges the permissions of every role the member holds on the resource and its ancestors', async () => {
    const { adapter, seed } = setup();
    seed.bind(FOLDER, VIEWER, [USER]);
    seed.bind(PROJECT, 'roles/storage.objectAdmin', [USER]);
    seed.bind(PROJECT, VIEWER, [BOB]);
    const res = await adapter.discoverEffectiveAuthority(USER, PROJECT, ctx);
    expect(res.evaluationMethod).toBe('PARTIAL_MODEL');
    expect(res.resourceId).toBe(PROJECT);
    expect(res.permissions.map((p) => [p.capability, p.state, p.confidence, ...p.sourcePolicies])).toEqual([
      ['resourcemanager.projects.get', 'GRANTED', 'MEDIUM', VIEWER],
      ['storage.objects.delete', 'GRANTED', 'MEDIUM', 'roles/storage.objectAdmin'],
      ['storage.objects.get', 'GRANTED', 'MEDIUM', 'roles/storage.objectAdmin', VIEWER],
      ['storage.objects.list', 'GRANTED', 'MEDIUM', 'roles/storage.objectAdmin'],
    ]);
    const atFolder = await adapter.discoverEffectiveAuthority(USER, FOLDER, ctx);
    expect(atFolder.permissions.map((p) => p.capability)).toEqual(['resourcemanager.projects.get', 'storage.objects.get']);
  });

  it('marks conditional grants as conditional unless an unconditional grant also gives the permission', async () => {
    const { adapter, seed } = setup();
    seed.bind(PROJECT, VIEWER, [USER], COND);
    seed.bind(PROJECT, 'roles/storage.objectAdmin', [USER]);
    const perms = (await adapter.discoverEffectiveAuthority(USER, PROJECT, ctx)).permissions;
    const state = (c: string) => perms.find((p) => p.capability === c);
    expect(state('resourcemanager.projects.get')).toMatchObject({ state: 'CONDITIONALLY_GRANTED', confidence: 'LOW' });
    expect(state('storage.objects.get')).toMatchObject({ state: 'GRANTED', confidence: 'MEDIUM' });
    const reversed = setup();
    reversed.seed.bind(PROJECT, 'roles/storage.objectAdmin', [USER]);
    reversed.seed.bind(PROJECT, VIEWER, [USER], COND);
    const later = (await reversed.adapter.discoverEffectiveAuthority(USER, PROJECT, ctx)).permissions.find((p) => p.capability === 'storage.objects.get');
    expect(later).toMatchObject({ state: 'GRANTED', confidence: 'MEDIUM' });
  });

  it('does not see group-derived access, skips deleted roles and rejects bad input', async () => {
    const { adapter, seed } = setup();
    seed.bind(PROJECT, VIEWER, [GROUP]);
    seed.group(GROUP, ['alice@example.com']);
    expect((await adapter.discoverEffectiveAuthority(USER, PROJECT, ctx)).permissions).toEqual([]);
    seed.role(`${PROJECT}/roles/soft`, ['storage.buckets.get']);
    seed.bind(PROJECT, `${PROJECT}/roles/soft`, [USER]);
    seed.role(`${PROJECT}/roles/soft`, ['storage.buckets.get'], { deleted: true });
    seed.role(`${PROJECT}/roles/gone`, ['storage.buckets.get']);
    seed.bind(PROJECT, `${PROJECT}/roles/gone`, [USER]);
    seed.purge(`${PROJECT}/roles/gone`);
    expect((await adapter.discoverEffectiveAuthority(USER, PROJECT, ctx)).permissions).toEqual([]);
    expect(await failure(() => adapter.discoverEffectiveAuthority('alice', PROJECT, ctx))).toBe(T('invalid_member', { member: 'alice' }));
    expect(await failure(() => adapter.discoverEffectiveAuthority(USER, OTHER, ctx))).toBe(T('scope_outside_environment', { resource: OTHER }));
  });
});

describe('GCP IAM evaluation and simulation (troubleshooter)', () => {
  it('evaluates through the hierarchy and group membership, and reports denial and uncertainty', async () => {
    const { adapter, seed } = setup();
    const ask = (id: string, ...ops: string[]) => adapter.evaluate(rule({ ...by(id), ...op(...ops) }), ctx);
    expect(await ask(USER, 'storage.objects.get')).toBe('DENIED');
    seed.bind(FOLDER, VIEWER, [USER]);
    expect(await ask(USER, 'storage.objects.get')).toBe('GRANTED');
    expect(await ask(USER, 'storage.objects.get', 'storage.objects.list')).toBe('DENIED');
    seed.bind(PROJECT, 'roles/storage.objectAdmin', [GROUP]);
    seed.group(GROUP, ['bob@example.com']);
    expect(await ask(BOB, 'storage.objects.list')).toBe('GRANTED');
    seed.deny('bob@example.com', 'storage.objects.list');
    expect(await ask(BOB, 'storage.objects.list')).toBe('DENIED');
    seed.bind(PROJECT, VIEWER, [SA], COND);
    expect(await ask(SA, 'storage.objects.get')).toBe('UNKNOWN');
  });

  it('answers UNKNOWN when the question cannot be put to the troubleshooter', async () => {
    const { adapter } = setup();
    const ask = (r: any) => adapter.evaluate(r, ctx);
    expect(await ask(rule({ ...by('domain:example.com') }))).toBe('UNKNOWN');
    expect(await ask(rule({ ...op('not a permission') }))).toBe('UNKNOWN');
    expect(await ask(rule({ ...op() }))).toBe('UNKNOWN');
    expect(await ask(rule({ ...at(OTHER) }))).toBe('UNKNOWN');
    expect(await adapter.evaluate(rule(), { ...ctx, environmentId: 'missing' })).toBe('UNKNOWN');
  });

  it('simulates what a proposed Allow would add, with confidence that reflects what was decided', async () => {
    const { adapter, seed } = setup();
    seed.bind(FOLDER, VIEWER, [USER]);
    const ops = op('storage.objects.get', 'storage.objects.list');
    const res = await adapter.simulate([rule(ops)], ctx);
    const key = (p: string) => `${USER}:${PROJECT}:${p}`;
    expect(res.allowed).toEqual([key('storage.objects.list')]);
    expect(res.unchanged).toEqual([key('storage.objects.get')]);
    expect(res.denied).toEqual([]);
    expect(res.confidence).toBe('HIGH');
    expect(res.blastRadius.dependentActors).toEqual([USER]);
    expect(res.blastRadius.blastRadius).toBe('LIMITED');
    seed.bind(PROJECT, VIEWER, [BOB], COND);
    const partial = await adapter.simulate([rule({ ...by(BOB), ...ops })], ctx);
    expect(partial.confidence).toBe('MEDIUM');
    expect(partial.unchanged).toEqual([`${BOB}:${PROJECT}:storage.objects.get`]);
    expect(partial.allowed).toEqual([`${BOB}:${PROJECT}:storage.objects.list`]);
  });

  it('leaves Deny rules and unanswerable subjects unchanged at LOW confidence, and flags groups as BROAD', async () => {
    const { adapter } = setup();
    const res = await adapter.simulate([rule({ effect: 'DENY' }), rule({ ...by('domain:example.com') })], ctx);
    expect(res.allowed).toEqual([]);
    expect(res.confidence).toBe('LOW');
    expect(res.unchanged).toHaveLength(4);
    const group = await adapter.simulate([rule({ ...by(GROUP) })], ctx);
    expect(group.blastRadius.blastRadius).toBe('BROAD');
    expect(group.allowed).toHaveLength(2);
  });
});

describe('GCP IAM conflicts', () => {
  it('reports a Deny that overlaps an Allow of the same subject as ambiguous', async () => {
    const { adapter } = setup();
    const allow = rule({ ruleId: 'allow', ...at(PROJECT) });
    const deny = rule({ ruleId: 'deny', effect: 'DENY', ...at(FOLDER), ...op('storage.objects.list') });
    const { conflicts } = await adapter.findConflicts([allow, deny], ctx);
    expect(conflicts).toEqual([{
      ruleA: 'allow', ruleB: 'deny', conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS',
      explanation: T('conflict_explanation', { subject: USER, allowScope: PROJECT, denyScope: FOLDER }),
    }]);
  });

  it('finds nothing when there is no Deny, another subject, or no shared permission', async () => {
    const { adapter } = setup();
    expect((await adapter.findConflicts([rule()], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([rule(), rule({ ruleId: 'd', effect: 'DENY', ...by(BOB) })], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([rule(), rule({ ruleId: 'd', effect: 'DENY', ...op('storage.buckets.get') })], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([rule(), rule({ ruleId: 'd', effect: 'DENY', subject: { type: 'USER', id: 'USER:ALICE@EXAMPLE.COM' }, ...op('storage.objects.get') })], ctx)).conflicts).toHaveLength(1);
  });
});

describe('GCP IAM reconciliation and constraints', () => {
  it('diffs desired Allow rules against the observed roles by resource, condition and permissions', async () => {
    const { adapter } = setup();
    const kept = await adapter.generate([rule()], ctx);
    const stale = await adapter.generate([rule({ ...at(PROJECT), ...op('storage.buckets.get') , ...{ conditions: [{ type: 'TIME_BOUND', value: { notAfter: '2030-01-01T00:00:00Z' } }] } })], ctx);
    for (const p of [kept, stale]) await adapter.attach(p, USER, ctx);
    const observed = await adapter.discoverPolicies(ctx);
    const wanted = [rule({ ruleId: 'a' }), rule({ ruleId: 'b', ...op('storage.objects.get') }), rule({ ruleId: 'c', ...at(FOLDER), ...op('storage.buckets.get') })];
    const plan = await adapter.reconcile(wanted, observed, ctx);
    const keyOf = (r: string, c = '') => `Allow|${r}|${c}`;
    expect(plan.noChange).toEqual([keyOf(PROJECT)]);
    expect(plan.toAdd.map((r) => [r.ruleId, r.resource.scope])).toEqual([['c', FOLDER]]);
    expect(plan.toRemove).toEqual([keyOf(PROJECT, (stale.nativeDocument as GcpRoleDocument).condition?.expression)]);
    expect(plan.toUpdate).toEqual([]);
    const changed = await adapter.reconcile([rule({ ruleId: 'z', ...op('storage.objects.get') })], observed.filter((p) => p.providerId === kept.providerId), ctx);
    expect(changed.toUpdate.map((u) => [u.ruleId, u.newRule.action.operations])).toEqual([[keyOf(PROJECT), ['storage.objects.get']]]);
    const folder = await adapter.generate([rule({ ...at(FOLDER), ...op('storage.buckets.get') })], ctx);
    await adapter.attach(folder, USER, ctx);
    const again = await adapter.reconcile([rule({ ruleId: 'c', ...at(FOLDER), ...op('storage.buckets.get') })], await adapter.discoverPolicies(ctx), ctx);
    expect(again.noChange).toEqual([keyOf(FOLDER)]);
    expect(again.toAdd).toEqual([]);
    expect(again.toRemove.sort()).toEqual([keyOf(PROJECT), keyOf(PROJECT, (stale.nativeDocument as GcpRoleDocument).condition?.expression)].sort());
  });

  it('wraps reconciliation failures with the localized error', async () => {
    const { adapter } = setup();
    const msg = await failure(() => adapter.reconcile([rule({ ruleId: 'd', effect: 'DENY' })], [], ctx));
    expect(msg).toBe(T('reconcile_error', { error: T('deny_unsupported', { ruleId: 'd' }) }));
  });

  it('publishes the documented Google Cloud limits', async () => {
    const { adapter } = setup();
    const c = await adapter.getConstraints(ctx);
    expect(c).toBe(GCP_IAM_CONSTRAINTS);
    expect(c.maxPoliciesPerRole).toMatchObject({ status: 'SUPPORTED', value: 300 });
    expect(c.maxAssignments).toMatchObject({ status: 'SUPPORTED', value: 1500 });
    expect(c.maxStatements).toMatchObject({ status: 'SUPPORTED', value: 3000 });
    expect(c.maxRules.status).toBe('UNSUPPORTED');
  });
});
