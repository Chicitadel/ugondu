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

describe(__t('cpanel_discovery'), () => {
  it(__t('reports_every_feature_list_as_'), async () => {
    const { adapter } = setup();
    const policies = await adapter.discoverPolicies(ctx);
    expect(policies.map((p) => p.providerId)).toEqual([__t('mail_only'), 'default', 'disabled']);
    expect(policies.every((p) => p.providerType === 'CPANEL')).toBe(true);
    expect(policies[0]?.nativeDocument).toEqual({ name: __t('mail_only'), features: ['webmail'] });
    expect(policies[1]?.nativeDocument).toEqual({ name: 'default', features: FEATURES });
    expect(policies[0]?.digest).toBe((await adapter.generate([rule({ action: { capability: 'x', operations: ['webmail'] } })], ctx)).digest);
  });

  it(__t('maps_accounts_to_the_feature_l'), async () => {
    const { adapter } = setup();
    expect(await adapter.discoverAssignments(ctx)).toEqual({ alice: ['default'], bob: [__t('mail_only')], carol: ['default'], dave: ['default'] });
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
      { id: 'Mailer', displayName: 'Mailer', policies: [__t('mail_only')] },
    ]);
    expect(await adapter.discoverGroups(ctx)).toEqual([]);
    expect(adapter.capabilities.discoverGroups).toBe('UNSUPPORTED');
    expect(Object.keys(adapter.capabilities).length).toBe(22);
  });
});

