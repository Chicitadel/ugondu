/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Trust Registry
 * File           : trust_registry.ts
 * Version        : 1.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
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
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { KeyObject, createPublicKey, createPrivateKey } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { __t } from './i18n';

export type KeyStatus = 'ACTIVE' | 'ROTATED' | 'REVOKED';
export type KeyPurpose = 'recipe' | 'plugin' | 'language-pack' | 'service-identity';

export interface TrustKey {
    keyId: string;
    algorithm: 'ed25519';
    status: KeyStatus;
    purpose: KeyPurpose;
    publicKey: string; // PEM or base64 encoded
    privateKey?: string; // Optional for signing keys
}

export class TrustRegistry {
    private keys: Map<string, TrustKey> = new Map();

    constructor(initialKeys?: TrustKey[]) {
        this.loadDefaultKeys();
        if (initialKeys) {
            for (const key of initialKeys) {
                this.keys.set(key.keyId, key);
            }
        }
    }

    private loadDefaultKeys(): void {
        const candidates = [
            process.env.SHARED_KEYS_DIR,
            path.resolve(__dirname, '../keys'),
            path.resolve(__dirname, './keys'),
            path.resolve(__dirname, '../../shared/keys')
        ].filter(Boolean) as string[];

        let keysDir = '';
        for (const dir of candidates) {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                keysDir = dir;
                break;
            }
        }
        if (!keysDir) return;

        const mappings: Array<{ prefix: string; keyId: string; purpose: KeyPurpose }> = [
            { prefix: 'service_identity', keyId: 'key_service_v1', purpose: 'service-identity' },
            { prefix: 'recipe', keyId: 'key_recipe_v1', purpose: 'recipe' },
            { prefix: 'langpack', keyId: 'key_langpack_v1', purpose: 'language-pack' }
        ];

        for (const m of mappings) {
            const pubPath = path.join(keysDir, `${m.prefix}_public.pem`);
            const privPath = path.join(keysDir, `${m.prefix}_private.pem`);
            if (fs.existsSync(pubPath)) {
                const pubKey = fs.readFileSync(pubPath, 'utf-8').trim();
                const privKey = fs.existsSync(privPath) ? fs.readFileSync(privPath, 'utf-8').trim() : undefined;
                this.keys.set(m.keyId, {
                    keyId: m.keyId,
                    algorithm: 'ed25519',
                    status: 'ACTIVE',
                    purpose: m.purpose,
                    publicKey: pubKey,
                    privateKey: privKey
                });
            }
        }
    }

    public registerKey(key: TrustKey): void {
        this.keys.set(key.keyId, key);
    }

    public getKey(keyId: string): TrustKey | undefined {
        return this.keys.get(keyId);
    }

    public getActiveKeyByPurpose(purpose: KeyPurpose): TrustKey | undefined {
        for (const key of this.keys.values()) {
            if (key.purpose === purpose && key.status === 'ACTIVE') {
                return key;
            }
        }
        return undefined;
    }

    public validateKeyStatus(keyId: string): boolean {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error(__t('error_key_not_found'));
        }
        if (key.status === 'REVOKED') {
            throw new Error(__t('error_key_revoked'));
        }
        return true;
    }

    public verifyPurpose(keyId: string, expectedPurpose: KeyPurpose): boolean {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error(__t('error_key_not_found'));
        }
        if (key.purpose !== expectedPurpose) {
            throw new Error(__t('error_key_purpose_mismatch'));
        }
        return true;
    }

    public getPublicKeyObject(keyId: string): KeyObject {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error(__t('error_key_not_found'));
        }
        return createPublicKey(key.publicKey);
    }

    public getPrivateKeyObject(keyId: string): KeyObject {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error(__t('error_key_not_found'));
        }
        if (!key.privateKey) {
            throw new Error(__t('error_private_key_missing'));
        }
        return createPrivateKey(key.privateKey);
    }

    public getTrustRootAnchor(): any {
        // Compiled trust root anchor
        const anchor: any = {};
        for (const [keyId, key] of this.keys.entries()) {
            if (key.status !== 'REVOKED') {
                anchor[keyId] = {
                    algorithm: key.algorithm,
                    purpose: key.purpose,
                    status: key.status,
                    publicKey: key.publicKey
                };
            }
        }
        return anchor;
    }
}

export const globalTrustRegistry = new TrustRegistry();
