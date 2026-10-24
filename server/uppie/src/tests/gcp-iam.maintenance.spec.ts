/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - GCP IAM Adapter Maintenance Tests
 * File           : gcp-iam.maintenance.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { GcpIamAdapter } from '../adapters/gcp-iam/GcpIamAdapter';
import { fakeGcp, ctx, rule, ORG, FOLDER, PROJECT, OTHER, USER, BOB, VIEWER } from './support/gcpFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.gcp.${key}`, params);

function setup() {
  const gcp = fakeGcp();
  return { ...gcp, adapter: new GcpIamAdapter(async () => gcp.client) };
}
const op = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const at = (scope: string) => ({ resource: { type: 't', scope } });
const window = { from: '2026-01-01T00:00:00Z', to: '2026-02-01T00:00:00Z' } as any;
const certificate = (policyId: string, rollbackReference?: string): any => ({ policyId, ...(rollbackReference !== undefined ? { rollbackReference } : {}) });

describe(__t('gcp_iam_update'), () => {
  it(__t('replaces_the_permissions_of_a_'), async () => {
    const { adapter, roles, policyOf } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    const res = await adapter.update(policy.providerId, [rule(op('storage.objects.delete'))], ctx);
    expect(res.errors).toEqual([]);
    expect(res.success).toBe(true);
    expect(res.version).toBe(roles.get(policy.providerId)?.etag);
    expect(roles.get(policy.providerId)?.includedPermissions).toEqual(['storage.objects.delete']);
    expect(roles.get(policy.providerId)?.title).toBe(T('role_title', { digest: policy.digest.slice(0, 12) }));
    expect(policyOf(PROJECT).bindings).toEqual([{ role: policy.providerId, members: [USER] }]);
  });

  it(__t('refuses_predefined_roles_condi'), async () => {
    const { adapter, roles, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    const before = JSON.stringify(roles.get(policy.providerId));
    const update = async (id: string, ...rules: any[]) => (await adapter.update(id, rules, ctx)).errors;
    expect(await update(VIEWER, rule())).toEqual([T('update_error', { error: T('protected_role', { name: VIEWER }) })]);
    expect(await update(policy.providerId, rule({ conditions: [{ type: 'TIME_BOUND', value: { notAfter: '2030-01-01T00:00:00Z' } }] }))).toEqual([T('update_error', { error: T('update_condition_change', { name: policy.providerId }) })]);
    expect(await update(policy.providerId, rule(at(ORG)))).toEqual([T('update_error', { error: T('update_scope_change', { name: policy.providerId }) })]);
    expect(await update(policy.providerId, rule(op(__t('not_a_permission'))))).toEqual([T('validate.invalid_permission', { permission: __t('not_a_permission') })]);
    expect(await update(policy.providerId, rule({ effect: 'DENY', ruleId: 'd' }))).toEqual([T('update_error', { error: T('deny_unsupported', { ruleId: 'd' }) })]);
    seed.role(`${OTHER}/roles/foreign`, ['storage.objects.get']);
    expect(await update(`${OTHER}/roles/foreign`, rule())).toEqual([T('update_error', { error: T('scope_outside_environment', { resource: OTHER }) })]);
    expect(JSON.stringify(roles.get(policy.providerId))).toBe(before);
  });

  it(__t('refuses_to_change_an_organizat'), async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule(at(FOLDER))], ctx);
    await adapter.attach(policy, USER, ctx);
    const res = await adapter.update(policy.providerId, [rule({ ...at(ORG), ...op('storage.buckets.get') })], ctx);
    expect(res.errors).toEqual([T('update_error', { error: T('shared_role', { name: policy.providerId }) })]);
    expect(roles.get(policy.providerId)?.includedPermissions).toEqual(['storage.objects.get', 'storage.objects.list']);
  });
});

