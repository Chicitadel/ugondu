/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - cPanel Adapter Analysis Tests
 * File           : cpanel.analysis.spec.ts
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
const failure = async (run: () => Promise<any>): Promise<string> => { try { await run(); return ''; } catch (e: any) { return e.message; } };
const forUser = (user: string, ...operations: string[]) => rule({ subject: { type: 'USER', id: user }, resource: { type: 'cpanel::account', scope: `${user}.example.com` }, action: { capability: 'x', operations } });
const id = (user: string, feature: string): string => `${user}:${user}.example.com:${feature}`;
const except = (...gone: string[]): string[] => FEATURES.filter((f) => !gone.includes(f));

function setup() {
  const whm = fakeWhm();
  return { ...whm, adapter: new CpanelAdapter(async () => whm.client) };
}

describe('cPanel discovery', () => {
  it('reports every feature list as a native policy whose digest depends only on its features', async () => {
    const { adapter } = setup();
    const policies = await adapter.discoverPolicies(ctx);
    expect(policies.map((p) => p.providerId)).toEqual(['Mail Only', 'default', 'disabled']);
    expect(policies.every((p) => p.providerType === 'CPANEL')).toBe(true);
    expect(policies[0]?.nativeDocument).toEqual({ name: 'Mail Only', features: ['webmail'] });
    expect(policies[1]?.nativeDocument).toEqual({ name: 'default', features: FEATURES });
    expect(policies[0]?.digest).toBe((await adapter.generate([rule({ action: { capability: 'x', operations: ['webmail'] } })], ctx)).digest);
  });

  it('maps accounts to the feature list of their package and leaves out accounts whose package is missing', async () => {
    const { adapter } = setup();
    expect(await adapter.discoverAssignments(ctx)).toEqual({ alice: ['default'], bob: ['Mail Only'], carol: ['default'], dave: ['default'] });
  });

  it('reports accounts and resellers as identities, and packages as roles; there are no groups', async () => {
    const { adapter, seed } = setup();
    seed.reseller('carol');
    seed.reseller('ghostreseller');
    seed.account('aaron', 'default');
    seed.pkg('Alpha', 'disabled');
    const identities = await adapter.discoverIdentities(ctx);
    expect(identities.map((i) => i.id)).toEqual(['aaron', 'alice', 'bob', 'carol', 'dave', 'erin', 'ghostreseller']);
    expect(identities.map((i) => i.type)).toEqual(['CPANEL_ACCOUNT', 'CPANEL_ACCOUNT', 'CPANEL_ACCOUNT', 'WHM_RESELLER', 'CPANEL_ACCOUNT', 'CPANEL_ACCOUNT', 'WHM_RESELLER']);
    expect(identities[1]?.displayName).toBe('alice.example.com');
    expect(identities[3]?.displayName).toBe('carol.example.com');
    expect(identities[6]?.displayName).toBe('ghostreseller');
    expect(await adapter.discoverRoles(ctx)).toEqual([
      { id: 'Alpha', displayName: 'Alpha', policies: ['disabled'] },
      { id: 'default', displayName: 'default', policies: ['default'] },
      { id: 'Gold', displayName: 'Gold', policies: ['default'] },
      { id: 'Mailer', displayName: 'Mailer', policies: ['Mail Only'] },
    ]);
    expect(await adapter.discoverGroups(ctx)).toEqual([]);
    expect(adapter.capabilities.discoverGroups).toBe('UNSUPPORTED');
    expect(Object.keys(adapter.capabilities).length).toBe(22);
  });
});

