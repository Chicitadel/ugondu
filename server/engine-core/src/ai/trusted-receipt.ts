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

/**
 * Approved immutable anti-SSRF security boundary invariant protocol established by
 * Air Roofers SASU Corporate Governance. Outbound live AI inference transports are
 * strictly restricted to encrypted HTTPS transport.
 */
export const ALLOWLISTED_LIVE_ENDPOINT_PROTOCOL = 'https:';

/**
 * Strict domain pattern validation regex for corporate governed host overrides.
 * Enforces fully qualified domain names with valid top-level domains.
 * Strictly disallows IP addresses, localhost, ports, protocols, userinfo, and directory paths.
 */
export const GOVERNED_ENDPOINT_HOST_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;

/**
 * Resolves the approved immutable anti-SSRF AI endpoint host.
 * Defaults to the Corporate Governance approved immutable host ('ai.airroofers.eu').
 * Supports optional validated override via governed environment variable `UGONDU_AI_ENDPOINT_HOST`.
 * If `UGONDU_AI_ENDPOINT_HOST` is provided, it is strictly validated against corporate domain patterns
 * and security constraints; if invalid or unconfigured, it safely falls back to 'ai.airroofers.eu'.
 *
 * @param envHost Optional host override candidate (defaults to process.env.UGONDU_AI_ENDPOINT_HOST)
 * @returns Approved endpoint host string
 */
export function resolveGovernedAiEndpointHost(envHost: string | undefined = process.env.UGONDU_AI_ENDPOINT_HOST): string {
    if (typeof envHost === 'string') {
        const candidate = envHost.trim().toLowerCase();
        if (
            candidate.length > 0 &&
            GOVERNED_ENDPOINT_HOST_REGEX.test(candidate) &&
            !/^(localhost|127\.|0\.|169\.254\.|10\.|192\.168\.|172\.(?:1[6-9]|2[0-9]|3[0-1])\.)/i.test(candidate)
        ) {
            return candidate;
        }
    }
    return 'ai.airroofers.eu';
}

/**
 * Validates whether a candidate hostname satisfies approved anti-SSRF host invariants.
 *
 * @param host Host string to evaluate
 * @returns boolean true if hostname is approved
 */
export function isGovernedEndpointHost(host: string): boolean {
    if (!host || typeof host !== 'string') return false;
    const normalized = host.trim().toLowerCase();
    const current = resolveGovernedAiEndpointHost();
    return normalized === ALLOWLISTED_LIVE_ENDPOINT_HOST || normalized === current || normalized === 'ai.airroofers.eu';
}

/**
 * Approved immutable anti-SSRF security boundary invariant host established by
 * Air Roofers SASU Corporate Governance. Live AI inference transports are strictly
 * restricted to this approved sovereign endpoint.
 * Supports optional validated override via governed environment variable `UGONDU_AI_ENDPOINT_HOST`
 * with strict domain pattern validation or fallback to 'ai.airroofers.eu'.
 */
export const ALLOWLISTED_LIVE_ENDPOINT_HOST: string = resolveGovernedAiEndpointHost();
export const DEV_KEY_ID = 'dev-key-local-only';
export const DEV_FALLBACK_KEY = 'ugondu_dev_ephemeral_provenance_key_0123456789abcdef0123456789abcdef';

export class ProvenanceConfigurationError extends Error {
    public readonly errorCode: string;
    public readonly statusCode: number;
    public readonly details: Record<string, unknown>;