describe(__t('gcp_iam_clone'), () => {
  it(__t('copies_a_predefined_role_into_'), async () => {
    const { adapter, roles } = setup();
    const predefined = await adapter.clone(VIEWER, 'viewer_copy', ctx);
    expect(predefined).toEqual({ success: true, clonedId: `${PROJECT}/roles/viewer_copy`, errors: [] });
    expect(roles.get(`${PROJECT}/roles/viewer_copy`)?.includedPermissions).toEqual(roles.get(VIEWER)?.includedPermissions);
    const policy = await adapter.generate([rule(at(FOLDER))], ctx);
    await adapter.attach(policy, USER, ctx);
    expect((await adapter.clone(policy.providerId, ' org_copy ', ctx)).clonedId).toBe(`${ORG}/roles/org_copy`);
    expect(roles.get(`${ORG}/roles/org_copy`)?.includedPermissions).toEqual(['storage.objects.get', 'storage.objects.list']);
  });

  it(__t('is_idempotent_for_identical_co'), async () => {
    const { adapter, seed, calls, roles } = setup();
    await adapter.clone(VIEWER, 'viewer_copy', ctx);
    expect((await adapter.clone(VIEWER, 'viewer_copy', ctx)).success).toBe(true);
    expect(calls.filter((c) => c.startsWith('createRole'))).toHaveLength(1);
    seed.role(`${PROJECT}/roles/other_copy`, ['storage.buckets.get']);
    const different = await adapter.clone(VIEWER, 'other_copy', ctx);
    expect(different.errors).toEqual([T('clone_error', { error: T('role_exists_different', { name: `${PROJECT}/roles/other_copy` }) })]);
    seed.role(`${PROJECT}/roles/old_copy`, roles.get(VIEWER)?.includedPermissions ?? [], { deleted: true });
    expect((await adapter.clone(VIEWER, 'old_copy', ctx)).success).toBe(true);
    expect(roles.get(`${PROJECT}/roles/old_copy`)?.deleted).toBe(false);
  });

  it(__t('validates_the_new_id_and_keeps'), async () => {
    const { adapter, seed } = setup();
    for (const bad of ['', 'ab', __t('has_space'), 'x'.repeat(65), 'a/b']) {
      expect((await adapter.clone(VIEWER, bad, ctx)).errors).toEqual([T('clone_error', { error: T('invalid_name', { name: bad.trim() }) })]);
    }
    seed.role(`${OTHER}/roles/foreign`, ['storage.objects.get']);
    expect((await adapter.clone(`${OTHER}/roles/foreign`, 'copy_of_foreign', ctx)).errors).toEqual([T('clone_error', { error: T('scope_outside_environment', { resource: OTHER }) })]);
    expect((await adapter.clone('roles/does.not.exist', 'copy_of_nothing', ctx)).errors).toEqual([T('clone_error', { error: 'no role roles/does.not.exist' })]);
  });
});

describe(__t('gcp_iam_usage'), () => {
  it(__t('reports_unused_for_an_unbound_'), async () => {
    const { adapter, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    expect((await adapter.observeUsage(policy.providerId, window, ctx)).classification).toBe('UNKNOWN');
    await adapter.detach(policy.providerId, USER, ctx);
    const unused = await adapter.observeUsage(policy.providerId, window, ctx);
    expect(unused).toEqual({ policyId: policy.providerId, observedUsages: 0, classification: 'UNUSED', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false });
    seed.bind(PROJECT, policy.providerId, [BOB]);
    expect((await adapter.observeUsage(policy.providerId, window, ctx)).classification).toBe('UNKNOWN');
  });

  it(__t('never_proves_an_organization_r'), async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule(at(ORG))], ctx);
    await adapter.attach(policy, USER, ctx);
    await adapter.detach(policy.providerId, USER, ctx);
    expect((await adapter.observeUsage(policy.providerId, window, ctx)).classification).toBe('UNKNOWN');
  });

  it('lists only the project\'s own custom roles that nothing references', async () => {
    const { adapter, seed } = setup();
    const used = await adapter.generate([rule()], ctx);
    await adapter.attach(used, USER, ctx);
    seed.role(`${PROJECT}/roles/idle_project`, ['storage.objects.get']);
    seed.role(`${PROJECT}/roles/gone`, ['storage.objects.get'], { deleted: true });
    seed.role(`${PROJECT}/roles/bound_here`, ['storage.objects.get']);
    seed.bind(PROJECT, `${PROJECT}/roles/bound_here`, [USER]);
    seed.role(`${ORG}/roles/idle_org`, ['storage.objects.get']);
    seed.role(`${OTHER}/roles/elsewhere`, ['storage.objects.get']);
    const found = await adapter.detectUnused(ctx, 90);
    expect(found.map((u) => u.policyId)).toEqual([`${PROJECT}/roles/idle_project`]);
    expect(found[0].classification).toBe('UNUSED');
  });
});

