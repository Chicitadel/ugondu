/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — AeroBill Commercial Authority Client
 * File           : aerobill-client.ts
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
 * - Commercial Sovereignty: AeroBill APR Authority
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import axios from 'axios';
import { __t } from '@ugondu/shared';

export const DEFAULT_AEROBILL_BASE_URL = 'https://billing.airroofers.eu';

export interface AeroBillCheckoutSessionRequest {
    tenantId?: string;
    edition: string;
    successUrl?: string;
    cancelUrl?: string;
    idempotencyKey?: string;
    correlationId?: string;
}

export interface AeroBillUpgradeSessionRequest {
    tenantId: string;
    targetEdition: string;
    subscriptionId?: string;
    idempotencyKey?: string;
    correlationId?: string;
}

export interface AeroBillUsageMeterRequest {
    eventId: string;
    tenantId: string;
    metric: string;
    quantity: number;
    timestamp: string;
    metadata?: Record<string, unknown>;
    correlationId?: string;
}

export class AeroBillAuthorityError extends Error {
    public readonly code: 'UPSTREAM_UNAVAILABLE' | 'AEROBILL_REQUEST_REJECTED';
    public readonly statusCode: number;

    constructor(
        code: 'UPSTREAM_UNAVAILABLE' | 'AEROBILL_REQUEST_REJECTED',
        statusCode: number
    ) {
        super(__t('auth_rejected'));
        this.name = 'AeroBillAuthorityError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

export function resolveAeroBillBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
    const raw = (env.AEROBILL_URL || env.BILLING_AUTHORITY_URL || DEFAULT_AEROBILL_BASE_URL).trim();
    return raw.replace(/\/+$/, '');
}

function buildAeroBillHeaders(
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
    const apiKey = (env.AEROBILL_API_KEY || '').trim();
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return headers;
}

export class AeroBillClient {
    private readonly baseUrlOverride?: string;
    private readonly timeoutMs: number;

    constructor(options?: { baseUrl?: string; timeoutMs?: number }) {
        this.baseUrlOverride = options?.baseUrl?.replace(/\/+$/, '');
        this.timeoutMs = options?.timeoutMs ?? 4000;
    }

    private getBaseUrl(): string {
        return this.baseUrlOverride || resolveAeroBillBaseUrl();
    }

    async createCheckoutSession(input: AeroBillCheckoutSessionRequest): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        try {
            const res = await axios.post(
                `${base}/api/v1/checkout/sessions`,
                {
                    productId: 'ugondu',
                    tenantId: input.tenantId,
                    edition: input.edition,
                    successUrl: input.successUrl,
                    cancelUrl: input.cancelUrl,
                },
                {
                    headers: buildAeroBillHeaders(input.correlationId, input.idempotencyKey),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new AeroBillAuthorityError('AEROBILL_REQUEST_REJECTED', status);
            }
            throw new AeroBillAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }

    async createUpgradeSession(input: AeroBillUpgradeSessionRequest): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        try {
            const res = await axios.post(
                `${base}/api/v1/subscriptions/upgrade`,
                {
                    productId: 'ugondu',
                    tenantId: input.tenantId,
                    targetEdition: input.targetEdition,
                    subscriptionId: input.subscriptionId,
                },
                {
                    headers: buildAeroBillHeaders(input.correlationId, input.idempotencyKey),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new AeroBillAuthorityError('AEROBILL_REQUEST_REJECTED', status);
            }
            throw new AeroBillAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }

    async getSubscription(tenantId: string, correlationId?: string): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        try {
            const res = await axios.get(
                `${base}/api/v1/subscriptions/${encodeURIComponent(tenantId)}`,
                {
                    headers: buildAeroBillHeaders(correlationId),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new AeroBillAuthorityError('AEROBILL_REQUEST_REJECTED', status);
            }
            throw new AeroBillAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }

    async listInvoices(tenantId: string, correlationId?: string): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        try {
            const res = await axios.get(
                `${base}/api/v1/invoices?tenantId=${encodeURIComponent(tenantId)}`,
                {
                    headers: buildAeroBillHeaders(correlationId),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new AeroBillAuthorityError('AEROBILL_REQUEST_REJECTED', status);
            }
            throw new AeroBillAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }

    async reportUsageMeter(input: AeroBillUsageMeterRequest): Promise<Record<string, any>> {
        const base = this.getBaseUrl();
        try {
            const res = await axios.post(
                `${base}/api/v1/metering/usage`,
                {
                    productId: 'ugondu',
                    eventId: input.eventId,
                    tenantId: input.tenantId,
                    metric: input.metric,
                    quantity: input.quantity,
                    timestamp: input.timestamp,
                    metadata: input.metadata || {},
                },
                {
                    headers: buildAeroBillHeaders(input.correlationId, input.eventId),
                    timeout: this.timeoutMs,
                }
            );
            return res.data;
        } catch (err: any) {
            const status = Number(err?.response?.status || 0);
            if (status >= 400 && status < 500) {
                throw new AeroBillAuthorityError('AEROBILL_REQUEST_REJECTED', status);
            }
            throw new AeroBillAuthorityError('UPSTREAM_UNAVAILABLE', 503);
        }
    }
}

export const defaultAeroBillClient = new AeroBillClient();
