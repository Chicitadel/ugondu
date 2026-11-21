/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : freshness-evaluator.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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

export enum FreshnessState {
    FRESH = 'FRESH',
    STALE = 'STALE',
    EXPIRED = 'EXPIRED'
}

/**
 * @class FreshnessEvaluator
 * @description Corporate Governed class implementation for FreshnessEvaluator
 * @classification ENTERPRISE
 */
export class FreshnessEvaluator {
    constructor(
        private staleThresholdMs: number,
        private expiredThresholdMs: number
    ) {}

    public evaluate(lastSeen: number, now: number): FreshnessState {
        const age = now - lastSeen;

        if (age >= this.expiredThresholdMs) {
            return FreshnessState.EXPIRED;
        }

        if (age >= this.staleThresholdMs) {
            return FreshnessState.STALE;
        }

        return FreshnessState.FRESH;
    }
}
