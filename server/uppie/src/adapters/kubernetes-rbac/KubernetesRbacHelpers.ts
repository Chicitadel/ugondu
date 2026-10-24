/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Kubernetes RBAC Helpers
 * File           : KubernetesRbacHelpers.ts
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

import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AuthorizationRule } from '../../types/index';
import type { ProviderNativePolicy, DependencyReport } from '../IPolicyProviderAdapter';
import { classifyBlast } from '../shared/BlastRadius';
import type { K8sClusterRole, K8sClusterRoleBinding, K8sPolicyRule, K8sSubject } from './KubernetesRbacClient';

export const K8S_RBAC_API_GROUP = 'rbac.authorization.k8s.io';
export const K8S_ROLE_PREFIX = 'ugondu-';
export const K8S_MAX_OBJECT_BYTES = 1048576;
export const K8S_VERBS: ReadonlySet<string> = new Set(['get', 'list', 'watch', 'create', 'update', 'patch', 'delete', 'deletecollection']);

const DNS_SUBDOMAIN = /^[a-z0-9]([-a-z0-9.]{0,251}[a-z0-9])?$/;
const SCOPE = /^([a-z][a-z0-9-]*)(?:\.([a-z0-9][a-z0-9.-]*))?(?:\/([a-z][a-z0-9-]*))?$/;
const NAME_PART = /^[A-Za-z0-9][A-Za-z0-9._:@\-]*$/;

const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');
const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));

/** True for the built-in `system:` objects Kubernetes itself owns; they are never modified or removed. */
export const isProtectedRole = (name: string): boolean => name.startsWith('system:') || name === 'cluster-admin';

export const isDnsSubdomain = (name: string): boolean => name.length <= 253 && DNS_SUBDOMAIN.test(name);

/**
 * Parses a kubectl-style scope — `<resource>[.<apiGroup>][/<subresource>]` — into a PolicyRule resource and group.
 * Examples: `pods` (core group), `pods/log`, `deployments.apps`, `roles.rbac.authorization.k8s.io`.
 * Wildcards are rejected: a generated policy must always name what it grants.
 */
export function parseScope(scope: string): { apiGroup: string; resource: string } {
  if (scope.includes('*')) throw fail('uppie.adapter.k8s.wildcard_forbidden', { value: scope });
  const m = SCOPE.exec(scope);
  if (!m) throw fail('uppie.adapter.k8s.invalid_scope', { scope });
  return { apiGroup: m[2] ?? '', resource: m[3] ? `${m[1]}/${m[3]}` : m[1] };
}

/**
 * Compiles ALLOW-only AuthorizationRules into least-privilege PolicyRules, merged per (apiGroup, verb set).
 * INVARIANT: DENY rules are excluded — Kubernetes RBAC has no deny primitive. Output order is deterministic.
 */
export function compileK8sPolicyRules(rules: AuthorizationRule[]): K8sPolicyRule[] {
  const byResource = new Map<string, { apiGroup: string; resource: string; verbs: Set<string> }>();
  for (const rule of rules.filter((r) => r.effect === 'ALLOW')) {
    const { apiGroup, resource } = parseScope(rule.resource.scope);
    if (rule.action.operations.length === 0) throw fail('uppie.adapter.k8s.invalid_rule', { scope: rule.resource.scope });
    const entry = byResource.get(`${apiGroup}|${resource}`) ?? { apiGroup, resource, verbs: new Set<string>() };
    for (const op of rule.action.operations) {
      const verb = op.toLowerCase();
      if (verb === '*') throw fail('uppie.adapter.k8s.wildcard_forbidden', { value: op });
      if (!K8S_VERBS.has(verb)) throw fail('uppie.adapter.k8s.invalid_verb', { verb: op });
      entry.verbs.add(verb);
    }
    byResource.set(`${apiGroup}|${resource}`, entry);
  }
  // Merge resources sharing the same apiGroup and verb set into one PolicyRule.
  const merged = new Map<string, K8sPolicyRule>();
  for (const e of [...byResource.values()].sort((a, b) => `${a.apiGroup}|${a.resource}`.localeCompare(`${b.apiGroup}|${b.resource}`))) {
    const verbs = [...e.verbs];
    const ordered = [...K8S_VERBS].filter((v) => verbs.includes(v));
    const key = `${e.apiGroup}|${ordered.join(',')}`;
    const existing = merged.get(key);
    if (existing) existing.resources.push(e.resource);
    else merged.set(key, { apiGroups: [e.apiGroup], resources: [e.resource], verbs: ordered });
  }
  return [...merged.values()];
}

