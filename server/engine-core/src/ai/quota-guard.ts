/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Quota & Cost Guard
 * File           : quota-guard.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { AiGatewayError, CatalogModelEntry, InferenceRequest } from './contracts';

export interface QuotaPolicy {
    maxConcurrentRequests: number;
    maxRequestsPerMinute: number;
    maxTotalTokens: number;
    maxTotalCostUsd: number;
}

export interface TenantQuotaSnapshot {
    tenantId: string;
    productId: string;
    inFlightRequests: number;
    requestsInLastMinute: number;
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
    policy: QuotaPolicy;
}

export interface QuotaLease {
    readonly leaseId: string;
    readonly tenantId: string;
    readonly productId: string;
    release(
        model: CatalogModelEntry,
        usage?: { inputTokens?: number; outputTokens?: number }
    ): number;
}

interface InternalQuotaBucket {
    tenantId: string;
    productId: string;
    inFlight: number;
    requestTimestamps: number[];
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: number;
}

const DEFAULT_QUOTA_POLICY: QuotaPolicy = {
    maxConcurrentRequests: 4,
    maxRequestsPerMinute: 120,
    maxTotalTokens: 500000,
    maxTotalCostUsd: 50.0,
};

export class QuotaGuard {
    private readonly defaultPolicy: QuotaPolicy;
    private readonly tenantPolicies = new Map<string, QuotaPolicy>();
    private readonly buckets = new Map<string, InternalQuotaBucket>();

    constructor(defaultPolicy?: Partial<QuotaPolicy>) {
        this.defaultPolicy = {
            ...DEFAULT_QUOTA_POLICY,
            ...defaultPolicy,
        };
    }

    public setTenantQuotaPolicy(tenantId: string, policy: Partial<QuotaPolicy>): void {
        const current = this.tenantPolicies.get(tenantId) || { ...this.defaultPolicy };
        this.tenantPolicies.set(tenantId, {
            ...current,
            ...policy,
        });
    }

    public getTenantQuotaPolicy(tenantId: string): QuotaPolicy {
        return this.tenantPolicies.get(tenantId) || { ...this.defaultPolicy };
    }

    public acquireLease(request: InferenceRequest, model: CatalogModelEntry): QuotaLease {
        const key = `${request.tenantId}::${request.productId}`;
        const policy = this.getTenantQuotaPolicy(request.tenantId);
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = {
                tenantId: request.tenantId,
                productId: request.productId,
                inFlight: 0,
                requestTimestamps: [],
                totalRequests: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalCostUsd: 0,
            };
            this.buckets.set(key, bucket);
        }

        // 1. Concurrency limit enforcement
        if (bucket.inFlight >= policy.maxConcurrentRequests) {
            throw new AiGatewayError(
                'CONCURRENCY_LIMIT_EXCEEDED',
                __t('ai.error.concurrency_limit_exceeded'),
                429,
                {
                    tenantId: request.tenantId,
                    productId: request.productId,
                    inFlight: bucket.inFlight,
                    maxConcurrentRequests: policy.maxConcurrentRequests,
                }
            );
        }

        // 2. Sliding-window RPM rate limit enforcement
        const now = Date.now();
        bucket.requestTimestamps = bucket.requestTimestamps.filter(ts => now - ts < 60000);
        const effectiveRpm = Math.min(policy.maxRequestsPerMinute, model.policy.rateLimitRpm || 120);
        if (bucket.requestTimestamps.length >= effectiveRpm) {
            throw new AiGatewayError(
                'RATE_LIMIT_EXCEEDED',
                __t('ai.error.rate_limit_exceeded'),
                429,
                {
                    tenantId: request.tenantId,
                    productId: request.productId,
                    rateLimitRpm: effectiveRpm,
                }
            );
        }

        // 3. Token & cost budget pre-flight enforcement
        const estimatedPromptChars = request.messages.reduce(
            (sum, m) => sum + (m.content?.length || 0),
            0
        );
        const estimatedInputTokens = Math.max(1, Math.ceil(estimatedPromptChars / 4));
        const projectedTokens =
            bucket.totalInputTokens + bucket.totalOutputTokens + estimatedInputTokens;

        if (projectedTokens > policy.maxTotalTokens) {
            throw new AiGatewayError('QUOTA_EXCEEDED', __t('ai.error.token_quota_exceeded'), 429, {
                tenantId: request.tenantId,
                projectedTokens,
                maxTotalTokens: policy.maxTotalTokens,
            });
        }

        const estimatedMinCost =
            (estimatedInputTokens / 1000) * (model.policy.costPer1kInput || 0.001);
        if (bucket.totalCostUsd + estimatedMinCost > policy.maxTotalCostUsd) {
            throw new AiGatewayError('QUOTA_EXCEEDED', __t('ai.error.cost_budget_exceeded'), 429, {
                tenantId: request.tenantId,
                totalCostUsd: bucket.totalCostUsd,
                maxTotalCostUsd: policy.maxTotalCostUsd,
            });
        }

        bucket.inFlight += 1;
        bucket.totalRequests += 1;
        bucket.requestTimestamps.push(now);

        let released = false;
        const leaseId = `${request.requestId}:${now}`;

        return {
            leaseId,
            tenantId: request.tenantId,
            productId: request.productId,
            release: (
                resolvedModel: CatalogModelEntry,
                usage?: { inputTokens?: number; outputTokens?: number }
            ): number => {
                if (released) {
                    return 0;
                }
                released = true;
                bucket!.inFlight = Math.max(0, bucket!.inFlight - 1);

                const inTok = usage?.inputTokens ?? 0;
                const outTok = usage?.outputTokens ?? 0;
                const cost =
                    (inTok / 1000) * (resolvedModel.policy.costPer1kInput || 0) +
                    (outTok / 1000) * (resolvedModel.policy.costPer1kOutput || 0);
                const roundedCost = Number(cost.toFixed(6));

                bucket!.totalInputTokens += inTok;
                bucket!.totalOutputTokens += outTok;
                bucket!.totalCostUsd = Number((bucket!.totalCostUsd + roundedCost).toFixed(6));
                return roundedCost;
            },
        };
    }

    public getSnapshot(tenantId: string, productId: string): TenantQuotaSnapshot {
        const key = `${tenantId}::${productId}`;
        const policy = this.getTenantQuotaPolicy(tenantId);
        const bucket = this.buckets.get(key);
        const now = Date.now();
        if (!bucket) {
            return {
                tenantId,
                productId,
                inFlightRequests: 0,
                requestsInLastMinute: 0,
                totalRequests: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalCostUsd: 0,
                policy,
            };
        }
        const activeWindow = bucket.requestTimestamps.filter(ts => now - ts < 60000);
        return {
            tenantId,
            productId,
            inFlightRequests: bucket.inFlight,
            requestsInLastMinute: activeWindow.length,
            totalRequests: bucket.totalRequests,
            totalInputTokens: bucket.totalInputTokens,
            totalOutputTokens: bucket.totalOutputTokens,
            totalCostUsd: bucket.totalCostUsd,
            policy,
        };
    }

    public listSnapshots(): TenantQuotaSnapshot[] {
        const snapshots: TenantQuotaSnapshot[] = [];
        for (const bucket of this.buckets.values()) {
            snapshots.push(this.getSnapshot(bucket.tenantId, bucket.productId));
        }
        return snapshots;
    }

    public reset(): void {
        this.buckets.clear();
    }
}
