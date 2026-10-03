/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — GCP IAM Provider Constraints
 * File           : GcpIamConstraints.ts
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

import type { AuthorizationConstraints } from '../../types/index';

/**
 * GCP IAM provider constraints.
 * Source: Google Cloud IAM documentation - quotas and limits.
 *
 * Key GCP-specific semantics:
 * - IAM policies are set ON RESOURCES, not attached to identities
 * - Hierarchy: Organization > Folder > Project > Resource
 * - Max 1500 principals per allow policy (at most 250 of them groups or domains)
 * - Custom roles: 300 per project and 300 per organization, 3000 permissions per role
 * - DENY policies are a separate policy type and are not produced by this adapter
 */
export const GCP_IAM_CONSTRAINTS: AuthorizationConstraints = {
  maxPoliciesPerRole:  { status: 'SUPPORTED',   value: 300,   note: 'Max custom roles per project and per organization' },
  maxRolesPerIdentity: { status: 'NOT_OBSERVABLE',             note: 'GCP does not cap the number of roles a principal holds; the cap is per policy' },
  maxAssignments:      { status: 'SUPPORTED',   value: 1500,  note: 'Max principals per allow policy (at most 250 groups or domains)' },
  maxPolicySize:       { status: 'SUPPORTED',   value: 65536, note: 'Max IAM policy size in bytes (64 KB)' },
  maxStatements:       { status: 'SUPPORTED',   value: 3000,  note: 'Max permissions per custom role' },
  maxGroups:           { status: 'SUPPORTED',   value: 250,   note: 'Max groups and domains per allow policy' },
  maxGroupMemberships: { status: 'NOT_OBSERVABLE',             note: 'Group membership is held by Cloud Identity and is not visible to IAM' },
  maxInheritanceDepth: { status: 'SUPPORTED',   value: 10,    note: 'Organization > folders (up to 10 levels) > project' },
  maxBindings:         { status: 'SUPPORTED',   value: 1500,  note: 'Bindings are bounded by the principal limit of the allow policy' },
  maxServiceAccounts:  { status: 'SUPPORTED',   value: 100,   note: 'Max service accounts per project (default quota)' },
  maxRules:            { status: 'UNSUPPORTED',                note: 'GCP IAM does not use rule-based access control' },
  maxACLEntries:       { status: 'UNSUPPORTED',                note: 'GCP IAM does not use ACLs (Cloud Storage ACLs are separate)' },
};
