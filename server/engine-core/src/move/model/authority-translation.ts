/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Move — Authority Translation
 * File           : authority-translation.ts
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

import { z } from 'zod';

/**
 * A rule that could not be automatically translated from source to target provider.
 * These MUST surface as manual action items in the migration plan.
 *
 * INVARIANT: Untranslatable rules are NEVER silently dropped.
 *            They block cutover until manually resolved or explicitly waived.
 */
export interface UntranslatableRule {
  sourceRuleId:         string;   // rule ID in source provider
  capability:           string;   // capability the rule grants
  reason:               string;   // why translation failed
  manualActionRequired: string;   // specific human action needed
  blocksAutoCutover:    boolean;  // if true, cutover cannot proceed without resolution
}

/**
 * AuthorityTranslationRecord — captured in the MigrationCertificate.
 *
 * Documents the complete authority model translation when migrating between providers:
 * - Source authorization model (AWS IAM, K8s RBAC, etc.)
 * - Target authorization model
 * - How many AIR rules were compiled for the target
 * - Coverage ratio (1.0 = fully translated, 0.8 = 80% coverage)
 * - Any rules that could not be translated (require manual action)
 *
 * INVARIANT: Authority must not be moved merely because data has moved.
 *            Authority is committed ONLY after the target is verified.
 */
export interface AuthorityTranslationRecord {
  sourceProvider:         string;   // e.g. 'LINUX_ACL'
  targetProvider:         string;   // e.g. 'AWS_IAM'
  sourceAuthorityDigest:  string;   // SHA-256 of source authority model snapshot
  targetAuthorityDigest:  string;   // SHA-256 of target authority model snapshot
  airRulesGenerated:      number;   // total AIR rules compiled for target provider
  airRulesAttached:       number;   // rules successfully applied to target
  untranslatableRules:    UntranslatableRule[];
  translationCoverage:    number;   // 0.0 to 1.0; 1.0 = full coverage
  verifiedAt:             string;   // ISO-8601
  verifiedBy:             string;   // Ugondu operation ID
}

export const UntranslatableRuleSchema = z.object({
  sourceRuleId:         z.string(),
  capability:           z.string(),
  reason:               z.string(),
  manualActionRequired: z.string(),
  blocksAutoCutover:    z.boolean(),
});

export const AuthorityTranslationRecordSchema = z.object({
  sourceProvider:         z.string(),
  targetProvider:         z.string(),
  sourceAuthorityDigest:  z.string(),
  targetAuthorityDigest:  z.string(),
  airRulesGenerated:      z.number().int().nonnegative(),
  airRulesAttached:       z.number().int().nonnegative(),
  untranslatableRules:    z.array(UntranslatableRuleSchema),
  translationCoverage:    z.number().min(0).max(1),
  verifiedAt:             z.string().datetime(),
  verifiedBy:             z.string(),
});

/** Check whether any untranslatable rule blocks auto-cutover. */
export function hasBlockingUntranslatableRules(
  record: AuthorityTranslationRecord
): boolean {
  return record.untranslatableRules.some((r) => r.blocksAutoCutover);
}

/** Check whether authority translation achieved full coverage. */
export function isFullyCovered(record: AuthorityTranslationRecord): boolean {
  return record.translationCoverage >= 1.0 && record.untranslatableRules.length === 0;
}
