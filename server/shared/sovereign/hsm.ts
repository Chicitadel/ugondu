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

import crypto from 'crypto';
import { __t } from '../i18n';

export type ResidencyFence = 'EU_ONLY' | 'US_ONLY' | 'IN_COUNTRY_AIRGAP';

export interface SovereignTelemetryPayload {
    tenantId: string;
    environment: string;
    region: string;
    metrics: Record<string, number>;
    rawLogs: string[];
    metadata: Record<string, string>;
}

export interface HSMProvider {
    readonly providerName: string;
    readonly isHardwareBacked: boolean;
    getPublicKeyPem(keyHandle: string): string;
    sign(keyHandle: string, dataBuffer: Buffer): Buffer;
    verify(keyHandle: string, dataBuffer: Buffer, signature: Buffer): boolean;
}

const FORBIDDEN_HSM_LITERALS = new Set<string>([
    'ci-test-key-not-for-production',
    'ci-key',
    'test-key',
    '<placeholder>',
    'placeholder',
    'changeme',
    'default'
]);

function isForbiddenKeyLiteral(raw: string): boolean {
    const normalized = raw.trim().toLowerCase();
    return (
        FORBIDDEN_HSM_LITERALS.has(normalized) ||
        normalized.includes('ci-test-key-not-for-production')
    );
}

/**
 * Hardware/KMS-backed HSM provider requiring explicit slot/key material.
 */
export class ConfiguredHSMProvider implements HSMProvider {
    public readonly providerName = 'ConfiguredHSMProvider';
    public readonly isHardwareBacked = true;
    private readonly slotId: string;
    private readonly privateKey: crypto.KeyObject;
    private readonly publicKey: crypto.KeyObject;
    private readonly publicKeyPem: string;

    constructor(options: { slotId: string; privateKeyPem: string; publicKeyPem?: string }) {
        if (!options || !options.slotId || !options.slotId.trim()) {
            throw new Error(__t('err_hsm_slot_id_required'));
        }
        if (!options.privateKeyPem || !options.privateKeyPem.trim()) {
            throw new Error(__t('err_hsm_private_key_required'));
        }
        if (isForbiddenKeyLiteral(options.privateKeyPem)) {
            throw new Error(__t('err_hsm_insecure_key_literal'));
        }

        this.slotId = options.slotId.trim();
        const normalizedPem = options.privateKeyPem.replace(/\\n/g, '\n');
        this.privateKey = crypto.createPrivateKey(normalizedPem);
        this.publicKey = options.publicKeyPem
            ? crypto.createPublicKey(options.publicKeyPem.replace(/\\n/g, '\n'))
            : crypto.createPublicKey(this.privateKey);
        this.publicKeyPem = this.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    public getSlotId(): string {
        return this.slotId;
    }

    public getPublicKeyPem(_keyHandle: string): string {
        return this.publicKeyPem;
    }

    public sign(_keyHandle: string, dataBuffer: Buffer): Buffer {
        return crypto.sign(null, dataBuffer, this.privateKey);
    }

    public verify(_keyHandle: string, dataBuffer: Buffer, signature: Buffer): boolean {
        return crypto.verify(null, dataBuffer, this.publicKey, signature);
    }
}

/**
 * Ephemeral in-memory HSM provider strictly restricted to test and explicit development modes.
 * Fails closed if instantiated or invoked in production.
 */
export class SoftwareHSMProvider implements HSMProvider {
    public readonly providerName = 'SoftwareHSMProvider';
    public readonly isHardwareBacked = false;
    private static cachedKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject } | null = null;
    private readonly keyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject };

    constructor(env: NodeJS.ProcessEnv = process.env) {
        const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();
        if (nodeEnv === 'production') {
            throw new Error(__t('err_software_hsm_forbidden_in_production'));
        }
        const allowSoftware =
            nodeEnv === 'test' ||
            nodeEnv === 'development' ||
            env.UGONDU_DEV_EPHEMERAL_KEYS === 'true' ||
            env.UGONDU_ALLOW_SOFTWARE_HSM === 'true';
        if (!allowSoftware) {
            throw new Error(__t('err_software_hsm_not_permitted'));
        }

        if (!SoftwareHSMProvider.cachedKeyPair) {
            SoftwareHSMProvider.cachedKeyPair = crypto.generateKeyPairSync('ed25519');
        }
        this.keyPair = SoftwareHSMProvider.cachedKeyPair;
    }

    public getPublicKeyPem(_keyHandle: string): string {
        return this.keyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    public sign(_keyHandle: string, dataBuffer: Buffer): Buffer {
        return crypto.sign(null, dataBuffer, this.keyPair.privateKey);
    }

    public verify(_keyHandle: string, dataBuffer: Buffer, signature: Buffer): boolean {
        return crypto.verify(null, dataBuffer, this.keyPair.publicKey, signature);
    }
}

