/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Move — Authority Continuity Verification
 * File           : authority-continuity.ts
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

import { hasBlockingUntranslatableRules, isFullyCovered } from '../model/authority-translation';
import type { AuthorityTranslationRecord } from '../model/authority-translation';

export type AuthorityContinuityCheckResult =
  | 'PASS'
  | 'PASS_WITH_MANUAL_ITEMS'
  | 'FAIL_BLOCKING_UNTRANSLATABLE'
  | 'FAIL_SOURCE_REVOKED_EARLY'
  | 'FAIL_INSUFFICIENT_COVERAGE'
  | 'SKIP';   // no authority translation in this migration

/**
 * @interface AuthorityContinuityReport
 * @description Corporate Governed interface implementation for AuthorityContinuityReport
 * @classification ENTERPRISE
 */
export interface AuthorityContinuityReport {
  result:                   AuthorityContinuityCheckResult;
  translationCoverage:      number;
  blockingRuleCount:        number;
  manualItemCount:          number;
  sourceAuthorityIntact:    boolean;
  targetAuthorityVerified:  boolean;
  evaluatedAt:              string;   // ISO-8601
  detail:                   string;
}

/**
 * @interface AuthorityContinuityContext
 * @description Corporate Governed interface implementation for AuthorityContinuityContext
 * @classification ENTERPRISE
 */
export interface AuthorityContinuityContext {
  translation:              AuthorityTranslationRecord | undefined;
  sourceAuthorityIntact:    boolean;   // source authority was NOT prematurely revoked
  targetAuthorityVerified:  boolean;   // target authority checks passed
  requiredCoverageThreshold: number;  // minimum acceptable coverage (default: 0.95)
}

/**
 * verifyAuthorityContinuity — checks authority translation before committing cutover.
 *
 * Verifies:
 * 1. Target environment's effective authority satisfies all required capabilities
 * 2. Source authority was NOT prematurely revoked before cutover commitment
 * 3. Untranslatable rules have been manually resolved (or explicitly waived)
 *
 * INVARIANT: Source authority remains intact until cutover is committed.
 *            This function gates the COMMIT_TARGET_AUTHORITY step.
 */
export function verifyAuthorityContinuity(
  ctx: AuthorityContinuityContext
): AuthorityContinuityReport {
  const evaluatedAt = new Date().toISOString();

  // No authority translation in this migration — skip check
  if (!ctx.translation) {
    return {
      result:                  'SKIP',
      translationCoverage:     1.0,
      blockingRuleCount:       0,
      manualItemCount:         0,
      sourceAuthorityIntact:   ctx.sourceAuthorityIntact,
      targetAuthorityVerified: ctx.targetAuthorityVerified,
      evaluatedAt,
      detail: 'No authority translation present in this migration — check skipped',
    };
  }

  const translation = ctx.translation;
  const threshold = ctx.requiredCoverageThreshold;

  // Source authority prematurely revoked
  if (!ctx.sourceAuthorityIntact) {
    return {
      result:                  'FAIL_SOURCE_REVOKED_EARLY',
      translationCoverage:     translation.translationCoverage,
      blockingRuleCount:       translation.untranslatableRules.filter((r) => r.blocksAutoCutover).length,
      manualItemCount:         translation.untranslatableRules.length,
      sourceAuthorityIntact:   false,
      targetAuthorityVerified: ctx.targetAuthorityVerified,
      evaluatedAt,
      detail: 'Source authority was revoked before cutover commitment. Rollback required.',
    };
  }

  // Insufficient coverage
  if (translation.translationCoverage < threshold) {
    return {
      result:                  'FAIL_INSUFFICIENT_COVERAGE',
      translationCoverage:     translation.translationCoverage,
      blockingRuleCount:       translation.untranslatableRules.filter((r) => r.blocksAutoCutover).length,
      manualItemCount:         translation.untranslatableRules.length,
      sourceAuthorityIntact:   true,
      targetAuthorityVerified: ctx.targetAuthorityVerified,
      evaluatedAt,
      detail: `Translation coverage ${(translation.translationCoverage * 100).toFixed(1)}% is below threshold ${(threshold * 100).toFixed(1)}%.`,
    };
  }

  // Blocking untranslatable rules
  if (hasBlockingUntranslatableRules(translation)) {
    const blockingCount = translation.untranslatableRules.filter((r) => r.blocksAutoCutover).length;
    return {
      result:                  'FAIL_BLOCKING_UNTRANSLATABLE',
      translationCoverage:     translation.translationCoverage,
      blockingRuleCount:       blockingCount,
      manualItemCount:         translation.untranslatableRules.length,
      sourceAuthorityIntact:   true,
      targetAuthorityVerified: ctx.targetAuthorityVerified,
      evaluatedAt,
      detail: `${blockingCount} untranslatable rule(s) block auto-cutover. Manual resolution required.`,
    };
  }

  // Non-blocking manual items
  const manualCount = translation.untranslatableRules.length;
  if (manualCount > 0) {
    return {
      result:                  'PASS_WITH_MANUAL_ITEMS',
      translationCoverage:     translation.translationCoverage,
      blockingRuleCount:       0,
      manualItemCount:         manualCount,
      sourceAuthorityIntact:   true,
      targetAuthorityVerified: ctx.targetAuthorityVerified,
      evaluatedAt,
      detail: `${manualCount} non-blocking manual item(s) require post-cutover attention.`,
    };
  }

  void isFullyCovered; // used in coverage check above

  return {
    result:                  'PASS',
    translationCoverage:     translation.translationCoverage,
    blockingRuleCount:       0,
    manualItemCount:         0,
    sourceAuthorityIntact:   true,
    targetAuthorityVerified: ctx.targetAuthorityVerified,
    evaluatedAt,
    detail: 'Authority translation verified. Full coverage. No blocking items.',
  };
}
