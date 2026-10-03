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

describe('cPanel update', () => {
  it('replaces the features of a managed list in place and reports the new version', async () => {
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

  it('refuses unmanaged, missing, Deny and unknown-feature updates without changing anything', async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    const mark = calls.length;
    const err = (e: string) => [T('update_error', { error: e })];
    expect((await adapter.update('default', [rule()], ctx)).errors).toEqual(err(T('unmanaged_list', { name: 'default' })));
    expect((await adapter.update('Mail Only', [rule()], ctx)).errors).toEqual(err(T('unmanaged_list', { name: 'Mail Only' })));
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

describe('cPanel clone', () => {
  it('copies any readable list into a managed list, adding the prefix and trimming the name', async () => {
    const { adapter, state, calls } = setup();
    const a = await adapter.clone('Mail Only', 'copy', ctx);
    expect(a).toEqual({ success: true, clonedId: 'ugondu_copy', errors: [] });
    expect(state.list('ugondu_copy')).toEqual(['webmail']);
    expect(await adapter.clone('default', '  ugondu_everything ', ctx)).toEqual({ success: true, clonedId: 'ugondu_everything', errors: [] });
    expect(state.list('ugondu_everything')).toEqual(FEATURES);
    const mark = calls.length;
    expect((await adapter.clone('Mail Only', 'copy', ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual([]);
  });

  it('refuses a clash with a different list, a missing source and invalid names', async () => {
    const { adapter, state, seed } = setup();
    seed.list('ugondu_taken', ['mysql']);
    const err = (e: string) => [T('clone_error', { error: e })];
    expect((await adapter.clone('Mail Only', 'taken', ctx)).errors).toEqual(err(T('list_exists_different', { name: 'ugondu_taken' })));
    expect((await adapter.clone('nothing', 'fresh', ctx)).errors).toEqual(err(T('list_missing', { name: 'nothing' })));
    for (const bad of ['bad name', '', 'x_y', 'a'.repeat(49), 'ugondu_']) {
      const result = await adapter.clone('Mail Only', bad, ctx);
      expect(result).toEqual({ success: false, clonedId: '', errors: err(T('invalid_name', { name: bad })) });
    }
    expect(state.list('ugondu_taken')).toEqual(['mysql']);
    expect(state.listNames()).toEqual(['Mail Only', 'default', 'disabled', 'ugondu_taken']);
  });
});

describe('cPanel usage', () => {
  it('classifies a list no package references as UNUSED and any referenced list as UNKNOWN', async () => {
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

  it('lists only managed lists that no package references', async () => {
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

describe('cPanel retire and restore', () => {
  it('retires an unreferenced managed list and returns a snapshot and evidence', async () => {
    const { adapter, state } = setup();
    const cloned = await adapter.clone('Mail Only', 'idle', ctx);
    const result = await adapter.retire(plan(cloned.clonedId), ctx);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(JSON.parse(result.rollbackReference as string)).toEqual({ name: 'ugondu_idle', features: ['webmail'] });
    expect(JSON.parse(result.detachmentEvidence as string)).toMatchObject({ policy: 'ugondu_idle', packages: 0, approvedBy: 'ops' });
    expect(JSON.parse(result.detachmentEvidence as string).verifiedAt).toBeTruthy();
    expect(state.list('ugondu_idle')).toBeUndefined();
  });

  it('refuses to retire a list a package references, even one no account uses, and never an unmanaged or missing list', async () => {
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

  it('restores a retired list from its snapshot, idempotently', async () => {
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

  it('refuses a restore that would overwrite a different list or that the snapshot does not justify', async () => {
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
    const broken = await adapter.restore(certificate('ugondu_live', 'not json'), ctx);
    expect(broken.success).toBe(false);
    expect(broken.errors[0]?.startsWith(T('restore_error', { error: '' }))).toBe(true);
    expect(writes(calls)).toEqual([]);
    expect(state.list('ugondu_live')).toEqual(['mysql']);
    expect(state.list('default')).toEqual(FEATURES);
  });
});
