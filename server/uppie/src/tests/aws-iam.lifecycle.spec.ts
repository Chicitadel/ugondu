/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - AWS IAM Adapter Lifecycle Tests
 * File           : aws-iam.lifecycle.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AwsIamPolicyAdapter } from '../adapters/aws-iam/AwsIamPolicyAdapter';
import { compileConditions } from '../adapters/aws-iam/AwsIamConditions';
import type { AwsPolicyDocument } from '../adapters/aws-iam/AwsIamClient';
import { fakeIam, ARN, ACCOUNT, ctx, rule } from './support/awsFakeIam';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

function setup() {
  const iam = fakeIam();
  return { ...iam, adapter: new AwsIamPolicyAdapter(async () => iam.client) };
}

describe(__t('aws_iam_compilation'), () => {
  it(__t('emits_iam_cased_effects_merges'), async () => {
    const { adapter } = setup();
    const rules = [rule({ ruleId: 'a' }), rule({ ruleId: 'b', action: { capability: 'x', operations: ['s3:ListBucket', 's3:GetObject'] } }), rule({ ruleId: 'c', effect: 'DENY', action: { capability: 'x', operations: ['s3:DeleteObject'] } })];
    const a = await adapter.generate(rules, ctx);
    const b = await adapter.generate([...rules].reverse(), ctx);
    const doc = a.nativeDocument as AwsPolicyDocument;
    expect(doc.Version).toBe('2012-10-17');
    expect(doc.Statement.map((s) => [s.Effect, s.Action])).toEqual([['Allow', ['s3:GetObject', 's3:ListBucket']], ['Deny', ['s3:DeleteObject']]]);
    expect(a.providerId).toBe(b.providerId);
    expect(a.digest.length).toBe(64);
    expect(/^ugondu-[a-f0-9]{12}$/.test(a.providerId)).toBe(true);
    expect(doc.Statement[0].Sid).toBe('a');
  });

  it(__t('compiles_every_limiter_into_th'), () => {
    const condition = compileConditions(rule({
      resource: { type: 't', scope: '*', conditions: { 'aws:PrincipalOrgID': 'o-123' } },
      constraints: { requireMfa: true, ipRange: '10.0.0.0/8' },
      validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2030-01-01T00:00:00Z', type: 'TEMPORARY' },
      conditions: [
        { type: 'TAG_MATCH', value: { key: 'team', value: 'blue' } },
        { type: 'TIME_BOUND', value: { notBefore: '2026-02-01T00:00:00Z' } },
        { type: 'CUSTOM', value: { operator: 'StringLike', key: 'aws:UserAgent', values: ['ugondu/*'] } },
      ],
    }));
    expect(condition).toEqual({
      Bool: { 'aws:MultiFactorAuthPresent': 'true' },
      DateGreaterThan: { 'aws:CurrentTime': '2026-02-01T00:00:00Z' },
      DateLessThan: { 'aws:CurrentTime': '2030-01-01T00:00:00Z' },
      IpAddress: { 'aws:SourceIp': '10.0.0.0/8' },
      StringEquals: { 'aws:PrincipalOrgID': 'o-123', 'aws:ResourceTag/team': 'blue' },
      StringLike: { 'aws:UserAgent': ['ugondu/*'] },
    });
    expect(compileConditions(rule())).toBeUndefined();
  });

  it(__t('fails_closed_on_conditions_it_'), () => {
    const bad = (conditions: any[], constraints: any = {}) => () => compileConditions(rule({ conditions, constraints }));
    expect(bad([{ type: 'GEO_FENCE', value: {} }])).toThrow(__t('uppie.adapter.aws.invalid_condition', { type: 'GEO_FENCE' }));
    expect(bad([{ type: 'IP_BOUND', value: {} }])).toThrow(__t('uppie.adapter.aws.invalid_condition', { type: 'IP_BOUND' }));
    expect(bad([{ type: 'TIME_BOUND', value: { notAfter: 'tomorrow-ish' } }])).toThrow(__t('uppie.adapter.aws.invalid_condition', { type: 'TIME_BOUND' }));
    expect(bad([{ type: 'IP_BOUND', value: { cidr: '10.1.0.0/16' } }], { ipRange: '10.0.0.0/8' })).toThrow(__t('uppie.adapter.aws.invalid_condition', { type: 'IP_BOUND' }));
    expect(bad([{ type: 'CUSTOM', value: { operator: __t('string_equals'), key: 'k', values: 'v' } }])).toThrow(__t('uppie.adapter.aws.invalid_condition', { type: 'CUSTOM' }));
  });

  it(__t('rejects_a_rule_with_no_operati'), async () => {
    const { adapter } = setup();
    let message = '';
    try { await adapter.generate([rule({ action: { capability: 'x', operations: [] } })], ctx); } catch (e: any) { message = e.message; }
    expect(message).toBe(__t('uppie.adapter.aws.invalid_rule', { scope: 'arn:aws:s3:::bkt/*' }));
  });
});

