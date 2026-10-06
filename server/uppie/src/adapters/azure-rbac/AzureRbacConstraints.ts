import { __t } from '@ugondu/shared';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Azure RBAC Constraints
 * File           : AzureRbacConstraints.ts
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

import type { AuthorizationConstraints } from '../../types/index';

/**
 * Azure RBAC provider constraints.
 * Source: Azure RBAC documentation — service quotas and limits.
 *
 * Key Azure-specific limits:
 * - Max 5000 custom role definitions per Azure AD tenant
 * - Max 5000 role assignments per subscription (500 per management group)
 * - Conditions (ABAC) supported but limited to specific storage/key operations
 * - No DENY-only assignments: deny assignments are system-generated only
 */
export const AZURE_RBAC_CONSTRAINTS: AuthorizationConstraints = {
  maxPoliciesPerRole:  { status: 'SUPPORTED',            value: 5000, note: __t('max_custom_role_definitions_pe') },
  maxRolesPerIdentity: { status: 'SUPPORTED',            value: 200,  note: 'Max role assignments per user/SP' },
  maxAssignments:      { status: 'SUPPORTED',            value: 5000, note: __t('max_role_assignments_per_subsc') },
  maxPolicySize:       { status: 'SUPPORTED',            value: 8192, note: __t('max_custom_role_definition_jso') },
  maxStatements:       { status: 'SUPPORTED',            value: 128,  note: __t('max_actions_per_custom_role') },
  maxGroups:           { status: 'SUPPORTED',            value: 5000, note: __t('max_groups_per_azure_ad_tenant') },
  maxGroupMemberships: { status: 'SUPPORTED',            value: 500,  note: __t('max_group_memberships_per_user') },
  maxInheritanceDepth: { status: 'SUPPORTED',            value: 3,    note: 'Management group → subscription → resource group' },
  maxBindings:         { status: 'UNSUPPORTED',                       note: __t('azure_uses_role_assignments_no') },
  maxServiceAccounts:  { status: 'SUPPORTED',            value: 2000, note: __t('max_service_principals_per_ten') },
  maxRules:            { status: 'UNSUPPORTED',                       note: __t('azure_rbac_does_not_use_rule_b') },
  maxACLEntries:       { status: 'UNSUPPORTED',                       note: __t('azure_rbac_does_not_use_acls') },
};
