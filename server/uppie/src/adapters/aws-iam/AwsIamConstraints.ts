/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Adapter
 * File           : AwsIamConstraints.ts
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
 * AWS IAM authorization constraint limits.
 * Source: AWS IAM documentation (service quotas).
 * These are NOT hardcoded ARNs or account IDs — they are service-level limits.
 */
export const AWS_IAM_CONSTRAINTS: AuthorizationConstraints = {
  maxPoliciesPerRole:     { status: 'SUPPORTED_WITH_LIMITS', value: 10,    note: '10 managed policies per role; 1 inline policy' },
  maxRolesPerIdentity:    { status: 'NOT_OBSERVABLE',                       note: 'Users can assume many roles; no fixed limit' },
  maxAssignments:         { status: 'SUPPORTED_WITH_LIMITS', value: 5000,  note: 'IAM entities per account' },
  maxPolicySize:          { status: 'SUPPORTED_WITH_LIMITS', value: 6144,  note: 'Managed policy max size in bytes' },
  maxStatements:          { status: 'NOT_OBSERVABLE',                       note: 'Limited indirectly by maxPolicySize' },
  maxGroups:              { status: 'SUPPORTED_WITH_LIMITS', value: 300,   note: 'IAM groups per account' },
  maxGroupMemberships:    { status: 'SUPPORTED_WITH_LIMITS', value: 10,    note: 'Groups per IAM user' },
  maxInheritanceDepth:    { status: 'UNSUPPORTED',                          note: 'AWS IAM has no role inheritance depth' },
  maxBindings:            { status: 'NOT_OBSERVABLE',                       note: 'N/A for AWS IAM (see maxAssignments)' },
  maxServiceAccounts:     { status: 'SUPPORTED_WITH_LIMITS', value: 1000,  note: 'IAM roles usable as service accounts' },
  maxRules:               { status: 'NOT_OBSERVABLE',                       note: 'N/A for AWS IAM (sudoers concept)' },
  maxACLEntries:          { status: 'NOT_OBSERVABLE',                       note: 'Resource-specific (S3, KMS, etc.)' },
};