describe(__t('gcp_iam_retire_and_restore'), () => {
  it(__t('refuses_to_retire_a_role_that_'), async () => {
    const { adapter, seed, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    const retire = async (id: string) => (await adapter.retire({ policyId: id, approvedBy: 'cab' } as any, ctx)).errors;
    expect(await retire(policy.providerId)).toEqual([T('retire_error', { error: T('retire_in_use', { name: policy.providerId, count: 1 }) })]);
    expect(await retire(VIEWER)).toEqual([T('retire_error', { error: T('protected_role', { name: VIEWER }) })]);
    seed.role(`${OTHER}/roles/foreign`, ['storage.objects.get']);
    expect(await retire(`${OTHER}/roles/foreign`)).toEqual([T('retire_error', { error: T('scope_outside_environment', { resource: OTHER }) })]);
    seed.role(`${ORG}/roles/shared`, ['storage.objects.get']);
    expect(await retire(`${ORG}/roles/shared`)).toEqual([T('retire_error', { error: T('shared_role', { name: `${ORG}/roles/shared` }) })]);
    expect(roles.get(`${ORG}/roles/shared`)?.deleted).toBe(false);
    expect(roles.get(policy.providerId)?.deleted).toBe(false);
  });

  it(__t('soft_deletes_an_unbound_role_w'), async () => {
    const { adapter, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    await adapter.detach(policy.providerId, USER, ctx);
    const res = await adapter.retire({ policyId: policy.providerId, approvedBy: 'cab' } as any, ctx);
    expect(res.success).toBe(true);
    expect(roles.get(policy.providerId)?.deleted).toBe(true);
    expect(JSON.parse(res.rollbackReference as string)).toMatchObject({ name: policy.providerId, includedPermissions: ['storage.objects.get', 'storage.objects.list'] });
    expect(JSON.parse(res.detachmentEvidence as string)).toMatchObject({ policy: policy.providerId, bindings: 0, approvedBy: 'cab' });
    const again = await adapter.retire({ policyId: policy.providerId, approvedBy: 'cab' } as any, ctx);
    expect(again.errors).toEqual([T('retire_error', { error: T('already_retired', { name: policy.providerId }) })]);
  });

  it(__t('restores_by_undeleting_recreat'), async () => {
    const { adapter, roles, seed, policyOf } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    await adapter.detach(policy.providerId, USER, ctx);
    const retired = await adapter.retire({ policyId: policy.providerId, approvedBy: 'cab' } as any, ctx);
    const cert = certificate(policy.providerId, retired.rollbackReference);
    expect(await adapter.restore(cert, ctx)).toEqual({ success: true, restoredId: policy.providerId, errors: [] });
    expect(roles.get(policy.providerId)?.deleted).toBe(false);
    expect((await adapter.restore(cert, ctx)).success).toBe(true);
    expect((await adapter.attach(policy, BOB, ctx)).success).toBe(true);
    expect(policyOf(PROJECT).bindings).toEqual([{ role: policy.providerId, members: [BOB] }]);
    await adapter.detach(policy.providerId, BOB, ctx);
    await adapter.retire({ policyId: policy.providerId, approvedBy: 'cab' } as any, ctx);
    seed.purge(policy.providerId);
    expect((await adapter.restore(cert, ctx)).success).toBe(true);
    expect(roles.get(policy.providerId)).toMatchObject({ deleted: false, includedPermissions: ['storage.objects.get', 'storage.objects.list'] });
  });

  it(__t('refuses_a_missing_mismatched_o'), async () => {
    const { adapter, seed, roles } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, USER, ctx);
    await adapter.detach(policy.providerId, USER, ctx);
    const snapshot = JSON.parse((await adapter.retire({ policyId: policy.providerId, approvedBy: 'cab' } as any, ctx)).rollbackReference as string);
    const restore = async (policyId: string, ref?: object | string) => (await adapter.restore(certificate(policyId, typeof ref === 'string' ? ref : ref ? JSON.stringify(ref) : undefined), ctx)).errors;
    expect(await restore(policy.providerId)).toEqual([T('restore_no_reference')]);
    expect(await restore(`${PROJECT}/roles/other`, snapshot)).toEqual([T('restore_error', { error: T('restore_invalid_snapshot', { name: `${PROJECT}/roles/other` }) })]);
    expect(await restore(policy.providerId, { ...snapshot, includedPermissions: undefined })).toEqual([T('restore_error', { error: T('restore_invalid_snapshot', { name: policy.providerId }) })]);
    expect((await restore(policy.providerId, __t('not_json')))[0].startsWith(T('restore_error', { error: '' }))).toBe(true);
    expect(await restore(VIEWER, { ...snapshot, name: VIEWER })).toEqual([T('restore_error', { error: T('protected_role', { name: VIEWER }) })]);
    expect(await restore(`${OTHER}/roles/x`, { ...snapshot, name: `${OTHER}/roles/x` })).toEqual([T('restore_error', { error: T('scope_outside_environment', { resource: OTHER }) })]);
    expect(await restore(`${ORG}/roles/x`, { ...snapshot, name: `${ORG}/roles/x` })).toEqual([T('restore_error', { error: T('shared_role', { name: `${ORG}/roles/x` }) })]);
    expect(await restore(policy.providerId, { ...snapshot, includedPermissions: ['read'] })).toEqual([T('restore_error', { error: T('validate.invalid_permission', { permission: 'read' }) })]);
    seed.role(policy.providerId, ['storage.buckets.get']);
    expect(await restore(policy.providerId, snapshot)).toEqual([T('restore_error', { error: T('role_exists_different', { name: policy.providerId }) })]);
    expect(roles.get(policy.providerId)?.includedPermissions).toEqual(['storage.buckets.get']);
  });
});
