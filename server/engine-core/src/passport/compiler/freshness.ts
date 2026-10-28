/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : freshness.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
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
export interface FreshnessConfig {
    ttlMs: number;
}

/**
 * @class FreshnessValidator
 * @description Corporate Governed class implementation for FreshnessValidator
 * @classification ENTERPRISE
 */
export class FreshnessValidator {
    public static isFresh(timestamp: number, config: FreshnessConfig): boolean {
        const now = Date.now();
        return (now - timestamp) <= config.ttlMs;
    }

    public static validateCollection(timestamps: number[], config: FreshnessConfig): boolean {
        return timestamps.every(ts => this.isFresh(ts, config));
    }
}