describe('cPanel effective authority and evaluation', () => {
  it('lists the features an account holds through its package and nothing for a suspended account', async () => {
    const { adapter } = setup();
    const alice = await adapter.discoverEffectiveAuthority('alice', 'alice.example.com', ctx);
    expect(alice.actorId).toBe('alice');
    expect(alice.resourceId).toBe('alice.example.com');
    expect(alice.evaluationMethod).toBe('POLICY_MODEL');
    expect(alice.permissions.map((p) => p.capability)).toEqual(FEATURES);
    expect(alice.permissions[0]).toMatchObject({ state: 'GRANTED', confidence: 'MEDIUM', sourcePolicies: ['default'], denyPolicies: [], resource: 'alice.example.com' });
    expect((await adapter.discoverEffectiveAuthority('bob', '*', ctx)).permissions.map((p) => [p.capability, p.sourcePolicies])).toEqual([['webmail', ['Mail Only']]]);
    expect((await adapter.discoverEffectiveAuthority('dave', '*', ctx)).permissions).toEqual([]);
  });

  it('follows an attached policy and refuses accounts it cannot resolve', async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([forUser('alice', 'fileman')], ctx);
    await adapter.attach(policy, 'alice', ctx);
    expect((await adapter.discoverEffectiveAuthority('alice', '*', ctx)).permissions.map((p) => [p.capability, p.sourcePolicies])).toEqual([['fileman', [policy.providerId]]]);
    expect(await failure(() => adapter.discoverEffectiveAuthority('erin', '*', ctx))).toBe(T('package_unresolved', { account: 'erin', plan: 'Ghost' }));
    expect(await failure(() => adapter.discoverEffectiveAuthority('nobody', '*', ctx))).toBe(T('account_not_found', { account: 'nobody' }));
    expect(await failure(() => adapter.discoverEffectiveAuthority('Bad!', '*', ctx))).toBe(T('invalid_account', { account: 'Bad!' }));
  });

  it('evaluates the access an account actually holds, whatever the effect of the rule', async () => {
    const { adapter, seed } = setup();
    const ev = (r: any) => adapter.evaluate(r, ctx);
    expect(await ev(forUser('alice', 'fileman'))).toBe('GRANTED');
    expect(await ev(forUser('bob', 'webmail'))).toBe('GRANTED');
    expect(await ev(forUser('bob', 'fileman'))).toBe('DENIED');
    expect(await ev(forUser('bob', 'webmail', 'fileman'))).toBe('DENIED');
    expect(await ev(forUser('dave', 'fileman'))).toBe('DENIED');
    expect(await ev({ ...forUser('bob', 'fileman'), effect: 'DENY' })).toBe('DENIED');
    expect(await ev({ ...forUser('bob', 'webmail'), effect: 'DENY' })).toBe('GRANTED');
    expect(await ev(forUser('erin', 'fileman'))).toBe('UNKNOWN');
    expect(await ev(forUser('nobody', 'fileman'))).toBe('UNKNOWN');
    expect(await ev(forUser('alice'))).toBe('UNKNOWN');
    expect(await ev(forUser('Bad!', 'fileman'))).toBe('UNKNOWN');
    seed.failOnce('getAccount');
    expect(await ev(forUser('alice', 'fileman'))).toBe('UNKNOWN');
  });
});

