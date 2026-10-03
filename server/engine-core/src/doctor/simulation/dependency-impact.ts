/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Doctor / Simulation
 * File           : dependency-impact.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface DependencyImpactReport {
    blastRadius: 'MINIMAL' | 'MODERATE' | 'CRITICAL';
    impactedCount: number;
    affectedDependencies: string[];
}

export class DependencyImpact {
    public assess(deps: Array<{ id: string; critical?: boolean }>): DependencyImpactReport {
        const list = deps || [];
        const hasCritical = list.some(d => d.critical);
        return {
            blastRadius: hasCritical ? 'CRITICAL' : (list.length > 5 ? 'MODERATE' : 'MINIMAL'),
            impactedCount: list.length,
            affectedDependencies: list.map(d => d.id)
        };
    }
}
