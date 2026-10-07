const __t = (str: string, p?: any) => {
  if (['fileman', 'mysql', 'cron', 'ftpaccts', 'webmail', 'default', 'disabled', 'ugondu_taken', 'ugondu_copy', 'ugondu_everything', 'ugondu_idle'].includes(str)) return str;
  return '[en] ' + str;
};
/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - Kubernetes RBAC Test Support
 * File           : k8sFakeCluster.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { K8sApiError } from '../../adapters/kubernetes-rbac/KubernetesRbacClient';
import type { K8sRbacClient, K8sClusterRole, K8sClusterRoleBinding } from '../../adapters/kubernetes-rbac/KubernetesRbacClient';

/** In-memory cluster that enforces real RBAC semantics: a subject may do what any bound ClusterRole's rules grant. */
export function fakeCluster() {
  const roles = new Map<string, K8sClusterRole>();
  const bindings = new Map<string, K8sClusterRoleBinding>();
  let revision = 1;
  const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
  const client: K8sRbacClient = {
    async listClusterRoles() { return [...roles.values()].map(clone); },
    async readClusterRole(name) { const r = roles.get(name); if (!r) throw new K8sApiError(__t('not_found'), 404); return clone(r); },
    async createClusterRole(role) {
      const name = role.metadata?.name as string;
      if (roles.has(name)) throw new K8sApiError('exists', 409);
      roles.set(name, { ...clone(role), metadata: { ...role.metadata, resourceVersion: String(revision++), uid: `uid-${name}` } });
    },
    async replaceClusterRole(name, role) {
      const current = roles.get(name);
      if (!current) throw new K8sApiError(__t('not_found'), 404);
      if (role.metadata?.resourceVersion !== current.metadata?.resourceVersion) throw new K8sApiError('conflict', 409);
      roles.set(name, { ...clone(role), metadata: { ...role.metadata, resourceVersion: String(revision++) } });
    },
    async deleteClusterRole(name) { if (!roles.delete(name)) throw new K8sApiError(__t('not_found'), 404); },
    async listClusterRoleBindings() { return [...bindings.values()].map(clone); },
    async createClusterRoleBinding(b) {
      const name = b.metadata?.name as string;
      if (bindings.has(name)) throw new K8sApiError('exists', 409);
      bindings.set(name, clone(b));
    },
    async deleteClusterRoleBinding(name) { if (!bindings.delete(name)) throw new K8sApiError(__t('not_found'), 404); },
    async reviewAccess(spec) {
      for (const b of bindings.values()) {
        const bound = (b.subjects ?? []).some((s) =>
          (s.kind === 'User' && s.name === spec.user) || (s.kind === 'Group' && spec.groups.includes(s.name)) ||
          (s.kind === 'ServiceAccount' && spec.user === `system:serviceaccount:${s.namespace}:${s.name}`));
        const role = roles.get(b.roleRef.name);
        if (bound && role && (role.rules ?? []).some((r) => r.apiGroups.includes(spec.group) && r.resources.includes(spec.resource) && r.verbs.includes(spec.verb))) return { allowed: true };
      }
      return { allowed: false };
    },
  };
  return { client, roles, bindings };
}

export const ctx: any = { tenantId: 't', environmentId: 'prod', provider: 'KUBERNETES_RBAC', credentials: {} };

/** Builds a complete AuthorizationRule with sensible defaults for Kubernetes tests. */
export function rule(over: Record<string, any> = {}): any {
  return {
    ruleId: 'r1', version: '1.0.0', effect: 'ALLOW', conditions: [], scope: {}, purpose: 'test', owner: 'o',
    subject: { type: 'USER', id: 'alice' },
    action: { capability: 'Pods.Read', operations: ['get', 'list'] },
    resource: { type: 'k8s::resource', scope: 'pods' },
    ...over,
  };
}
