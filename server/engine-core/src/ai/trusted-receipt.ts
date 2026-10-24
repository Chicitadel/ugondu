/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Trusted Receipt Service
 * File           : trusted-receipt.ts
 * Version        : 3.3.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';

export const ALLOWLISTED_LIVE_ENDPOINT_HOST = 'ai.airroofers.eu';
export const ALLOWLISTED_LIVE_ENDPOINT_PROTOCOL = 'https:';

export class ProvenanceConfigurationError extends Error {
    public readonly errorCode: string;
    public readonly statusCode: number;
    public readonly details: Record<string, unknown>;

    constructor(
        errorCode: 'PROVENANCE_KEY_MISSING' | 'PROVENANCE_KEY_WEAK' | string,
        message: string,
        statusCode = 500,
        details: Record<string, unknown> = {}
    ) {
        super(message);
        this.name = 'ProvenanceConfigurationError';
        this.errorCode = errorCode;
        this.statusCode = statusCode;
        this.details = details;
    }
}

export function isWeakProvenanceKey(key: string): boolean {
    if (!key || typeof key !== 'string') return true;
    const trimmed = key.trim();
    if (trimmed.length < 32) return true;
    const lower = trimmed.toLowerCase();
    if (['password', 'admin', 'secret', 'changeme', 'default', '12345678901234567890123456789012'].includes(lower)) return true;
    if (/^(.)\1+$/.test(trimmed)) return true;
    return false;
}

export function getProvenanceSigningKey(explicitKey?: string): string {
    const isProd = process.env.NODE_ENV === 'production';
    if (explicitKey !== undefined && explicitKey !== null) {
        if (typeof explicitKey !== 'string' || !explicitKey.trim()) {
            throw new ProvenanceConfigurationError('PROVENANCE_KEY_MISSING', 'Explicit provenance signing key is empty', 500);
        }
        if (isWeakProvenanceKey(explicitKey)) {
            throw new ProvenanceConfigurationError('PROVENANCE_KEY_WEAK', 'Explicit provenance signing key is too weak (min 32 non-trivial characters required)', 500);
        }
        return explicitKey.trim();
    }

    const envKey = process.env.UGONDU_PROVENANCE_KEY;
    if (isProd) {
        if (!envKey || typeof envKey !== 'string' || !envKey.trim()) {
            throw new ProvenanceConfigurationError(
                'PROVENANCE_KEY_MISSING',
                'Mandatory production provenance signing key (UGONDU_PROVENANCE_KEY) is unconfigured',
                500
            );
        }
        if (isWeakProvenanceKey(envKey)) {
            throw new ProvenanceConfigurationError(
                'PROVENANCE_KEY_WEAK',
                'Production provenance signing key (UGONDU_PROVENANCE_KEY) is too weak',
                500
            );
        }
        return envKey.trim();
    }

    if (envKey && typeof envKey === 'string' && envKey.trim()) {
        return envKey.trim();
    }
    return 'ugondu_dev_ephemeral_provenance_key_0123456789abcdef0123456789abcdef';
}

export interface LiveInferenceReceipt {
    source: 'airroofers-live-transport';
    httpStatus: number;
    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED';
    candidateSha: string;
    modelId: string;
    endpointHost: string;
    providerRequestId?: string;
    responseDigestSha256: string;
    observedAt: string;
    signature?: string;
    provenanceSeal?: string;
    correlationId?: string;
    testOnly?: boolean;
}

export interface LiveInferenceReceiptParams {
    source: 'airroofers-live-transport' | string;
    httpStatus: number;
    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED' | string;
    candidateSha: string;
    modelId: string;
    endpointHost: string;
    providerRequestId?: string;
    correlationId?: string;
    responseDigestSha256: string;
    observedAt: string;
    testOnly?: boolean;
    output?: string;
}

