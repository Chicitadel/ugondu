/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - AWS IAM Adapter Analysis Tests
 * File           : aws-iam.analysis.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AwsIamPolicyAdapter } from '../adapters/aws-iam/AwsIamPolicyAdapter';
import { fakeIam, ARN, ctx, rule } from './support/awsFakeIam';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const OBJECTS = 'arn:aws:s3:::bkt/*';
const op = (...operations: string[]) => ({ capability: 'x', operations });

/** Environment with role "app" holding Allow GetObject+DeleteObject and an explicit Deny DeleteObject on the bucket. */
async function seeded() {
  const iam = fakeIam();
  const adapter = new AwsIamPolicyAdapter(async () => iam.client);
  iam.addPrincipal('role', 'app');
  iam.addPrincipal('user', 'bob');
  iam.addPrincipal('group', 'ops');
  iam.groupMembers.set('ops', ['bob']);
  const native = await adapter.generate([rule({ action: op('s3:GetObject', 's3:DeleteObject') }), rule({ ruleId: 'deny', effect: 'DENY', action: op('s3:DeleteObject') })], ctx);
  const { providerRef } = await adapter.attach(native, ARN.role('app'), ctx);
  return { ...iam, adapter, policyArn: providerRef };
}

describe(__t('aws_iam_discovery'), () => {
  it(__t('discovers_policies_assignments'), async () => {
    const { adapter, policyArn } = await seeded();
    const policies = await adapter.discoverPolicies(ctx);
    expect(policies.map((p) => p.providerId)).toEqual([policyArn]);
    expect(policies[0].digest.length).toBe(64);
    expect(await adapter.discoverAssignments(ctx)).toEqual({ [ARN.role('app')]: [policyArn], [ARN.user('bob')]: [], [ARN.group('ops')]: [] });
    expect((await adapter.discoverIdentities(ctx)).map((i) => [i.type, i.displayName])).toEqual([['USER', 'bob'], ['ROLE', 'app']]);
    expect(await adapter.discoverGroups(ctx)).toEqual([{ id: ARN.group('ops'), displayName: 'ops', members: [ARN.user('bob')] }]);
    expect(await adapter.discoverRoles(ctx)).toEqual([{ id: ARN.role('app'), displayName: 'app', policies: [policyArn] }]);
  });

  it('classifies blast radius from attached entities; any group makes it BROAD', async () => {
    const { adapter, policyArn } = await seeded();
    expect((await adapter.findDependencies(policyArn, ctx)).blastRadius).toBe('LIMITED');
    expect((await adapter.findDependencies(policyArn, ctx)).dependentRoles).toEqual(['role/app']);
    await adapter.attach((await adapter.discoverPolicies(ctx))[0], ARN.group('ops'), ctx);
    const report = await adapter.findDependencies(policyArn, ctx);
    expect(report.blastRadius).toBe('BROAD');
    expect(report.dependentActors).toEqual(['group/ops']);
  });
});

