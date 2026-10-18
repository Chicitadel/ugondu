/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Trust Registry
 * File           : trust_registry.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2 Type II
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { KeyObject, createPublicKey, createPrivateKey, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { __t } from './i18n';

export type KeyStatus = 'ACTIVE' | 'ROTATED' | 'REVOKED';
export type KeyPurpose = 'recipe' | 'plugin' | 'language-pack' | 'service-identity' | 'evidence';

export interface TrustKey {
    keyId: string;
    algorithm: 'ed25519';
    status: KeyStatus;
    purpose: KeyPurpose;
    publicKey: string; // PEM or base64 encoded
    privateKey?: string; // Optional for signing keys
}

const FORBIDDEN_KEY_LITERALS = new Set<string>([
    'ci-test-key-not-for-production',
    'ci-key',
    'test-key',
    '<placeholder>',
    'placeholder',
    'changeme',
    'default'
]);

function isForbiddenLiteral(val?: string): boolean {
    if (!val) return false;
    const normalized = val.trim().toLowerCase();
    return (
        FORBIDDEN_KEY_LITERALS.has(normalized) ||
        normalized.includes('ci-test-key-not-for-production')
    );
}

export class TrustRegistry {
    private keys: Map<string, TrustKey> = new Map();

    constructor(initialKeys?: TrustKey[]) {
        this.loadDefaultKeys();
        if (initialKeys) {
            for (const key of initialKeys) {
                this.registerKey(key);
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

        // Formally revoked v1 key authorities (compromised in historical commits)
        const revokedKeys: Array<{ keyId: string; purpose: KeyPurpose; publicKey: string }> = [
            { keyId: 'key_service_v1', purpose: 'service-identity', publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEArLNZN2cPQpTCYMgpl9SVSjgeyG2x92Q5xD1xHxaLZ5U=\n-----END PUBLIC KEY-----' },
            { keyId: 'key_recipe_v1', purpose: 'recipe', publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAW0l7OAZeUQZhMnk3etjBWeYiEJK0O5LCFWKiWhRBvQM=\n-----END PUBLIC KEY-----' },
            { keyId: 'key_langpack_v1', purpose: 'language-pack', publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAUz8IM99c7+M2Bwg9bWR9BSVRI/J6L5LGu3kZ2q9701M=\n-----END PUBLIC KEY-----' },
            { keyId: 'key_evidence_v1', purpose: 'evidence', publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAKxR2E/t1h9k8+eR1n8xM7tZfXhX6E7e0p5r7e9u8y1I=\n-----END PUBLIC KEY-----' },
            { keyId: 'key_plugin_v1', purpose: 'plugin', publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAS7VlIOyBTY0I+e7qHNPd7cuxF086dUGMkRExe1RsqG4=\n-----END PUBLIC KEY-----' }
        ];

        for (const k of revokedKeys) {
            this.keys.set(k.keyId, {
                keyId: k.keyId,
                algorithm: 'ed25519',
                status: 'REVOKED',
                purpose: k.purpose,
                publicKey: k.publicKey
            });
        }

        const isProduction = (process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

        if (keysDir) {
            const mappings: Array<{ prefix: string; keyId: string; purpose: KeyPurpose }> = [
                { prefix: 'service_identity', keyId: 'key_service_v2', purpose: 'service-identity' },
                { prefix: 'recipe', keyId: 'key_recipe_v2', purpose: 'recipe' },
                { prefix: 'langpack', keyId: 'key_langpack_v2', purpose: 'language-pack' },
                { prefix: 'evidence', keyId: 'key_evidence_v2', purpose: 'evidence' },
                { prefix: 'plugin', keyId: 'key_plugin_v2', purpose: 'plugin' }
            ];

            for (const m of mappings) {
                const pubPath = path.join(keysDir, `${m.prefix}_public.pem`);
                const privPath = path.join(keysDir, `${m.prefix}_private.pem`);
                if (fs.existsSync(pubPath)) {
                    const pubKey = fs.readFileSync(pubPath, 'utf-8').trim();
                    const privKey = !isProduction && fs.existsSync(privPath)
                        ? fs.readFileSync(privPath, 'utf-8').trim()
                        : undefined;
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

        // Synchronize explicit recipe signing key from environment if valid PEM is provided
        const envRecipeKey = process.env.UGONDU_RECIPE_PRIVATE_KEY || process.env.UGONDU_PRIVATE_KEY;
        if (envRecipeKey && !isForbiddenLiteral(envRecipeKey) && envRecipeKey.includes('PRIVATE KEY')) {
            try {
                const normalizedPem = envRecipeKey.replace(/\\n/g, '\n');
                const privObj = createPrivateKey(normalizedPem);
                const pubObj = createPublicKey(privObj);
                const pubPem = pubObj.export({ type: 'spki', format: 'pem' }) as string;
                const keyId = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);
                this.registerKey({
                    keyId,
                    algorithm: 'ed25519',
                    status: 'ACTIVE',
                    purpose: 'recipe',
                    publicKey: pubPem.trim(),
                    privateKey: normalizedPem.trim()
                });
            } catch {
                // Handled by KeyLoader at service bootstrap
            }
        }

        if (!isProduction && process.env.UGONDU_SERVICE_TEST_PUBKEY) {
            if (isForbiddenLiteral(process.env.UGONDU_SERVICE_TEST_PUBKEY)) {
                throw new Error(__t('err_insecure_key_literal'));
            }
            const testKeyId = process.env.UGONDU_SERVICE_TEST_KEY_ID;
            if (!testKeyId) throw new Error(__t('error_service_key_missing'));
            this.keys.set(testKeyId, {
                keyId: testKeyId,
                algorithm: 'ed25519',
                status: 'ACTIVE',
                purpose: 'service-identity',
                publicKey: process.env.UGONDU_SERVICE_TEST_PUBKEY
            });
        }
    }

    public registerKey(key: TrustKey): void {
        if (!key || !key.keyId || isForbiddenLiteral(key.publicKey) || isForbiddenLiteral(key.privateKey)) {
            throw new Error(__t('err_insecure_key_literal'));
        }
        if (key.status === 'ACTIVE') {
            for (const existing of this.keys.values()) {
                if (existing.purpose === key.purpose && existing.status === 'ACTIVE' && existing.keyId !== key.keyId) {
                    existing.status = 'ROTATED';
                }
            }
        }
        this.keys.set(key.keyId, { ...key });
    }

    public rotateKey(previousKeyId: string, nextKey: TrustKey): TrustKey {
        const previous = this.keys.get(previousKeyId);
        if (!previous) {
            throw new Error(__t('error_key_not_found'));
        }
        if (previous.status === 'REVOKED') {
            throw new Error(__t('error_key_revoked'));
        }
        previous.status = 'ROTATED';
        const rotatedEntry: TrustKey = {
            ...nextKey,
            purpose: previous.purpose,
            status: 'ACTIVE'
        };
        this.registerKey(rotatedEntry);
        return rotatedEntry;
    }

    public revokeKey(keyId: string): void {
        const target = this.keys.get(keyId);
        if (!target) {
            throw new Error(__t('error_key_not_found'));
        }
        target.status = 'REVOKED';
    }

    public getKey(keyId: string): TrustKey | undefined {
        return this.keys.get(keyId);
    }

    public getActiveKeyByPurpose(purpose: KeyPurpose): TrustKey | undefined {
        let candidate: TrustKey | undefined;
        for (const key of this.keys.values()) {
            if (key.purpose === purpose && key.status === 'ACTIVE') {
                candidate = key;
            }
        }
        return candidate;
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

    public getTrustRootAnchor(): Record<string, { algorithm: string; purpose: KeyPurpose; status: KeyStatus; publicKey: string }> {
        const anchor: Record<string, { algorithm: string; purpose: KeyPurpose; status: KeyStatus; publicKey: string }> = {};
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

export * from './sovereign/hsm';
export * from './health-contract';
