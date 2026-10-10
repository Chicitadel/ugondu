/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant / Policy
 * File           : impact.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface PolicyChangeImpact {
    diffSummary: {
        addedRules: number;
        removedRules: number;
    };
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresApproval: boolean;
}

export class ImpactAnalysis {
    public analyzeChanges(oldPolicy: { rules?: unknown[] }, newPolicy: { rules?: unknown[] }): PolicyChangeImpact {
        const oldRules = oldPolicy?.rules || [];
        const newRules = newPolicy?.rules || [];
        const added = Math.max(0, newRules.length - oldRules.length);
        const removed = Math.max(0, oldRules.length - newRules.length);
        return {
            diffSummary: {
                addedRules: added,
                removedRules: removed
            },
            riskLevel: removed > 0 ? 'HIGH' : 'LOW',
            requiresApproval: removed > 0
        };
    }
}
