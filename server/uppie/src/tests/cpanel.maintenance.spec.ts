/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - cPanel Adapter Maintenance Tests
 * File           : cpanel.maintenance.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { CpanelAdapter } from '../adapters/cpanel/CpanelAdapter';
import { fakeWhm, ctx, rule, FEATURES } from './support/whmFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.cpanel.${key}`, params);
const WRITES = ['saveFeatureList', 'deleteFeatureList', 'createPackage', 'deletePackage', 'changePackage'];
const writes = (calls: string[], from = 0): string[] => calls.slice(from).filter((c) => WRITES.some((w) => c.startsWith(w)));
const ops = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const plan = (policyId: string) => ({ policyId, shadowPeriodDays: 7, approvedBy: 'ops', retentionDays: 30 });
const certificate = (policyId: string, rollbackReference?: string): any => ({ certificateId: 'c-1', policyId, rollbackReference });
const window = { startAt: '2026-01-01T00:00:00Z', endAt: '2026-02-01T00:00:00Z' };

function setup() {
  const whm = fakeWhm();
  return { ...whm, adapter: new CpanelAdapter(async () => whm.client) };
}

describe(__t('cpanel_update'), () => {
  it(__t('replaces_the_features_of_a_man'), async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    const mark = calls.length;
    const result = await adapter.update(policy.providerId, [rule(ops('mysql', 'cron'))], ctx);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.version).toBe((await adapter.generate([rule(ops('cron', 'mysql'))], ctx)).digest.slice(0, 12));
    expect(state.list(policy.providerId)).toEqual(['cron', 'mysql']);
    expect(writes(calls, mark)).toEqual([`saveFeatureList:${policy.providerId}:overwrite`]);
    expect(state.plan('alice')).toBe(`${policy.providerId}__Gold`);
  });

  it(__t('refuses_unmanaged_missing_deny'), async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    const mark = calls.length;
    const err = (e: string) => [T('update_error', { error: e })];
    expect((await adapter.update('default', [rule()], ctx)).errors).toEqual(err(T('unmanaged_list', { name: 'default' })));
    expect((await adapter.update(__t('mail_only'), [rule()], ctx)).errors).toEqual(err(T('unmanaged_list', { name: __t('mail_only') })));
    expect((await adapter.update('ugondu_a_b', [rule()], ctx)).errors).toEqual(err(T('unmanaged_list', { name: 'ugondu_a_b' })));
    expect((await adapter.update('ugondu_missing', [rule()], ctx)).errors).toEqual(err(T('list_missing', { name: 'ugondu_missing' })));
    expect((await adapter.update(policy.providerId, [rule({ ruleId: 'd', effect: 'DENY' })], ctx)).errors).toEqual(err(T('deny_unsupported', { ruleId: 'd' })));
    expect((await adapter.update(policy.providerId, [rule(ops('nope'))], ctx)).errors).toEqual(err(T('unknown_feature', { feature: 'nope' })));
    expect((await adapter.update(policy.providerId, [], ctx)).errors).toEqual(err(T('no_rules')));
    expect(writes(calls, mark)).toEqual([]);
    expect(state.list(policy.providerId)).toEqual(['fileman', 'ftpaccts']);
    expect(state.list('default')).toEqual(FEATURES);
  });
});