describe('cPanel simulation', () => {
  it('reports what attaching would grant, keep and take away, because a feature list replaces the whole feature set', async () => {
    const { adapter, calls } = setup();
    const kept = await adapter.simulate([forUser('alice', 'fileman', 'ftpaccts')], ctx);
    expect(kept.allowed).toEqual([]);
    expect(kept.unchanged).toEqual([id('alice', 'fileman'), id('alice', 'ftpaccts')]);
    expect(kept.denied).toEqual(except('fileman', 'ftpaccts').map((f) => id('alice', f)));
    expect(kept.confidence).toBe('HIGH');
    expect(kept.blastRadius).toMatchObject({ dependentActors: ['alice'], blastRadius: 'LIMITED' });
    const swapped = await adapter.simulate([forUser('bob', 'fileman')], ctx);
    expect(swapped).toMatchObject({ allowed: [id('bob', 'fileman')], denied: [id('bob', 'webmail')], unchanged: [], confidence: 'HIGH' });
    expect(calls.some((c) => c.startsWith('saveFeatureList') || c.startsWith('changePackage'))).toBe(false);
  });

  it('merges the rules of one subject and lowers the confidence for subjects it cannot resolve or compile', async () => {
    const { adapter } = setup();
    const merged = await adapter.simulate([forUser('bob', 'webmail'), forUser('bob', 'fileman')], ctx);
    expect(merged).toMatchObject({ allowed: [id('bob', 'fileman')], unchanged: [id('bob', 'webmail')], denied: [] });
    const partial = await adapter.simulate([forUser('bob', 'webmail'), forUser('erin', 'fileman')], ctx);
    expect(partial.confidence).toBe('MEDIUM');
    expect(partial.unchanged).toEqual([id('bob', 'webmail'), id('erin', 'fileman')]);
    const none = await adapter.simulate([forUser('erin', 'fileman'), { ...forUser('bob', 'mysql'), effect: 'DENY' }, forUser('carol', 'nope')], ctx);
    expect(none).toMatchObject({ allowed: [], denied: [], confidence: 'LOW' });
    expect(none.unchanged).toEqual([id('erin', 'fileman'), id('bob', 'mysql'), id('carol', 'nope')]);
    expect(none.blastRadius.dependentActors).toEqual([]);
  });

  it('classifies the blast radius from the number of accounts', async () => {
    const { adapter } = setup();
    const result = await adapter.simulate(['alice', 'bob', 'carol', 'dave'].map((u) => forUser(u, 'fileman')), ctx);
    expect(result.blastRadius).toMatchObject({ dependentActors: ['alice', 'bob', 'carol', 'dave'], blastRadius: 'SIGNIFICANT' });
  });
});

describe('cPanel dependencies and conflicts', () => {
  it('reports the packages that carry a list and the accounts on them', async () => {
    const { adapter, seed } = setup();
    expect(await adapter.findDependencies('default', ctx)).toEqual({ policyId: 'default', dependentRoles: ['Gold', 'default'], dependentActors: ['alice', 'carol', 'dave'], dependentServices: [], blastRadius: 'LIMITED' });
    seed.account('abby', 'Gold');
    const wide = await adapter.findDependencies('default', ctx);
    expect(wide.blastRadius).toBe('SIGNIFICANT');
    expect(wide.dependentActors).toEqual(['abby', 'alice', 'carol', 'dave']);
    seed.list('ugondu_idle', ['cron']);
    expect(await adapter.findDependencies('ugondu_idle', ctx)).toEqual({ policyId: 'ugondu_idle', dependentRoles: [], dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' });
  });

  it('reports a Deny that overlaps an Allow of the same subject as ambiguous, and nothing else', async () => {
    const { adapter } = setup();
    const allow = { ...forUser('alice', 'mysql', 'fileman', 'ftpaccts'), ruleId: 'a' };
    const deny = { ...forUser('alice', 'mysql', 'ftpaccts', 'cron'), ruleId: 'd', effect: 'DENY' };
    const found = await adapter.findConflicts([allow, deny], ctx);
    expect(found.conflicts).toEqual([{
      ruleA: 'a', ruleB: 'd', conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS', explanation: T('conflict_explanation', { subject: 'alice', operations: 'ftpaccts, mysql' }),
    }]);
    expect((await adapter.findConflicts([allow, { ...deny, subject: { type: 'USER', id: 'bob' } }], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, { ...deny, action: { capability: 'x', operations: ['cron'] } }], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, { ...allow, ruleId: 'b' }], ctx)).conflicts).toEqual([]);
  });
});

