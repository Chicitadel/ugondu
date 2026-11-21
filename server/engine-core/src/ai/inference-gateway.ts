/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Central Inference Gateway
 * File           : inference-gateway.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance     : Corporate Policy Governed | Security Reviewed | Protocol Frozen
 * Standards      : ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import { __t } from '@ugondu/shared';
import {
    AdminAuthContext, AiAuditRecord, AiErrorCode, AiGatewayError,
    CatalogModelEntry, InferenceRequest, InferenceResult, ModelStatus, StreamChunk,
} from './contracts';
import { CredentialBroker } from './credential-broker';
import { ModelCatalog, ModelStatusScope } from './model-catalog';
import { ProviderAdapterRegistry } from './provider-registry';
import { QuotaGuard } from './quota-guard';
import { RoutingPolicyEngine } from './routing-policy';

const IDENTITY_QUERY_REGEX =
    /\b(who are you|what model are you|which model are you|what llm|which llm|which provider|what provider|what is your underlying model|who created you|what ai are you|qui es[- ]tu|quel mod[eè]le)\b/i;

const RETRYABLE_UPSTREAM_CODES = new Set<AiErrorCode>([
    'PROVIDER_TIMEOUT', 'PROVIDER_RATE_LIMITED', 'UPSTREAM_UNAVAILABLE', 'NETWORK_INTERRUPTED', 'CIRCUIT_OPEN',
]);

export interface GatewayDiagnosticsReport {
    generatedAt: string;
    schemaVersion: string;
    providers: Array<{
        providerId: string; legalEntity: string; adapterVersion: string; status: ModelStatus;
        credentialRef: string; supportedRegions: string[]; health: { ok: boolean; checkedAt: string; reasonCode?: string };
    }>;
    models: Array<{
        alias: string; providerId: string; providerModelIdRef: string; credentialRef: string;
        status: ModelStatus; allowedRegions: string[]; dataClassifications: string[]; fallbackAliases: string[];
    }>;
    circuits: ReturnType<RoutingPolicyEngine['getCircuitStates']>;
    quotas: ReturnType<QuotaGuard['listSnapshots']>;
    recentAuditEvents: AiAuditRecord[];
}

export class InferenceGateway {
    public readonly catalog: ModelCatalog;
    public readonly credentialBroker: CredentialBroker;
    public readonly providerRegistry: ProviderAdapterRegistry;
    public readonly routingPolicy: RoutingPolicyEngine;
    public readonly quotaGuard: QuotaGuard;
    private readonly auditLedger: AiAuditRecord[] = [];
    private readonly maxAuditEntries = 1000;

    constructor(deps?: {
        catalog?: ModelCatalog; credentialBroker?: CredentialBroker;
        providerRegistry?: ProviderAdapterRegistry; routingPolicy?: RoutingPolicyEngine; quotaGuard?: QuotaGuard;
    }) {
        this.catalog = deps?.catalog ?? new ModelCatalog();
        this.credentialBroker = deps?.credentialBroker ?? new CredentialBroker();
        this.providerRegistry =
            deps?.providerRegistry ?? new ProviderAdapterRegistry(this.catalog, this.credentialBroker);
        this.routingPolicy = deps?.routingPolicy ?? new RoutingPolicyEngine(this.catalog);
        this.quotaGuard = deps?.quotaGuard ?? new QuotaGuard();
    }

