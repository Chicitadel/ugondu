/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Air Roofers AI Provider Adapter
 * File           : airroofers-provider.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-22
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

import { __t } from '@ugondu/shared';
import {
    AiGatewayError,
    CatalogModelEntry,
    CatalogProviderEntry,
    FinishReason,
    InferenceProvider,
    InferenceRequest,
    InferenceResult,
    ModelCapability,
} from './contracts';
import { CredentialBroker } from './credential-broker';
import { ModelCatalog } from './model-catalog';
import { HttpTransport, HttpTransportRequest, HttpTransportResponse } from './provider-registry';

const defaultHttpTransport: HttpTransport = async (req: HttpTransportRequest): Promise<HttpTransportResponse> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs);
    try {
        const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body, signal: controller.signal });
        return { status: res.status, body: await res.text() };
    } catch (err: any) {
        if (err?.name === 'AbortError' || /timeout|aborted/i.test(String(err?.message))) {
            throw new AiGatewayError('PROVIDER_TIMEOUT', __t('ai.error.provider_timeout') || 'Provider request timed out', 504);
        }
        throw new AiGatewayError('NETWORK_INTERRUPTED', __t('ai.error.network_interrupted') || 'Network interrupted', 502);
    } finally {
        clearTimeout(timer);
    }
};

/**
 * Sovereign Production Adapter for Air Roofers AI Fabric.
 */
export class AirRoofersAiProviderAdapter implements InferenceProvider {
    public readonly providerId: string;
    private readonly catalog: ModelCatalog;
    private readonly credentialBroker: CredentialBroker;
    private transport: HttpTransport = defaultHttpTransport;

    constructor(
        arg1: ModelCatalog | string,
        arg2: CredentialBroker | ModelCatalog,
        arg3?: HttpTransport | (() => HttpTransport) | CredentialBroker,
        arg4?: HttpTransport | (() => HttpTransport)
    ) {
        let t: any;
        if (typeof arg1 === 'string') {
            this.providerId = arg1;
            this.catalog = arg2 as ModelCatalog;
            this.credentialBroker = arg3 as CredentialBroker;
            t = arg4;
        } else {
            this.providerId = 'airroofers-ai';
            this.catalog = arg1;
            this.credentialBroker = arg2 as CredentialBroker;
            t = arg3;
        }
        if (t) this.setHttpTransport(t);
    }

    public setHttpTransport(transport: HttpTransport | (() => HttpTransport)): void {
        this.transport = async (req: HttpTransportRequest): Promise<HttpTransportResponse> => {
            const res = (transport as any)(req);
            return typeof res === 'function' ? await res(req) : await res;
        };
    }

    private redactRawUrl(raw: string): string {
        try {
            const u = new URL(raw);
            u.username = '';
            u.password = '';
            return this.credentialBroker.redactString(u.toString());
        } catch {
            return this.credentialBroker.redactString(raw.replace(/\/\/[^@/]+@/, '//***:***@'));
        }
    }

    public getBaseUrl(): string {
        const provider = this.catalog.getProvider(this.providerId);
        const envVar = provider?.endpointEnvVar || 'UGONDU_AIRROOFERS_AI_BASE_URL';
        const rawUrl = process.env[envVar] || provider?.defaultEndpoint;

        if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
            throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_REQUIRED' as any, __t('ai.error.endpoint_required') || 'Air Roofers AI endpoint configuration is required; fallback to hardcoded default is prohibited by zero-hardcoding governance', 500, { providerId: this.providerId, envVar });
        }

        let parsed: URL;
        try {
            parsed = new URL(rawUrl.trim());
        } catch {
            throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_MALFORMED' as any, __t('ai.error.endpoint_malformed', { url: this.redactRawUrl(rawUrl) }) || ('Air Roofers AI endpoint URL is malformed: ' + this.redactRawUrl(rawUrl)), 400, { providerId: this.providerId });
        }

        if (parsed.protocol !== 'https:') {
            throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_INSECURE' as any, __t('ai.error.endpoint_insecure', { protocol: parsed.protocol }) || ('Air Roofers AI endpoint must use HTTPS protocol, received: ' + parsed.protocol), 400, { providerId: this.providerId, protocol: parsed.protocol });
        }

        if (provider?.supportedRegions && !['ai.airroofers.eu', 'ai-staging.airroofers.eu', 'ai.airroofers.de', 'ai.airroofers.fr'].includes(parsed.hostname) && !parsed.hostname.endsWith('.airroofers.eu')) {
            throw new AiGatewayError('AIRROOFERS_AI_ENDPOINT_DISALLOWED' as any, __t('ai.error.endpoint_disallowed', { hostname: parsed.hostname }) || ('Air Roofers AI endpoint host is not permitted by residency policy: ' + parsed.hostname), 403, { providerId: this.providerId, hostname: parsed.hostname });
        }

