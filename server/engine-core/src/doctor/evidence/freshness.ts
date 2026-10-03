/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::evidence
 * File           : freshness.rs
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Human Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';

// Implementation for freshness.rs
/**
 * @interface FreshnessPolicy
 * @description Corporate Governed interface implementation for FreshnessPolicy
 * @classification ENTERPRISE
 */
export interface FreshnessPolicy {
  maxAgeMs: number;
}

/**
 * @class FreshnessValidator
 * @description Corporate Governed class implementation for FreshnessValidator
 * @classification ENTERPRISE
 */
export class FreshnessValidator {
  constructor(private readonly policy: FreshnessPolicy) {}

  isStale(collectedAt: Date): boolean {
    return Date.now() - collectedAt.getTime() > this.policy.maxAgeMs;
  }

  assertFresh(collectedAt: Date, label: string): void {
    if (this.isStale(collectedAt)) {
      throw new Error(__t('messages.error.evidence_is_stale_collected_at', { 'label': label, 'collectedAt_toISOString__': collectedAt.toISOString() }));
    }
  }
}