export function computeProvenanceSeal(
    params: {
        candidateSha: string;
        modelId: string;
        endpointHost: string;
        providerRequestId?: string;
        correlationId?: string;
        responseDigestSha256: string;
        [key: string]: unknown;
    },
    signerKey?: string
): string {
    const key = getProvenanceSigningKey(signerKey);
    if (!params.candidateSha || typeof params.candidateSha !== 'string' || !params.candidateSha.trim()) {
        throw new Error('candidateSha is required to compute provenance seal');
    }
    if (!params.modelId || typeof params.modelId !== 'string' || !params.modelId.trim()) {
        throw new Error('modelId is required to compute provenance seal');
    }
    if (!params.endpointHost || typeof params.endpointHost !== 'string' || params.endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST) {
        throw new Error(`endpointHost strictly requires '${ALLOWLISTED_LIVE_ENDPOINT_HOST}'`);
    }
    const providerRequestId = (params.providerRequestId || params.correlationId || '').trim();
    if (!providerRequestId) {
        throw new Error('providerRequestId is required to compute provenance seal');
    }
    if (!params.responseDigestSha256 || typeof params.responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(params.responseDigestSha256)) {
        throw new Error('responseDigestSha256 must be a 64-hex SHA-256 digest');
    }

    const canonical = [
        params.candidateSha.trim(),
        params.modelId.trim(),
        params.endpointHost.trim().toLowerCase(),
        providerRequestId,
        params.responseDigestSha256.trim().toLowerCase(),
    ].join(':');

    return crypto.createHmac('sha256', key).update(canonical).digest('hex');
}

export function isTrustedLiveInferenceReceipt(
    receipt: unknown,
    secretSignerOrKey?: string
): receipt is LiveInferenceReceipt {
    if (!receipt || typeof receipt !== 'object') return false;
    const r = receipt as Partial<LiveInferenceReceipt>;
    if (process.env.NODE_ENV === 'production' && r.testOnly === true) return false;

    const sig = r.signature || r.provenanceSeal;
    if (typeof sig !== 'string' || !/^[0-9a-f]{64}$/i.test(sig)) return false;

    const candidateSha = r.candidateSha;
    const modelId = r.modelId;
    const endpointHost = r.endpointHost;
    const providerRequestId = r.providerRequestId || r.correlationId;
    const responseDigestSha256 = r.responseDigestSha256;

    if (
        !candidateSha || typeof candidateSha !== 'string' ||
        !modelId || typeof modelId !== 'string' ||
        !endpointHost || typeof endpointHost !== 'string' || endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST ||
        !providerRequestId || typeof providerRequestId !== 'string' || !providerRequestId.trim() ||
        !responseDigestSha256 || typeof responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(responseDigestSha256)
    ) {
        return false;
    }

    try {
        const expectedSeal = computeProvenanceSeal({
            candidateSha,
            modelId,
            endpointHost,
            providerRequestId,
            responseDigestSha256,
        }, secretSignerOrKey);

        const sigBuf = Buffer.from(sig.toLowerCase(), 'hex');
        const expBuf = Buffer.from(expectedSeal.toLowerCase(), 'hex');
        if (sigBuf.length !== expBuf.length || sigBuf.length !== 32) return false;
        return crypto.timingSafeEqual(sigBuf, expBuf);
    } catch (err) {
        if (err instanceof ProvenanceConfigurationError) throw err;
        return false;
    }
}

