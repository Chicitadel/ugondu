/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : canonicalizer.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

export class Canonicalizer {
    /**
     * Recursively sorts object keys and returns a deterministic JSON string.
     */
    public canonicalize(payload: unknown): string {
        if (payload === null || typeof payload !== 'object') {
            return JSON.stringify(payload);
        }

        if (Array.isArray(payload)) {
            const arr = payload.map(item => JSON.parse(this.canonicalize(item)));
            return JSON.stringify(arr);
        }

        const keys = Object.keys(payload as Record<string, unknown>).sort();
        const sortedObj: Record<string, unknown> = {};
        for (const key of keys) {
            const val = (payload as Record<string, unknown>)[key];
            if (val !== undefined) {
                sortedObj[key] = JSON.parse(this.canonicalize(val));
            }
        }
        return JSON.stringify(sortedObj);
    }
}
