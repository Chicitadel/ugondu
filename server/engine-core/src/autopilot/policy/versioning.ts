/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Policy
 * File           : versioning.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface PolicyVersionEntry {
    version: string;
    definition: Record<string, unknown>;
    timestamp: number;
}

export class PolicyVersioning {
    private readonly versions: Map<string, PolicyVersionEntry[]> = new Map();

    public getActiveVersion(policyId: string): string {
        const history = this.versions.get(policyId);
        if (!history || history.length === 0) {
            return 'v1.0.0';
        }
        return history[history.length - 1].version;
    }

    public trackChanges(policyId: string, newDefinition: Record<string, unknown>): void {
        const history = this.versions.get(policyId) || [];
        const nextPatch = history.length + 1;
        const newVersion = `v1.0.${nextPatch}`;
        history.push({
            version: newVersion,
            definition: newDefinition,
            timestamp: Date.now()
        });
        this.versions.set(policyId, history);
    }

    public getHistory(policyId: string): PolicyVersionEntry[] {
        return this.versions.get(policyId) || [];
    }
}
