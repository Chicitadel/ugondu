/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : rto.ts
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

export interface IncidentHistory {
    incidentId: string;
    detectionTimestamp: Date;
    recoveryCompletionTimestamp: Date | null;
}

/**
 * @class RtoCalculator
 * @description Corporate Governed class implementation for RtoCalculator
 * @classification ENTERPRISE
 */
export class RtoCalculator {
    public calculateElapsedRto(incident: IncidentHistory): number {
        const end = incident.recoveryCompletionTimestamp ? incident.recoveryCompletionTimestamp.getTime() : new Date().getTime();
        return end - incident.detectionTimestamp.getTime();
    }

    public calculateAggregateRto(incidents: IncidentHistory[]): { averageRtoMs: number; maxRtoMs: number } {
        const completedIncidents = incidents.filter(i => i.recoveryCompletionTimestamp !== null);
        if (completedIncidents.length === 0) {
            return { averageRtoMs: 0, maxRtoMs: 0 };
        }

        let maxRtoMs = 0;
        let totalRtoMs = 0;

        for (const incident of completedIncidents) {
            const rto = incident.recoveryCompletionTimestamp!.getTime() - incident.detectionTimestamp.getTime();
            if (rto > maxRtoMs) {
                maxRtoMs = rto;
            }
            totalRtoMs += rto;
        }

        return {
            averageRtoMs: totalRtoMs / completedIncidents.length,
            maxRtoMs
        };
    }
}