/** Deterministic ClusterRole name derived from the canonical rule set, so regeneration is idempotent. */
export function roleNameFor(rules: K8sPolicyRule[]): string {
  return `${K8S_ROLE_PREFIX}${sha256(JSON.stringify(rules)).slice(0, 12)}`;
}

export function buildClusterRole(name: string, rules: K8sPolicyRule[]): K8sClusterRole {
  return { apiVersion: `${K8S_RBAC_API_GROUP}/v1`, kind: 'ClusterRole', metadata: { name }, rules };
}

/** Canonical SHA-256 of a native document (stable across key order within the compiled structure). */
export const digestOf = (doc: unknown): string => sha256(JSON.stringify(doc));

export function toNativePolicy(role: K8sClusterRole): ProviderNativePolicy {
  const name = role.metadata?.name ?? '';
  return { providerId: name, providerType: 'KUBERNETES_RBAC', nativeDocument: role, digest: digestOf(role) };
}

export function extractRoleName(nativePolicy: ProviderNativePolicy): string {
  const doc = nativePolicy.nativeDocument as { metadata?: { name?: unknown } } | undefined;
  return typeof doc?.metadata?.name === 'string' && doc.metadata.name ? doc.metadata.name : nativePolicy.providerId;
}

/**
 * Parses a subject reference: `User:<name>`, `Group:<name>`, `ServiceAccount:<namespace>:<name>`.
 * A bare name is treated as a User.
 */
export function parseSubject(target: string): K8sSubject {
  const [kind, ...rest] = target.includes(':') ? target.split(':') : ['User', target];
  if (kind === 'ServiceAccount') {
    const [namespace, name] = rest;
    if (rest.length !== 2 || !isDnsSubdomain(namespace ?? '') || !isDnsSubdomain(name ?? '')) throw fail('uppie.adapter.k8s.invalid_subject', { subject: target });
    return { kind, name, namespace };
  }
  const name = rest.join(':');
  if ((kind !== 'User' && kind !== 'Group') || !NAME_PART.test(name)) throw fail('uppie.adapter.k8s.invalid_subject', { subject: target });
  return { kind, name, apiGroup: K8S_RBAC_API_GROUP };
}

/** Stable text form of a subject; the inverse of parseSubject. */
export const formatSubject = (s: K8sSubject): string => (s.kind === 'ServiceAccount' ? `ServiceAccount:${s.namespace}:${s.name}` : `${s.kind}:${s.name}`);

export function buildBindingName(roleName: string, target: string): string {
  return `${roleName}-${sha256(formatSubject(parseSubject(target))).slice(0, 10)}`;
}

export function buildClusterRoleBinding(roleName: string, target: string): K8sClusterRoleBinding {
  return {
    apiVersion: `${K8S_RBAC_API_GROUP}/v1`,
    kind: 'ClusterRoleBinding',
    metadata: { name: buildBindingName(roleName, target) },
    roleRef: { apiGroup: K8S_RBAC_API_GROUP, kind: 'ClusterRole', name: roleName },
    subjects: [parseSubject(target)],
  };
}

/** Identity and group set the API server evaluates for a subject in a SubjectAccessReview. */
export function accessReviewIdentity(target: string): { user: string; groups: string[] } {
  const s = parseSubject(target);
  if (s.kind === 'Group') return { user: '', groups: [s.name] };
  if (s.kind === 'ServiceAccount') return { user: `system:serviceaccount:${s.namespace}:${s.name}`, groups: ['system:serviceaccounts', `system:serviceaccounts:${s.namespace}`] };
  return { user: s.name, groups: [] };
}

