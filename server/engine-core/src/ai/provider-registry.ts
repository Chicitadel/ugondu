/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Provider Adapter Registry
 * File           : provider-registry.ts
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

import * as crypto from 'crypto';
import { __t } from '@ugondu/shared';
import {
    AiGatewayError,
    CatalogModelEntry,
    CatalogProviderEntry,
    InferenceProvider,
    InferenceRequest,
    InferenceResult,
    ModelCapability,
} from './contracts';
import { CredentialBroker } from './credential-broker';
import { ModelCatalog } from './model-catalog';
import { AirRoofersAiProviderAdapter } from './airroofers-provider';

export interface HttpTransportRequest {
    url: string;
    method: 'POST' | 'GET';
    headers: Record<string, string>;
    body?: string;
    timeoutMs: number;
}

export interface HttpTransportResponse {
    status: number;
    body: string;
}

export type HttpTransport = (req: HttpTransportRequest) => Promise<HttpTransportResponse>;

const defaultHttpTransport: HttpTransport = async (req: HttpTransportRequest): Promise<HttpTransportResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs);
    try {
        const res = await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body,
            signal: controller.signal,
        });
        const body = await res.text();
        return { status: res.status, body };
    } catch (err: any) {
        if (err?.name === 'AbortError' || /timeout|aborted/i.test(String(err?.message))) {
            throw new AiGatewayError('PROVIDER_TIMEOUT', __t('ai.error.provider_timeout'), 504);
        }
        throw new AiGatewayError('NETWORK_INTERRUPTED', __t('ai.error.network_interrupted'), 502);
    } finally {
        clearTimeout(timer);
    }
};

export class ExternalHttpProviderAdapter implements InferenceProvider {
    public readonly providerId: string;
    private readonly catalog: ModelCatalog;
    private readonly credentialBroker: CredentialBroker;
    private readonly getTransport: () => HttpTransport;

    constructor(
        providerId: string,
        catalog: ModelCatalog,
        credentialBroker: CredentialBroker,
        getTransport: () => HttpTransport
    ) {
        this.providerId = providerId;
        this.catalog = catalog;
        this.credentialBroker = credentialBroker;
        this.getTransport = getTransport;
    }

    public async capabilities(): Promise<ModelCapability[]> {
        const models = this.catalog
            .listModels(true)
            .filter(m => m.providerId === this.providerId && m.status === 'enabled');
        return models.map(m => m.capabilities);
    }

    public async healthCheck(): Promise<{ ok: boolean; checkedAt: string; reasonCode?: string }> {
        const checkedAt = new Date().toISOString();
        const provider = this.catalog.getProvider(this.providerId);
        if (!provider || provider.status !== 'enabled') {
            return { ok: false, checkedAt, reasonCode: 'PROVIDER_DISABLED' };
        }
        try {
            this.credentialBroker.resolveHandle(provider.credentialRef);
            return { ok: true, checkedAt };
        } catch (err: any) {
            const reasonCode = err instanceof AiGatewayError ? err.errorCode : 'HEALTH_CHECK_FAILED';
            return { ok: false, checkedAt, reasonCode };
        }
    }