describe(__t('aws_iam_evaluation_and_effecti'), () => {
  it(__t('evaluates_through_the_policy_s'), async () => {
    const { adapter } = await seeded();
    expect(await adapter.evaluate(rule({ action: op('s3:GetObject') }), ctx)).toBe('GRANTED');
    expect(await adapter.evaluate(rule({ action: op('s3:DeleteObject') }), ctx)).toBe('DENIED');
    expect(await adapter.evaluate(rule({ action: op('s3:PutObject') }), ctx)).toBe('DENIED');
    expect(await adapter.evaluate(rule({ action: op('s3:Get*') }), ctx)).toBe('UNKNOWN');
    expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'bob' } }), ctx)).toBe('UNKNOWN');
  });

  it(__t('returns_unknown_when_aws_canno'), async () => {
    const adapter = new AwsIamPolicyAdapter(async () => { throw new Error('offline'); });
    expect(await adapter.evaluate(rule(), ctx)).toBe('UNKNOWN');
  });

  it(__t('reports_per_action_state_with_'), async () => {
    const { adapter, policyArn } = await seeded();
    const res = await adapter.discoverEffectiveAuthority(ARN.role('app'), 'arn:aws:s3:::bkt/file', ctx);
    const by = (a: string) => res.permissions.find((p) => p.capability === a);
    expect(res.evaluationMethod).toBe('PROVIDER_API');
    expect(by('s3:GetObject')).toMatchObject({ state: 'GRANTED', confidence: 'HIGH', sourcePolicies: [policyArn], denyPolicies: [] });
    expect(by('s3:DeleteObject')).toMatchObject({ state: 'DENIED', sourcePolicies: [policyArn], denyPolicies: [policyArn] });
  });

  it('marks wildcard actions NEEDS_SIMULATION and the result PARTIAL_MODEL', async () => {
    const { adapter } = await seeded();
    const wide = await adapter.generate([rule({ ruleId: 'w', action: op('s3:List*') })], ctx);
    await adapter.attach(wide, ARN.role('app'), ctx);
    const res = await adapter.discoverEffectiveAuthority(ARN.role('app'), OBJECTS, ctx);
    expect(res.evaluationMethod).toBe('PARTIAL_MODEL');
    expect(res.permissions.find((p) => p.capability === 's3:List*')).toMatchObject({ state: 'NEEDS_SIMULATION', confidence: 'LOW' });
    let message = '';
    try { await adapter.discoverEffectiveAuthority('bob', OBJECTS, ctx); } catch (e: any) { message = e.message; }
    expect(message).toBe(__t('uppie.adapter.aws.invalid_principal', { principal: 'bob' }));
  });
});

describe(__t('aws_iam_simulation_conflicts_a'), () => {
  it(__t('classifies_proposed_rules_as_n'), async () => {
    const { adapter } = await seeded();
    const subject = (id: string) => ({ type: 'USER', id });
    const sim = await adapter.simulate([
      rule({ ruleId: 'r1', action: op('s3:GetObject') }), // already held
      rule({ ruleId: 'r2', action: op('s3:PutObject') }), // new
      rule({ ruleId: 'r3', effect: 'DENY', action: op('s3:DeleteObject'), subject: subject(ARN.user('bob')) }), // bob holds nothing
    ], ctx);
    expect(sim.allowed).toEqual([`${ARN.role('app')}:${OBJECTS}:s3:PutObject`]);
    expect(sim.unchanged).toEqual([`${ARN.role('app')}:${OBJECTS}:s3:GetObject`, `${ARN.user('bob')}:${OBJECTS}:s3:DeleteObject`]);
    expect(sim.denied).toEqual([]);
    expect(sim.confidence).toBe('HIGH');
    expect(sim.blastRadius.blastRadius).toBe('LIMITED');

    const deny = await adapter.simulate([rule({ ruleId: 'd', effect: 'DENY', action: op('s3:GetObject') })], ctx);
    expect(deny.denied).toEqual([`${ARN.role('app')}:${OBJECTS}:s3:GetObject`]);
  });

  it(__t('lowers_confidence_when_rules_c'), async () => {
    const { adapter } = await seeded();
    const mixed = await adapter.simulate([rule({ action: op('s3:GetObject') }), rule({ action: op('s3:Put*') })], ctx);
    expect(mixed.confidence).toBe('MEDIUM');
    expect((await adapter.simulate([], ctx)).confidence).toBe('LOW');
  });

  it('detects an Allow/Deny overlap for the same subject and ignores unrelated rules', async () => {
    const { adapter } = await seeded();
    const allow = rule({ ruleId: 'allow', action: op('s3:*') });
    const deny = rule({ ruleId: 'deny', effect: 'DENY', action: op('s3:DeleteObject'), resource: { type: 't', scope: 'arn:aws:s3:::bkt/private/*' } });
    const { conflicts } = await adapter.findConflicts([allow, deny], ctx);
    expect(conflicts).toEqual([{
      ruleA: 'allow', ruleB: 'deny', conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'B_WINS',
      explanation: __t('uppie.adapter.aws.conflict_explanation', { subject: ARN.role('app'), allowScope: OBJECTS, denyScope: 'arn:aws:s3:::bkt/private/*' }),
    }]);
    expect((await adapter.findConflicts([allow, { ...deny, subject: { type: 'USER', id: ARN.user('bob') } }], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, { ...deny, resource: { type: 't', scope: 'arn:aws:s3:::other/*' } }], ctx)).conflicts).toEqual([]);
  });

  it(__t('plans_add_update_remove_and_no'), async () => {
    const { adapter } = await seeded();
    const at = (scope: string, effect: string, ...ops: string[]) => rule({ effect, action: op(...ops), resource: { type: 't', scope } });
    const observed = [
      await adapter.generate([at('arn:aws:s3:::one/*', 'ALLOW', 's3:GetObject', 's3:ListBucket')], ctx),
      await adapter.generate([at('arn:aws:s3:::two/*', 'ALLOW', 's3:GetObject')], ctx),
      await adapter.generate([at('arn:aws:s3:::three/*', 'DENY', 's3:DeleteObject')], ctx),
    ];
    const plan = await adapter.reconcile([
      at('arn:aws:s3:::one/*', 'ALLOW', 's3:ListBucket', 's3:GetObject'),
      at('arn:aws:s3:::two/*', 'ALLOW', 's3:GetObject', 's3:PutObject'),
      at('arn:aws:s3:::four/*', 'ALLOW', 's3:GetObject'),
    ], observed, ctx);
    expect(plan.noChange).toEqual(['Allow|arn:aws:s3:::one/*']);
    expect(plan.toUpdate.map((u) => [u.ruleId, u.newRule.action.operations])).toEqual([['Allow|arn:aws:s3:::two/*', ['s3:GetObject', 's3:PutObject']]]);
    expect(plan.toAdd.map((r) => r.resource.scope)).toEqual(['arn:aws:s3:::four/*']);
    expect(plan.toRemove).toEqual(['Deny|arn:aws:s3:::three/*']);
  });

  it(__t('wraps_reconciliation_failures_'), async () => {
    const { adapter } = await seeded();
    let message = '';
    try { await adapter.reconcile([rule()], [{ providerId: 'x', providerType: 'AWS_IAM', digest: '', nativeDocument: undefined }], ctx); } catch (e: any) { message = e.message; }
    expect(message).toContain(__t('uppie.adapter.aws.reconcile_error', { error: 'MARKER' }).split('MARKER')[0].trim());
  });
});

