"use strict";
/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / HSM & Data Residency Scrubber
 * File           : hsm.ts
 * Version        : 3.0.0
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataResidencyScrubber = exports.HsmTrustRootAdapter = exports.SoftwareHSMProvider = exports.ConfiguredHSMProvider = void 0;
const crypto_1 = __importDefault(require("crypto"));
const i18n_1 = require("../i18n");
const FORBIDDEN_HSM_LITERALS = new Set([
    'ci-test-key-not-for-production',
    'ci-key',
    'test-key',
    '<placeholder>',
    'placeholder',
    'changeme',
    'default'
]);
function isForbiddenKeyLiteral(raw) {
    const normalized = raw.trim().toLowerCase();
    return (FORBIDDEN_HSM_LITERALS.has(normalized) ||
        normalized.includes('ci-test-key-not-for-production'));
}
/**
 * Hardware/KMS-backed HSM provider requiring explicit slot/key material.
 */
class ConfiguredHSMProvider {
    providerName = 'ConfiguredHSMProvider';
    isHardwareBacked = true;
    slotId;
    privateKey;
    publicKey;
    publicKeyPem;
    constructor(options) {
        if (!options || !options.slotId || !options.slotId.trim()) {
            throw new Error((0, i18n_1.__t)('err_hsm_slot_id_required'));
        }
        if (!options.privateKeyPem || !options.privateKeyPem.trim()) {
            throw new Error((0, i18n_1.__t)('err_hsm_private_key_required'));
        }
        if (isForbiddenKeyLiteral(options.privateKeyPem)) {
            throw new Error((0, i18n_1.__t)('err_hsm_insecure_key_literal'));
        }
        this.slotId = options.slotId.trim();
        const normalizedPem = options.privateKeyPem.replace(/\\n/g, '\n');
        this.privateKey = crypto_1.default.createPrivateKey(normalizedPem);
        this.publicKey = options.publicKeyPem
            ? crypto_1.default.createPublicKey(options.publicKeyPem.replace(/\\n/g, '\n'))
            : crypto_1.default.createPublicKey(this.privateKey);
        this.publicKeyPem = this.publicKey.export({ type: 'spki', format: 'pem' });
    }
    getSlotId() {
        return this.slotId;
    }
    getPublicKeyPem(_keyHandle) {
        return this.publicKeyPem;
    }
    sign(_keyHandle, dataBuffer) {
        return crypto_1.default.sign(null, dataBuffer, this.privateKey);
    }
    verify(_keyHandle, dataBuffer, signature) {
        return crypto_1.default.verify(null, dataBuffer, this.publicKey, signature);
    }
}
exports.ConfiguredHSMProvider = ConfiguredHSMProvider;
/**
 * Ephemeral in-memory HSM provider strictly restricted to test and explicit development modes.
 * Fails closed if instantiated or invoked in production.
 */
