/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : key-registry.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

export interface KeyMetadata {
    keyId: string;
    algorithm: string;
    status: 'ACTIVE' | 'ROTATED' | 'COMPROMISED';
    createdAt: string;
    rotatedAt?: string;
}

export interface IKeyRegistry {
    registerKey(metadata: KeyMetadata): Promise<void>;
    getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
    updateStatus(keyId: string, status: 'ACTIVE' | 'ROTATED' | 'COMPROMISED'): Promise<void>;
}

export class InMemoryKeyRegistry implements IKeyRegistry {
    private store = new Map<string, KeyMetadata>();

    public async registerKey(metadata: KeyMetadata): Promise<void> {
        this.store.set(metadata.keyId, { ...metadata });
    }

    public async getKeyMetadata(keyId: string): Promise<KeyMetadata | null> {
        const meta = this.store.get(keyId);
        return meta ? { ...meta } : null;
    }

    public async updateStatus(keyId: string, status: 'ACTIVE' | 'ROTATED' | 'COMPROMISED'): Promise<void> {
        const meta = this.store.get(keyId);
        if (!meta) {
            throw new Error(`Key ${keyId} not found in registry`);
        }
        meta.status = status;
        if (status === 'ROTATED' || status === 'COMPROMISED') {
            meta.rotatedAt = new Date().toISOString();
        }
        this.store.set(keyId, meta);
    }
}
