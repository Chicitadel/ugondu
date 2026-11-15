/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Mandatag Licensing Authority Client
 * File           : mandatag-client.ts
 * Version        : 2026.4.0-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-11-14
 * Last Modified  : 2026-11-14
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Licensing Sovereignty: Mandatag Authority (Ed25519)
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { createPublicKey } from 'crypto';
import axios from 'axios';
import { __t, globalTrustRegistry } from '@ugondu/shared';

export const DEFAULT_MANDATAG_AUTHORITY_URL = 'https://license.airroofers.eu/api/v1';

export interface MandatagRefreshRequest {
    tenantId: string;
    invoiceId?: string;
    subscriptionId?: string;
    edition?: string;
    triggerEvent?: string;
    correlationId?: string;
}

export interface MandatagRevokeRequest {
    tenantId: string;
    reason: string;
    invoiceId?: string;
    subscriptionId?: string;
    correlationId?: string;
}

export class MandatagAuthorityError extends Error {
    public readonly code: 'UPSTREAM_UNAVAILABLE' | 'MANDATAG_REQUEST_REJECTED';
    public readonly statusCode: number;

    constructor(
        code: 'UPSTREAM_UNAVAILABLE' | 'MANDATAG_REQUEST_REJECTED',
        statusCode: number
    ) {
        super(__t('auth_rejected'));
        this.name = 'MandatagAuthorityError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export function resolveMandatagAuthorityUrl(env: NodeJS.ProcessEnv = process.env): string {
    const raw = (
        env.MANDATAG_AUTHORITY_URL ||
        env.MANDATAG_URL ||
        env.IDENTITY_AUTHORITY_URL ||
        DEFAULT_MANDATAG_AUTHORITY_URL
    ).trim();
    return raw.replace(/\/+$/, '');
}

function buildMandatagHeaders(
    correlationId?: string,
    idempotencyKey?: string,
    env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (correlationId) {
        headers['x-correlation-id'] = correlationId;
    }
    if (idempotencyKey) {
        headers['Idempotency-Key'] = idempotencyKey;
    }
    const apiKey = (env.MANDATAG_API_KEY || '').trim();
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
}

export class MandatagClient {
    private readonly baseUrlOverride?: string;
    private readonly timeoutMs: number;

    constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
        this.baseUrlOverride = options?.baseUrl?.replace(/\/+$/, '');
        this.timeoutMs = options?.timeoutMs ?? 4000;
    }

    private getBaseUrl(): string {
        return this.baseUrlOverride || resolveMandatagAuthorityUrl();
    }

    async refreshEntitlementManifest(input: MandatagRefreshRequest): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        const idempKey = input.invoiceId
            ? `refresh:${input.tenantId}:${input.invoiceId}`
            : undefined;
        try {
            const res = await axios.post(
                `${base}/entitlements/refresh`,
                {
                    productId: 'ugondu',
                    tenantId: input.tenantId,
                    invoiceId: input.invoiceId,
                    subscriptionId: input.subscriptionId,
                    edition: input.edition,
                    triggerEvent: input.triggerEvent || 'AEROBILL_PAYMENT_CONFIRMED',
                },
                {
                    headers: buildMandatagHeaders(input.correlationId, idempKey),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new MandatagAuthorityError('MANDATAG_REQUEST_REJECTED', status);
            }
            throw new MandatagAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }

    async revokeEntitlement(input: MandatagRevokeRequest): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        const idempKey = input.invoiceId
            ? `revoke:${input.tenantId}:${input.invoiceId}:${input.reason}`
            : undefined;
        try {
            const res = await axios.post(
                `${base}/entitlements/revoke`,
                {
                    productId: 'ugondu',
                    tenantId: input.tenantId,
                    reason: input.reason,
                    invoiceId: input.invoiceId,
                    subscriptionId: input.subscriptionId,
                },
                {
                    headers: buildMandatagHeaders(input.correlationId, idempKey),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new MandatagAuthorityError('MANDATAG_REQUEST_REJECTED', status);
            }
            throw new MandatagAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }

    async discoverAndSyncPublicKeys(correlationId?: string): Promise<number> {
        const base = this.getBaseUrl();
        try {
            const res = await axios.get(`${base}/keys/jwks`, {
                headers: buildMandatagHeaders(correlationId),
                timeout: this.timeoutMs,
            });
            const keys = Array.isArray(res.data?.keys) ? res.data.keys : [];
            let registeredCount = 0;
            for (const entry of keys) {
                if (!entry || typeof entry !== 'object') {
                    continue;
                }
                const keyId =
                    typeof entry.keyId === 'string' && entry.keyId
                        ? entry.keyId
                        : typeof entry.kid === 'string' && entry.kid
                            ? entry.kid
                            : '';
                const isEd25519 =
                    entry.algorithm === 'ed25519' ||
                    (entry.kty === 'OKP' && entry.crv === 'Ed25519') ||
                    entry.alg === 'EdDSA';
                const isActive =
                    entry.status === undefined || entry.status === 'ACTIVE';

                let publicKey =
                    typeof entry.publicKey === 'string' && entry.publicKey
                        ? entry.publicKey
                        : typeof entry.publicKeyPem === 'string' && entry.publicKeyPem
                            ? entry.publicKeyPem
                            : '';
                if (!publicKey && entry.kty === 'OKP' && entry.crv === 'Ed25519' && typeof entry.x === 'string' && entry.x) {
                    publicKey = createPublicKey({
                        key: { kty: 'OKP', crv: 'Ed25519', x: entry.x },
                        format: 'jwk',
                    })
                        .export({ type: 'spki', format: 'pem' })
                        .toString();
                }

                if (keyId && publicKey && isEd25519 && isActive) {
                    globalTrustRegistry.registerKey({
                        keyId,
                        algorithm: 'ed25519',
                        status: 'ACTIVE',
                        purpose: entry.purpose || 'service-identity',
                        publicKey,
                    });
                    registeredCount++;
                }
            }
            return registeredCount;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new MandatagAuthorityError('MANDATAG_REQUEST_REJECTED', status);
            }
            throw new MandatagAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }
}

export const defaultMandatagClient = new MandatagClient();