        return rawUrl.trim().replace(/\/+$/, '');
    }

    public async capabilities(): Promise<ModelCapability[]> {
        const models = this.catalog.listModels(true).filter(m => m.providerId === this.providerId && m.status === 'enabled');
        if (models.length > 0) return models.map(m => m.capabilities);
        return [{ streaming: false, toolCalling: true, structuredOutput: true, modalities: ['text', 'embedding'], maxInputTokens: 128000, maxOutputTokens: 4096 }];
    }

    public async healthCheck(): Promise<{ ok: boolean; checkedAt: string; reasonCode?: string }> {
        const checkedAt = new Date().toISOString();
        const provider = this.catalog.getProvider(this.providerId);
        if (!provider || provider.status !== 'enabled') return { ok: false, checkedAt, reasonCode: 'PROVIDER_DISABLED' };
        try {
            this.credentialBroker.resolveHandle(provider.credentialRef);
        } catch (err: any) {
            return { ok: false, checkedAt, reasonCode: err instanceof AiGatewayError ? err.errorCode : 'CREDENTIALS_MISSING' };
        }

        try {
            const res = await this.transport({ url: `${this.getBaseUrl()}/health`, method: 'GET', headers: { accept: 'application/json' }, timeoutMs: 5000 });
            return res.status >= 200 && res.status < 300 ? { ok: true, checkedAt } : { ok: false, checkedAt, reasonCode: `HTTP_${res.status}` };
        } catch (err: any) {
            return { ok: false, checkedAt, reasonCode: err instanceof AiGatewayError ? err.errorCode : 'UPSTREAM_UNAVAILABLE' };
        }
    }

    public async discoverModels(): Promise<{ models: Array<{ id: string; name?: string; status: string; capabilities?: any }>; discoveredAt: string }> {
        const provider = this.assertProviderEnabled();
        const baseUrl = this.getBaseUrl();
        const discoveredAt = new Date().toISOString();
        return this.credentialBroker.withCredential(provider.credentialRef, async ephemeralSecret => {
            const res = await this.transport({
                url: `${baseUrl}/v1/ai/models`,
                method: 'GET',
                headers: { accept: 'application/json', authorization: `Bearer ${ephemeralSecret}` },
                timeoutMs: 10000,
            });
            if (res.status === 401) throw new AiGatewayError('AUTHENTICATION_FAILED' as any, __t('ai.error.credentials_missing') || 'Authentication failed', 401);
            if (res.status !== 200) throw new AiGatewayError('UPSTREAM_UNAVAILABLE', __t('ai.error.upstream_unavailable') || 'Failed to discover models', 502);
            let data: any;
            try {
                data = JSON.parse(res.body);
            } catch {
                throw new AiGatewayError('MALFORMED_OUTPUT', __t('ai.error.malformed_output') || 'Malformed model list response', 502);
            }
            const modelsList = Array.isArray(data?.models) ? data.models : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            return { models: modelsList, discoveredAt };
        });
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
            const url = `${this.getBaseUrl()}/v1/ai/execute`;
            const headers: Record<string, string> = {
                'content-type': 'application/json',
                accept: 'application/json',
                authorization: `Bearer ${ephemeralSecret}`,
                'x-correlation-id': request.correlationId,
                'x-tenant-id': request.tenantId,
                'x-request-id': request.requestId,
            };

            const modelId = model.providerModelIdRef.includes('/')
                ? model.providerModelIdRef.split('/').pop()!
                : model.providerModelIdRef;

            const postBody = {
                model_id: modelId,
                payload: {
                    messages: request.messages,
                    max_tokens: request.maxOutputTokens ?? model.policy.maxOutputTokens,
                    task: request.task,
                },
                context: {
                    tenant_id: request.tenantId,
                    product_id: request.productId,
                    environment: request.environment,
                    region: request.region,
                    correlation_id: request.correlationId,
                    data_classification: request.dataClassification,
                },
            };

            let response: HttpTransportResponse;
            try {
                response = await this.executeWithDeadline(
                    this.transport({
                        url,
                        method: 'POST',
                        headers,
                        body: JSON.stringify(postBody),
                        timeoutMs: effectiveTimeoutMs,
                    }),
                    effectiveTimeoutMs
                );
            } catch (err: any) {
                if (err instanceof AiGatewayError) throw err;
                throw new AiGatewayError('NETWORK_INTERRUPTED', __t('ai.error.network_interrupted') || 'Network interrupted', 502);
            }

            if (response.status === 401) {
                throw new AiGatewayError('AUTHENTICATION_FAILED' as any, __t('ai.error.credentials_missing') || 'Air Roofers AI authentication failed', 401, { providerId: this.providerId, status: 401 });
            }
            if (response.status === 429) {
                throw new AiGatewayError('PROVIDER_RATE_LIMITED', __t('ai.error.rate_limit_exceeded') || 'Air Roofers AI rate limit exceeded', 429, { providerId: this.providerId, modelAlias: request.modelAlias, status: 429 });
            }
            if (response.status >= 500) {
                throw new AiGatewayError('UPSTREAM_UNAVAILABLE', __t('ai.error.upstream_unavailable') || 'Air Roofers AI upstream service unavailable', 502, { providerId: this.providerId, status: response.status });
            }
            if (response.status < 200 || response.status >= 300) {
                throw new AiGatewayError('UPSTREAM_UNAVAILABLE', __t('ai.error.upstream_unavailable') || `Air Roofers AI non-2xx status: ${response.status}`, 502, { providerId: this.providerId, status: response.status });
            }

            let parsed: any;
            try {
                parsed = JSON.parse(response.body);
            } catch {
                throw new AiGatewayError('MALFORMED_OUTPUT', __t('ai.error.malformed_output') || 'Malformed output from Air Roofers AI', 502, { providerId: this.providerId });
            }

            if (parsed && parsed.success === false) {
                const code = parsed.code === 'RATE_LIMIT_EXCEEDED'
                    ? 'PROVIDER_RATE_LIMITED'
                    : /AUTH/i.test(parsed.code || '')
                    ? ('AUTHENTICATION_FAILED' as any)
                    : 'UPSTREAM_UNAVAILABLE';
                throw new AiGatewayError(code, parsed.error || 'Air Roofers AI error', code === 'PROVIDER_RATE_LIMITED' ? 429 : 502, {
                    providerId: this.providerId,
                    code: parsed.code,
                });
            }

            let outputText = '';
            if (typeof parsed.output === 'string') outputText = parsed.output;
            else if (parsed.output?.completion) outputText = String(parsed.output.completion);
            else if (parsed.output?.text) outputText = String(parsed.output.text);
            else if (typeof parsed.completion === 'string') outputText = parsed.completion;
            else if (typeof parsed.result === 'string') outputText = parsed.result;
            else if (typeof parsed.text === 'string') outputText = parsed.text;
            else if (parsed.output && typeof parsed.output === 'object') outputText = JSON.stringify(parsed.output);
            else outputText = JSON.stringify(parsed);

            const inputTokens = parsed.usage?.prompt_tokens ?? parsed.token_metrics?.prompt_tokens ?? parsed.usage?.inputTokens ?? this.estimateInputTokens(request);
            const outputTokens = parsed.usage?.completion_tokens ?? parsed.token_metrics?.completion_tokens ?? parsed.usage?.outputTokens ?? Math.max(1, Math.ceil(outputText.length / 4));
            const finishReason: FinishReason = ['stop', 'length', 'tool_call', 'blocked', 'error'].includes(parsed.finishReason)
                ? parsed.finishReason
                : 'stop';

            const toolCalls = Array.isArray(parsed.toolCalls)
                ? parsed.toolCalls
                : Array.isArray(parsed.output?.tools)
                ? parsed.output.tools.map((t: any) => (typeof t === 'string' ? { name: t, arguments: {}, validated: true } : { ...t, validated: true }))
                : undefined;

            return {
                requestId: request.requestId,
                providerId: this.providerId,
                modelAlias: request.modelAlias,
                adapterVersion: provider.adapterVersion || '3.1.0',
                output: this.credentialBroker.redactString(outputText),
                usage: { inputTokens: Number(inputTokens), outputTokens: Number(outputTokens) },
                finishReason,
                latencyMs: Math.max(1, Date.now() - startedAt),
                ...(toolCalls ? { toolCalls } : {}),
            };
        });
    }

    private assertProviderEnabled(): CatalogProviderEntry {
        const provider = this.catalog.getProvider(this.providerId);
        if (!provider) throw new AiGatewayError('PROVIDER_NOT_FOUND', __t('ai.error.provider_not_found') || 'Provider not found', 404, { providerId: this.providerId });
        if (provider.status !== 'enabled') throw new AiGatewayError('PROVIDER_DISABLED', __t('ai.error.provider_disabled') || 'Provider disabled', 503, { providerId: this.providerId });
        return provider;
    }

    private resolveModelForRequest(request: InferenceRequest): CatalogModelEntry {
        const model = this.catalog.getModel(request.modelAlias);
        if (!model) throw new AiGatewayError('MODEL_NOT_FOUND', __t('ai.error.model_not_found') || 'Model not found', 404, { modelAlias: request.modelAlias });
        return model;
    }

    private estimateInputTokens(request: InferenceRequest): number {
        const totalChars = request.messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
        return Math.max(1, Math.ceil(totalChars / 4));
    }

    private async executeWithDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
        let timer: NodeJS.Timeout | undefined;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new AiGatewayError('PROVIDER_TIMEOUT', __t('ai.error.provider_timeout') || 'Provider request timed out', 504)), timeoutMs);
        });
        try {
            return await Promise.race([promise, timeoutPromise]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }
}