    public async invoke(request: InferenceRequest): Promise<InferenceResult> {
        const startedAt = Date.now();
        let resolvedModel: CatalogModelEntry | undefined;

        try {
            const decision = this.routingPolicy.evaluate(request);
            resolvedModel = decision.primaryModel;
            const lease = this.quotaGuard.acquireLease(request, decision.primaryModel);
            try {
                // Product-level identity protection (Section 6.6)
                if (this.isIdentityQuery(request)) {
                    const identityPolicy = this.catalog.getIdentityPolicy();
                    const identityOutput = `${identityPolicy.productIdentityName} — Corporate Policy Governed by ${identityPolicy.organization}.`;
                    const usage = { inputTokens: 12, outputTokens: 16 };
                    const costUsd = lease.release(decision.primaryModel, usage);
                    const latencyMs = Math.max(1, Date.now() - startedAt);

                    this.recordAudit({
                        request, resolvedModelAlias: decision.primaryModel.alias,
                        providerId: 'ugondu-platform', adapterVersion: decision.primaryProvider.adapterVersion,
                        policyDecision: 'ALLOW', outcome: 'SUCCESS', latencyMs, usage, costUsd,
                        notes: 'Product-level identity protection applied',
                    });

                    return {
                        requestId: request.requestId, providerId: 'ugondu-platform',
                        modelAlias: request.modelAlias, adapterVersion: decision.primaryProvider.adapterVersion,
                        output: identityOutput, usage, finishReason: 'stop', latencyMs, costUsd,
                    };
                }

                const execution = await this.executeWithCircuitAndFallback(
                    request,
                    decision.primaryModel,
                    decision.validatedTools
                );

                const costUsd = lease.release(execution.modelUsed, execution.result.usage);
                const finalResult: InferenceResult = {
                    ...execution.result,
                    output: this.credentialBroker.redactString(execution.result.output),
                    toolCalls: decision.validatedTools.length > 0 ? decision.validatedTools : undefined,
                    finishReason:
                        decision.validatedTools.length > 0 ? 'tool_call' : execution.result.finishReason,
                    costUsd,
                };

                this.recordAudit({
                    request, resolvedModelAlias: execution.modelUsed.alias,
                    providerId: execution.modelUsed.providerId, adapterVersion: execution.result.adapterVersion,
                    policyDecision: execution.result.fallbackUsed ? 'FALLBACK_ALLOW' : 'ALLOW',
                    outcome: 'SUCCESS', latencyMs: finalResult.latencyMs, usage: finalResult.usage, costUsd,
                });

                return finalResult;
            } finally {
                lease.release(decision.primaryModel, { inputTokens: 0, outputTokens: 0 });
            }
        } catch (err: any) {
            const gatewayErr = this.normalizeError(err);
            this.recordAudit({
                request, resolvedModelAlias: resolvedModel?.alias || request?.modelAlias || 'unknown',
                providerId: resolvedModel?.providerId || 'unassigned', adapterVersion: '3.0.0',
                policyDecision: 'DENY', outcome: gatewayErr.statusCode >= 500 ? 'FAILED' : 'DENIED',
                errorCode: gatewayErr.errorCode, latencyMs: Math.max(1, Date.now() - startedAt),
            });
            throw gatewayErr;
        }
    }

    /** Bounded streaming invocation with backpressure, tenant isolation, and disconnect cleanup. */
    public async *invokeStream(
        request: InferenceRequest,
        signal?: AbortSignal
    ): AsyncGenerator<StreamChunk, void, unknown> {
        const streamRequest: InferenceRequest = { ...request, stream: true };
        const startedAt = Date.now();
        const decision = this.routingPolicy.evaluate(streamRequest);
        const lease = this.quotaGuard.acquireLease(streamRequest, decision.primaryModel);
        const boundTenantId = streamRequest.tenantId;
        const boundRequestId = streamRequest.requestId;

        try {
            if (signal?.aborted) {
                throw new AiGatewayError('STREAM_CANCELLED', __t('ai.error.stream_cancelled'), 499);
            }

            const result = await this.executeWithCircuitAndFallback(
                streamRequest,
                decision.primaryModel,
                decision.validatedTools
            );

            const segments = result.result.output.match(/[\s\S]{1,16}/g) || [result.result.output];
            const chunks = segments.slice(0, 64);

            for (let idx = 0; idx < chunks.length; idx++) {
                if (signal?.aborted) {
                    this.recordAudit({
                        request: streamRequest, resolvedModelAlias: result.modelUsed.alias,
                        providerId: result.modelUsed.providerId, adapterVersion: result.result.adapterVersion,
                        policyDecision: 'ALLOW', outcome: 'CANCELLED', errorCode: 'STREAM_CANCELLED',
                        latencyMs: Math.max(1, Date.now() - startedAt),
                    });
                    throw new AiGatewayError('STREAM_CANCELLED', __t('ai.error.stream_cancelled'), 499);
                }

                yield Object.freeze({
                    requestId: boundRequestId,
                    tenantId: boundTenantId,
                    sequence: idx + 1,
                    delta: this.credentialBroker.redactString(chunks[idx]),
                    done: idx === chunks.length - 1,
                });
            }

            if (signal?.aborted) {
                throw new AiGatewayError('STREAM_CANCELLED', __t('ai.error.stream_cancelled'), 499);
            }

            const costUsd = lease.release(result.modelUsed, result.result.usage);
            this.recordAudit({
                request: streamRequest, resolvedModelAlias: result.modelUsed.alias,
                providerId: result.modelUsed.providerId, adapterVersion: result.result.adapterVersion,
                policyDecision: result.result.fallbackUsed ? 'FALLBACK_ALLOW' : 'ALLOW',
                outcome: 'SUCCESS', latencyMs: Math.max(1, Date.now() - startedAt),
                usage: result.result.usage, costUsd,
            });
        } finally {
            lease.release(decision.primaryModel, { inputTokens: 0, outputTokens: 0 });
        }
    }

