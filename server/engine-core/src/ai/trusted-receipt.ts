/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Trusted Receipt Service
 * File           : trusted-receipt.ts
 * Version        : 3.2.0
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

export interface LiveInferenceReceipt {
    source: 'airroofers-live-transport';
    httpStatus: number;
    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED';
    candidateSha: string;
    modelId: string;
    responseDigestSha256: string;
    correlationId: string;
    endpointHost: string;
    observedAt: string;
    testOnly?: boolean;
    provenanceSeal?: string;
}

export interface LiveInferenceReceiptParams {
    source: 'airroofers-live-transport' | string;
    httpStatus: number;
    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED' | string;
    candidateSha: string;
    modelId: string;
    responseDigestSha256: string;
    correlationId: string;
    endpointHost: string;
    observedAt: string;
    testOnly?: boolean;
    output?: string;
}

const DEFAULT_PROVENANCE_KEY = process.env.UGONDU_PROVENANCE_KEY || crypto.randomBytes(32).toString('hex');
const TRUSTED_RECEIPT_REGISTRY = new WeakSet<object>();

export function computeProvenanceSeal(
    params: Omit<LiveInferenceReceipt, 'provenanceSeal'>,
    signerKey: string = DEFAULT_PROVENANCE_KEY
): string {
    const canonical = [
        params.source,
        params.httpStatus,
        params.verification,
        params.candidateSha,
        params.modelId,
        params.responseDigestSha256,
        params.correlationId,
        params.endpointHost,
        params.observedAt,
        Boolean(params.testOnly),
    ].join('|');
    return crypto.createHmac('sha256', signerKey).update(canonical).digest('hex');
}

export function isTrustedLiveInferenceReceipt(
    receipt: unknown,
    secretSignerOrKey?: string
): receipt is LiveInferenceReceipt {
    if (!receipt || typeof receipt !== 'object') return false;
    const r = receipt as LiveInferenceReceipt;
    if (TRUSTED_RECEIPT_REGISTRY.has(r)) return true;
    if (typeof r.provenanceSeal === 'string' && /^[0-9a-f]{64}$/i.test(r.provenanceSeal)) {
        try {
            const expectedSeal = computeProvenanceSeal({
                source: r.source,
                httpStatus: r.httpStatus,
                verification: r.verification,
                candidateSha: r.candidateSha,
                modelId: r.modelId,
                responseDigestSha256: r.responseDigestSha256,
                correlationId: r.correlationId,
                endpointHost: r.endpointHost,
                observedAt: r.observedAt,
                testOnly: Boolean(r.testOnly),
            }, secretSignerOrKey);
            return crypto.timingSafeEqual(
                Buffer.from(r.provenanceSeal, 'hex'),
                Buffer.from(expectedSeal, 'hex')
            );
        } catch {
            return false;
        }
    }
    return false;
}

export function validateLiveInferenceReceipt(
    receipt: unknown,
    expectedModelId?: string,
    expectedCandidateSha?: string,
    secretSignerOrKey?: string
): receipt is LiveInferenceReceipt {
    if (!receipt || typeof receipt !== 'object') return false;
    const r = receipt as Partial<LiveInferenceReceipt>;
    if (r.source !== 'airroofers-live-transport' || r.httpStatus !== 200 || r.verification !== 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED') return false;
    if (r.endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST) return false;
    if (typeof r.candidateSha !== 'string' || !r.candidateSha.trim()) return false;
    if (expectedCandidateSha && r.candidateSha !== expectedCandidateSha) return false;
    if (typeof r.modelId !== 'string' || !r.modelId.trim()) return false;
    if (expectedModelId && r.modelId !== expectedModelId) return false;
    if (typeof r.responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(r.responseDigestSha256)) return false;
    if (typeof r.correlationId !== 'string' || !r.correlationId.trim()) return false;
    if (typeof r.observedAt !== 'string' || !r.observedAt.trim()) return false;

    if (process.env.NODE_ENV === 'production') {
        if (r.testOnly === true) return false;
        if (!isTrustedLiveInferenceReceipt(r, secretSignerOrKey)) return false;
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
    if (params.endpointHost !== ALLOWLISTED_LIVE_ENDPOINT_HOST) {
        throw new Error(`Disallowed endpoint host '${params.endpointHost}': strictly requires '${ALLOWLISTED_LIVE_ENDPOINT_HOST}'`);
    }
    if (!params.candidateSha || typeof params.candidateSha !== 'string' || !params.candidateSha.trim()) {
        throw new Error('Receipt requires non-empty candidateSha');
    }
    if (!params.modelId || typeof params.modelId !== 'string' || !params.modelId.trim()) {
        throw new Error('Receipt requires non-empty modelId');
    }
    if (!params.responseDigestSha256 || typeof params.responseDigestSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(params.responseDigestSha256)) {
        throw new Error('Receipt requires valid 64-hex SHA-256 responseDigestSha256');
    }
    if (!params.correlationId || typeof params.correlationId !== 'string' || !params.correlationId.trim()) {
        throw new Error('Receipt requires non-empty correlationId');
    }
    if (!params.observedAt || typeof params.observedAt !== 'string' || !params.observedAt.trim()) {
        throw new Error('Receipt requires non-empty observedAt');
    }
    if (process.env.NODE_ENV === 'production' && params.testOnly === true) {
        throw new Error('testOnly mock receipt cannot be activated in production');
    }

    const receipt: LiveInferenceReceipt = {
        source: 'airroofers-live-transport',
        httpStatus: 200,
        verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
        candidateSha: params.candidateSha.trim(),
        modelId: params.modelId.trim(),
        responseDigestSha256: params.responseDigestSha256.trim().toLowerCase(),
        correlationId: params.correlationId.trim(),
        endpointHost: ALLOWLISTED_LIVE_ENDPOINT_HOST,
        observedAt: params.observedAt.trim(),
        ...(params.testOnly ? { testOnly: true } : {}),
    };

    receipt.provenanceSeal = computeProvenanceSeal(receipt, secretSignerOrKey);
    TRUSTED_RECEIPT_REGISTRY.add(receipt);

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
