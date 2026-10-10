/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : revocation-registry.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

export interface RevocationRecord {
    passportId: string;
    revokedAt: string;
    reason: string;
    revokedBy: string;
}

/**
 * @interface IRevocationRegistry
 * @description Corporate Governed interface implementation for IRevocationRegistry
 * @classification ENTERPRISE
 */
export interface IRevocationRegistry {
    revoke(record: RevocationRecord): Promise<void>;
    isRevoked(passportId: string): Promise<boolean>;
    getRecord(passportId: string): Promise<RevocationRecord | null>;
}

/**
 * @class InMemoryRevocationRegistry
 * @description Corporate Governed class implementation for InMemoryRevocationRegistry
 * @classification ENTERPRISE
 */
export class InMemoryRevocationRegistry implements IRevocationRegistry {
    private store = new Map<string, RevocationRecord>();

    public async revoke(record: RevocationRecord): Promise<void> {
        this.store.set(record.passportId, { ...record });
    }

    public async isRevoked(passportId: string): Promise<boolean> {
        return this.store.has(passportId);
    }

    public async getRecord(passportId: string): Promise<RevocationRecord | null> {
        const record = this.store.get(passportId);
        return record ? { ...record } : null;
    }
}
