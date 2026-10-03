/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : history-manager.ts
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

export interface HistoricalTwinState {
    timestamp: number;
    stateSnapshot: any;
}

/**
 * @class HistoryManager
 * @description Corporate Governed class implementation for HistoryManager
 * @classification ENTERPRISE
 */
export class HistoryManager {
    private history: HistoricalTwinState[] = [];

    public saveSnapshot(stateSnapshot: any, timestamp: number): void {
        this.history.push({ timestamp, stateSnapshot });
    }

    public getSnapshotAt(timestamp: number): HistoricalTwinState | null {
        // Find the closest snapshot that is <= timestamp
        let bestMatch: HistoricalTwinState | null = null;
        for (const record of this.history) {
            if (record.timestamp <= timestamp) {
                if (!bestMatch || record.timestamp > bestMatch.timestamp) {
                    bestMatch = record;
                }
            }
        }
        return bestMatch;
    }
}
