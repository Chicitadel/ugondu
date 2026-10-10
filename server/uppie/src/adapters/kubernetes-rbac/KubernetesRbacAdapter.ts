/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Kubernetes RBAC Adapter
 * File           : KubernetesRbacAdapter.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type {
  IPolicyProviderAdapter, AdapterContext, AdapterCapabilityDeclaration, ProviderNativePolicy,
  PolicyValidationResult, AttachResult, DetachResult, UpdateResult, CloneResult,
  ObservationWindow, UsageObservation, DependencyReport, ConflictReport, ReconciliationPlan,
  RetirementPlan, RetirementResult, RestoreResult, PolicySimulationResult,
} from '../IPolicyProviderAdapter';
import type {
  AuthorizationRule, AuthorizationConstraints, EffectiveAuthorityResult, PolicyRetirementCertificate,
} from '../../types/index';
import { KUBERNETES_RBAC_CONSTRAINTS } from './KubernetesRbacConstraints';
import { K8sApiError, createSdkK8sClient } from './KubernetesRbacClient';
import type { K8sRbacClient, K8sClusterRole } from './KubernetesRbacClient';
import {
  K8S_VERBS, accessReviewIdentity, buildClusterRole, buildClusterRoleBinding, buildBindingName, classifyBlastRadius,
  compileK8sPolicyRules, digestOf, extractRoleName, formatSubject, isDnsSubdomain, isProtectedRole, parseScope,
  parseSubject, roleNameFor, ruleGrants, ruleKeys, snapshotRole, subjectRef, toNativePolicy, validateClusterRole,
} from './KubernetesRbacHelpers';

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));
const statusOf = (e: unknown): number | undefined => (e instanceof K8sApiError ? e.statusCode : undefined);

/**
 * KubernetesRbacAdapter — UPPIE provider adapter for Kubernetes RBAC (ClusterRole / ClusterRoleBinding).
 *
 * - RBAC is purely additive: there is no DENY primitive, so DENY rules are never compiled.
 * - Generated roles are least-privilege: wildcards in verbs, groups or resources are rejected.
 * - Role names are `ugondu-<digest12>` of the canonical rules, so regeneration and attach are idempotent.
 * - Built-in `system:*` roles and `cluster-admin` are never modified, retired or restored over.
 * - All cluster access goes through K8sRbacClient; the production client is created lazily from
 *   @kubernetes/client-node, and tests inject a double.
 * - Scope notation is kubectl-style: `<resource>[.<apiGroup>][/<subresource>]`.
 */
export class KubernetesRbacAdapter implements IPolicyProviderAdapter {
  readonly providerType = 'KUBERNETES_RBAC' as const;

  readonly capabilities: AdapterCapabilityDeclaration = {
    discoverPolicies: 'SUPPORTED', discoverAssignments: 'SUPPORTED', discoverIdentities: 'SUPPORTED_WITH_LIMITS',
    discoverGroups: 'SUPPORTED_WITH_LIMITS', discoverRoles: 'SUPPORTED', discoverEffectiveAuthority: 'SUPPORTED',
    evaluate: 'SUPPORTED', simulate: 'SUPPORTED_WITH_LIMITS', generate: 'SUPPORTED', validate: 'SUPPORTED',
    attach: 'SUPPORTED', detach: 'SUPPORTED', update: 'SUPPORTED', clone: 'SUPPORTED',
    observeUsage: 'NOT_OBSERVABLE', detectUnused: 'NOT_OBSERVABLE', findDependencies: 'SUPPORTED',
    findConflicts: 'NOT_OBSERVABLE', getConstraints: 'SUPPORTED', reconcile: 'SUPPORTED',
    retire: 'SUPPORTED', restore: 'SUPPORTED',
  };

  private clientPromise?: Promise<K8sRbacClient>;

  constructor(private readonly clientFactory: () => Promise<K8sRbacClient> = createSdkK8sClient) {}

  private client(): Promise<K8sRbacClient> {
    this.clientPromise ??= this.clientFactory().catch((e) => { this.clientPromise = undefined; throw e; });
    return this.clientPromise;
  }

  async discoverPolicies(_context: AdapterContext): Promise<ProviderNativePolicy[]> {
    return (await (await this.client()).listClusterRoles()).map(toNativePolicy);
  }

  async discoverAssignments(_context: AdapterContext): Promise<Record<string, string[]>> {
    const out: Record<string, string[]> = {};
    for (const b of await (await this.client()).listClusterRoleBindings()) {
      for (const s of b.subjects ?? []) (out[formatSubject(s)] ||= []).push(b.roleRef.name);
    }
    return out;
  }

