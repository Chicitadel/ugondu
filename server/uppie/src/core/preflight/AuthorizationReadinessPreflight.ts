// @ts-ignore
import { __t } from '../../../../shared/i18n';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Authorization Readiness Preflight
 * File           : AuthorizationReadinessPreflight.ts
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

export type PreflightCheckResult = 'PASS' | 'PARTIAL' | 'FAIL' | 'WARN' | 'SKIP';

export type PreflightDecision =
  | 'PROCEED'
  | 'PROCEED_WITH_WARNING'
  | 'BLOCK'
  | 'BLOCK_RECOVERY_PATH'
  | 'REQUIRE_APPROVAL';

/**
 * Input context for the UPPIE authorization preflight.
 * Passed by engine-core into URRE admission alongside disk/drift checks.
 */
export interface UppiePreflightContext {
  actorId:                     string;
  targetId:                    string;
  requiredCapabilities:        string[];
  existingGrantedCapabilities: string[];
  missingCapabilities:         string[];
  newGrantApproved:            boolean;
  recoveryAuthorityVerified:   boolean;
  verificationAuthorityVerified: boolean;
  providerLimitHeadroom:       'OK' | 'WARN' | 'EXHAUSTED';
  policyConflictDetected:      boolean;
  existingAssignmentReusable:  boolean;
}

/**
 * @interface PreflightCheck
 * @description Corporate Governed interface implementation for PreflightCheck
 * @classification ENTERPRISE
 */
export interface PreflightCheck {
  checkId:     number;
  description: string;
  result:      PreflightCheckResult;
  detail?:     string;
}

/**
 * @interface AuthorizationReadinessReport
 * @description Corporate Governed interface implementation for AuthorizationReadinessReport
 * @classification ENTERPRISE
 */
export interface AuthorizationReadinessReport {
  decision:      PreflightDecision;
  checks:        PreflightCheck[];
  missingCount:  number;
  requiresApproval: boolean;
  evaluatedAt:   string;   // ISO-8601
}

/**
 * Evaluates all 13 UPPIE Authorization Readiness checks.
 * This function is called from within the URRE admission preflight
 * when a UppiePreflightContext is present.
 *
 * INVARIANT: Check #12 (recovery authority) FAIL → BLOCK_RECOVERY_PATH
 *            Check #13 (verification authority) FAIL → BLOCK_RECOVERY_PATH
 *            Both are non-negotiable hard blocks.
 */
export function evaluateAuthorizationReadiness(
  ctx: UppiePreflightContext
): AuthorizationReadinessReport {
  const checks: PreflightCheck[] = [
    {
      checkId:     1,
      description: __t('ui.preflight.actor_authenticated'),
      result:      ctx.actorId ? 'PASS' : 'FAIL',
    },
    {
      checkId:     2,
      description: __t('ui.preflight.actor_authorized'),
      result:      ctx.missingCapabilities.length === 0
        ? 'PASS'
        : ctx.existingGrantedCapabilities.length > 0 ? 'PARTIAL' : 'FAIL',
    },
    {
      checkId:     3,
      description: __t('ui.preflight.target_accessible'),
      result:      ctx.targetId ? 'PASS' : 'FAIL',
    },
    {
      checkId:     4,
      description: __t('ui.preflight.capabilities_known'),
      result:      ctx.requiredCapabilities.length > 0 ? 'PASS' : 'FAIL',
      detail:      ctx.requiredCapabilities.length === 0 ? 'No capabilities declared for this operation' : undefined,
    },
    {
      checkId:     5,
      description: __t('ui.preflight.authority_sufficient'),
      result:      ctx.missingCapabilities.length === 0
        ? 'PASS'
        : ctx.existingGrantedCapabilities.length > 0 ? 'PARTIAL' : 'FAIL',
    },
    {
      checkId:     6,
      description: __t('ui.preflight.missing_capabilities_count'),
      result:      ctx.missingCapabilities.length === 0 ? 'PASS' : 'WARN',
      detail:      `${ctx.missingCapabilities.length} missing: ${ctx.missingCapabilities.join(', ')}`,
    },
    {
      checkId:     7,
      description: __t('ui.preflight.assignment_limit_headroom'),
      result:      ctx.providerLimitHeadroom === 'OK'
        ? 'PASS'
        : ctx.providerLimitHeadroom === 'WARN' ? 'WARN' : 'FAIL',
    },
    {
      checkId:     8,
      description: __t('ui.preflight.policy_conflict_detected'),
      result:      ctx.policyConflictDetected ? 'WARN' : 'PASS',
      detail:      ctx.policyConflictDetected ? 'Policy conflict requires manual review' : undefined,
    },
    {
      checkId:     9,
      description: __t('ui.preflight.assignment_reusable'),
      result:      ctx.existingAssignmentReusable ? 'PASS' : 'WARN',
    },
    {
      checkId:     10,
      description: __t('ui.preflight.new_assignment_required'),
      result:      ctx.missingCapabilities.length > 0 ? 'WARN' : 'PASS',
    },
    {
      checkId:     11,
      description: __t('ui.preflight.approval_required'),
      result:      ctx.missingCapabilities.length > 0 && !ctx.newGrantApproved ? 'WARN' : 'PASS',
    },
    {
      checkId:     12,
      description: __t('ui.preflight.recovery_authority_available'),
      result:      ctx.recoveryAuthorityVerified ? 'PASS' : 'FAIL',
      detail:      !ctx.recoveryAuthorityVerified
        ? 'BLOCK: Ugondu cannot recover from this operation — recovery authority missing'
        : undefined,
    },
    {
      checkId:     13,
      description: __t('ui.preflight.verification_authority_available'),
      result:      ctx.verificationAuthorityVerified ? 'PASS' : 'FAIL',
      detail:      !ctx.verificationAuthorityVerified
        ? 'BLOCK: Ugondu cannot verify operation outcome — verification authority missing'
        : undefined,
    },
  ];

  const decision = deriveDecision(checks, ctx);

  return {
    decision,
    checks,
    missingCount: ctx.missingCapabilities.length,
    requiresApproval: ctx.missingCapabilities.length > 0 && !ctx.newGrantApproved,
    evaluatedAt: new Date().toISOString(),
  };
}

function deriveDecision(
  checks: PreflightCheck[],
  ctx: UppiePreflightContext
): PreflightDecision {
  // Hard blocks — non-negotiable
  const check12 = checks.find((c) => c.checkId === 12);
  const check13 = checks.find((c) => c.checkId === 13);
  if (check12?.result === 'FAIL' || check13?.result === 'FAIL') {
    return 'BLOCK_RECOVERY_PATH';
  }

  // Authentication/identification block
  const hardFails = checks.filter((c) => [1, 3, 4].includes(c.checkId) && c.result === 'FAIL');
  if (hardFails.length > 0) return 'BLOCK';

  // Provider limit exhausted
  if (ctx.providerLimitHeadroom === 'EXHAUSTED') return 'BLOCK';

  // Missing capabilities without approval
  if (ctx.missingCapabilities.length > 0 && !ctx.newGrantApproved) {
    return 'REQUIRE_APPROVAL';
  }

  // Warnings present
  const hasWarnings = checks.some((c) => c.result === 'WARN');
  if (hasWarnings) return 'PROCEED_WITH_WARNING';

  return 'PROCEED';
}
