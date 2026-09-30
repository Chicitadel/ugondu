/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / HSM & Data Residency Scrubber
 * File           : hsm.ts
 * Version        : 2.0.0
 * Author         : Sovereign Security & Compliance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
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

export class HsmTrustRootAdapter {
    private keyHandle: string;
    private simulatedKeyPair: { publicKey: crypto.KeyObject; privateKey: crypto.KeyObject };

    constructor(keyHandle: string) {
        this.keyHandle = keyHandle;
        // In real deployment, interfaces with PKCS#11 / AWS CloudHSM / GCP Cloud KMS
        this.simulatedKeyPair = crypto.generateKeyPairSync('ed25519');
    }

    public getKeyHandle(): string {
        return this.keyHandle;
    }

    public getPublicKeyPem(): string {
        return this.simulatedKeyPair.publicKey.export({ type: 'spki', format: 'pem' }) as string;
    }

    public signEnvelope(dataBuffer: Buffer): Buffer {
        return crypto.sign(null, dataBuffer, this.simulatedKeyPair.privateKey);
    }

    public verifyEnvelope(dataBuffer: Buffer, signature: Buffer): boolean {
        return crypto.verify(null, dataBuffer, this.simulatedKeyPair.publicKey, signature);
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