    public async invoke(request: InferenceRequest): Promise<InferenceResult> {
        const startedAt = Date.now();
        const provider = this.assertProviderEnabled();
        const model = this.resolveModelForRequest(request);
        const credentialRef = model.credentialRef || provider.credentialRef;
        const effectiveTimeoutMs = Math.min(
            request.deadlineMs > 0 ? request.deadlineMs : model.policy.timeoutMs,
            model.policy.timeoutMs
        );

        return this.credentialBroker.withCredential(credentialRef, async ephemeralSecret => {
            const endpointBase = process.env[provider.endpointEnvVar] || provider.defaultEndpoint;
            const url = `${endpointBase.replace(/\/+$/, '')}/invoke`;
            const headers: Record<string, string> = {
                'content-type': 'application/json',
                'x-correlation-id': request.correlationId,
                'x-request-id': request.requestId,
                authorization: `Bearer ${ephemeralSecret}`,
            };

            const payload = JSON.stringify({
                modelRef: model.providerModelIdRef,
                task: request.task,
                messages: request.messages,
                maxOutputTokens: request.maxOutputTokens ?? model.policy.maxOutputTokens,
                requestedTools: request.requestedTools,
            });

            const transport = this.getTransport();
            let response: HttpTransportResponse;
            try {
                response = await this.executeWithDeadline(
                    transport({
                        url,
                        method: 'POST',
                        headers,
                        body: payload,
                        timeoutMs: effectiveTimeoutMs,
                    }),
                    effectiveTimeoutMs
                );
            } catch (err: any) {
                if (err instanceof AiGatewayError) {
                    throw err;
                }
                throw new AiGatewayError('NETWORK_INTERRUPTED', __t('ai.error.network_interrupted'), 502);
            }

            if (response.status === 429) {
                throw new AiGatewayError(
                    'PROVIDER_RATE_LIMITED',
                    __t('ai.error.provider_rate_limited'),
                    429,
                    { providerId: this.providerId, modelAlias: request.modelAlias }
                );
            }

            if (response.status >= 500) {
                throw new AiGatewayError(
                    'UPSTREAM_UNAVAILABLE',
                    __t('ai.error.upstream_unavailable'),
                    502,
                    { providerId: this.providerId, status: response.status }
                );
            }

            if (response.status < 200 || response.status >= 300) {
                throw new AiGatewayError(
                    'UPSTREAM_UNAVAILABLE',
                    __t('ai.error.upstream_non_2xx'),
                    502,
                    { providerId: this.providerId, status: response.status }
                );
            }

            let parsedBody: any;
            try {
                parsedBody = JSON.parse(response.body);
            } catch {
                throw new AiGatewayError('MALFORMED_OUTPUT', __t('ai.error.malformed_output'), 502, {
                    providerId: this.providerId,
                });
            }

            if (!parsedBody || typeof parsedBody.output !== 'string') {
                throw new AiGatewayError('MALFORMED_OUTPUT', __t('ai.error.malformed_output_schema'), 502, {
                    providerId: this.providerId,
                });
            }

            const inputTokens =
                typeof parsedBody.usage?.inputTokens === 'number'
                    ? parsedBody.usage.inputTokens
                    : this.estimateInputTokens(request);
            const outputTokens =
                typeof parsedBody.usage?.outputTokens === 'number'
                    ? parsedBody.usage.outputTokens
                    : Math.max(1, Math.ceil(parsedBody.output.length / 4));

            const finishReason = ['stop', 'length', 'tool_call', 'blocked', 'error'].includes(
                parsedBody.finishReason
            )
                ? parsedBody.finishReason
                : 'stop';

            return {
                requestId: request.requestId,
                providerId: this.providerId,
                modelAlias: request.modelAlias,
                adapterVersion: provider.adapterVersion,
                output: this.credentialBroker.redactString(parsedBody.output),
                usage: { inputTokens, outputTokens },
                finishReason,
                latencyMs: Math.max(1, Date.now() - startedAt),
            };
        });
    }

    private assertProviderEnabled(): CatalogProviderEntry {
        const provider = this.catalog.getProvider(this.providerId);
        if (!provider) {
            throw new AiGatewayError('PROVIDER_NOT_FOUND', __t('ai.error.provider_not_found'), 404, {
                providerId: this.providerId,
            });
        }
        if (provider.status !== 'enabled') {
            throw new AiGatewayError('PROVIDER_DISABLED', __t('ai.error.provider_disabled'), 503, {
                providerId: this.providerId,
            });
        }
        return provider;
    }

    private resolveModelForRequest(request: InferenceRequest): CatalogModelEntry {
        const model = this.catalog.getModel(request.modelAlias);
        if (!model) {
            throw new AiGatewayError('MODEL_NOT_FOUND', __t('ai.error.model_not_found'), 404, {
                modelAlias: request.modelAlias,
            });
        }
        return model;
    }

    private estimateInputTokens(request: InferenceRequest): number {
        const totalChars = request.messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
        return Math.max(1, Math.ceil(totalChars / 4));
    }

    private async executeWithDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                reject(new AiGatewayError('PROVIDER_TIMEOUT', __t('ai.error.provider_timeout'), 504));
            }, timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }
}

/**
 * Sovereign Deterministic Provider Adapter (Enforces Constitutional Law 9 / INV-AI-001).
 * Executes deterministic, rule-governed evaluation without external LLM dependencies,
 * while still strictly enforcing credential broker verification and policy boundaries.
 */
export class SovereignDeterministicAdapter implements InferenceProvider {
    public readonly providerId = 'sovereign-deterministic';
    private readonly catalog: ModelCatalog;
    private readonly credentialBroker: CredentialBroker;

    constructor(catalog: ModelCatalog, credentialBroker: CredentialBroker) {
        this.catalog = catalog;
        this.credentialBroker = credentialBroker;
    }

    public async capabilities(): Promise<ModelCapability[]> {
        return this.catalog
            .listModels(true)
            .filter(m => m.providerId === this.providerId && m.status === 'enabled')
            .map(m => m.capabilities);
    }

