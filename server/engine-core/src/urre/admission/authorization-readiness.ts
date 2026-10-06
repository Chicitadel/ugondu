import { __t } from "@ugondu/shared";

/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : URRE — Authorization Readiness Check
 * File           : authorization-readiness.ts
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
 * URRE-side UPPIE preflight context.
 * A plain-data object (no class methods) — safe to pass across module boundaries.
 * Populated by the UPPIE service layer and injected into the PreflightRequest.
 */
export interface UppiePreflightContext {
  actorId:                       string;
  targetId:                      string;
  requiredCapabilities:          string[];
  existingGrantedCapabilities:   string[];
  missingCapabilities:           string[];
  newGrantApproved:              boolean;
  recoveryAuthorityVerified:     boolean;
  verificationAuthorityVerified: boolean;
  providerLimitHeadroom:         'OK' | 'WARN' | 'EXHAUSTED';
  policyConflictDetected:        boolean;
  existingAssignmentReusable:    boolean;
}

export type AuthReadinessCheckResult = 'PASS' | 'PARTIAL' | 'FAIL' | 'WARN';

export type AuthReadinessDecision =
  | 'PROCEED'
  | 'PROCEED_WITH_WARNING'
  | 'REQUIRE_APPROVAL'
  | 'BLOCK'
  | 'BLOCK_RECOVERY_PATH';

/**
 * @interface AuthReadinessCheck
 * @description Corporate Governed interface implementation for AuthReadinessCheck
 * @classification ENTERPRISE
 */
export interface AuthReadinessCheck {
  checkId:     number;
  description: string;
  result:      AuthReadinessCheckResult;
  detail?:     string;
}

/**
 * @interface AuthorizationReadinessReport
 * @description Corporate Governed interface implementation for AuthorizationReadinessReport
 * @classification ENTERPRISE
 */
export interface AuthorizationReadinessReport {
  decision:         AuthReadinessDecision;
  checks:           AuthReadinessCheck[];
  missingCount:     number;
  requiresApproval: boolean;
  evaluatedAt:      string;   // ISO-8601
}

/**
 * Run the 13-check UPPIE Authorization Readiness assessment.
 *
 * Called by runPreflightAdmission() when UppiePreflightContext is present.
 *
 * Hard blocks (non-negotiable):
 *   Check #12 (recovery authority) FAIL → BLOCK_RECOVERY_PATH
 *   Check #13 (verification authority) FAIL → BLOCK_RECOVERY_PATH
 *
 * When uppieContext is absent, this function MUST NOT be called —
 * the preflight continues with existing behavior unchanged.
 */
export function runAuthorizationReadiness(
  ctx: UppiePreflightContext
): AuthorizationReadinessReport {
  const checks: AuthReadinessCheck[] = [
    {
      checkId: 1, description: __t('actor_authenticated'),
      result:  ctx.actorId.length > 0 ? 'PASS' : 'FAIL',
    },
    {
      checkId: 2, description: __t('actor_authorized_minimum_requi'),
      result:  ctx.missingCapabilities.length === 0
        ? 'PASS'
        : ctx.existingGrantedCapabilities.length > 0 ? 'PARTIAL' : 'FAIL',
    },
    {
      checkId: 3, description: __t('target_identified_and_accessib'),
      result:  ctx.targetId.length > 0 ? 'PASS' : 'FAIL',
    },
    {
      checkId: 4, description: __t('required_capabilities_known'),
      result:  ctx.requiredCapabilities.length > 0 ? 'PASS' : 'FAIL',
    },
    {
      checkId: 5, description: __t('existing_authority_sufficient'),
      result:  ctx.missingCapabilities.length === 0 ? 'PASS' : 'PARTIAL',
    },
    {
      checkId: 6, description: __t('missing_capabilities_count'),
      result:  ctx.missingCapabilities.length === 0 ? 'PASS' : 'WARN',
      detail:  ctx.missingCapabilities.length > 0
        ? `${ctx.missingCapabilities.length} missing: ${ctx.missingCapabilities.join(', ')}`
        : undefined,
    },
    {
      checkId: 7, description: __t('provider_assignment_limit_head'),
      result:  ctx.providerLimitHeadroom === 'OK'
        ? 'PASS'
        : ctx.providerLimitHeadroom === 'WARN' ? 'WARN' : 'FAIL',
    },
    {
      checkId: 8, description: __t('policy_conflict_detected'),
      result:  ctx.policyConflictDetected ? 'WARN' : 'PASS',
      detail:  ctx.policyConflictDetected ? __t('msg_policy_conflict_detected_manual_review_r') : undefined,
    },
    {
      checkId: 9, description: __t('existing_assignment_reusable'),
      result:  ctx.existingAssignmentReusable ? 'PASS' : 'WARN',
    },
    {
      checkId: 10, description: __t('new_assignment_required'),
      result:  ctx.missingCapabilities.length > 0 ? 'WARN' : 'PASS',
    },
    {
      checkId: 11, description: __t('approval_required_for_new_gran'),
      result:  (ctx.missingCapabilities.length > 0 && !ctx.newGrantApproved) ? 'WARN' : 'PASS',
    },
    {
      checkId: 12, description: __t('recovery_authority_available'),
      result:  ctx.recoveryAuthorityVerified ? 'PASS' : 'FAIL',
      detail:  !ctx.recoveryAuthorityVerified
        ? __t('msg_hard_block_recovery_authority_unavailabl')
        : undefined,
    },
    {
      checkId: 13, description: __t('verification_authority_availab'),
      result:  ctx.verificationAuthorityVerified ? 'PASS' : 'FAIL',
      detail:  !ctx.verificationAuthorityVerified
        ? __t('msg_hard_block_verification_authority_unavai')
        : undefined,
    },
  ];

  const decision = resolveDecision(checks, ctx);

  return {
    decision,
    checks,
    missingCount:     ctx.missingCapabilities.length,
    requiresApproval: ctx.missingCapabilities.length > 0 && !ctx.newGrantApproved,
    evaluatedAt:      new Date().toISOString(),
  };
}

function resolveDecision(
  checks: AuthReadinessCheck[],
  ctx:    UppiePreflightContext
): AuthReadinessDecision {
  const check12 = checks[11];
  const check13 = checks[12];
  if (check12?.result === 'FAIL' || check13?.result === 'FAIL') {
    return 'BLOCK_RECOVERY_PATH';
  }
  const hardFails = checks
    .filter((c) => [1, 3, 4].includes(c.checkId) && c.result === 'FAIL');
  if (hardFails.length > 0) return 'BLOCK';
  if (ctx.providerLimitHeadroom === 'EXHAUSTED') return 'BLOCK';
  if (ctx.missingCapabilities.length > 0 && !ctx.newGrantApproved) return 'REQUIRE_APPROVAL';
  if (checks.some((c) => c.result === 'WARN')) return 'PROCEED_WITH_WARNING';
  return 'PROCEED';
}