describe(__t('cpanel_clone'), () => {
  it(__t('copies_any_readable_list_into_'), async () => {
    const { adapter, state, calls } = setup();
    const a = await adapter.clone(__t('mail_only'), 'copy', ctx);
    expect(a).toEqual({ success: true, clonedId: 'ugondu_copy', errors: [] });
    expect(state.list('ugondu_copy')).toEqual(['webmail']);
    expect(await adapter.clone('default', '  ugondu_everything ', ctx)).toEqual({ success: true, clonedId: 'ugondu_everything', errors: [] });
    expect(state.list('ugondu_everything')).toEqual(FEATURES);
    const mark = calls.length;
    expect((await adapter.clone(__t('mail_only'), 'copy', ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual([]);
  });

  it(__t('refuses_a_clash_with_a_differe'), async () => {
    const { adapter, state, seed } = setup();
    seed.list('ugondu_taken', ['mysql']);
    const err = (e: string) => [T('clone_error', { error: e })];
    expect((await adapter.clone(__t('mail_only'), 'taken', ctx)).errors).toEqual(err(T('list_exists_different', { name: 'ugondu_taken' })));
    expect((await adapter.clone('nothing', 'fresh', ctx)).errors).toEqual(err(T('list_missing', { name: 'nothing' })));
    for (const bad of [__t('bad_name'), '', 'x_y', 'a'.repeat(49), 'ugondu_']) {
      const result = await adapter.clone(__t('mail_only'), bad, ctx);
      expect(result).toEqual({ success: false, clonedId: '', errors: err(T('invalid_name', { name: bad })) });
    }
    expect(state.list('ugondu_taken')).toEqual(['mysql']);
    expect(state.listNames()).toEqual([__t('mail_only'), 'default', 'disabled', 'ugondu_taken']);
  });
});

describe(__t('cpanel_usage'), () => {
  it(__t('classifies_a_list_no_package_r'), async () => {
    const { adapter, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    seed.list('ugondu_idle', ['mysql']);
    expect(await adapter.observeUsage('ugondu_idle', window, ctx)).toMatchObject({ policyId: 'ugondu_idle', observedUsages: 0, classification: 'UNUSED' });
    expect(await adapter.observeUsage('ugondu_missing', window, ctx)).toMatchObject({ observedUsages: 0, classification: 'UNKNOWN' });
    await adapter.attach(policy, 'alice', ctx);
    await adapter.attach(policy, 'dave', ctx);
    expect(await adapter.observeUsage(policy.providerId, window, ctx)).toMatchObject({ observedUsages: 2, classification: 'UNKNOWN' });
    expect(await adapter.observeUsage('default', window, ctx)).toMatchObject({ observedUsages: 1, classification: 'UNKNOWN' });
    await adapter.detach(policy.providerId, 'alice', ctx);
    await adapter.detach(policy.providerId, 'dave', ctx);
    expect(await adapter.observeUsage(policy.providerId, window, ctx)).toMatchObject({ observedUsages: 0, classification: 'UNUSED' });
  });

  it(__t('lists_only_managed_lists_that_'), async () => {
    const { adapter, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    seed.list('ugondu_idle2', ['mysql']);
    seed.list('ugondu_idle1', ['cron']);
    seed.list('Spare', ['cron']);
    seed.list('ugondu_used', ['ssl']);
    seed.pkg('Holder', 'ugondu_used');
    const unused = await adapter.detectUnused(ctx, 30);
    expect(unused.map((u) => u.policyId)).toEqual(['ugondu_idle1', 'ugondu_idle2']);
    expect(unused.every((u) => u.classification === 'UNUSED' && u.observedUsages === 0)).toBe(true);
  });
});

describe(__t('cpanel_retire_and_restore'), () => {
  it(__t('retires_an_unreferenced_manage'), async () => {
    const { adapter, state } = setup();
    const cloned = await adapter.clone(__t('mail_only'), 'idle', ctx);
    const result = await adapter.retire(plan(cloned.clonedId), ctx);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(JSON.parse(result.rollbackReference as string)).toEqual({ name: 'ugondu_idle', features: ['webmail'] });
    expect(JSON.parse(result.detachmentEvidence as string)).toMatchObject({ policy: 'ugondu_idle', packages: 0, approvedBy: 'ops' });
    expect(JSON.parse(result.detachmentEvidence as string).verifiedAt).toBeTruthy();
    expect(state.list('ugondu_idle')).toBeUndefined();
  });

  it(__t('refuses_to_retire_a_list_a_pac'), async () => {
    const { adapter, state, calls, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    const err = (e: string) => [T('retire_error', { error: e })];
    expect((await adapter.retire(plan(policy.providerId), ctx)).errors).toEqual(err(T('retire_in_use', { name: policy.providerId, count: 1 })));
    seed.list('ugondu_held', ['ssl']);
    seed.pkg('Orphan', 'ugondu_held');
    expect((await adapter.retire(plan('ugondu_held'), ctx)).errors).toEqual(err(T('retire_in_use', { name: 'ugondu_held', count: 1 })));
    expect((await adapter.retire(plan('default'), ctx)).errors).toEqual(err(T('unmanaged_list', { name: 'default' })));
    expect((await adapter.retire(plan('ugondu_none'), ctx)).errors).toEqual(err(T('list_missing', { name: 'ugondu_none' })));
    expect(calls.some((c) => c.startsWith('deleteFeatureList'))).toBe(false);
    expect(state.list(policy.providerId)).toEqual(['fileman', 'ftpaccts']);
    await adapter.detach(policy.providerId, 'alice', ctx);
    expect((await adapter.retire(plan(policy.providerId), ctx)).success).toBe(true);
  });

  it(__t('restores_a_retired_list_from_i'), async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    await adapter.detach(policy.providerId, 'alice', ctx);
    const retired = await adapter.retire(plan(policy.providerId), ctx);
    expect(state.list(policy.providerId)).toBeUndefined();
    const cert = certificate(policy.providerId, retired.rollbackReference);
    expect(await adapter.restore(cert, ctx)).toEqual({ success: true, restoredId: policy.providerId, errors: [] });
    expect(state.list(policy.providerId)).toEqual(['fileman', 'ftpaccts']);
    const mark = calls.length;
    expect((await adapter.restore(cert, ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual([]);
  });

  it(__t('refuses_a_restore_that_would_o'), async () => {
    const { adapter, state, calls, seed } = setup();
    const err = (e: string) => [T('restore_error', { error: e })];
    const snap = (name: string, features: unknown) => JSON.stringify({ name, features });
    seed.list('ugondu_live', ['mysql']);
    expect((await adapter.restore(certificate('ugondu_live', snap('ugondu_live', ['cron'])), ctx)).errors).toEqual(err(T('list_exists_different', { name: 'ugondu_live' })));
    expect((await adapter.restore(certificate('ugondu_live'), ctx)).errors).toEqual([T('restore_no_reference')]);
    expect((await adapter.restore(certificate('ugondu_other', snap('ugondu_live', ['mysql'])), ctx)).errors).toEqual(err(T('restore_invalid_snapshot', { name: 'ugondu_other' })));
    expect((await adapter.restore(certificate('ugondu_live', snap('ugondu_live', 'mysql')), ctx)).errors).toEqual(err(T('restore_invalid_snapshot', { name: 'ugondu_live' })));
    expect((await adapter.restore(certificate('default', snap('default', ['mysql'])), ctx)).errors).toEqual(err(T('unmanaged_list', { name: 'default' })));
    expect((await adapter.restore(certificate('ugondu_new', snap('ugondu_new', ['zzz'])), ctx)).errors).toEqual(err(T('validate.unknown_feature', { feature: 'zzz' })));
    const broken = await adapter.restore(certificate('ugondu_live', __t('not_json')), ctx);
    expect(broken.success).toBe(false);
    expect(broken.errors[0]?.startsWith(T('restore_error', { error: '' }))).toBe(true);
    expect(writes(calls)).toEqual([]);
    expect(state.list('ugondu_live')).toEqual(['mysql']);
    expect(state.list('default')).toEqual(FEATURES);
  });
});
