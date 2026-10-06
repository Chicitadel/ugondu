/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : passport.ts
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

import { Evidence } from './collector';
import { EvidenceIntegrity } from './integrity';

export class EvidencePassport {
    private readonly evidences: Evidence[] = [];
    private readonly integrityChecker = new EvidenceIntegrity();

    public addEvidence(evidence: Evidence): void {
        if (!this.integrityChecker.verifyEvidence(evidence)) {
            throw new Error('Evidence integrity check failed.');
        }
        this.evidences.push(evidence);
    }

    public getEvidences(): ReadonlyArray<Evidence> {
        return this.evidences;
    }

    public generatePassportHash(): string {
        return this.integrityChecker.calculateBatchHash(this.evidences);
    }
}
