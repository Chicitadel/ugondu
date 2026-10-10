/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - Kubernetes RBAC Adapter Tests
 * File           : k8s-rbac.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { KubernetesRbacAdapter } from '../adapters/kubernetes-rbac/KubernetesRbacAdapter';
import { K8sApiError } from '../adapters/kubernetes-rbac/KubernetesRbacClient';
import type { K8sClusterRole } from '../adapters/kubernetes-rbac/KubernetesRbacClient';
import { fakeCluster, ctx, rule } from './support/k8sFakeCluster';
import { compileK8sPolicyRules, parseScope, parseSubject, buildBindingName } from '../adapters/kubernetes-rbac/KubernetesRbacHelpers';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;


function setup() {
  const cluster = fakeCluster();
  return { ...cluster, adapter: new KubernetesRbacAdapter(async () => cluster.client) };
}

describe(__t('kubernetes_rbac_compilation'), () => {
  it(__t('compiles_an_allow_rule_to_a_le'), async () => {
    const { adapter } = setup();
    const native = await adapter.generate([rule()], ctx);
    const doc = native.nativeDocument as K8sClusterRole;
    expect(doc.kind).toBe('ClusterRole');
    expect(doc.apiVersion).toBe('rbac.authorization.k8s.io/v1');
    expect(doc.rules).toEqual([{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }]);
    expect(native.providerId).toBe(doc.metadata?.name);
    expect(/^ugondu-[a-f0-9]{12}$/.test(native.providerId)).toBe(true);
  });

  it(__t('derives_apigroup_and_subresour'), () => {
    expect(parseScope('deployments.apps')).toEqual({ apiGroup: 'apps', resource: 'deployments' });
    expect(parseScope('pods/log')).toEqual({ apiGroup: '', resource: 'pods/log' });
    expect(parseScope('deployments.apps/scale')).toEqual({ apiGroup: 'apps', resource: 'deployments/scale' });
  });

  it(__t('merges_resources_sharing_a_gro'), async () => {
    const { adapter } = setup();
    const rules = [rule({ resource: { type: 'k8s::resource', scope: 'services' } }), rule(), rule({ action: { capability: 'x', operations: ['get', 'list'] } })];
    const a = await adapter.generate(rules, ctx);
    const b = await adapter.generate([...rules].reverse(), ctx);
    expect((a.nativeDocument as K8sClusterRole).rules).toEqual([{ apiGroups: [''], resources: ['pods', 'services'], verbs: ['get', 'list'] }]);
    expect(a.providerId).toBe(b.providerId);
    expect(a.digest).toBe(b.digest);
  });

  it(__t('never_compiles_deny_rules_beca'), () => {
    expect(compileK8sPolicyRules([rule({ effect: 'DENY' })])).toEqual([]);
  });

  it(__t('rejects_wildcards_unknown_verb'), () => {
    expect(() => compileK8sPolicyRules([rule({ action: { capability: 'x', operations: ['*'] } })])).toThrow(__t('uppie.adapter.k8s.wildcard_forbidden', { value: '*' }));
    expect(() => compileK8sPolicyRules([rule({ resource: { type: 't', scope: '*' } })])).toThrow(__t('uppie.adapter.k8s.wildcard_forbidden', { value: '*' }));
    expect(() => compileK8sPolicyRules([rule({ action: { capability: 'x', operations: ['exec'] } })])).toThrow(__t('uppie.adapter.k8s.invalid_verb', { verb: 'exec' }));
    expect(() => compileK8sPolicyRules([rule({ resource: { type: 't', scope: 'Pods!' } })])).toThrow(__t('uppie.adapter.k8s.invalid_scope', { scope: 'Pods!' }));
  });

  it(__t('parses_subjects_and_rejects_ma'), () => {
    expect(parseSubject('alice')).toEqual({ kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' });
    expect(parseSubject('ServiceAccount:team-a:builder')).toEqual({ kind: 'ServiceAccount', name: 'builder', namespace: 'team-a' });
    expect(() => parseSubject('ServiceAccount:only-name')).toThrow(__t('uppie.adapter.k8s.invalid_subject', { subject: 'ServiceAccount:only-name' }));
    expect(() => parseSubject('Robot:r2')).toThrow(__t('uppie.adapter.k8s.invalid_subject', { subject: 'Robot:r2' }));
  });
});

describe(__t('kubernetes_rbac_validation'), () => {
  it(__t('accepts_a_generated_policy'), async () => {
    const { adapter } = setup();
    const res = await adapter.validate(await adapter.generate([rule()], ctx), ctx);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it(__t('reports_an_empty_role_a_tamper'), async () => {
    const { adapter } = setup();
    const empty = await adapter.generate([], ctx);
    expect((await adapter.validate(empty, ctx)).errors).toContain(__t('uppie.adapter.k8s.validate.no_rules'));

    const tampered = await adapter.generate([rule()], ctx);
    (tampered.nativeDocument as K8sClusterRole).rules![0].verbs.push('delete');
    expect((await adapter.validate(tampered, ctx)).errors).toContain(__t('uppie.adapter.k8s.validate.digest_mismatch'));

    const wild = { providerId: 'w', providerType: 'KUBERNETES_RBAC' as const, digest: '', nativeDocument: { kind: 'ClusterRole', metadata: { name: 'w' }, rules: [{ apiGroups: ['*'], resources: ['pods'], verbs: ['get'] }] } };
    expect((await adapter.validate(wild, ctx)).valid).toBe(false);
    const notRole = { ...wild, nativeDocument: { kind: 'Role' } };
    expect((await adapter.validate(notRole, ctx)).errors).toEqual([__t('uppie.adapter.k8s.validate.invalid_kind')]);
  });
});

describe(__t('kubernetes_rbac_lifecycle'), () => {
  it(__t('attaches_idempotently_one_role'), async () => {
    const { adapter, roles, bindings } = setup();
    const native = await adapter.generate([rule()], ctx);
    const first = await adapter.attach(native, 'User:alice', ctx);
    const second = await adapter.attach(native, 'User:alice', ctx);
    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.providerRef).toBe(first.providerRef);
    expect(roles.size).toBe(1);
    expect(bindings.size).toBe(1);
    expect(bindings.get(first.providerRef)?.subjects?.[0]).toEqual({ kind: 'User', name: 'alice', apiGroup: 'rbac.authorization.k8s.io' });
  });

  it(__t('refuses_to_attach_over_a_same_'), async () => {
    const { adapter, roles } = setup();
    const native = await adapter.generate([rule()], ctx);
    roles.set(native.providerId, { kind: 'ClusterRole', metadata: { name: native.providerId }, rules: [{ apiGroups: [''], resources: ['secrets'], verbs: ['get'] }] });
    const res = await adapter.attach(native, 'User:alice', ctx);
    expect(res.success).toBe(false);
    expect(res.errors[0]).toBe(__t('uppie.adapter.k8s.attach_error', { error: __t('uppie.adapter.k8s.role_exists_different', { name: native.providerId }) }));
  });

  it(__t('fails_attach_on_an_invalid_doc'), async () => {
    const { adapter, roles } = setup();
    const res = await adapter.attach(await adapter.generate([], ctx), 'User:alice', ctx);
    expect(res.success).toBe(false);
    expect(roles.size).toBe(0);
  });

  it(__t('includes_the_underlying_error_'), async () => {
    const { client } = fakeCluster();
    const adapter = new KubernetesRbacAdapter(async () => ({ ...client, createClusterRole: async () => { throw new K8sApiError(__t('forbidden_by_admission'), 403); } }));
    const res = await adapter.attach(await adapter.generate([rule()], ctx), 'User:alice', ctx);
    expect(res.errors[0]).toBe(__t('uppie.adapter.k8s.attach_error', { error: __t('forbidden_by_admission') }));
  });

  it(__t('detaches_a_binding_and_treats_'), async () => {
    const { adapter, bindings } = setup();
    const native = await adapter.generate([rule()], ctx);
    await adapter.attach(native, 'ServiceAccount:team-a:builder', ctx);
    expect(bindings.size).toBe(1);
    expect((await adapter.detach(native.providerId, 'ServiceAccount:team-a:builder', ctx)).success).toBe(true);
    expect(bindings.size).toBe(0);
    expect((await adapter.detach(native.providerId, 'ServiceAccount:team-a:builder', ctx)).success).toBe(true);
    expect(buildBindingName('r', 'alice')).toBe(buildBindingName('r', 'User:alice'));
  });

  it(__t('updates_rules_in_place_preserv'), async () => {
    const { adapter, roles } = setup();
    const native = await adapter.generate([rule()], ctx);
    await adapter.attach(native, 'User:alice', ctx);
    const res = await adapter.update(native.providerId, [rule({ action: { capability: 'x', operations: ['get'] } })], ctx);
    expect(res.success).toBe(true);
    expect(roles.get(native.providerId)?.rules).toEqual([{ apiGroups: [''], resources: ['pods'], verbs: ['get'] }]);
    const refused = await adapter.update('system:admin', [rule()], ctx);
    expect(refused.success).toBe(false);
    expect(refused.errors[0]).toBe(__t('uppie.adapter.k8s.update_error', { error: __t('uppie.adapter.k8s.protected_role', { name: 'system:admin' }) }));
    expect((await adapter.update(native.providerId, [], ctx)).errors).toEqual([__t('uppie.adapter.k8s.validate.no_rules')]);
  });

  it(__t('clones_a_role_under_a_new_vali'), async () => {
    const { adapter, roles } = setup();
    const native = await adapter.generate([rule()], ctx);
    await adapter.attach(native, 'User:alice', ctx);
    expect((await adapter.clone(native.providerId, 'copy-of-pods', ctx)).clonedId).toBe('copy-of-pods');
    expect(roles.get('copy-of-pods')?.rules).toEqual(roles.get(native.providerId)?.rules);
    expect((await adapter.clone(native.providerId, 'copy-of-pods', ctx)).success).toBe(false);
    expect((await adapter.clone(native.providerId, __t('bad_name'), ctx)).success).toBe(false);
  });
});

describe(__t('kubernetes_rbac_discovery_and_'), () => {
  async function seeded() {
    const env = setup();
    const native = await env.adapter.generate([rule()], ctx);
    await env.adapter.attach(native, 'User:alice', ctx);
    await env.adapter.attach(native, 'ServiceAccount:team-a:builder', ctx);
    await env.adapter.attach(native, 'Group:devs', ctx);
    return { ...env, native };
  }

  it(__t('discovers_policies_roles_assig'), async () => {
    const { adapter, native } = await seeded();
    expect((await adapter.discoverPolicies(ctx)).map((p) => p.providerId)).toEqual([native.providerId]);
    expect((await adapter.discoverRoles(ctx))[0].policies).toEqual([native.providerId]);
    const assignments = await adapter.discoverAssignments(ctx);
    expect(Object.keys(assignments).sort()).toEqual(['Group:devs', 'ServiceAccount:team-a:builder', 'User:alice']);
    const identities = await adapter.discoverIdentities(ctx);
    expect(identities.map((i) => i.type).sort()).toEqual(['SERVICE_IDENTITY', 'USER']);
    expect((await adapter.discoverGroups(ctx)).map((g) => g.id)).toEqual(['Group:devs']);
  });

  it('classifies blast radius from bindings; any group makes it BROAD', async () => {
    const { adapter, native } = await seeded();
    const report = await adapter.findDependencies(native.providerId, ctx);
    expect(report.blastRadius).toBe('BROAD');
    expect(report.dependentServices).toEqual(['ServiceAccount:team-a:builder']);
    const lone = setup();
    const n2 = await lone.adapter.generate([rule()], ctx);
    expect((await lone.adapter.findDependencies(n2.providerId, ctx)).blastRadius).toBe('MINIMAL');
    await lone.adapter.attach(n2, 'User:alice', ctx);
    expect((await lone.adapter.findDependencies(n2.providerId, ctx)).blastRadius).toBe('LIMITED');
  });

  it(__t('evaluates_access_through_subje'), async () => {
    const { adapter } = await seeded();
    expect(await adapter.evaluate(rule(), ctx)).toBe('GRANTED');
    expect(await adapter.evaluate(rule({ action: { capability: 'x', operations: ['delete'] } }), ctx)).toBe('DENIED');
    expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'mallory' } }), ctx)).toBe('DENIED');
    expect(await adapter.evaluate(rule({ subject: { type: 'WORKLOAD_IDENTITY', id: 'team-a:builder' } }), ctx)).toBe('GRANTED');
    expect(await adapter.evaluate(rule({ effect: 'DENY' }), ctx)).toBe('UNKNOWN');
  });

  it(__t('returns_unknown_when_the_clust'), async () => {
    const adapter = new KubernetesRbacAdapter(async () => { throw new Error('offline'); });
    expect(await adapter.evaluate(rule(), ctx)).toBe('UNKNOWN');
  });

  it(__t('reports_effective_authority_pe'), async () => {
    const { adapter, native } = await seeded();
    const res = await adapter.discoverEffectiveAuthority('User:alice', 'pods', ctx);
    const state = (verb: string) => res.permissions.find((p) => p.capability === verb);
    expect(res.evaluationMethod).toBe('PROVIDER_API');
    expect(state('get')?.state).toBe('GRANTED');
    expect(state('get')?.sourcePolicies).toEqual([native.providerId]);
    expect(state('delete')?.state).toBe('DENIED');
    expect(state('delete')?.sourcePolicies).toEqual([]);
  });

  it(__t('simulates_by_probing_current_a'), async () => {
    const { adapter } = await seeded();
    const sim = await adapter.simulate([
      rule(),
      rule({ action: { capability: 'x', operations: ['delete'] }, subject: { type: 'USER', id: 'alice' } }),
      rule({ effect: 'DENY', subject: { type: 'USER', id: 'mallory' } }),
      rule({ effect: 'DENY' }),
    ], ctx);
    expect(sim.unchanged).toEqual(['User:alice:pods:get', 'User:alice:pods:list', 'User:alice:pods:get', 'User:alice:pods:list']);
    expect(sim.allowed).toEqual(['User:alice:pods:delete']);
    expect(sim.denied).toEqual(['User:mallory:pods:get', 'User:mallory:pods:list']);
    expect(sim.confidence).toBe('MEDIUM');
    expect(sim.blastRadius.blastRadius).toBe('LIMITED');
  });
});