describe(__t('aws_iam_validation'), () => {
  it(__t('accepts_a_generated_policy_and'), async () => {
    const { adapter } = setup();
    expect((await adapter.validate(await adapter.generate([rule()], ctx), ctx)).valid).toBe(true);
    const wide = await adapter.generate([rule({ action: { capability: 'x', operations: ['s3:*'] } })], ctx);
    const res = await adapter.validate(wide, ctx);
    expect(res.valid).toBe(true);
    expect(res.warnings).toEqual([__t('uppie.adapter.aws.validate.service_wildcard', { action: 's3:*' })]);
  });

  it(__t('rejects_admin_wildcards_malfor'), async () => {
    const { adapter } = setup();
    const admin = await adapter.generate([rule({ action: { capability: 'x', operations: ['*'] }, resource: { type: 't', scope: '*' } })], ctx);
    expect((await adapter.validate(admin, ctx)).errors).toContain(__t('uppie.adapter.aws.validate.admin_wildcard'));

    const native = (doc: any) => ({ providerId: 'x', providerType: 'AWS_IAM' as const, digest: '', nativeDocument: doc });
    const broken = await adapter.validate(native({ Version: '2008-10-17', Statement: [{ Effect: 'ALLOW', Action: ['bogus'], Resource: ['not-an-arn'] }] }), ctx);
    expect(broken.errors).toEqual([
      __t('uppie.adapter.aws.validate.invalid_version', { version: '2008-10-17' }),
      __t('uppie.adapter.aws.validate.invalid_effect', { effect: 'ALLOW' }),
      __t('uppie.adapter.aws.validate.invalid_action', { action: 'bogus' }),
      __t('uppie.adapter.aws.validate.invalid_resource', { resource: 'not-an-arn' }),
    ]);
    expect((await adapter.validate(native(undefined), ctx)).errors).toEqual([__t('uppie.adapter.aws.validate.no_document')]);
    expect((await adapter.validate(native({ Version: '2012-10-17', Statement: [] }), ctx)).errors).toEqual([__t('uppie.adapter.aws.validate.no_statements')]);

    const big = await adapter.generate([rule({ action: { capability: 'x', operations: Array.from({ length: 400 }, (_, i) => `s3:Operation${i}`) } })], ctx);
    expect((await adapter.validate(big, ctx)).valid).toBe(false);

    const tampered = await adapter.generate([rule()], ctx);
    (tampered.nativeDocument as AwsPolicyDocument).Statement[0].Action.push('s3:PutObject');
    expect((await adapter.validate(tampered, ctx)).errors).toEqual([__t('uppie.adapter.aws.validate.digest_mismatch')]);
  });
});