/** Flattens PolicyRules to `group|resource|verb` keys: the unit of comparison for reconciliation. */
export function ruleKeys(rules: K8sPolicyRule[]): Set<string> {
  const keys = new Set<string>();
  for (const r of rules) for (const g of r.apiGroups) for (const res of r.resources) for (const v of r.verbs) keys.add(`${g}|${res}|${v}`);
  return keys;
}

/** Structural validation of a ClusterRole document; returns localized error messages (empty when valid). */
export function validateClusterRole(role: K8sClusterRole): string[] {
  const errors: string[] = [];
  const name = role.metadata?.name ?? '';
  if (!isDnsSubdomain(name)) errors.push(__t('uppie.adapter.k8s.validate.invalid_name', { name }));
  if (!role.rules || role.rules.length === 0) errors.push(__t('uppie.adapter.k8s.validate.no_rules'));
  for (const r of role.rules ?? []) {
    for (const v of r.verbs) if (v === '*') errors.push(__t('uppie.adapter.k8s.wildcard_forbidden', { value: v })); else if (!K8S_VERBS.has(v)) errors.push(__t('uppie.adapter.k8s.invalid_verb', { verb: v }));
    for (const x of [...r.apiGroups, ...r.resources]) if (x.includes('*')) errors.push(__t('uppie.adapter.k8s.wildcard_forbidden', { value: x }));
    if (r.resources.length === 0 || r.verbs.length === 0) errors.push(__t('uppie.adapter.k8s.invalid_rule', { scope: r.resources.join(',') }));
  }
  if (Buffer.byteLength(JSON.stringify(role), 'utf8') > K8S_MAX_OBJECT_BYTES) errors.push(__t('uppie.adapter.k8s.validate.too_large', { limit: K8S_MAX_OBJECT_BYTES }));
  return errors;
}

/** Blast radius from the bindings that reference a role. Any Group subject is BROAD. */
export function classifyBlastRadius(policyId: string, bindings: K8sClusterRoleBinding[]): DependencyReport {
  const subjects = bindings.filter((b) => b.roleRef.name === policyId).flatMap((b) => b.subjects ?? []);
  const actors = [...new Set(subjects.map(formatSubject))];
  const hasGroup = subjects.some((s) => s.kind === 'Group');
  const services = actors.filter((a) => a.startsWith('ServiceAccount:'));
  const blastRadius = classifyBlast(actors.length, hasGroup);
  return { policyId, dependentRoles: [], dependentActors: actors.filter((a) => !a.startsWith('ServiceAccount:')), dependentServices: services, blastRadius };
}

/** Removes server-managed fields so a snapshot can be re-created on a cluster. */
export function snapshotRole(role: K8sClusterRole): K8sClusterRole {
  const { resourceVersion: _rv, uid: _uid, ...metadata } = role.metadata ?? {};
  return { apiVersion: `${K8S_RBAC_API_GROUP}/v1`, kind: 'ClusterRole', metadata, rules: role.rules ?? [] };
}

/**
 * Maps an AuthorizationRule subject to the subject reference form parseSubject understands.
 * Workload-style identities are Kubernetes ServiceAccounts and must be addressed as `<namespace>:<name>`;
 * ROLE subjects have no Kubernetes meaning (roles are bound, not assumed) and are rejected.
 */
export function subjectRef(subject: { type: string; id: string }): string {
  if (/^(User|Group|ServiceAccount):/.test(subject.id)) return subject.id;
  switch (subject.type) {
    case 'USER': return `User:${subject.id}`;
    case 'GROUP': return `Group:${subject.id}`;
    case 'SERVICE_IDENTITY': case 'WORKLOAD_IDENTITY': case 'APPLICATION': return `ServiceAccount:${subject.id}`;
    default: throw fail('uppie.adapter.k8s.invalid_subject', { subject: `${subject.type}:${subject.id}` });
  }
}

/** True when a PolicyRule grants `verb` on `resource` in `apiGroup`. */
export const ruleGrants = (r: K8sPolicyRule, apiGroup: string, resource: string, verb: string): boolean =>
  r.apiGroups.includes(apiGroup) && r.resources.includes(resource) && r.verbs.includes(verb);