describe(__t('cpanel_effective_authority_and'), () => {
  it(__t('lists_the_features_an_account_'), async () => {
    const { adapter } = setup();
    const alice = await adapter.discoverEffectiveAuthority('alice', 'alice.example.com', ctx);
    expect(alice.actorId).toBe('alice');
    expect(alice.resourceId).toBe('alice.example.com');
    expect(alice.evaluationMethod).toBe('POLICY_MODEL');
    expect(alice.permissions.map((p) => p.capability)).toEqual(FEATURES);
    expect(alice.permissions[0]).toMatchObject({ state: 'GRANTED', confidence: 'MEDIUM', sourcePolicies: ['default'], denyPolicies: [], resource: 'alice.example.com' });
    expect((await adapter.discoverEffectiveAuthority('bob', '*', ctx)).permissions.map((p) => [p.capability, p.sourcePolicies])).toEqual([['webmail', [__t('mail_only')]]]);
    expect((await adapter.discoverEffectiveAuthority('dave', '*', ctx)).permissions).toEqual([]);
  });

  it(__t('follows_an_attached_policy_and'), async () => {
    const { adapter } = setup();
    const policy = await adapter.generate([forUser('alice', 'fileman')], ctx);
    await adapter.attach(policy, 'alice', ctx);
    expect((await adapter.discoverEffectiveAuthority('alice', '*', ctx)).permissions.map((p) => [p.capability, p.sourcePolicies])).toEqual([['fileman', [policy.providerId]]]);
    expect(await failure(() => adapter.discoverEffectiveAuthority('erin', '*', ctx))).toBe(T('package_unresolved', { account: 'erin', plan: 'Ghost' }));
    expect(await failure(() => adapter.discoverEffectiveAuthority('nobody', '*', ctx))).toBe(T('account_not_found', { account: 'nobody' }));
    expect(await failure(() => adapter.discoverEffectiveAuthority('Bad!', '*', ctx))).toBe(T('invalid_account', { account: 'Bad!' }));
  });

  it(__t('evaluates_the_access_an_accoun'), async () => {
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

describe(__t('cpanel_simulation'), () => {
  it(__t('reports_what_attaching_would_g'), async () => {
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

  it(__t('merges_the_rules_of_one_subjec'), async () => {
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

  it(__t('classifies_the_blast_radius_fr'), async () => {
    const { adapter } = setup();
    const result = await adapter.simulate(['alice', 'bob', 'carol', 'dave'].map((u) => forUser(u, 'fileman')), ctx);
    expect(result.blastRadius).toMatchObject({ dependentActors: ['alice', 'bob', 'carol', 'dave'], blastRadius: 'SIGNIFICANT' });
  });
});

describe(__t('cpanel_dependencies_and_confli'), () => {
  it(__t('reports_the_packages_that_carr'), async () => {
    const { adapter, seed } = setup();
    expect(await adapter.findDependencies('default', ctx)).toEqual({ policyId: 'default', dependentRoles: ['Gold', 'default'], dependentActors: ['alice', 'carol', 'dave'], dependentServices: [], blastRadius: 'LIMITED' });
    seed.account('abby', 'Gold');
    const wide = await adapter.findDependencies('default', ctx);
    expect(wide.blastRadius).toBe('SIGNIFICANT');
    expect(wide.dependentActors).toEqual(['abby', 'alice', 'carol', 'dave']);
    seed.list('ugondu_idle', ['cron']);
    expect(await adapter.findDependencies('ugondu_idle', ctx)).toEqual({ policyId: 'ugondu_idle', dependentRoles: [], dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' });
  });

  it(__t('reports_a_deny_that_overlaps_a'), async () => {
    const { adapter } = setup();
    const allow = { ...forUser('alice', 'mysql', 'fileman', 'ftpaccts'), ruleId: 'a' };
    const deny = { ...forUser('alice', 'mysql', 'ftpaccts', 'cron'), ruleId: 'd', effect: 'DENY' };
    const found = await adapter.findConflicts([allow, deny], ctx);
    expect(found.conflicts).toEqual([{
      ruleA: 'a', ruleB: 'd', conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS', explanation: T('conflict_explanation', { subject: 'alice', operations: __t('ftpaccts_mysql') }),
    }]);
    expect((await adapter.findConflicts([allow, { ...deny, subject: { type: 'USER', id: 'bob' } }], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, { ...deny, action: { capability: 'x', operations: ['cron'] } }], ctx)).conflicts).toEqual([]);
    expect((await adapter.findConflicts([allow, { ...allow, ruleId: 'b' }], ctx)).conflicts).toEqual([]);
  });
});

describe(__t('cpanel_reconciliation_and_cons'), () => {
  it(__t('diffs_the_desired_features_per'), async () => {
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

  it(__t('refuses_deny_rules_conditions_'), async () => {
    const { adapter } = setup();
    const err = (e: string) => T('reconcile_error', { error: e });
    expect(await failure(() => adapter.reconcile([{ ...forUser('alice', 'fileman'), ruleId: 'd', effect: 'DENY' }], [], ctx))).toBe(err(T('deny_unsupported', { ruleId: 'd' })));
    expect(await failure(() => adapter.reconcile([{ ...forUser('alice', 'fileman'), ruleId: 'c', constraints: { requireMfa: true } }], [], ctx))).toBe(err(T('condition_unsupported', { ruleId: 'c' })));
    expect(await failure(() => adapter.reconcile([forUser('Bad!', 'fileman')], [], ctx))).toBe(err(T('invalid_account', { account: 'Bad!' })));
  });

  it(__t('declares_its_limits_and_reads_'), async () => {
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

describe(__t('cpanel_client_handling'), () => {
  it(__t('builds_one_client_per_tenant_e'), async () => {
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

  it(__t('uses_the_https_client_by_defau'), async () => {
    expect(await failure(() => new CpanelAdapter().discoverRoles(ctx))).toBe(T('invalid_host'));
  });

  it(__t('refuses_to_compile_or_report_l'), async () => {
    const { client } = fakeWhm();
    const blind = { ...client, getFeatureList: async (name: string) => (name === 'default' ? undefined : client.getFeatureList(name)) };
    const adapter = new CpanelAdapter(async () => blind);
    expect(await failure(() => adapter.generate([rule()], ctx))).toBe(T('catalog_unavailable', { name: 'default' }));
    expect(await failure(() => adapter.getConstraints(ctx))).toBe(T('catalog_unavailable', { name: 'default' }));
  });
});
