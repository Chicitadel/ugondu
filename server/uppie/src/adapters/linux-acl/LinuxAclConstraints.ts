/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Linux ACL Adapter
 * File           : LinuxAclConstraints.ts
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
 * Linux POSIX ACL authorization constraint limits.
 * Source: Linux kernel ACL implementation (POSIX.1e draft + ext4/xfs limits).
 */
export const LINUX_ACL_CONSTRAINTS: AuthorizationConstraints = {
  maxPoliciesPerRole:     { status: 'UNSUPPORTED',                          note: 'Linux ACL has no role concept' },
  maxRolesPerIdentity:    { status: 'UNSUPPORTED',                          note: 'Linux ACL has no role concept' },
  maxAssignments:         { status: 'NOT_OBSERVABLE',                       note: 'ACL entries per filesystem object vary by fs' },
  maxPolicySize:          { status: 'UNSUPPORTED',                          note: 'N/A for Linux ACL' },
  maxStatements:          { status: 'UNSUPPORTED',                          note: 'N/A for Linux ACL' },
  maxGroups:              { status: 'SUPPORTED_WITH_LIMITS', value: 65536,  note: 'Linux GID namespace limit (16-bit)' },
  maxGroupMemberships:    { status: 'NOT_OBSERVABLE',                       note: 'Managed by /etc/group; no kernel hard limit' },
  maxInheritanceDepth:    { status: 'UNSUPPORTED',                          note: 'Linux ACL has no inheritance; default ACLs only' },
  maxBindings:            { status: 'UNSUPPORTED',                          note: 'N/A for Linux ACL' },
  maxServiceAccounts:     { status: 'UNSUPPORTED',                          note: 'N/A for Linux ACL' },
  maxRules:               { status: 'SUPPORTED_WITH_LIMITS', value: 32,     note: 'Max ACL entries per object (ext4 default)' },
  maxACLEntries:          { status: 'SUPPORTED_WITH_LIMITS', value: 32,     note: 'POSIX ACL entry limit per filesystem object' },
};