    constructor(
        errorCode: 'PROVENANCE_KEY_MISSING' | 'PROVENANCE_KEY_WEAK' | 'DEV_KEY_PROHIBITED_IN_PRODUCTION' | string,
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

export interface ProvenanceKeyInfo {
    key: string;
    keyId: string;
    isDevFallback: boolean;
}

export function getProvenanceSigningKeyInfo(explicitKey?: string): ProvenanceKeyInfo {
    const isProd = process.env.NODE_ENV === 'production';
    if (explicitKey !== undefined && explicitKey !== null) {
        if (typeof explicitKey !== 'string' || !explicitKey.trim()) {
            throw new ProvenanceConfigurationError('PROVENANCE_KEY_MISSING', 'Explicit provenance signing key is empty', 500);
        }
        if (isWeakProvenanceKey(explicitKey)) {
            throw new ProvenanceConfigurationError('PROVENANCE_KEY_WEAK', 'Explicit provenance signing key is too weak (min 32 non-trivial characters required)', 500);
        }
        const trimmed = explicitKey.trim();
        const isDev = trimmed === DEV_FALLBACK_KEY;
        return { key: trimmed, keyId: isDev ? DEV_KEY_ID : 'configured-explicit-key', isDevFallback: isDev };
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
        const trimmed = envKey.trim();
        if (trimmed === DEV_FALLBACK_KEY) {
            throw new ProvenanceConfigurationError(
                'DEV_KEY_PROHIBITED_IN_PRODUCTION',
                'Development fallback key is strictly prohibited in production',
                403
            );
        }
        return { key: trimmed, keyId: 'ugondu-prod-provenance-key', isDevFallback: false };
    }

    if (envKey && typeof envKey === 'string' && envKey.trim()) {
        const trimmed = envKey.trim();
        const isDev = trimmed === DEV_FALLBACK_KEY;
        return { key: trimmed, keyId: isDev ? DEV_KEY_ID : 'ugondu-env-provenance-key', isDevFallback: isDev };
    }

    return { key: DEV_FALLBACK_KEY, keyId: DEV_KEY_ID, isDevFallback: true };
}

export function getProvenanceSigningKey(explicitKey?: string): string {
    return getProvenanceSigningKeyInfo(explicitKey).key;
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
    keyId?: string;
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
    keyId?: string;
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
    if (!params.endpointHost || typeof params.endpointHost !== 'string' || !isGovernedEndpointHost(params.endpointHost)) {
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
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd) {
        if (r.keyId === DEV_KEY_ID) {
            throw new ProvenanceConfigurationError(
                'DEV_KEY_PROHIBITED_IN_PRODUCTION',
                'Development fallback key is strictly prohibited in production verification',
                403
            );
        }
        if (r.testOnly === true) return false;
    }

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
        !endpointHost || typeof endpointHost !== 'string' || !isGovernedEndpointHost(endpointHost) ||
        !providerRequestId || typeof providerRequestId !== 'string' || !providerRequestId.trim() ||
        !responseDigestSha256 || typeof responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(responseDigestSha256)
    ) {
        return false;
    }

    const sigBuf = Buffer.from(sig.toLowerCase(), 'hex');
    if (sigBuf.length !== 32) return false;

    if (isProd) {
        try {
            const devSeal = computeProvenanceSeal({
                candidateSha,
                modelId,
                endpointHost,
                providerRequestId,
                responseDigestSha256,
            }, DEV_FALLBACK_KEY);
            const devBuf = Buffer.from(devSeal.toLowerCase(), 'hex');
            if (devBuf.length === 32 && crypto.timingSafeEqual(sigBuf, devBuf)) {
                throw new ProvenanceConfigurationError(
                    'DEV_KEY_PROHIBITED_IN_PRODUCTION',
                    'Receipt signed with development fallback key is strictly prohibited in production verification',
                    403
                );
            }
        } catch (err) {
            if (err instanceof ProvenanceConfigurationError) throw err;
        }
    }

    try {
        const expectedSeal = computeProvenanceSeal({
            candidateSha,
            modelId,
            endpointHost,
            providerRequestId,
            responseDigestSha256,
        }, secretSignerOrKey);

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
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && r.keyId === DEV_KEY_ID) {
        throw new ProvenanceConfigurationError(
            'DEV_KEY_PROHIBITED_IN_PRODUCTION',
            'Development fallback key is strictly prohibited in production verification',
            403
        );
    }

    if (r.source !== 'airroofers-live-transport') return false;
    if (r.httpStatus !== 200) return false;
    if (r.verification !== 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED') return false;

    if (!r.endpointHost || typeof r.endpointHost !== 'string' || !isGovernedEndpointHost(r.endpointHost)) {
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

    if (isProd) {
        if (r.testOnly === true) return false;
        if (!isTrustedLiveInferenceReceipt(r, secretSignerOrKey)) return false;
    } else {
        const sig = r.signature || r.provenanceSeal;
        if (sig && !isTrustedLiveInferenceReceipt(r, secretSignerOrKey)) return false;
    }

    return true;
}

export function verifyEvidenceIntegrity(
    receipt: unknown,
    expectedModelId?: string,
    expectedCandidateSha?: string,
    secretSignerOrKey?: string
): receipt is LiveInferenceReceipt {
    return validateLiveInferenceReceipt(receipt, expectedModelId, expectedCandidateSha, secretSignerOrKey);
}

export function createTrustedLiveInferenceReceipt(
    params: LiveInferenceReceiptParams,
    secretSignerOrKey?: string
): LiveInferenceReceipt {
    if (!params || typeof params !== 'object') {
        throw new Error('Receipt parameters must be a valid object');
    }
    const keyInfo = getProvenanceSigningKeyInfo(secretSignerOrKey);
    const isDevFallback = keyInfo.isDevFallback || params.keyId === DEV_KEY_ID || secretSignerOrKey === DEV_FALLBACK_KEY;
    const isProd = process.env.NODE_ENV === 'production';

    if (isProd && isDevFallback) {
        throw new ProvenanceConfigurationError('DEV_KEY_PROHIBITED_IN_PRODUCTION', 'Development fallback key cannot mint receipts in production', 403);
    }
    if (isProd && params.testOnly === true) {
        throw new Error('testOnly mock receipt cannot be activated in production');
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
    if (!params.endpointHost || !isGovernedEndpointHost(params.endpointHost)) {
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

    const effectiveEndpointHost = params.endpointHost.trim().toLowerCase();
    const seal = computeProvenanceSeal({
        candidateSha: params.candidateSha.trim(),
        modelId: params.modelId.trim(),
        endpointHost: effectiveEndpointHost,
        providerRequestId,
        responseDigestSha256: params.responseDigestSha256.trim().toLowerCase(),
    }, keyInfo.key);

    const effectiveKeyId = isDevFallback ? DEV_KEY_ID : (params.keyId || keyInfo.keyId);
    const effectiveTestOnly = isDevFallback ? true : Boolean(params.testOnly);

    const receipt: LiveInferenceReceipt = {
        source: 'airroofers-live-transport',
        httpStatus: 200,
        verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
        candidateSha: params.candidateSha.trim(),
        modelId: params.modelId.trim(),
        endpointHost: effectiveEndpointHost,
        providerRequestId,
        responseDigestSha256: params.responseDigestSha256.trim().toLowerCase(),
        observedAt: params.observedAt.trim(),
        signature: seal,
        provenanceSeal: seal,
        correlationId: params.correlationId ? params.correlationId.trim() : providerRequestId,
        keyId: effectiveKeyId,
        ...(effectiveTestOnly ? { testOnly: true } : {}),
    };

    return Object.freeze(receipt);
}

export class TrustedReceiptService {
    public static validateReceipt(receipt: unknown, expectedModelId?: string, expectedCandidateSha?: string, secretSignerOrKey?: string): receipt is LiveInferenceReceipt {
        return validateLiveInferenceReceipt(receipt, expectedModelId, expectedCandidateSha, secretSignerOrKey);
    }
    public static isTrustedReceipt(receipt: unknown, secretSignerOrKey?: string): boolean {
        return isTrustedLiveInferenceReceipt(receipt, secretSignerOrKey);
    }
}
