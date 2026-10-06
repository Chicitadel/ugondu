/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : revocation.ts
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

export class RevocationList {
    private readonly revokedCertificates: Map<string, number> = new Map();

    public revokeCertificate(certificateId: string, timestamp: number = Date.now()): void {
        if (!this.revokedCertificates.has(certificateId)) {
            this.revokedCertificates.set(certificateId, timestamp);
        }
    }

    public isRevoked(certificateId: string): boolean {
        return this.revokedCertificates.has(certificateId);
    }

    public getRevocationTime(certificateId: string): number | undefined {
        return this.revokedCertificates.get(certificateId);
    }

    public clearRevocations(): void {
        this.revokedCertificates.clear();
    }
}