describe(__t('kubernetes_rbac_reconciliation'), () => {
  it(__t('plans_add_update_remove_and_no'), async () => {
    const { adapter } = setup();
    const observed = [
      await adapter.generate([rule(), rule({ resource: { type: 't', scope: 'secrets' } })], ctx),
      await adapter.generate([rule({ resource: { type: 't', scope: 'deployments.apps' }, action: { capability: 'x', operations: ['get'] } })], ctx),
    ];
    const desired = [
      rule(), // pods get,list: unchanged
      rule({ resource: { type: 't', scope: 'deployments.apps' }, action: { capability: 'x', operations: ['get', 'patch'] } }), // verbs differ
      rule({ resource: { type: 't', scope: 'configmaps' } }), // new
    ];
    const plan = await adapter.reconcile(desired, observed, ctx);
    expect(plan.noChange).toEqual(['|pods']);
    expect(plan.toUpdate.map((u) => u.ruleId)).toEqual(['apps|deployments']);
    expect(plan.toUpdate[0].newRule.action.operations).toEqual(['get', 'patch']);
    expect(plan.toAdd.map((r) => r.resource.scope)).toEqual(['configmaps']);
    expect(plan.toRemove).toEqual(['|secrets']);
  });

  it(__t('wraps_failures_with_the_locali'), async () => {
    const { adapter } = setup();
    let message = '';
    try { await adapter.reconcile([rule({ resource: { type: 't', scope: '*' } })], [], ctx); } catch (e: any) { message = e.message; }
    expect(message).toBe(__t('uppie.adapter.k8s.reconcile_error', { error: __t('uppie.adapter.k8s.wildcard_forbidden', { value: '*' }) }));
  });
});

