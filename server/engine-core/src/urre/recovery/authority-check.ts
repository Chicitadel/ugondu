/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : URRE — Recovery Authority Check
 * File           : authority-check.ts
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

import type { UppiePreflightContext } from '../admission/authorization-readiness';
import { __t } from "@ugondu/shared";

export type RecoveryAuthorityCheckResult =
  | 'AUTHORIZED'          // Ugondu has required effective authority to perform recovery
  | 'INSUFFICIENT'        // specific capabilities are missing (with detail)
  | 'CANNOT_DETERMINE'    // authority not observable — permits proceed with warning
  | 'BLOCKED';            // explicit deny prevents recovery — escalate to human

/**
 * @interface RecoveryAuthorityReport
 * @description Corporate Governed interface implementation for RecoveryAuthorityReport
 * @classification ENTERPRISE
 */
export interface RecoveryAuthorityReport {
  result:              RecoveryAuthorityCheckResult;
  missingCapabilities: string[];    // non-empty only when result = INSUFFICIENT
  detail:              string;
  evaluatedAt:         string;      // ISO-8601
  operationId:         string;
  executionId:         string;
}

/**
 * verifyRecoveryAuthority — checks that Ugondu has required authority BEFORE
 * any recovery mutation begins.
 *
 * INVARIANT: A BLOCKED result halts recovery and escalates to human.
 *            A CANNOT_DETERMINE result permits recovery with a warning log.
 *            When uppieContext is absent, returns CANNOT_DETERMINE (no regression).
 *
 * This function MUST be called before any rollback, forward-recovery, or
 * backup-restore operation mutates provider state.
 *
 * It does NOT call provider APIs directly — it evaluates the pre-computed
 * UppiePreflightContext from the current execution context.
 */
export function verifyRecoveryAuthority(
  operationId:   string,
  executionId:   string,
  uppieContext?: UppiePreflightContext
): RecoveryAuthorityReport {
  const evaluatedAt = new Date().toISOString();

  // No UPPIE context — cannot determine authority, permit with warning
  if (!uppieContext) {
    return {
      result:              'CANNOT_DETERMINE',
      missingCapabilities: [],
      detail:              __t('msg_no_uppie_context_present_recovery_author'),
      evaluatedAt,
      operationId,
      executionId,
    };
  }

  // Recovery authority explicitly verified by UPPIE preflight
  if (uppieContext.recoveryAuthorityVerified) {
    if (uppieContext.missingCapabilities.length === 0) {
      return {
        result:              'AUTHORIZED',
        missingCapabilities: [],
        detail:              __t('msg_recovery_authority_verified_all_required'),
        evaluatedAt,
        operationId,
        executionId,
      };
    }
    // Recovery verified but some general capabilities missing — INSUFFICIENT
    return {
      result:              'INSUFFICIENT',
      missingCapabilities: uppieContext.missingCapabilities,
      detail:              `Recovery authority present but ${uppieContext.missingCapabilities.length} capability gap(s) detected.`,
      evaluatedAt,
      operationId,
      executionId,
    };
  }

  // Provider limit exhausted — cannot grant additional authority
  if (uppieContext.providerLimitHeadroom === 'EXHAUSTED') {
    return {
      result:              'BLOCKED',
      missingCapabilities: uppieContext.missingCapabilities,
      detail:              __t('msg_recovery_authority_missing_and_provider'),
      evaluatedAt,
      operationId,
      executionId,
    };
  }

  // Recovery authority NOT verified and not blocked — INSUFFICIENT
  return {
    result:              'INSUFFICIENT',
    missingCapabilities: uppieContext.missingCapabilities,
    detail:              `Recovery authority not verified. Missing capabilities: ${uppieContext.missingCapabilities.join(', ')}.`,
    evaluatedAt,
    operationId,
    executionId,
  };
}

/**
 * shouldHaltRecovery — determines if a recovery authority report requires halting.
 * BLOCKED = halt and escalate.
 * All other results permit recovery (with warning where applicable).
 */
export function shouldHaltRecovery(report: RecoveryAuthorityReport): boolean {
  return report.result === 'BLOCKED';
}
