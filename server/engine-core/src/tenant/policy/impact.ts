/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant / Policy
 * File           : impact.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-26
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import canonicalize from 'canonicalize';

export interface PolicyChangeImpact {
    diffSummary: {
        addedRules: number;
        removedRules: number;
    };
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    requiresApproval: boolean;
}

function canonicalRuleKey(rule: unknown): string | undefined {
    try {
        const result = canonicalize(rule as never);
        return typeof result === 'string' ? result : undefined;
    } catch {
        return undefined;
    }
}

export class ImpactAnalysis {
    public analyzeChanges(oldPolicy: { rules?: unknown[] }, newPolicy: { rules?: unknown[] }): PolicyChangeImpact {
        const oldRules = Array.isArray(oldPolicy?.rules) ? oldPolicy.rules : [];
        const newRules = Array.isArray(newPolicy?.rules) ? newPolicy.rules : [];
        const oldKeys = oldRules.map(canonicalRuleKey);
        const newKeys = newRules.map(canonicalRuleKey);

        // Invalid policy values cannot receive a low-risk classification. Count
        // both sides conservatively and require approval for human review.
        if (oldKeys.some((key) => key === undefined) || newKeys.some((key) => key === undefined)) {
            return {
                diffSummary: { addedRules: newRules.length, removedRules: oldRules.length },
                riskLevel: 'HIGH',
                requiresApproval: true,
            };
        }

        const oldCounts = this.countKeys(oldKeys as string[]);
        const newCounts = this.countKeys(newKeys as string[]);
        let added = 0;
        let removed = 0;

        for (const [key, count] of newCounts) {
            added += Math.max(0, count - (oldCounts.get(key) ?? 0));
        }
        for (const [key, count] of oldCounts) {
            removed += Math.max(0, count - (newCounts.get(key) ?? 0));
        }

        return {
            diffSummary: { addedRules: added, removedRules: removed },
            riskLevel: removed > 0 ? 'HIGH' : added > 0 ? 'MEDIUM' : 'LOW',
            requiresApproval: added > 0 || removed > 0,
        };
    }

    private countKeys(keys: string[]): Map<string, number> {
        const counts = new Map<string, number>();
        for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
        return counts;
    }
}