  async discoverIdentities(_context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> {
    // SUPPORTED_WITH_LIMITS: Kubernetes has no user directory; identities are those named by bindings.
    const seen = new Map<string, { id: string; type: string; displayName: string }>();
    for (const b of await (await this.client()).listClusterRoleBindings()) {
      for (const s of b.subjects ?? []) {
        if (s.kind !== 'Group') seen.set(formatSubject(s), { id: formatSubject(s), type: s.kind === 'ServiceAccount' ? 'SERVICE_IDENTITY' : 'USER', displayName: s.name });
      }
    }
    return [...seen.values()];
  }

  async discoverGroups(_context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> {
    // SUPPORTED_WITH_LIMITS: group membership is owned by the identity provider; only names are visible here.
    const groups = new Set<string>();
    for (const b of await (await this.client()).listClusterRoleBindings()) {
      for (const s of b.subjects ?? []) if (s.kind === 'Group') groups.add(s.name);
    }
    return [...groups].map((name) => ({ id: `Group:${name}`, displayName: name, members: [] }));
  }

  async discoverRoles(_context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> {
    return (await (await this.client()).listClusterRoles()).map((r) => ({ id: r.metadata?.name ?? '', displayName: r.metadata?.name ?? '', policies: [r.metadata?.name ?? ''] }));
  }

  async discoverEffectiveAuthority(actor: string, resource: string, _context: AdapterContext): Promise<EffectiveAuthorityResult> {
    const client = await this.client();
    const { apiGroup, resource: res } = parseScope(resource);
    const identity = accessReviewIdentity(actor);
    const subject = formatSubject(parseSubject(actor));
    const [roles, bindings] = await Promise.all([client.listClusterRoles(), client.listClusterRoleBindings()]);
    const boundRoles = new Set(bindings.filter((b) => (b.subjects ?? []).some((s) => formatSubject(s) === subject)).map((b) => b.roleRef.name));
    const permissions = [];
    for (const verb of K8S_VERBS) {
      const review = await client.reviewAccess({ ...identity, verb, group: apiGroup, resource: res });
      const sources = roles.filter((r) => boundRoles.has(r.metadata?.name ?? '') && (r.rules ?? []).some((p) => ruleGrants(p, apiGroup, res, verb))).map((r) => r.metadata?.name ?? '');
      permissions.push({
        capability: verb, resource, confidence: 'HIGH' as const, sourcePolicies: sources, denyPolicies: [],
        state: review.allowed && !review.denied ? ('GRANTED' as const) : ('DENIED' as const),
      });
    }
    return { actorId: actor, resourceId: resource, evaluatedAt: new Date().toISOString(), permissions, evaluationMethod: 'PROVIDER_API' };
  }

  private async granted(rule: AuthorizationRule, client: K8sRbacClient): Promise<boolean> {
    const { apiGroup, resource } = parseScope(rule.resource.scope);
    const identity = accessReviewIdentity(subjectRef(rule.subject));
    for (const op of rule.action.operations) {
      const review = await client.reviewAccess({ ...identity, verb: op.toLowerCase(), group: apiGroup, resource });
      if (!review.allowed || review.denied) return false;
    }
    return true;
  }

  async evaluate(rule: AuthorizationRule, _context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
    if (rule.effect !== 'ALLOW') return 'UNKNOWN'; // RBAC cannot express or evaluate a DENY
    try {
      return (await this.granted(rule, await this.client())) ? 'GRANTED' : 'DENIED';
    } catch {
      return 'UNKNOWN';
    }
  }

  async simulate(proposedRules: AuthorizationRule[], _context: AdapterContext): Promise<PolicySimulationResult> {
    // Model-based: no dry-run API exists, so current access is probed with SubjectAccessReview.
    const client = await this.client();
    const allowed: string[] = [];
    const denied: string[] = [];
    const unchanged: string[] = [];
    const subjects = new Map<string, ReturnType<typeof parseSubject>>();
    for (const rule of proposedRules) {
      const ref = subjectRef(rule.subject);
      subjects.set(ref, parseSubject(ref));
      const current = await this.granted(rule, client);
      const ids = rule.action.operations.map((op) => `${ref}:${rule.resource.scope}:${op.toLowerCase()}`);
      if (rule.effect === 'ALLOW') (current ? unchanged : allowed).push(...ids);
      else (current ? unchanged : denied).push(...ids); // an additive system cannot revoke access that is already granted
    }
    const blastRadius = classifyBlastRadius('', [{ roleRef: { apiGroup: '', kind: 'ClusterRole', name: '' }, subjects: [...subjects.values()] }]);
    return { allowed, denied, unchanged, confidence: 'MEDIUM', blastRadius };
  }

  async generate(rules: AuthorizationRule[], _context: AdapterContext): Promise<ProviderNativePolicy> {
    const policyRules = compileK8sPolicyRules(rules);
    const role = buildClusterRole(roleNameFor(policyRules), policyRules);
    return toNativePolicy(role);
  }

  async validate(nativePolicy: ProviderNativePolicy, _context: AdapterContext): Promise<PolicyValidationResult> {
    const role = nativePolicy.nativeDocument as K8sClusterRole;
    const errors = role?.kind === 'ClusterRole' ? validateClusterRole(role) : [__t('uppie.adapter.k8s.validate.invalid_kind')];
    if (errors.length === 0 && nativePolicy.digest && nativePolicy.digest !== digestOf(role)) errors.push(__t('uppie.adapter.k8s.validate.digest_mismatch'));
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  async attach(nativePolicy: ProviderNativePolicy, target: string, context: AdapterContext): Promise<AttachResult> {
    try {
      const check = await this.validate(nativePolicy, context);
      if (!check.valid) return { success: false, providerRef: '', attachedAt: '', errors: check.errors };
      const client = await this.client();
      const role = nativePolicy.nativeDocument as K8sClusterRole;
      const name = extractRoleName(nativePolicy);
      try {
        await client.createClusterRole(role);
      } catch (e) {
        if (statusOf(e) !== 409) throw e;
        const existing = await client.readClusterRole(name); // idempotent only when the stored rules are identical
        const same = ruleKeys(existing.rules ?? []);
        const wanted = ruleKeys(role.rules ?? []);
        if (same.size !== wanted.size || [...wanted].some((k) => !same.has(k))) throw fail('uppie.adapter.k8s.role_exists_different', { name });
      }
      const binding = buildClusterRoleBinding(name, target);
      try {
        await client.createClusterRoleBinding(binding);
      } catch (e) {
        if (statusOf(e) !== 409) throw e;
      }
      return { success: true, providerRef: binding.metadata?.name ?? '', attachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, providerRef: '', attachedAt: '', errors: [__t('uppie.adapter.k8s.attach_error', { error: errorText(e) })] };
    }
  }

  async detach(policyId: string, target: string, _context: AdapterContext): Promise<DetachResult> {
    try {
      await (await this.client()).deleteClusterRoleBinding(buildBindingName(policyId, target));
      return { success: true, detachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      if (statusOf(e) === 404) return { success: true, detachedAt: new Date().toISOString(), errors: [] }; // already detached
      return { success: false, errors: [__t('uppie.adapter.k8s.detach_error', { error: errorText(e) })] };
    }
  }

  async update(policyId: string, newRules: AuthorizationRule[], _context: AdapterContext): Promise<UpdateResult> {
    try {
      if (isProtectedRole(policyId)) throw fail('uppie.adapter.k8s.protected_role', { name: policyId });
      const client = await this.client();
      const role = await client.readClusterRole(policyId);
      const updated: K8sClusterRole = { ...role, rules: compileK8sPolicyRules(newRules) };
      const problems = validateClusterRole(updated);
      if (problems.length > 0) return { success: false, version: '', errors: problems };
      await client.replaceClusterRole(policyId, updated); // resourceVersion is retained for optimistic concurrency
      return { success: true, version: digestOf(updated.rules), errors: [] };
    } catch (e) {
      return { success: false, version: '', errors: [__t('uppie.adapter.k8s.update_error', { error: errorText(e) })] };
    }
  }

  async clone(policyId: string, newName: string, _context: AdapterContext): Promise<CloneResult> {
    try {
      if (!isDnsSubdomain(newName)) throw fail('uppie.adapter.k8s.validate.invalid_name', { name: newName });
      const client = await this.client();
      const source = await client.readClusterRole(policyId);
      await client.createClusterRole(buildClusterRole(newName, JSON.parse(JSON.stringify(source.rules ?? []))));
      return { success: true, clonedId: newName, errors: [] };
    } catch (e) {
      return { success: false, clonedId: '', errors: [__t('uppie.adapter.k8s.clone_error', { error: errorText(e) })] };
    }
  }

  async observeUsage(policyId: string, _window: ObservationWindow, _context: AdapterContext): Promise<UsageObservation> {
    // NOT_OBSERVABLE: the API server exposes no per-role usage history
    return { policyId, observedUsages: 0, classification: 'UNKNOWN', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false };
  }

  async detectUnused(_context: AdapterContext, _thresholdDays: number): Promise<UsageObservation[]> {
    throw new Error('NOT_OBSERVABLE: Kubernetes RBAC does not provide usage history');
  }

  async findDependencies(policyId: string, _context: AdapterContext): Promise<DependencyReport> {
    return classifyBlastRadius(policyId, await (await this.client()).listClusterRoleBindings());
  }

  async findConflicts(_rules: AuthorizationRule[], _context: AdapterContext): Promise<ConflictReport> {
    return { conflicts: [] }; // additive-only model: no deny, so no allow/deny conflicts can exist
  }

  async getConstraints(_context: AdapterContext): Promise<AuthorizationConstraints> {
    return KUBERNETES_RBAC_CONSTRAINTS;
  }

  async reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], _context: AdapterContext): Promise<ReconciliationPlan> {
    try {
      const have = new Map<string, Set<string>>();
      for (const p of observed) {
        for (const r of (p.nativeDocument as K8sClusterRole).rules ?? []) {
          for (const g of r.apiGroups) for (const res of r.resources) {
            const set = have.get(`${g}|${res}`) ?? new Set<string>();
            r.verbs.forEach((v) => set.add(v));
            have.set(`${g}|${res}`, set);
          }
        }
      }
      const want = new Map<string, { rule: AuthorizationRule; verbs: Set<string> }>();
      for (const rule of desired.filter((r) => r.effect === 'ALLOW')) {
        const { apiGroup, resource } = parseScope(rule.resource.scope);
        const id = `${apiGroup}|${resource}`;
        const entry = want.get(id) ?? { rule, verbs: new Set<string>() };
        rule.action.operations.forEach((o) => entry.verbs.add(o.toLowerCase()));
        want.set(id, entry);
      }
      const plan: ReconciliationPlan = { toAdd: [], toRemove: [], toUpdate: [], noChange: [] };
      for (const [id, { rule, verbs }] of want) {
        const current = have.get(id);
        const merged: AuthorizationRule = { ...rule, action: { ...rule.action, operations: [...verbs] } };
        if (!current) plan.toAdd.push(merged);
        else if (current.size === verbs.size && [...verbs].every((v) => current.has(v))) plan.noChange.push(id);
        else plan.toUpdate.push({ ruleId: id, newRule: merged });
      }
      plan.toRemove = [...have.keys()].filter((id) => !want.has(id));
      return plan;
    } catch (e) {
      throw fail('uppie.adapter.k8s.reconcile_error', { error: errorText(e) });
    }
  }

  async retire(plan: RetirementPlan, _context: AdapterContext): Promise<RetirementResult> {
    try {
      if (isProtectedRole(plan.policyId)) throw fail('uppie.adapter.k8s.protected_role', { name: plan.policyId });
      const client = await this.client();
      const role = await client.readClusterRole(plan.policyId);
      const inUse = (await client.listClusterRoleBindings()).filter((b) => b.roleRef.name === plan.policyId);
      if (inUse.length > 0) throw fail('uppie.adapter.k8s.retire_in_use', { name: plan.policyId, count: inUse.length });
      const rollbackReference = JSON.stringify(snapshotRole(role));
      await client.deleteClusterRole(plan.policyId);
      const detachmentEvidence = JSON.stringify({ role: plan.policyId, remainingBindings: 0, approvedBy: plan.approvedBy, verifiedAt: new Date().toISOString() });
      return { success: true, rollbackReference, detachmentEvidence, errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.k8s.retire_error', { error: errorText(e) })] };
    }
  }

  async restore(certificate: PolicyRetirementCertificate, _context: AdapterContext): Promise<RestoreResult> {
    try {
      if (!certificate.rollbackReference) return { success: false, restoredId: '', errors: [__t('uppie.adapter.k8s.restore_no_reference')] };
      const role = JSON.parse(certificate.rollbackReference) as K8sClusterRole;
      const name = role.metadata?.name ?? '';
      if (role.kind !== 'ClusterRole' || name !== certificate.policyId) throw fail('uppie.adapter.k8s.restore_invalid_snapshot', { name: certificate.policyId });
      if (isProtectedRole(name)) throw fail('uppie.adapter.k8s.protected_role', { name });
      const problems = validateClusterRole(role);
      if (problems.length > 0) throw new Error(problems.join('; '));
      await (await this.client()).createClusterRole(role);
      return { success: true, restoredId: name, errors: [] };
    } catch (e) {
      return { success: false, restoredId: '', errors: [__t('uppie.adapter.k8s.restore_error', { error: errorText(e) })] };
    }
  }
}