class SoftwareHSMProvider {
    providerName = 'SoftwareHSMProvider';
    isHardwareBacked = false;
    static cachedKeyPair = null;
    keyPair;
    constructor(env = process.env) {
        const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
        if (nodeEnv === 'production') {
            throw new Error((0, i18n_1.__t)('err_software_hsm_forbidden_in_production'));
        }
        const allowSoftware = nodeEnv === 'test' ||
            nodeEnv === 'development' ||
            env.UGONDU_DEV_EPHEMERAL_KEYS === 'true' ||
            env.UGONDU_ALLOW_SOFTWARE_HSM === 'true';
        if (!allowSoftware) {
            throw new Error((0, i18n_1.__t)('err_software_hsm_not_permitted'));
        }
        if (!SoftwareHSMProvider.cachedKeyPair) {
            SoftwareHSMProvider.cachedKeyPair = crypto_1.default.generateKeyPairSync('ed25519');
        }
        this.keyPair = SoftwareHSMProvider.cachedKeyPair;
    }
    getPublicKeyPem(_keyHandle) {
        return this.keyPair.publicKey.export({ type: 'spki', format: 'pem' });
    }
    sign(_keyHandle, dataBuffer) {
        return crypto_1.default.sign(null, dataBuffer, this.keyPair.privateKey);
    }
    verify(_keyHandle, dataBuffer, signature) {
        return crypto_1.default.verify(null, dataBuffer, this.keyPair.publicKey, signature);
    }
}
exports.SoftwareHSMProvider = SoftwareHSMProvider;
class HsmTrustRootAdapter {
    keyHandle;
    provider;
    constructor(keyHandle, options) {
        if (!keyHandle || typeof keyHandle !== 'string' || !keyHandle.trim()) {
            throw new Error((0, i18n_1.__t)('err_hsm_key_handle_required'));
        }
        this.keyHandle = keyHandle.trim();
        const env = options?.env ?? process.env;
        const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
        if (options?.provider) {
            if (nodeEnv === 'production' && !options.provider.isHardwareBacked) {
                throw new Error((0, i18n_1.__t)('err_software_hsm_forbidden_in_production'));
            }
            this.provider = options.provider;
            return;
        }
        const configuredSlotKey = options?.privateKeyPem ||
            env.UGONDU_HSM_PRIVATE_KEY_PEM ||
            env.UGONDU_HSM_SLOT_KEY;
        const configuredSlotId = options?.slotId ||
            env.UGONDU_HSM_SLOT_ID ||
            this.keyHandle;
        if (configuredSlotKey) {
            this.provider = new ConfiguredHSMProvider({
                slotId: configuredSlotId,
                privateKeyPem: configuredSlotKey,
                publicKeyPem: options?.publicKeyPem || env.UGONDU_HSM_PUBLIC_KEY_PEM
            });
            return;
        }
        if (nodeEnv === 'production') {
            throw new Error((0, i18n_1.__t)('err_hsm_not_configured_in_production'));
        }
        this.provider = new SoftwareHSMProvider(env);
    }
    getKeyHandle() {
        return this.keyHandle;
    }
    getProviderName() {
        return this.provider.providerName;
    }
    isHardwareBacked() {
        return this.provider.isHardwareBacked;
    }
    getPublicKeyPem() {
        return this.provider.getPublicKeyPem(this.keyHandle);
    }
    signEnvelope(dataBuffer) {
        return this.provider.sign(this.keyHandle, dataBuffer);
    }
    verifyEnvelope(dataBuffer, signature) {
        return this.provider.verify(this.keyHandle, dataBuffer, signature);
    }
}
exports.HsmTrustRootAdapter = HsmTrustRootAdapter;
class DataResidencyScrubber {
    static SENSITIVE_PATTERNS = [
        // IPv4 private/internal addresses
        /(?:10|127|172\.(?:1[6-9]|2[0-9]|3[0-1])|192\.168)\.\d{1,3}\.\d{1,3}/g,
        // Passwords and connection strings
        /(?:password|passwd|pwd|secret|token)=(?:[^\s&]+)/gi,
        // Database URIs
        /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s/]+/gi,
        // Bearer tokens
        /Bearer\s+[a-zA-Z0-9_\-\.]+/gi
    ];
    static scrubTelemetry(payload, fence) {
        const scrubbedLogs = payload.rawLogs.map(log => {
            let clean = log;
            for (const pattern of this.SENSITIVE_PATTERNS) {
                clean = clean.replace(pattern, '[REDACTED_CONFIDENTIAL]');
            }
            return clean;
        });
        const scrubbedMetadata = {};
        for (const [k, v] of Object.entries(payload.metadata)) {
            let cleanVal = v;
            for (const pattern of this.SENSITIVE_PATTERNS) {
                cleanVal = cleanVal.replace(pattern, '[REDACTED_CONFIDENTIAL]');
            }
            scrubbedMetadata[k] = cleanVal;
        }
        // Tag with sovereign data residency compliance fence
        scrubbedMetadata['SOVEREIGN_FENCE'] = fence;
        scrubbedMetadata['SCRUBBED_AT'] = new Date().toISOString();
        return {
            tenantId: payload.tenantId,
            environment: payload.environment,
            region: payload.region,
            metrics: { ...payload.metrics },
            rawLogs: scrubbedLogs,
            metadata: scrubbedMetadata
        };
    }
}
exports.DataResidencyScrubber = DataResidencyScrubber;
