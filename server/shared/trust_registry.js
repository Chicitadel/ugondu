"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalTrustRegistry = exports.TrustRegistry = void 0;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const i18n_1 = require("./i18n");
const FORBIDDEN_KEY_LITERALS = new Set([
    'ci-test-key-not-for-production',
    'ci-key',
    'test-key',
    '<placeholder>',
    'placeholder',
    'changeme',
    'default'
]);
function isForbiddenLiteral(val) {
    if (!val)
        return false;
    const normalized = val.trim().toLowerCase();
    return (FORBIDDEN_KEY_LITERALS.has(normalized) ||
        normalized.includes('ci-test-key-not-for-production'));
}
class TrustRegistry {
    keys = new Map();
    constructor(initialKeys) {
        this.loadDefaultKeys();
        if (initialKeys) {
            for (const key of initialKeys) {
                this.registerKey(key);
            }
        }
    }
    loadDefaultKeys() {
        const candidates = [
            process.env.SHARED_KEYS_DIR,
            path.resolve(__dirname, '../keys'),
            path.resolve(__dirname, './keys'),
            path.resolve(__dirname, '../../shared/keys')
        ].filter(Boolean);
        let keysDir = '';
        for (const dir of candidates) {
            if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                keysDir = dir;
                break;
            }
        }
        // Formally revoked v1 key authorities (compromised in historical commits)
        const revokedKeys = [
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
            const mappings = [
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
                const privObj = (0, crypto_1.createPrivateKey)(normalizedPem);
                const pubObj = (0, crypto_1.createPublicKey)(privObj);
                const pubPem = pubObj.export({ type: 'spki', format: 'pem' });
                const keyId = 'key_' + (0, crypto_1.createHash)('sha256').update(pubPem).digest('hex').substring(0, 16);
                this.registerKey({
                    keyId,
                    algorithm: 'ed25519',
                    status: 'ACTIVE',
                    purpose: 'recipe',
                    publicKey: pubPem.trim(),
                    privateKey: normalizedPem.trim()
                });
            }
            catch {
                // Handled by KeyLoader at service bootstrap
            }
        }
        if (!isProduction && process.env.UGONDU_SERVICE_TEST_PUBKEY) {
            if (isForbiddenLiteral(process.env.UGONDU_SERVICE_TEST_PUBKEY)) {
                throw new Error((0, i18n_1.__t)('err_insecure_key_literal'));
            }
            const testKeyId = process.env.UGONDU_SERVICE_TEST_KEY_ID;
            if (!testKeyId)
                throw new Error((0, i18n_1.__t)('error_service_key_missing'));
            this.keys.set(testKeyId, {
                keyId: testKeyId,
                algorithm: 'ed25519',
                status: 'ACTIVE',
                purpose: 'service-identity',
                publicKey: process.env.UGONDU_SERVICE_TEST_PUBKEY
            });
        }
    }
    registerKey(key) {
        if (!key || !key.keyId || isForbiddenLiteral(key.publicKey) || isForbiddenLiteral(key.privateKey)) {
            throw new Error((0, i18n_1.__t)('err_insecure_key_literal'));
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
    rotateKey(previousKeyId, nextKey) {
        const previous = this.keys.get(previousKeyId);
        if (!previous) {
            throw new Error((0, i18n_1.__t)('error_key_not_found'));
        }
        if (previous.status === 'REVOKED') {
            throw new Error((0, i18n_1.__t)('error_key_revoked'));
        }
        previous.status = 'ROTATED';
        const rotatedEntry = {
            ...nextKey,
            purpose: previous.purpose,
            status: 'ACTIVE'
        };
        this.registerKey(rotatedEntry);
        return rotatedEntry;
    }
    revokeKey(keyId) {
        const target = this.keys.get(keyId);
        if (!target) {
            throw new Error((0, i18n_1.__t)('error_key_not_found'));
        }
        target.status = 'REVOKED';
    }
    getKey(keyId) {
        return this.keys.get(keyId);
    }
    getActiveKeyByPurpose(purpose) {
        let candidate;
        for (const key of this.keys.values()) {
            if (key.purpose === purpose && key.status === 'ACTIVE') {
                candidate = key;
            }
        }
        return candidate;
    }
    validateKeyStatus(keyId) {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error((0, i18n_1.__t)('error_key_not_found'));
        }
        if (key.status === 'REVOKED') {
            throw new Error((0, i18n_1.__t)('error_key_revoked'));
        }
        return true;
    }
    verifyPurpose(keyId, expectedPurpose) {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error((0, i18n_1.__t)('error_key_not_found'));
        }
        if (key.purpose !== expectedPurpose) {
            throw new Error((0, i18n_1.__t)('error_key_purpose_mismatch'));
        }
        return true;
    }
    getPublicKeyObject(keyId) {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error((0, i18n_1.__t)('error_key_not_found'));
        }
        return (0, crypto_1.createPublicKey)(key.publicKey);
    }
    getPrivateKeyObject(keyId) {
        const key = this.getKey(keyId);
        if (!key) {
            throw new Error((0, i18n_1.__t)('error_key_not_found'));
        }
        if (!key.privateKey) {
            throw new Error((0, i18n_1.__t)('error_private_key_missing'));
        }
        return (0, crypto_1.createPrivateKey)(key.privateKey);
    }
    getTrustRootAnchor() {
        const anchor = {};
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
exports.TrustRegistry = TrustRegistry;
exports.globalTrustRegistry = new TrustRegistry();
__exportStar(require("./sovereign/hsm"), exports);
__exportStar(require("./health-contract"), exports);
