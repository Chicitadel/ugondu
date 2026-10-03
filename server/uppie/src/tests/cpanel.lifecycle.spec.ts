/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - cPanel Adapter Lifecycle Tests
 * File           : cpanel.lifecycle.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { CpanelAdapter } from '../adapters/cpanel/CpanelAdapter';
import type { CpanelDocument } from '../adapters/cpanel/CpanelHelpers';
import { fakeWhm, ctx, rule, FEATURES } from './support/whmFake';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.cpanel.${key}`, params);
const GOLD = { quota: '5000', maxftp: '10', maxsql: '5', hasshell: 'y', lang: 'fr' };
const WRITES = ['saveFeatureList', 'deleteFeatureList', 'createPackage', 'deletePackage', 'changePackage'];
const writes = (calls: string[], from = 0): string[] => calls.slice(from).filter((c) => WRITES.some((w) => c.startsWith(w)));
const ops = (...operations: string[]) => ({ action: { capability: 'x', operations } });
const failure = async (run: () => Promise<any>): Promise<string> => { try { await run(); return ''; } catch (e: any) { return e.message; } };

function setup() {
  const whm = fakeWhm();
  return { ...whm, adapter: new CpanelAdapter(async () => whm.client) };
}

describe('cPanel compilation', () => {
  it('builds one deterministic, order-independent feature list', async () => {
    const { adapter } = setup();
    const rules = [rule({ ruleId: 'a' }), rule({ ruleId: 'b', ...ops('mysql', 'fileman') })];
    const a = await adapter.generate(rules, ctx);
    const b = await adapter.generate([...rules].reverse(), ctx);
    const doc = a.nativeDocument as CpanelDocument;
    expect(doc.features).toEqual(['fileman', 'ftpaccts', 'mysql']);
    expect(doc.name).toBe(`ugondu_${a.digest.slice(0, 12)}`);
    expect(a.providerId).toBe(doc.name);
    expect(a.providerType).toBe('CPANEL');
    expect(a.digest.length).toBe(64);
    expect(b.digest).toBe(a.digest);
    expect(b.providerId).toBe(a.providerId);
    expect((await adapter.generate([rule(ops('mysql'))], ctx)).digest === a.digest).toBe(false);
  });

  it('trims and de-duplicates operations', async () => {
    const { adapter } = setup();
    expect(((await adapter.generate([rule(ops(' fileman ', 'fileman'))], ctx)).nativeDocument as CpanelDocument).features).toEqual(['fileman']);
  });

  it('stores the features in sorted order whatever order the rules list them in', async () => {
    const { adapter } = setup();
    const doc = (await adapter.generate([rule(ops('webmail', 'cron', 'backup'))], ctx)).nativeDocument as CpanelDocument;
    expect(doc.features).toEqual(['backup', 'cron', 'webmail']);
  });

  it('fails closed on everything a feature list cannot express and never drops a rule silently', async () => {
    const { adapter } = setup();
    const gen = (...rules: any[]) => failure(() => adapter.generate(rules, ctx));
    expect(await gen(rule({ ruleId: 'd', effect: 'DENY' }))).toBe(T('deny_unsupported', { ruleId: 'd' }));
    expect(await gen(rule(), rule({ ruleId: 'd', effect: 'DENY' }))).toBe(T('deny_unsupported', { ruleId: 'd' }));
    expect(await gen(rule({ ruleId: 'c', conditions: [{ type: 'TIME_BOUND', value: { notAfter: '2030-01-01T00:00:00Z' } }] }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { requireMfa: true } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { ipRange: '10.0.0.0/8' } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 'c', constraints: { maxCallsPerHour: 10 } }))).toBe(T('condition_unsupported', { ruleId: 'c' }));
    expect(await gen(rule({ ruleId: 't', validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: '2030-01-01T00:00:00Z', type: 'TEMPORARY' } }))).toBe(T('validity_unsupported', { ruleId: 't' }));
    expect(await gen(rule({ ruleId: 'e', ...ops() }))).toBe(T('invalid_rule', { ruleId: 'e' }));
    expect(await gen()).toBe(T('no_rules'));
    expect(await gen(rule(ops('nope')))).toBe(T('unknown_feature', { feature: 'nope' }));
    expect(await gen(rule(ops('Bad Feature')))).toBe(T('unknown_feature', { feature: 'Bad Feature' }));
    expect(await gen(rule({ constraints: { requireMfa: false } }))).toBe('');
  });
});

describe('cPanel validation', () => {
  it('accepts a generated policy and warns when it enables every feature', async () => {
    const { adapter } = setup();
    expect(await adapter.validate(await adapter.generate([rule()], ctx), ctx)).toEqual({ valid: true, errors: [], warnings: [] });
    expect(await adapter.validate(await adapter.generate([rule(ops(...FEATURES))], ctx), ctx)).toEqual({ valid: true, errors: [], warnings: [T('validate.all_features')] });
  });

  it('rejects tampered, foreign, unknown, empty and missing documents', async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const doc = policy.nativeDocument as CpanelDocument;
    const check = (nativeDocument: any, digest = '') => adapter.validate({ ...policy, nativeDocument, digest }, ctx);
    expect((await check({ ...doc, features: ['fileman'] }, policy.digest)).errors).toEqual([T('validate.digest_mismatch')]);
    expect((await check({ name: 'default', features: ['fileman'] })).errors).toEqual([T('validate.invalid_name', { name: 'default' })]);
    expect((await check({ name: 'ugondu_abc', features: ['fileman', 'zzz'] })).errors).toEqual([T('validate.unknown_feature', { feature: 'zzz' })]);
    expect((await check({ name: 'ugondu_abc', features: [] })).errors).toEqual([T('validate.no_features')]);
    expect((await check(undefined)).errors).toEqual([T('validate.invalid_document')]);
    expect((await check(undefined)).valid).toBe(false);
    expect((await check({ name: 'ugondu_abc', features: ['fileman'] })).valid).toBe(true);
  });
});

describe('cPanel attach', () => {
  it('moves the account to a clone of its package that carries the list and keeps every package setting', async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const name = policy.providerId;
    const result = await adapter.attach(policy, 'alice', ctx);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.providerRef).toBe(`alice#${name}`);
    expect(result.attachedAt).toBeTruthy();
    expect(state.list(name)).toEqual(['fileman', 'ftpaccts']);
    expect(state.plan('alice')).toBe(`${name}__Gold`);
    expect(state.pkg(`${name}__Gold`)).toEqual({ name: `${name}__Gold`, featureList: name, attributes: GOLD });
    expect(state.pkg('Gold')?.featureList).toBe('default');
    expect(state.plan('bob')).toBe('Mailer');
    expect(writes(calls)).toEqual([`saveFeatureList:${name}:create`, `createPackage:${name}__Gold`, `changePackage:alice:${name}__Gold`]);
  });

  it('is idempotent and reuses an identical existing list', async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    expect((await adapter.attach(policy, 'alice', ctx)).success).toBe(true);
    const mark = calls.length;
    expect((await adapter.attach(policy, 'alice', ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual([]);
    expect(state.plan('alice')).toBe(`${policy.providerId}__Gold`);
    const other = setup();
    other.seed.list(policy.providerId, ['fileman', 'ftpaccts']);
    expect((await other.adapter.attach(policy, 'bob', ctx)).success).toBe(true);
    expect(writes(other.calls)).toEqual([`createPackage:${policy.providerId}__Mailer`, `changePackage:bob:${policy.providerId}__Mailer`]);
  });

  it('refuses a different list of the same name, an unknown account and a bad account name without writing', async () => {
    const { adapter, state, calls, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const err = (e: string) => [T('attach_error', { error: e })];
    seed.list(policy.providerId, ['mysql']);
    expect((await adapter.attach(policy, 'alice', ctx)).errors).toEqual(err(T('list_exists_different', { name: policy.providerId })));
    expect((await adapter.attach(policy, 'nobody', ctx)).errors).toEqual(err(T('list_exists_different', { name: policy.providerId })));
    const clean = setup();
    const p = await clean.adapter.generate([rule()], ctx);
    expect((await clean.adapter.attach(p, 'nobody', ctx)).errors).toEqual(err(T('account_not_found', { account: 'nobody' })));
    expect((await clean.adapter.attach(p, 'Alice!', ctx)).errors).toEqual(err(T('invalid_account', { account: 'Alice!' })));
    expect((await clean.adapter.attach(p, '../x', ctx)).errors).toEqual(err(T('invalid_account', { account: '../x' })));
    expect((await clean.adapter.attach(p, '', ctx)).errors).toEqual(err(T('invalid_account', { account: '' })));
    expect(writes(clean.calls)).toEqual([]);
    expect(writes(calls)).toEqual([]);
    expect(state.plan('alice')).toBe('Gold');
  });

  it('checks everything before it writes: a missing original package or a clashing package leaves the server untouched', async () => {
    const { adapter, state, calls, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const err = (e: string) => [T('attach_error', { error: e })];
    expect((await adapter.attach(policy, 'erin', ctx)).errors).toEqual(err(T('origin_package_missing', { package: 'Ghost' })));
    seed.pkg(`${policy.providerId}__Gold`, 'Mail Only');
    expect((await adapter.attach(policy, 'alice', ctx)).errors).toEqual(err(T('package_conflict', { name: `${policy.providerId}__Gold` })));
    seed.pkg('P'.repeat(50), 'default');
    seed.account('zed', 'P'.repeat(50));
    const long = `${policy.providerId}__${'P'.repeat(50)}`;
    expect((await adapter.attach(policy, 'zed', ctx)).errors).toEqual(err(T('package_name_too_long', { name: long, max: 64 })));
    expect(writes(calls)).toEqual([]);
    expect(state.list(policy.providerId)).toBeUndefined();
    expect(state.plan('alice')).toBe('Gold');
  });

  it('refuses invalid and unmanaged policies before any call that writes', async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    expect((await adapter.attach({ ...policy, digest: 'f'.repeat(64) }, 'alice', ctx)).errors).toEqual([T('validate.digest_mismatch')]);
    const foreign = { providerId: 'default', providerType: 'CPANEL' as const, nativeDocument: { name: 'default', features: ['fileman'] }, digest: '' };
    expect((await adapter.attach(foreign, 'alice', ctx)).errors).toEqual([T('validate.invalid_name', { name: 'default' })]);
    expect(writes(calls)).toEqual([]);
    expect(state.list('default')).toEqual(FEATURES);
  });

  it('switches an account between policies without losing its original package and removes the abandoned clone', async () => {
    const { adapter, state } = setup();
    const a = await adapter.generate([rule()], ctx);
    const b = await adapter.generate([rule(ops('mysql'))], ctx);
    await adapter.attach(a, 'alice', ctx);
    expect((await adapter.attach(b, 'alice', ctx)).success).toBe(true);
    expect(state.plan('alice')).toBe(`${b.providerId}__Gold`);
    expect(state.packageNames()).toEqual(['Gold', 'Mailer', 'default', `${b.providerId}__Gold`]);
    expect(state.list(a.providerId)).toEqual(['fileman', 'ftpaccts']);
  });

  it('can be retried after the move itself failed, finding the list and package already in place', async () => {
    const { adapter, state, calls, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    seed.failOnce('changePackage');
    expect((await adapter.attach(policy, 'alice', ctx)).errors).toEqual([T('attach_error', { error: 'injected failure: changePackage' })]);
    expect(state.plan('alice')).toBe('Gold');
    const mark = calls.length;
    expect((await adapter.attach(policy, 'alice', ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual([`changePackage:alice:${policy.providerId}__Gold`]);
    expect(state.plan('alice')).toBe(`${policy.providerId}__Gold`);
  });
});

describe('cPanel detach', () => {
  it('moves the account back, keeps a clone that another account still uses and removes it with the last one', async () => {
    const { adapter, state, calls } = setup();
    const policy = await adapter.generate([rule()], ctx);
    const clone = `${policy.providerId}__Gold`;
    await adapter.attach(policy, 'alice', ctx);
    await adapter.attach(policy, 'dave', ctx);
    let mark = calls.length;
    const first = await adapter.detach(policy.providerId, 'alice', ctx);
    expect(first.success).toBe(true);
    expect(first.detachedAt).toBeTruthy();
    expect(writes(calls, mark)).toEqual(['changePackage:alice:Gold']);
    expect(state.plan('alice')).toBe('Gold');
    expect(state.plan('dave')).toBe(clone);
    mark = calls.length;
    expect((await adapter.detach(policy.providerId, 'dave', ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual(['changePackage:dave:Gold', `deletePackage:${clone}`]);
    expect(state.packageNames()).toEqual(['Gold', 'Mailer', 'default']);
  });

  it('does nothing for an account that is not attached to the policy', async () => {
    const { adapter, state, calls } = setup();
    const a = await adapter.generate([rule()], ctx);
    const b = await adapter.generate([rule(ops('mysql'))], ctx);
    expect((await adapter.detach(a.providerId, 'alice', ctx)).success).toBe(true);
    await adapter.attach(a, 'alice', ctx);
    const mark = calls.length;
    expect((await adapter.detach(b.providerId, 'alice', ctx)).success).toBe(true);
    expect(writes(calls, mark)).toEqual([]);
    expect(state.plan('alice')).toBe(`${a.providerId}__Gold`);
  });

  it('reports an unknown account, a bad account name and a vanished original package', async () => {
    const { adapter, state, client, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    expect((await adapter.detach(policy.providerId, 'nobody', ctx)).errors).toEqual([T('detach_error', { error: T('account_not_found', { account: 'nobody' }) })]);
    expect((await adapter.detach(policy.providerId, 'Bad Name', ctx)).errors).toEqual([T('detach_error', { error: T('invalid_account', { account: 'Bad Name' }) })]);
    seed.pkg('Temp', 'default');
    seed.account('zed', 'Temp');
    await adapter.attach(policy, 'zed', ctx);
    await client.deletePackage('Temp');
    const result = await adapter.detach(policy.providerId, 'zed', ctx);
    expect(result.success).toBe(false);
    expect(result.errors).toEqual([T('detach_error', { error: T('origin_package_missing', { package: 'Temp' }) })]);
    expect(state.plan('zed')).toBe(`${policy.providerId}__Temp`);
  });

  it('removes a leftover clone on retry when its deletion failed after the account moved back', async () => {
    const { adapter, state, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    seed.failOnce('deletePackage');
    expect((await adapter.detach(policy.providerId, 'alice', ctx)).errors).toEqual([T('detach_error', { error: 'injected failure: deletePackage' })]);
    expect(state.plan('alice')).toBe('Gold');
    expect(state.packageNames()).toContain(`${policy.providerId}__Gold`);
    expect((await adapter.detach(policy.providerId, 'alice', ctx)).success).toBe(true);
    expect(state.packageNames()).toEqual(['Gold', 'Mailer', 'default']);
  });

  it('only ever removes the clones it created for the list, never other unused packages', async () => {
    const { adapter, state, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    seed.pkg('Idle', 'default');
    seed.pkg(`${policy.providerId}__Stray`, 'Mail Only');
    await adapter.attach(policy, 'alice', ctx);
    expect((await adapter.detach(policy.providerId, 'alice', ctx)).success).toBe(true);
    expect(state.packageNames()).toEqual(['Gold', 'Idle', 'Mailer', 'default', `${policy.providerId}__Stray`]);
  });

  it('never removes an unused package of the operator that merely references the list', async () => {
    const { adapter, state, seed } = setup();
    const policy = await adapter.generate([rule()], ctx);
    await adapter.attach(policy, 'alice', ctx);
    seed.pkg('Custom', policy.providerId);
    expect((await adapter.detach(policy.providerId, 'alice', ctx)).success).toBe(true);
    expect(state.packageNames()).toEqual(['Custom', 'Gold', 'Mailer', 'default']);
  });
});
