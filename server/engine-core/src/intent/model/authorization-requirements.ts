/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Intent Engine — Authorization Requirements
 * File           : authorization-requirements.ts
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

/**
 * Source that produced an authorization requirement.
 * Drives how the requirement is treated during intent decomposition.
 */
export type AuthorizationRequirementProvenance =
  | 'USER_EXPLICIT'     // user explicitly stated a credential/role to use
  | 'LLM_INFERRED'      // inferred from intent text (requires validation gate)
  | 'POLICY_REQUIRED'   // mandated by tenant or environment policy
  | 'INHERITED';        // inherited from parent context (workspace/fleet)

export type AuthorizationGrantScope =
  | 'TEMPORARY'   // operation-scoped, auto-revoked on completion
  | 'PERMANENT'   // persists beyond this operation
  | 'SESSION';    // valid for the current authenticated session

export type AuthorizationApprovalScopeHint =
  | 'SELF_SERVICE'    // requester can approve their own authority request
  | 'TEAM_APPROVAL'   // requires team-level approval
  | 'ADMIN_APPROVAL'; // requires platform administrator approval

/**
 * AuthorizationRequirement — an authorization need extracted from the NormalizedIntent.
 *
 * When intent decomposition identifies operations that require provider-level
 * authority, those requirements are captured here and passed to UPPIE for:
 *   1. Authority graph lookup (does a suitable actor already exist?)
 *   2. Gap analysis (what is missing?)
 *   3. Least-privilege compilation (what minimum grants are needed?)
 */
export interface AuthorizationRequirement {
  requirementId:         string;    // stable UUID
  provenance:            AuthorizationRequirementProvenance;
  requiredCapabilities:  string[];  // capability IDs (e.g., 'Database.Read', 'Compute.Deploy')
  existingAuthorityHint?: string;   // actor/role ID if user explicitly provided credentials
  grantScope:            AuthorizationGrantScope;
  approvalScopeHint?:    AuthorizationApprovalScopeHint;
  resourceTargets:       string[];  // resource IDs/ARNs/namespaces this applies to
  notes:                 string;
}

/**
 * RequiredAuthoritySet — the authority set compiled for an Architecture IR candidate.
 * Produced by the capability mapper from AuthorizationRequirements.
 */
export interface RequiredAuthoritySet {
  candidateId:             string;   // Architecture IR candidate ID
  requirements:            AuthorizationRequirement[];
  estimatedGrantCount:     number;   // number of new grants needed (0 = reuse-only)
  estimatedApprovalNeeded: boolean;
  authorityComplexity:     'SIMPLE' | 'MODERATE' | 'COMPLEX';
}
