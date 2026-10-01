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

// Implementation for freshness.rs
export interface FreshnessPolicy {
  maxAgeMs: number;
}

export class FreshnessValidator {
  constructor(private readonly policy: FreshnessPolicy) {}

  isStale(collectedAt: Date): boolean {
    return Date.now() - collectedAt.getTime() > this.policy.maxAgeMs;
  }

  assertFresh(collectedAt: Date, label: string): void {
    if (this.isStale(collectedAt)) {
      throw new Error(`Evidence '${label}' is stale: collected at ${collectedAt.toISOString()}`);
    }
  }
}