describe(__t('kubernetes_rbac_retirement_and'), () => {
  const plan = (policyId: string): any => ({ policyId, shadowPeriodDays: 7, approvedBy: 'change-board', retentionDays: 90 });

  it(__t('refuses_to_retire_a_role_that_'), async () => {
    const { adapter } = setup();
    const native = await adapter.generate([rule()], ctx);
    await adapter.attach(native, 'User:alice', ctx);
    const res = await adapter.retire(plan(native.providerId), ctx);
    expect(res.success).toBe(false);
    expect(res.errors[0]).toBe(__t('uppie.adapter.k8s.retire_error', { error: __t('uppie.adapter.k8s.retire_in_use', { name: native.providerId, count: 1 }) }));
    expect((await adapter.retire(plan('cluster-admin'), ctx)).success).toBe(false);
  });

  it(__t('retires_an_unbound_role_with_a'), async () => {
    const { adapter, roles } = setup();
    const native = await adapter.generate([rule()], ctx);
    await adapter.attach(native, 'User:alice', ctx);
    await adapter.detach(native.providerId, 'User:alice', ctx);
    const original = JSON.parse(JSON.stringify(roles.get(native.providerId)));

    const retired = await adapter.retire(plan(native.providerId), ctx);
    expect(retired.success).toBe(true);
    expect(roles.size).toBe(0);
    const snapshot = JSON.parse(retired.rollbackReference as string);
    expect(snapshot.metadata.resourceVersion).toBeUndefined();
    expect(snapshot.metadata.uid).toBeUndefined();
    expect(JSON.parse(retired.detachmentEvidence as string).remainingBindings).toBe(0);

    const restored = await adapter.restore({ policyId: native.providerId, rollbackReference: retired.rollbackReference } as any, ctx);
    expect(restored).toEqual({ success: true, restoredId: native.providerId, errors: [] });
    expect(roles.get(native.providerId)?.rules).toEqual(original.rules);
    expect((await adapter.restore({ policyId: native.providerId, rollbackReference: retired.rollbackReference } as any, ctx)).success).toBe(false);
  });

  it(__t('refuses_restore_without_a_refe'), async () => {
    const { adapter } = setup();
    const native = await adapter.generate([rule()], ctx);
    const ref = JSON.stringify(native.nativeDocument);
    expect((await adapter.restore({ policyId: native.providerId } as any, ctx)).errors).toEqual([__t('uppie.adapter.k8s.restore_no_reference')]);
    expect((await adapter.restore({ policyId: 'another-role', rollbackReference: ref } as any, ctx)).success).toBe(false);
    expect((await adapter.restore({ policyId: 'cluster-admin', rollbackReference: JSON.stringify({ kind: 'ClusterRole', metadata: { name: 'cluster-admin' }, rules: [] }) } as any, ctx)).success).toBe(false);
    expect((await adapter.restore({ policyId: native.providerId, rollbackReference: '{not json' } as any, ctx)).success).toBe(false);
  });
});

describe(__t('kubernetes_rbac_client_lifecyc'), () => {
  it(__t('creates_the_client_lazily_cach'), async () => {
    let calls = 0;
    const { client } = fakeCluster();
    const adapter = new KubernetesRbacAdapter(async () => { calls++; if (calls === 1) throw new Error(__t('kubeconfig_missing')); return client; });
    expect(calls).toBe(0);
    let failure = '';
    try { await adapter.discoverPolicies(ctx); } catch (e: any) { failure = e.message; }
    expect(failure).toBe(__t('kubeconfig_missing'));
    await adapter.discoverPolicies(ctx);
    await adapter.discoverRoles(ctx);
    expect(calls).toBe(2);
  });

  it(__t('declares_every_non_observable_'), () => {
    const { adapter } = setup();
    expect(adapter.capabilities.observeUsage).toBe('NOT_OBSERVABLE');
    expect(adapter.capabilities.findConflicts).toBe('NOT_OBSERVABLE');
    expect(adapter.capabilities.simulate).toBe('SUPPORTED_WITH_LIMITS');
  });
});