describe(__t('aws_iam_attach_and_detach'), () => {
  it(__t('creates_the_policy_in_the_prin'), async () => {
    const { adapter, policies, attachments } = setup();
    const native = await adapter.generate([rule()], ctx);
    const first = await adapter.attach(native, ARN.role('app'), ctx);
    const second = await adapter.attach(native, ARN.role('app'), ctx);
    expect(first.providerRef).toBe(ARN.policy(native.providerId));
    expect(second).toEqual({ ...first, attachedAt: second.attachedAt });
    expect(policies.size).toBe(1);
    expect([...attachments.get(first.providerRef) as Set<string>]).toEqual(['role/app']);
  });

  it(__t('refuses_a_same_named_policy_th'), async () => {
    const { adapter } = setup();
    const native = await adapter.generate([rule()], ctx);
    await adapter.attach(native, ARN.role('app'), ctx);
    const clash = { ...(await adapter.generate([rule({ action: { capability: 'x', operations: ['s3:PutObject'] } })], ctx)), providerId: native.providerId };
    clash.digest = '';
    const res = await adapter.attach(clash, ARN.user('bob'), ctx);
    expect(res.success).toBe(false);
    expect(res.errors[0]).toBe(__t('uppie.adapter.aws.attach_error', { error: __t('uppie.adapter.aws.policy_exists_different', { arn: ARN.policy(native.providerId) }) }));
  });

  it(__t('attaches_an_existing_policy_ar'), async () => {
    const { adapter, seedManaged, policies, calls } = setup();
    const arn = seedManaged('ReadOnlyAccess', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:Get*'], Resource: ['*'] }] });
    const native = { ...(await adapter.generate([rule()], ctx)), providerId: arn };
    expect((await adapter.attach(native, ARN.group('ops'), ctx)).providerRef).toBe(arn);
    expect(calls.filter((c) => c.startsWith('createPolicy'))).toEqual([]);
    expect(policies.size).toBe(1);
    const bad = await adapter.attach(native, 'role/app', ctx);
    expect(bad.errors[0]).toBe(__t('uppie.adapter.aws.attach_error', { error: __t('uppie.adapter.aws.invalid_principal', { principal: 'role/app' }) }));
    expect((await adapter.attach(await adapter.generate([], ctx), ARN.role('app'), ctx)).success).toBe(false);
  });

  it(__t('detaches_treats_an_already_det'), async () => {
    const { adapter, attachments } = setup();
    const native = await adapter.generate([rule()], ctx);
    const { providerRef } = await adapter.attach(native, ARN.user('bob'), ctx);
    expect((await adapter.detach(providerRef, ARN.user('bob'), ctx)).success).toBe(true);
    expect((attachments.get(providerRef) as Set<string>).size).toBe(0);
    expect((await adapter.detach(providerRef, ARN.user('bob'), ctx)).success).toBe(true);
    expect((await adapter.detach('not-an-arn', ARN.user('bob'), ctx)).success).toBe(false);
  });
});

describe(__t('aws_iam_update_clone_retire_an'), () => {
  it(__t('creates_a_new_default_version_'), async () => {
    const { adapter, policies } = setup();
    const { providerRef } = await adapter.attach(await adapter.generate([rule()], ctx), ARN.role('app'), ctx);
    const operations = (i: number) => rule({ action: { capability: 'x', operations: [`s3:Operation${i}`] } });
    for (let i = 0; i < 6; i++) expect((await adapter.update(providerRef, [operations(i)], ctx)).success).toBe(true);
    const versions = (policies.get(providerRef) as any).versions;
    expect(versions.length).toBe(5);
    expect(versions.filter((v: any) => v.isDefault).length).toBe(1);
    expect(versions.map((v: any) => v.id)).toEqual(['v3', 'v4', 'v5', 'v6', 'v7']);
    expect(versions[4].document.Statement[0].Action).toEqual(['s3:Operation5']);
  });

  it('refuses to update AWS-managed policies or to publish an invalid document', async () => {
    const { adapter, seedManaged } = setup();
    const arn = seedManaged('ReadOnlyAccess', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:Get*'], Resource: ['*'] }] });
    expect((await adapter.update(arn, [rule()], ctx)).errors[0]).toBe(__t('uppie.adapter.aws.update_error', { error: __t('uppie.adapter.aws.protected_policy', { arn }) }));
    const { providerRef } = await adapter.attach(await adapter.generate([rule()], ctx), ARN.role('app'), ctx);
    expect((await adapter.update(providerRef, [rule({ action: { capability: 'x', operations: ['*'] }, resource: { type: 't', scope: '*' } })], ctx)).errors).toEqual([__t('uppie.adapter.aws.validate.admin_wildcard')]);
  });

  it(__t('clones_customer_and_aws_manage'), async () => {
    const { adapter, seedManaged, policies } = setup();
    const document: AwsPolicyDocument = { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:Get*'], Resource: ['*'] }] };
    const managed = seedManaged('ReadOnlyAccess', document);
    const res = await adapter.clone(managed, 'my-readonly', ctx);
    expect(res).toEqual({ success: true, clonedId: ARN.policy('my-readonly'), errors: [] });
    expect((policies.get(ARN.policy('my-readonly')) as any).versions[0].document).toEqual(document);
    expect((await adapter.clone(managed, 'my-readonly', ctx)).success).toBe(false);
    expect((await adapter.clone(managed, __t('bad_name'), ctx)).errors[0]).toBe(__t('uppie.adapter.aws.clone_error', { error: __t('uppie.adapter.aws.invalid_name', { name: __t('bad_name') }) }));
  });

  it(__t('refuses_to_retire_an_attached_'), async () => {
    const { adapter, seedManaged } = setup();
    const { providerRef } = await adapter.attach(await adapter.generate([rule()], ctx), ARN.role('app'), ctx);
    const plan: any = { policyId: providerRef, shadowPeriodDays: 7, approvedBy: 'change-board', retentionDays: 90 };
    expect((await adapter.retire(plan, ctx)).errors[0]).toBe(__t('uppie.adapter.aws.retire_error', { error: __t('uppie.adapter.aws.retire_in_use', { arn: providerRef, count: 1 }) }));
    const managed = seedManaged('Admin', { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:Get*'], Resource: ['*'] }] });
    expect((await adapter.retire({ ...plan, policyId: managed }, ctx)).success).toBe(false);
  });

  it(__t('retires_an_unattached_policy_w'), async () => {
    const { adapter, policies } = setup();
    const { providerRef } = await adapter.attach(await adapter.generate([rule()], ctx), ARN.role('app'), ctx);
    await adapter.update(providerRef, [rule({ action: { capability: 'x', operations: ['s3:PutObject'] } })], ctx);
    await adapter.detach(providerRef, ARN.role('app'), ctx);
    const before = JSON.parse(JSON.stringify((policies.get(providerRef) as any).versions.find((v: any) => v.isDefault).document));

    const retired = await adapter.retire({ policyId: providerRef, shadowPeriodDays: 7, approvedBy: 'change-board', retentionDays: 90 } as any, ctx);
    expect(retired.success).toBe(true);
    expect(policies.size).toBe(0);
    expect(JSON.parse(retired.detachmentEvidence as string).attachedEntities).toBe(0);

    const cert: any = { policyId: providerRef, rollbackReference: retired.rollbackReference };
    expect(await adapter.restore(cert, ctx)).toEqual({ success: true, restoredId: providerRef, errors: [] });
    expect((policies.get(providerRef) as any).versions[0].document).toEqual(before);
    expect((await adapter.restore(cert, ctx)).success).toBe(false);
  });

  it(__t('refuses_restore_without_a_refe'), async () => {
    const { adapter } = setup();
    const snapshot = JSON.stringify({ name: 'ugondu-abc', path: '/', document: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:GetObject'], Resource: ['*'] }] } });
    expect((await adapter.restore({ policyId: ARN.policy('ugondu-abc') } as any, ctx)).errors).toEqual([__t('uppie.adapter.aws.restore_no_reference')]);
    expect((await adapter.restore({ policyId: ARN.policy('other'), rollbackReference: snapshot } as any, ctx)).errors[0]).toBe(__t('uppie.adapter.aws.restore_error', { error: __t('uppie.adapter.aws.restore_invalid_snapshot', { arn: ARN.policy('other') }) }));
    expect((await adapter.restore({ policyId: `arn:aws:iam::aws:policy/ugondu-abc`, rollbackReference: snapshot } as any, ctx)).success).toBe(false);
    expect((await adapter.restore({ policyId: ARN.policy('ugondu-abc'), rollbackReference: JSON.stringify({ name: 'ugondu-abc', path: '/', document: { Version: '2012-10-17', Statement: [] } }) } as any, ctx)).success).toBe(false);
    expect((await adapter.restore({ policyId: ARN.policy('ugondu-abc'), rollbackReference: '{broken' } as any, ctx)).success).toBe(false);
  });
});

describe(__t('aws_iam_client_lifecycle'), () => {
  it('caches one client per tenant/environment/credential identity and retries after a factory failure', async () => {
    const iam = fakeIam();
    let calls = 0;
    const adapter = new AwsIamPolicyAdapter(async () => { calls++; if (calls === 1) throw new Error(__t('no_credentials')); return iam.client; });
    let failure = '';
    try { await adapter.discoverPolicies(ctx); } catch (e: any) { failure = e.message; }
    expect(failure).toBe(__t('no_credentials'));
    await adapter.discoverPolicies(ctx);
    await adapter.discoverRoles(ctx);
    expect(calls).toBe(2);
    await adapter.discoverRoles({ ...ctx, environmentId: 'staging' });
    expect(calls).toBe(3);
    expect(ACCOUNT.length).toBe(12);
  });
});
