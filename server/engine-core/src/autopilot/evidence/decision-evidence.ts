/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Evidence
 * File           : decision-evidence.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';

export interface EvidenceRecord {
    decisionId: string;
    timestamp: string;
    contextSnapshot: Record<string, unknown>;
    appliedPolicies: string[];
    cryptographicHash: string;
}

/**
 * @class DecisionEvidenceStore
 * @description Append-only store for autonomous decision audit evidence.
 * @classification ENTERPRISE
 */
export class DecisionEvidenceStore {
    private readonly records: Map<string, EvidenceRecord> = new Map();

    public storeEvidence(record: EvidenceRecord): void {
        if (!this.verifyHash(record)) {
            throw new Error('Evidence record fails cryptographic verification');
        }
        this.records.set(record.decisionId, record);
    }

    public getEvidence(decisionId: string): EvidenceRecord | undefined {
        return this.records.get(decisionId);
    }

    public verifyHash(record: EvidenceRecord): boolean {
        const payload = JSON.stringify({
            decisionId: record.decisionId,
            timestamp: record.timestamp,
            contextSnapshot: record.contextSnapshot,
            appliedPolicies: record.appliedPolicies
        });
        const expected = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
        return expected === record.cryptographicHash;
    }

    public count(): number {
        return this.records.size;
    }
}
