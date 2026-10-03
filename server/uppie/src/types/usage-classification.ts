/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : usage-classification.ts
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

export type UsageClassification =
  | 'ACTIVE'
  | 'RECENTLY_USED'
  | 'RARELY_USED'
  | 'SCHEDULED'
  | 'FAILOVER_REQUIRED'
  | 'EMERGENCY_REQUIRED'
  | 'UNKNOWN'
  | 'UNUSED'
  | 'OBSOLETE';

/**
 * INVARIANT: Only OBSOLETE is a strong retirement candidate.
 * UNUSED alone is insufficient — scheduled/failover/emergency patterns must be ruled out first.
 */
export function isRetirementCandidate(classification: UsageClassification): boolean {
  return classification === 'OBSOLETE';
}

export function requiresUsageAnalysisBeforeRetirement(classification: UsageClassification): boolean {
  return classification === 'UNUSED' || classification === 'RARELY_USED' || classification === 'UNKNOWN';
}
