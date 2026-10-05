/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Kubernetes RBAC Adapter
 * File           : KubernetesRbacConstraints.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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

import type { AuthorizationConstraints } from '../../types/index';

/**
 * Kubernetes RBAC authorization constraint limits.
 * Source: Kubernetes API server documentation and etcd size limits.
 */
export const KUBERNETES_RBAC_CONSTRAINTS: AuthorizationConstraints = {
  maxPoliciesPerRole:     { status: 'NOT_OBSERVABLE',                         note: 'Rules per Role/ClusterRole not enforced by API' },
  maxRolesPerIdentity:    { status: 'NOT_OBSERVABLE',                         note: __t('rolebindings_per_subject_not_l') },
  maxAssignments:         { status: 'NOT_OBSERVABLE',                         note: __t('no_fixed_binding_count_limit_i') },
  maxPolicySize:          { status: 'SUPPORTED_WITH_LIMITS', value: 1048576,  note: __t('etcd_object_size_limit_1_mib') },
  maxStatements:          { status: 'NOT_OBSERVABLE',                         note: 'Rules per Role unbounded; limited by maxPolicySize' },
  maxGroups:              { status: 'NOT_OBSERVABLE',                         note: 'Groups are external (OIDC/LDAP); no K8s-side limit' },
  maxGroupMemberships:    { status: 'NOT_OBSERVABLE',                         note: __t('group_membership_managed_outsi') },
  maxInheritanceDepth:    { status: 'UNSUPPORTED',                            note: __t('k8s_rbac_has_no_role_inheritan') },
  maxBindings:            { status: 'NOT_OBSERVABLE',                         note: __t('clusterrolebindings_not_limite') },
  maxServiceAccounts:     { status: 'SUPPORTED_WITH_LIMITS', value: 5000,     note: 'Soft limit; etcd storage-bound' },
  maxRules:               { status: 'NOT_OBSERVABLE',                         note: 'N/A for K8s RBAC' },
  maxACLEntries:          { status: 'NOT_OBSERVABLE',                         note: 'N/A for K8s RBAC' },
};
