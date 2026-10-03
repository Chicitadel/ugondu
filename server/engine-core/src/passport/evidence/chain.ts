/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : chain.ts
 * Version        : 1.0.0
 * Author         : Antigravity Autonomous Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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
import { generateDigest } from './digest';

/**
 * @interface EvidenceLink
 * @description Corporate Governed interface implementation for EvidenceLink
 * @classification ENTERPRISE
 */
export interface EvidenceLink {
    evidenceId: string;
    type: string;
    payload: any;
    timestamp: number;
    previousHash: string | null;
    hash: string;
}

/**
 * @class EvidenceChain
 * @description Corporate Governed class implementation for EvidenceChain
 * @classification ENTERPRISE
 */
export class EvidenceChain {
    private links: EvidenceLink[] = [];

    public append(evidenceId: string, type: string, payload: any): EvidenceLink {
        const previousHash = this.links.length > 0 ? this.links[this.links.length - 1].hash : null;
        const timestamp = Date.now();
        const dataToHash = JSON.stringify({ evidenceId, type, payload, timestamp, previousHash });
        const hash = generateDigest(dataToHash);
        
        const link: EvidenceLink = { evidenceId, type, payload, timestamp, previousHash, hash };
        this.links.push(link);
        return link;
    }

    public verify(): boolean {
        for (let i = 0; i < this.links.length; i++) {
            const link = this.links[i];
            const expectedPreviousHash = i > 0 ? this.links[i - 1].hash : null;
            if (link.previousHash !== expectedPreviousHash) return false;
            
            const dataToHash = JSON.stringify({
                evidenceId: link.evidenceId,
                type: link.type,
                payload: link.payload,
                timestamp: link.timestamp,
                previousHash: link.previousHash
            });
            const hash = generateDigest(dataToHash);
            if (hash !== link.hash) return false;
        }
        return true;
    }

    public getChain(): EvidenceLink[] {
        return [...this.links];
    }
}