    public setModelStatus(
        alias: string,
        status: ModelStatus,
        auth: AdminAuthContext,
        scope?: ModelStatusScope
    ) {
        const change = this.catalog.setModelStatus(alias, status, auth, scope);
        this.auditLedger.push({
            eventId: crypto.randomUUID(), timestamp: change.timestamp,
            requestId: `admin-${Date.now()}`, correlationId: `admin-${change.targetId}`,
            tenantId: scope?.tenantId || 'global', productId: scope?.productId || 'ugondu',
            environment: scope?.environment || 'production', region: scope?.region || 'global',
            dataClassification: 'internal', requestedModelAlias: alias, resolvedModelAlias: alias,
            providerId: this.catalog.getModel(alias)?.providerId || 'unknown', adapterVersion: '3.0.0',
            policyDecision: 'ALLOW', outcome: 'ADMIN_CHANGE', latencyMs: 1, actor: auth.actorId,
            notes: `Model ${alias} status changed from ${change.previousStatus} to ${change.newStatus}`,
        });
        return change;
    }

    public async getAdminDiagnostics(auth: AdminAuthContext): Promise<GatewayDiagnosticsReport> {
        if (!auth || !auth.actorId || !['admin', 'auditor'].includes(auth.role)) {
            throw new AiGatewayError('UNAUTHORIZED_ADMIN', __t('ai.error.unauthorized_admin_diagnostics'), 403);
        }
        const expectedAdminToken = process.env['UGONDU_ADMIN_DIAGNOSTICS_TOKEN'];
        if (expectedAdminToken && auth.adminToken !== expectedAdminToken) {
            throw new AiGatewayError('UNAUTHORIZED_ADMIN', __t('ai.error.invalid_admin_diagnostics_token'), 403);
        }

        const providers = await Promise.all(
            this.catalog.listProviders().map(async p => {
                const adapter = this.providerRegistry.getAdapter(p.providerId);
                const health = await adapter.healthCheck();
                return {
                    providerId: p.providerId, legalEntity: p.legalEntity, adapterVersion: p.adapterVersion,
                    status: p.status, credentialRef: p.credentialRef, supportedRegions: p.supportedRegions, health,
                };
            })
        );

        const models = this.catalog.listModels(true).map(m => ({
            alias: m.alias, providerId: m.providerId, providerModelIdRef: m.providerModelIdRef,
            credentialRef: m.credentialRef, status: m.status, allowedRegions: m.allowedRegions,
            dataClassifications: m.dataClassifications, fallbackAliases: m.policy.fallbackAliases,
        }));

        return {
            generatedAt: new Date().toISOString(), schemaVersion: this.catalog.getSchemaVersion(),
            providers, models, circuits: this.routingPolicy.getCircuitStates(),
            quotas: this.quotaGuard.listSnapshots(), recentAuditEvents: this.getAuditEvents(50),
        };
    }

    public getAuditEvents(limit = 100): AiAuditRecord[] {
        return this.auditLedger
            .slice(-limit)
            .map(entry => this.credentialBroker.redactObject(entry) as AiAuditRecord);
    }