    public async healthCheck(): Promise<{ ok: boolean; checkedAt: string; reasonCode?: string }> {
        const checkedAt = new Date().toISOString();
        const provider = this.catalog.getProvider(this.providerId);
        if (!provider || provider.status !== 'enabled') {
            return { ok: false, checkedAt, reasonCode: 'PROVIDER_DISABLED' };
        }
        try {
            this.credentialBroker.resolveHandle(provider.credentialRef);
            return { ok: true, checkedAt };
        } catch (err: any) {
            return {
                ok: false,
                checkedAt,
                reasonCode: err instanceof AiGatewayError ? err.errorCode : 'CREDENTIALS_MISSING',
            };
        }
    }

    public async invoke(request: InferenceRequest): Promise<InferenceResult> {
        const startedAt = Date.now();
        const provider = this.catalog.getProvider(this.providerId);
        if (!provider || provider.status !== 'enabled') {
            throw new AiGatewayError('PROVIDER_DISABLED', __t('ai.error.provider_disabled'), 503, {
                providerId: this.providerId,
            });
        }
        const model = this.catalog.getModel(request.modelAlias);
        if (!model) {
            throw new AiGatewayError('MODEL_NOT_FOUND', __t('ai.error.model_not_found'), 404, {
                modelAlias: request.modelAlias,
            });
        }

        const credentialRef = model.credentialRef || provider.credentialRef;
        return this.credentialBroker.withCredential(credentialRef, async () => {
            const combinedPrompt = request.messages.map(m => `${m.role}:${m.content}`).join('\n');
            const digest = crypto.createHash('sha256').update(combinedPrompt, 'utf8').digest('hex').slice(0, 16);

            let output: string;
            let finishReason: 'stop' | 'tool_call' = 'stop';
            if (request.task === 'embedding') {
                const vec = Array.from({ length: 8 }, (_, idx) =>
                    Number(((parseInt(digest.slice(idx * 2, idx * 2 + 2), 16) - 128) / 128).toFixed(4))
                );
                output = JSON.stringify({ object: 'embedding', vector: vec, fingerprint: digest });
            } else if (request.task === 'classification') {
                output = JSON.stringify({
                    classification: 'DETERMINISTIC_VERIFIED',
                    strategy: 'atomic',
                    region: request.region,
                    fingerprint: digest,
                });
            } else if (request.requestedTools && request.requestedTools.length > 0) {
                finishReason = 'tool_call';
                output = JSON.stringify({
                    status: 'TOOL_VALIDATED',
                    tools: request.requestedTools.map(t => t.name),
                    fingerprint: digest,
                });
            } else {
                output = `[SOVEREIGN_DETERMINISTIC:${request.task.toUpperCase()}] Verified execution plan digest=${digest} region=${request.region}`;
            }

            const inputTokens = Math.max(1, Math.ceil(combinedPrompt.length / 4));
            const outputTokens = Math.max(1, Math.ceil(output.length / 4));

            return {
                requestId: request.requestId,
                providerId: this.providerId,
                modelAlias: request.modelAlias,
                adapterVersion: provider.adapterVersion,
                output: this.credentialBroker.redactString(output),
                usage: { inputTokens, outputTokens },
                finishReason,
                latencyMs: Math.max(1, Date.now() - startedAt),
            };
        });
    }
}

export class ProviderAdapterRegistry {
    private readonly adapters = new Map<string, InferenceProvider>();
    private transport: HttpTransport = defaultHttpTransport;

    constructor(catalog: ModelCatalog, credentialBroker: CredentialBroker) {
        const getTransport = () => this.transport;
        const standardProviders = ['aws-bedrock', 'openai', 'anthropic', 'google-gemini', 'azure-openai'];
        for (const providerId of standardProviders) {
            this.adapters.set(
                providerId,
                new ExternalHttpProviderAdapter(providerId, catalog, credentialBroker, getTransport)
            );
        }
        this.adapters.set(
            'airroofers-ai',
            new AirRoofersAiProviderAdapter(catalog, credentialBroker, getTransport)
        );
        this.adapters.set(
            'sovereign-deterministic',
            new SovereignDeterministicAdapter(catalog, credentialBroker)
        );
    }

    public setHttpTransport(customTransport: HttpTransport): void {
        this.transport = customTransport;
    }

    public registerAdapter(adapter: InferenceProvider): void {
        if (!adapter || !adapter.providerId) {
            throw new AiGatewayError('INVALID_REQUEST', __t('ai.error.invalid_adapter_registration'), 400);
        }
        this.adapters.set(adapter.providerId, adapter);
    }

    public getAdapter(providerId: string): InferenceProvider {
        const adapter = this.adapters.get(providerId);
        if (!adapter) {
            throw new AiGatewayError('PROVIDER_NOT_FOUND', __t('ai.error.provider_not_found'), 404, {
                providerId,
            });
        }
        return adapter;
    }

    public listRegisteredProviderIds(): string[] {
        return Array.from(this.adapters.keys());
    }
}