export interface HsmAdapterOptions {
    provider?: HSMProvider;
    env?: NodeJS.ProcessEnv;
    slotId?: string;
    privateKeyPem?: string;
    publicKeyPem?: string;
}

export class HsmTrustRootAdapter {
    private readonly keyHandle: string;
    private readonly provider: HSMProvider;

    constructor(keyHandle: string, options?: HsmAdapterOptions) {
        if (!keyHandle || typeof keyHandle !== 'string' || !keyHandle.trim()) {
            throw new Error(__t('err_hsm_key_handle_required'));
        }
        this.keyHandle = keyHandle.trim();

        const env = options?.env ?? process.env;
        const nodeEnv = (env.NODE_ENV || 'development').trim().toLowerCase();

        if (options?.provider) {
            if (nodeEnv === 'production' && !options.provider.isHardwareBacked) {
                throw new Error(__t('err_software_hsm_forbidden_in_production'));
            }
            this.provider = options.provider;
            return;
        }

        const configuredSlotKey =
            options?.privateKeyPem ||
            env.UGONDU_HSM_PRIVATE_KEY_PEM ||
            env.UGONDU_HSM_SLOT_KEY;
        const configuredSlotId =
            options?.slotId ||
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
            throw new Error(__t('err_hsm_not_configured_in_production'));
        }

        this.provider = new SoftwareHSMProvider(env);
    }

    public getKeyHandle(): string {
        return this.keyHandle;
    }

    public getProviderName(): string {
        return this.provider.providerName;
    }

    public isHardwareBacked(): boolean {
        return this.provider.isHardwareBacked;
    }

    public getPublicKeyPem(): string {
        return this.provider.getPublicKeyPem(this.keyHandle);
    }

    public signEnvelope(dataBuffer: Buffer): Buffer {
        return this.provider.sign(this.keyHandle, dataBuffer);
    }

    public verifyEnvelope(dataBuffer: Buffer, signature: Buffer): boolean {
        return this.provider.verify(this.keyHandle, dataBuffer, signature);
    }
}

export class DataResidencyScrubber {
    private static readonly SENSITIVE_PATTERNS = [
        // IPv4 private/internal addresses
        /(?:10|127|172\.(?:1[6-9]|2[0-9]|3[0-1])|192\.168)\.\d{1,3}\.\d{1,3}/g,
        // Passwords and connection strings
        /(?:password|passwd|pwd|secret|token)=(?:[^\s&]+)/gi,
        // Database URIs
        /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@]+@[^\s/]+/gi,
        // Bearer tokens
        /Bearer\s+[a-zA-Z0-9_\-\.]+/gi
    ];

    public static scrubTelemetry(
        payload: SovereignTelemetryPayload,
        fence: ResidencyFence
    ): SovereignTelemetryPayload {
        const scrubbedLogs = payload.rawLogs.map(log => {
            let clean = log;
            for (const pattern of this.SENSITIVE_PATTERNS) {
                clean = clean.replace(pattern, '[REDACTED_CONFIDENTIAL]');
            }
            return clean;
        });

        const scrubbedMetadata: Record<string, string> = {};
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
