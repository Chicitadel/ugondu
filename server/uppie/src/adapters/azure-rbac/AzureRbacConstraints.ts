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
  maxPoliciesPerRole:  { status: 'SUPPORTED',            value: 5000, note: 'Max custom role definitions per tenant' },
  maxRolesPerIdentity: { status: 'SUPPORTED',            value: 200,  note: 'Max role assignments per user/SP' },
  maxAssignments:      { status: 'SUPPORTED',            value: 5000, note: 'Max role assignments per subscription (500 per management group)' },
  maxPolicySize:       { status: 'SUPPORTED',            value: 8192, note: 'Max custom role definition JSON size in bytes' },
  maxStatements:       { status: 'SUPPORTED',            value: 128,  note: 'Max actions per custom role' },
  maxGroups:           { status: 'SUPPORTED',            value: 5000, note: 'Max groups per Azure AD tenant' },
  maxGroupMemberships: { status: 'SUPPORTED',            value: 500,  note: 'Max group memberships per user' },
  maxInheritanceDepth: { status: 'SUPPORTED',            value: 3,    note: 'Management group → subscription → resource group' },
  maxBindings:         { status: 'UNSUPPORTED',                       note: 'Azure uses Role Assignments, not Bindings' },
  maxServiceAccounts:  { status: 'SUPPORTED',            value: 2000, note: 'Max service principals per tenant (soft limit)' },
  maxRules:            { status: 'UNSUPPORTED',                       note: 'Azure RBAC does not use rule-based access' },
  maxACLEntries:       { status: 'UNSUPPORTED',                       note: 'Azure RBAC does not use ACLs' },
};