describe('cPanel reconciliation and constraints', () => {
  it('diffs the desired features per account with what managed lists give the accounts that use them', async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([forUser('alice', 'fileman', 'ftpaccts')], ctx);
    await adapter.attach(policy, 'alice', ctx);
    const observed = await adapter.discoverPolicies(ctx);
    const same = await adapter.reconcile([forUser('alice', 'ftpaccts', 'fileman')], observed, ctx);
    expect(same).toEqual({ toAdd: [], toRemove: [], toUpdate: [], noChange: ['Allow|alice'] });
    const changed = await adapter.reconcile([forUser('alice', 'mysql'), forUser('bob', 'webmail', 'cron')], observed, ctx);
    expect(changed.toAdd.map((r) => [r.subject.id, r.action.operations])).toEqual([['bob', ['cron', 'webmail']]]);
    expect(changed.toUpdate.map((u) => [u.ruleId, u.newRule.action.operations])).toEqual([['Allow|alice', ['mysql']]]);
    expect(changed.noChange).toEqual([]);
    expect(changed.toRemove).toEqual([]);
    const dropped = await adapter.reconcile([forUser('bob', 'webmail')], observed, ctx);
    expect(dropped.toRemove).toEqual(['Allow|alice']);
    expect(dropped.toAdd.length).toBe(1);
    const union = await adapter.reconcile([forUser('alice', 'fileman'), forUser('alice', 'ftpaccts')], observed, ctx);
    expect(union.noChange).toEqual(['Allow|alice']);
  });

  it('refuses Deny rules, conditions and bad subjects instead of reconciling around them', async () => {
    const { adapter } = setup();
    const err = (e: string) => T('reconcile_error', { error: e });
    expect(await failure(() => adapter.reconcile([{ ...forUser('alice', 'fileman'), ruleId: 'd', effect: 'DENY' }], [], ctx))).toBe(err(T('deny_unsupported', { ruleId: 'd' })));
    expect(await failure(() => adapter.reconcile([{ ...forUser('alice', 'fileman'), ruleId: 'c', constraints: { requireMfa: true } }], [], ctx))).toBe(err(T('condition_unsupported', { ruleId: 'c' })));
    expect(await failure(() => adapter.reconcile([forUser('Bad!', 'fileman')], [], ctx))).toBe(err(T('invalid_account', { account: 'Bad!' })));
  });

  it('declares its limits and reads the number of features from the server', async () => {
    const { adapter } = setup();
    const c = await adapter.getConstraints(ctx);
    expect(c.maxStatements).toMatchObject({ status: 'SUPPORTED', value: FEATURES.length });
    expect(c.maxPoliciesPerRole).toMatchObject({ status: 'SUPPORTED', value: 1 });
    expect(c.maxRolesPerIdentity).toMatchObject({ status: 'SUPPORTED', value: 1 });
    expect(c.maxInheritanceDepth).toMatchObject({ status: 'SUPPORTED', value: 2 });
    expect(c.maxAssignments.status).toBe('NOT_OBSERVABLE');
    expect(c.maxGroups.status).toBe('UNSUPPORTED');
    expect(c.maxACLEntries.status).toBe('UNSUPPORTED');
  });
});

describe('cPanel client handling', () => {
  it('builds one client per tenant, environment and server identity and does not cache a failed build', async () => {
    const { client } = fakeWhm();
    let built = 0;
    const adapter = new CpanelAdapter(async () => { built++; return client; });
    await adapter.discoverRoles(ctx);
    await adapter.discoverRoles(ctx);
    expect(built).toBe(1);
    await adapter.discoverRoles({ ...ctx, environmentId: 'srv2' });
    await adapter.discoverRoles({ ...ctx, credentials: { host: 'other.example.com' } });
    expect(built).toBe(3);
    let broken = true;
    const retrying = new CpanelAdapter(async () => { if (broken) { broken = false; throw new Error('boom'); } return client; });
    expect(await failure(() => retrying.discoverRoles(ctx))).toBe('boom');
    expect((await retrying.discoverRoles(ctx)).length).toBe(3);
  });

  it('uses the HTTPS client by default and refuses to start without server credentials', async () => {
    expect(await failure(() => new CpanelAdapter().discoverRoles(ctx))).toBe(T('invalid_host'));
  });

  it('refuses to compile or report limits when the list that defines the server features is missing', async () => {
    const { client } = fakeWhm();
    const blind = { ...client, getFeatureList: async (name: string) => (name === 'default' ? undefined : client.getFeatureList(name)) };
    const adapter = new CpanelAdapter(async () => blind);
    expect(await failure(() => adapter.generate([rule()], ctx))).toBe(T('catalog_unavailable', { name: 'default' }));
    expect(await failure(() => adapter.getConstraints(ctx))).toBe(T('catalog_unavailable', { name: 'default' }));
  });
});