export function validateLiveInferenceReceipt(
    receipt: unknown,
    expectedModelId?: string,
    expectedCandidateSha?: string,
    secretSignerOrKey?: string
): receipt is LiveInferenceReceipt {
    if (!receipt || typeof receipt !== 'object') return false;
    const r = receipt as Partial<LiveInferenceReceipt>;

    if (r.source !== 'airroofers-live-transport') return false;
    if (r.httpStatus !== 200) return false;
    if (r.verification !== 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED') return false;

    if (!r.endpointHost || typeof r.endpointHost !== 'string' || r.endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST) {
        return false;
    }

    if (!r.candidateSha || typeof r.candidateSha !== 'string' || !r.candidateSha.trim()) return false;
    if (expectedCandidateSha && r.candidateSha !== expectedCandidateSha) return false;

    if (!r.modelId || typeof r.modelId !== 'string' || !r.modelId.trim()) return false;
    if (expectedModelId && r.modelId !== expectedModelId) return false;

    const providerRequestId = (r.providerRequestId || r.correlationId || '').trim();
    if (!providerRequestId) return false;
    if (r.providerRequestId !== undefined && (!r.providerRequestId || typeof r.providerRequestId !== 'string' || !r.providerRequestId.trim())) {
        return false;
    }

    if (!r.responseDigestSha256 || typeof r.responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(r.responseDigestSha256)) {
        return false;
    }

    if (!r.observedAt || typeof r.observedAt !== 'string' || !r.observedAt.trim()) return false;

    if (process.env.NODE_ENV === 'production') {
        if (r.testOnly === true) return false;
        if (!isTrustedLiveInferenceReceipt(r, secretSignerOrKey)) return false;
    } else {
        const sig = r.signature || r.provenanceSeal;
        if (sig && !isTrustedLiveInferenceReceipt(r, secretSignerOrKey)) return false;
    }

    return true;
}

export function createTrustedLiveInferenceReceipt(
    params: LiveInferenceReceiptParams,
    secretSignerOrKey?: string
): LiveInferenceReceipt {
    if (!params || typeof params !== 'object') {
        throw new Error('Receipt parameters must be a valid object');
    }
    if (params.source !== 'airroofers-live-transport') {
        throw new Error(`Invalid receipt source: expected 'airroofers-live-transport', got '${params.source}'`);
    }
    if (params.httpStatus !== 200) {
        throw new Error(`Invalid HTTP status: expected 200, got ${params.httpStatus}`);
    }
    if (params.verification !== 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED') {
        throw new Error(`Invalid verification marker: ${params.verification}`);
    }
    if (!params.endpointHost || params.endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST) {
        throw new Error(`Disallowed endpoint host '${params.endpointHost}': strictly requires '${ALLOWLISTED_LIVE_ENDPOINT_HOST}'`);
    }
    if (!params.candidateSha || typeof params.candidateSha !== 'string' || !params.candidateSha.trim()) {
        throw new Error('Receipt requires non-empty candidateSha');
    }
    if (!params.modelId || typeof params.modelId !== 'string' || !params.modelId.trim()) {
        throw new Error('Receipt requires non-empty modelId');
    }
    const providerRequestId = (params.providerRequestId || params.correlationId || '').trim();
    if (!providerRequestId) {
        throw new Error('Receipt requires non-empty providerRequestId');
    }
    if (!params.responseDigestSha256 || typeof params.responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(params.responseDigestSha256)) {
        throw new Error('Receipt requires valid 64-hex SHA-256 responseDigestSha256');
    }
    if (!params.observedAt || typeof params.observedAt !== 'string' || !params.observedAt.trim()) {
        throw new Error('Receipt requires non-empty observedAt');
    }
    if (process.env.NODE_ENV === 'production' && params.testOnly === true) {
        throw new Error('testOnly mock receipt cannot be activated in production');
    }

    const seal = computeProvenanceSeal({
        candidateSha: params.candidateSha.trim(),
        modelId: params.modelId.trim(),
        endpointHost: ALLOWLISTED_LIVE_ENDPOINT_HOST,
        providerRequestId,
        responseDigestSha256: params.responseDigestSha256.trim().toLowerCase(),
    }, secretSignerOrKey);

    const receipt: LiveInferenceReceipt = {
        source: 'airroofers-live-transport',
        httpStatus: 200,
        verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
        candidateSha: params.candidateSha.trim(),
        modelId: params.modelId.trim(),
        endpointHost: ALLOWLISTED_LIVE_ENDPOINT_HOST,
        providerRequestId,
        responseDigestSha256: params.responseDigestSha256.trim().toLowerCase(),
        observedAt: params.observedAt.trim(),
        signature: seal,
        provenanceSeal: seal,
        correlationId: params.correlationId ? params.correlationId.trim() : providerRequestId,
        ...(params.testOnly ? { testOnly: true } : {}),
    };

    return Object.freeze(receipt);
}

export class TrustedReceiptService {
    public static createReceipt(params: LiveInferenceReceiptParams, secretSignerOrKey?: string): LiveInferenceReceipt {
        return createTrustedLiveInferenceReceipt(params, secretSignerOrKey);
    }
    public static validateReceipt(receipt: unknown, expectedModelId?: string, expectedCandidateSha?: string, secretSignerOrKey?: string): receipt is LiveInferenceReceipt {
        return validateLiveInferenceReceipt(receipt, expectedModelId, expectedCandidateSha, secretSignerOrKey);
    }
    public static isTrustedReceipt(receipt: unknown, secretSignerOrKey?: string): boolean {
        return isTrustedLiveInferenceReceipt(receipt, secretSignerOrKey);
    }
}
