/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Kubernetes RBAC Client Boundary
 * File           : KubernetesRbacClient.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';

export interface K8sPolicyRule {
  apiGroups:      string[];
  resources:      string[];
  verbs:          string[];
  resourceNames?: string[];
}

export interface K8sClusterRole {
  apiVersion?:      string;
  kind?:            string;
  metadata?:        { name?: string; labels?: Record<string, string>; resourceVersion?: string; uid?: string };
  rules?:           K8sPolicyRule[];
  aggregationRule?: unknown;
}

export interface K8sSubject { kind: string; name: string; apiGroup?: string; namespace?: string }

export interface K8sClusterRoleBinding {
  apiVersion?: string;
  kind?:       string;
  metadata?:   { name?: string };
  roleRef:     { apiGroup: string; kind: string; name: string };
  subjects?:   K8sSubject[];
}

export interface K8sAccessReviewSpec {
  user:   string;
  groups: string[];
  verb:   string;
  group:  string;
  resource: string;
}

export interface K8sAccessReview { allowed: boolean; denied?: boolean; reason?: string }

/** Failure raised by the client; statusCode carries the Kubernetes API HTTP status (409 = already exists, 404 = not found). */
export class K8sApiError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = 'K8sApiError';
  }
}

/** Minimal Kubernetes surface used by the adapter; implemented by the SDK client and by test doubles. */
export interface K8sRbacClient {
  listClusterRoles(): Promise<K8sClusterRole[]>;
  readClusterRole(name: string): Promise<K8sClusterRole>;
  createClusterRole(role: K8sClusterRole): Promise<void>;
  replaceClusterRole(name: string, role: K8sClusterRole): Promise<void>;
  deleteClusterRole(name: string): Promise<void>;
  listClusterRoleBindings(): Promise<K8sClusterRoleBinding[]>;
  createClusterRoleBinding(binding: K8sClusterRoleBinding): Promise<void>;
  deleteClusterRoleBinding(name: string): Promise<void>;
  reviewAccess(spec: K8sAccessReviewSpec): Promise<K8sAccessReview>;
}

async function wrap<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err: any) {
    const status = err?.response?.statusCode ?? err?.statusCode ?? err?.code;
    throw new K8sApiError(err?.body?.message ?? err?.message ?? String(err), typeof status === 'number' ? status : undefined);
  }
}

/**
 * Builds the production client from @kubernetes/client-node (loaded on demand, so the package is only
 * required when this adapter is actually used) using in-cluster or kubeconfig credentials.
 */
export async function createSdkK8sClient(): Promise<K8sRbacClient> {
  let sdk: any;
  try {
    sdk = await import('@kubernetes/client-node');
  } catch (err: any) {
    throw new Error(__t('uppie.adapter.k8s.sdk_unavailable', { error: err?.message ?? String(err) }));
  }
  const kc = new sdk.KubeConfig();
  kc.loadFromDefault();
  const rbac = kc.makeApiClient(sdk.RbacAuthorizationV1Api);
  const authz = kc.makeApiClient(sdk.AuthorizationV1Api);

  return {
    listClusterRoles: () => wrap(async () => (await rbac.listClusterRole()).body.items ?? []),
    readClusterRole: (name) => wrap(async () => (await rbac.readClusterRole(name)).body),
    createClusterRole: (role) => wrap(async () => { await rbac.createClusterRole(role); }),
    replaceClusterRole: (name, role) => wrap(async () => { await rbac.replaceClusterRole(name, role); }),
    deleteClusterRole: (name) => wrap(async () => { await rbac.deleteClusterRole(name); }),
    listClusterRoleBindings: () => wrap(async () => (await rbac.listClusterRoleBinding()).body.items ?? []),
    createClusterRoleBinding: (binding) => wrap(async () => { await rbac.createClusterRoleBinding(binding); }),
    deleteClusterRoleBinding: (name) => wrap(async () => { await rbac.deleteClusterRoleBinding(name); }),
    reviewAccess: (spec) => wrap(async () => {
      const res = await authz.createSubjectAccessReview({
        apiVersion: 'authorization.k8s.io/v1',
        kind: 'SubjectAccessReview',
        spec: { user: spec.user, groups: spec.groups, resourceAttributes: { verb: spec.verb, group: spec.group, resource: spec.resource } },
      });
      const status = res.body.status ?? {};
      return { allowed: Boolean(status.allowed), denied: Boolean(status.denied), reason: status.reason };
    }),
  };
}
