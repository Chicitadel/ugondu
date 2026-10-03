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

// @ts-ignore
import { __t } from '../../../../shared/i18n';

/**
 * @interface KeyMetadata
 * @description Corporate Governed interface implementation for KeyMetadata
 * @classification ENTERPRISE
 */
export interface KeyMetadata {
    keyId: string;
    algorithm: string;
    status: 'ACTIVE' | 'ROTATED' | 'COMPROMISED';
    createdAt: string;
    rotatedAt?: string;
}

/**
 * @interface IKeyRegistry
 * @description Corporate Governed interface implementation for IKeyRegistry
 * @classification ENTERPRISE
 */
export interface IKeyRegistry {
    registerKey(metadata: KeyMetadata): Promise<void>;
    getKeyMetadata(keyId: string): Promise<KeyMetadata | null>;
    updateStatus(keyId: string, status: 'ACTIVE' | 'ROTATED' | 'COMPROMISED'): Promise<void>;
}

/**
 * @class InMemoryKeyRegistry
 * @description Corporate Governed class implementation for InMemoryKeyRegistry
 * @classification ENTERPRISE
 */
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
            throw new Error(__t('messages.error.key_not_found_in_registry', { 'keyId': keyId }));
        }
        meta.status = status;
        if (status === 'ROTATED' || status === 'COMPROMISED') {
            meta.rotatedAt = new Date().toISOString();
        }
        this.store.set(keyId, meta);
    }
}