    private async executeWithCircuitAndFallback(
        request: InferenceRequest,
        primaryModel: CatalogModelEntry,
        validatedTools: Array<{ name: string; arguments: Record<string, unknown>; validated: boolean }>
    ): Promise<{ result: InferenceResult; modelUsed: CatalogModelEntry }> {
        let primaryError: AiGatewayError | undefined;

        if (this.routingPolicy.isCircuitOpen(primaryModel.alias)) {
            primaryError = new AiGatewayError('CIRCUIT_OPEN', __t('ai.error.circuit_open'), 503, {
                modelAlias: primaryModel.alias,
            });
        } else {
            try {
                const adapter = this.providerRegistry.getAdapter(primaryModel.providerId);
                const result = await adapter.invoke(request);
                this.routingPolicy.recordSuccess(primaryModel.alias);
                return {
                    result: {
                        ...result,
                        toolCalls: validatedTools.length > 0 ? validatedTools : undefined,
                        fallbackUsed: false,
                    },
                    modelUsed: primaryModel,
                };
            } catch (err: any) {
                primaryError = this.normalizeError(err);
                if (RETRYABLE_UPSTREAM_CODES.has(primaryError.errorCode)) {
                    this.routingPolicy.recordFailure(primaryModel.alias);
                } else {
                    throw primaryError;
                }
            }
        }

        const fallbacks = this.routingPolicy.resolvePolicyEquivalentFallbacks(primaryModel, request);
        for (const candidate of fallbacks) {
            try {
                const fallbackAdapter = this.providerRegistry.getAdapter(candidate.model.providerId);
                const fallbackRequest: InferenceRequest = {
                    ...request,
                    modelAlias: candidate.model.alias,
                    deadlineMs: Math.min(request.deadlineMs, candidate.model.policy.timeoutMs),
                };
                const fallbackResult = await fallbackAdapter.invoke(fallbackRequest);
                this.routingPolicy.recordSuccess(candidate.model.alias);
                return {
                    result: {
                        ...fallbackResult,
                        modelAlias: candidate.model.alias,
                        primaryModelAlias: primaryModel.alias,
                        fallbackUsed: true,
                        toolCalls: validatedTools.length > 0 ? validatedTools : undefined,
                    },
                    modelUsed: candidate.model,
                };
            } catch (fallbackErr: any) {
                const normalizedFallbackErr = this.normalizeError(fallbackErr);
                if (RETRYABLE_UPSTREAM_CODES.has(normalizedFallbackErr.errorCode)) {
                    this.routingPolicy.recordFailure(candidate.model.alias);
                }
            }
        }

        throw primaryError!;
    }

    private isIdentityQuery(request: InferenceRequest): boolean {
        return request.messages.some(
            m => m.role === 'user' && typeof m.content === 'string' && IDENTITY_QUERY_REGEX.test(m.content)
        );
    }

    private normalizeError(err: any): AiGatewayError {
        if (err instanceof AiGatewayError) {
            return new AiGatewayError(
                err.errorCode,
                this.credentialBroker.redactString(err.message),
                err.statusCode,
                this.credentialBroker.redactObject(err.details) as Record<string, unknown>
            );
        }
        return new AiGatewayError(
            'UPSTREAM_UNAVAILABLE',
            this.credentialBroker.redactString(err?.message || __t('ai.error.unexpected_gateway_error')),
            502
        );
    }

    private recordAudit(params: {
        request: Partial<InferenceRequest>;
        resolvedModelAlias: string;
        providerId: string;
        adapterVersion: string;
        policyDecision: 'ALLOW' | 'DENY' | 'FALLBACK_ALLOW';
        outcome: 'SUCCESS' | 'DENIED' | 'FAILED' | 'CANCELLED' | 'ADMIN_CHANGE';
        errorCode?: AiErrorCode;
        latencyMs: number;
        usage?: { inputTokens?: number; outputTokens?: number };
        costUsd?: number;
        notes?: string;
    }): void {
        const entry: AiAuditRecord = {
            eventId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            requestId: String(params.request?.requestId || 'unknown'),
            correlationId: String(params.request?.correlationId || 'unknown'),
            tenantId: String(params.request?.tenantId || 'unknown'),
            productId: String(params.request?.productId || 'unknown'),
            environment: String(params.request?.environment || 'unknown'),
            region: String(params.request?.region || 'unknown'),
            dataClassification: String(params.request?.dataClassification || 'unknown'),
            requestedModelAlias: String(params.request?.modelAlias || 'unknown'),
            resolvedModelAlias: params.resolvedModelAlias,
            providerId: params.providerId,
            adapterVersion: params.adapterVersion,
            policyDecision: params.policyDecision,
            outcome: params.outcome,
            errorCode: params.errorCode,
            latencyMs: params.latencyMs,
            usage: params.usage,
            costUsd: params.costUsd,
            notes: params.notes ? this.credentialBroker.redactString(params.notes) : undefined,
        };

        this.auditLedger.push(entry);
        if (this.auditLedger.length > this.maxAuditEntries) {
            this.auditLedger.shift();
        }
    }
}