describe(__t('aws_iam_usage_observation'), () => {
  const day = 86_400_000;
  const window = (days: number) => ({ startAt: new Date(Date.now() - days * day).toISOString(), endAt: new Date().toISOString() });

  it(__t('classifies_a_policy_from_servi'), async () => {
    const { adapter, usage, policyArn } = await seeded();
    const recent = new Date(Date.now() - 2 * day);
    const old = new Date(Date.now() - 200 * day);
    usage.set(policyArn, [{ service: 's3', lastAuthenticated: recent }, { service: 'ec2', lastAuthenticated: old }, { service: 'iam' }]);
    const active = await adapter.observeUsage(policyArn, window(30), ctx);
    expect(active).toMatchObject({ observedUsages: 1, classification: 'ACTIVE', lastUsedAt: recent.toISOString() });
    expect((await adapter.observeUsage(policyArn, window(1), ctx)).classification).toBe('RARELY_USED');
    usage.set(policyArn, [{ service: 'iam' }]);
    expect(await adapter.observeUsage(policyArn, window(30), ctx)).toMatchObject({ observedUsages: 0, classification: 'UNUSED' });
  });

  it(__t('reports_unattached_policies_an'), async () => {
    const { adapter, usage, policyArn, policies } = await seeded();
    const spare = await adapter.generate([rule({ ruleId: 's', action: op('s3:PutObject') })], ctx);
    const spareArn = (await adapter.attach(spare, ARN.role('app'), ctx)).providerRef;
    await adapter.detach(spareArn, ARN.role('app'), ctx);
    const idle = await adapter.generate([rule({ ruleId: 'i', action: op('s3:ListBucket') })], ctx);
    const idleArn = (await adapter.attach(idle, ARN.role('app'), ctx)).providerRef;
    usage.set(policyArn, [{ service: 's3', lastAuthenticated: new Date() }]);
    usage.set(idleArn, [{ service: 's3', lastAuthenticated: new Date(Date.now() - 90 * day) }]);
    const unused = await adapter.detectUnused(ctx, 30);
    expect(policies.size).toBe(3);
    expect(unused.map((u) => [u.policyId, u.classification]).sort()).toEqual([[idleArn, 'RARELY_USED'], [spareArn, 'UNUSED']].sort());
  });
});
