/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : rpo.ts
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Team
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

import { RecoveryPoint } from './recovery-point';

export class RpoCalculator {
    public calculateActualRpoMetrics(history: RecoveryPoint[]): { currentRpoMs: number; maxRpoMs: number; averageRpoMs: number } {
        if (history.length < 2) {
            return { currentRpoMs: 0, maxRpoMs: 0, averageRpoMs: 0 };
        }

        const sorted = [...history].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        let maxRpoMs = 0;
        let totalRpoMs = 0;

        for (let i = 1; i < sorted.length; i++) {
            const diffMs = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
            if (diffMs > maxRpoMs) {
                maxRpoMs = diffMs;
            }
            totalRpoMs += diffMs;
        }

        const now = new Date().getTime();
        const currentRpoMs = now - sorted[sorted.length - 1].timestamp.getTime();

        return {
            currentRpoMs,
            maxRpoMs,
            averageRpoMs: totalRpoMs / (sorted.length - 1)
        };
    }
}
