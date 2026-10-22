/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Air Roofers AI Staging E2E Suite
 * File           : airroofers-e2e-staging.spec.ts
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

import {
    AiGatewayError,
    AirRoofersAiProviderAdapter,
    CredentialBroker,
    HttpTransport,
    HttpTransportRequest,
    HttpTransportResponse,
    InferenceGateway,
    InferenceRequest,
    ModelCatalog,
    ProviderAdapterRegistry,
    QuotaGuard,
    RoutingPolicyEngine,
} from '../index';

interface StagingSimulatorConfig {
    bearerToken?: string;
    rateLimitTenants?: Set<string>;
    upstreamStatus?: number;
    healthDegraded?: boolean;
    throwNetworkError?: boolean;
}

function createStagingSimulator(config: StagingSimulatorConfig, captured: HttpTransportRequest[]): HttpTransport {
    return async (req: HttpTransportRequest): Promise<HttpTransportResponse> => {
        captured.push(req);

        if (config.throwNetworkError) {
            throw new Error('ECONNRESET: Staging transport connection reset by peer');
        }

        const url = new URL(req.url);
        const path = url.pathname;
        const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
        const expectedAuth = `Bearer ${config.bearerToken || 'test-valid-bearer-token'}`;

        // 1. Operational Health Probe (unauthenticated per AIPlatformController.php line 124)
        if (path === '/health' || path === '/v1/health' || path === '/v1/ai/status') {
            if (config.upstreamStatus && config.upstreamStatus >= 500) {
                return { status: config.upstreamStatus, body: JSON.stringify({ status: 'degraded', error: 'Internal probe failure' }) };
            }
            const isDegraded = !!config.healthDegraded;
            return {
                status: isDegraded ? 503 : 200,
                body: JSON.stringify({
                    status: isDegraded ? 'degraded' : 'operational',
                    timestamp: '2026-10-22T14:00:00Z',
                    service: 'AirRoofers AI Fabric Platform',
                    subdomain: 'ai-staging.airroofers.eu',
                    uptime_indicator: isDegraded ? 'degraded' : 'operational',
                    memory_usage_mb: 48.2,
                    ai_assistant_enabled: true,
                    connectors: {
                        mistral: { provider: 'mistral', configured: true, is_configured: true, status: 'operational' },
                    },
                    policy_engine: { status: 'operational', active_rules_count: 7 },
                    model_registry: { status: 'operational', active_models_count: 5, registered_models_count: 5 },
                }),
            };
        }

        // 2. Authentication Verification (AIPlatformController.php line 134)
        if (authHeader !== expectedAuth) {
            return {
                status: 401,
                body: JSON.stringify({
                    status: 'error',
                    message: 'Unauthorized. Verified platform session required for AI Gateway.',
                }),
            };
        }

        // Upstream fault simulation
        if (config.upstreamStatus && config.upstreamStatus >= 500) {
            return {
                status: config.upstreamStatus,
                body: JSON.stringify({ status: 'error', code: 'UPSTREAM_FAILURE', message: 'Upstream gateway error' }),
            };
        }

        // 3. Model Discovery / Catalog Sync (AIPlatformController.php line 140)
        if (path === '/v1/ai/models') {
            return {
                status: 200,
                body: JSON.stringify({
                    status: 'success',
                    models: [
                        {
                            id: 'sentinel-guard-v1',
                            name: 'Air Roofers Sentinel Guard V1',
                            type: 'sentinel',
                            version: '1.0.0',
                            provider: 'airroofers',
                            status: 'active',
                            capabilities: ['text', 'audit', 'policy_eval'],
                        },
                        {
                            id: 'airroofers-sentinel-v1',
                            name: 'Air Roofers Sentinel V1',
                            type: 'llm',
                            version: '1.2.0',
                            provider: 'airroofers',
                            status: 'active',
                            capabilities: ['text', 'toolCalling', 'structuredOutput'],
                        },
                    ],
                }),
            };
        }

        // 4. Prompt Execution Endpoint (AIPlatformController.php line 182)
        if (path === '/v1/ai/execute') {
            const tenantHeader = req.headers['x-tenant-id'] || '';
            if (config.rateLimitTenants?.has(tenantHeader)) {
                return {
                    status: 429,
                    body: JSON.stringify({
                        status: 'error',
                        success: false,
                        code: 'RATE_LIMIT_EXCEEDED',
                        error: 'Tenant rate limit quota exceeded on AI Fabric Platform',
                    }),
                };
            }

            let parsedBody: any = {};
            try {
                parsedBody = JSON.parse(req.body || '{}');
            } catch {
                return { status: 400, body: JSON.stringify({ status: 'error', message: 'Malformed JSON payload' }) };
            }

            return {
                status: 200,
                body: JSON.stringify({
                    success: true,
                    code: 200,
                    execution_id: 'aix_stg_0192837465',
                    execution_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
                    timestamp: 1729605600,
                    model: {
                        id: parsedBody.model_id || 'sentinel-guard-v1',
                        name: 'Air Roofers Sentinel Guard V1',
                        type: 'sentinel',
                        version: '1.0.0',
                        provider: 'airroofers',
                    },
                    output: 'Deployment manifest verified with compliance score 100%. Zero violations detected.',
                    usage: {
                        prompt_tokens: 12,
                        completion_tokens: 24,
                        total_tokens: 36,
                    },
                }),
            };
        }

        return {
            status: 404,
            body: JSON.stringify({ status: 'error', message: `Endpoint '${path}' not found on AI Fabric Platform.` }),
        };
    };
}

function buildTestRequest(overrides: Partial<InferenceRequest> = {}): InferenceRequest {
    return {
        requestId: 'req-stg-test-001',
        tenantId: 'tenant-enterprise-alpha',
        productId: 'ugondu',
        environment: 'staging',
        task: 'classification',
        modelAlias: 'airroofers-sentinel',
        region: 'eu-west-3',
        dataClassification: 'confidential',
        messages: [{ role: 'user', content: 'Audit deployment manifest for zero-trust compliance' }],
        maxOutputTokens: 1024,
        deadlineMs: 15000,
        correlationId: 'corr-uuid-stg-8888',
        ...overrides,
    };
}

describe('Air Roofers AI Fabric Staging E2E Contract (UG-COR-REAUDIT Sec 3.4)', () => {
    const STAGING_BASE_URL = 'https://ai-staging.airroofers.eu';
    const VALID_BEARER_TOKEN = 'stg-token-airroofers-valid-jwt-987654';
    const CREDENTIAL_REF = 'env://UGONDU_AIRROOFERS_AI_KEY';

    let catalog: ModelCatalog;
    let credentialBroker: CredentialBroker;
    let capturedRequests: HttpTransportRequest[];
    let simConfig: StagingSimulatorConfig;
    let adapter: AirRoofersAiProviderAdapter;

    beforeEach(() => {
        process.env['UGONDU_AIRROOFERS_AI_BASE_URL'] = STAGING_BASE_URL;
        capturedRequests = [];
        simConfig = { bearerToken: VALID_BEARER_TOKEN };

        catalog = new ModelCatalog();
        credentialBroker = new CredentialBroker();
        credentialBroker.registerWorkloadSecret(CREDENTIAL_REF, VALID_BEARER_TOKEN);

        const transport = createStagingSimulator(simConfig, capturedRequests);
        adapter = new AirRoofersAiProviderAdapter('airroofers-ai', catalog, credentialBroker, transport);
    });

    afterEach(() => {
        delete process.env['UGONDU_AIRROOFERS_AI_BASE_URL'];
    });

    test('AF-STG-001: Health probe GET /health succeeds and reports operational status', async () => {
        const result = await adapter.healthCheck();
        expect(result.ok).toBe(true);
        expect(typeof result.checkedAt).toBe('string');
        expect(capturedRequests.length).toBe(1);
        expect(capturedRequests[0].method).toBe('GET');
        expect(capturedRequests[0].url).toBe(`${STAGING_BASE_URL}/health`);

        // Degraded upstream probe reports failure safely
        simConfig.healthDegraded = true;
        const degradedResult = await adapter.healthCheck();
        expect(degradedResult.ok).toBe(false);
        expect(degradedResult.reasonCode).toBe('HTTP_503');
    });

    test('AF-STG-002: Model discovery GET /v1/ai/models returns validated model catalog', async () => {
        const discovery = await adapter.discoverModels();
        expect(Array.isArray(discovery.models)).toBe(true);
        expect(discovery.models.length).toBe(2);

        const modelIds = discovery.models.map(m => m.id);
        expect(modelIds).toContain('sentinel-guard-v1');
        expect(modelIds).toContain('airroofers-sentinel-v1');

        const sentinel = discovery.models.find(m => m.id === 'sentinel-guard-v1');
        expect(sentinel?.status).toBe('active');
        expect(sentinel?.capabilities).toEqual(expect.arrayContaining(['text', 'audit']));

        expect(capturedRequests.length).toBe(1);
        expect(capturedRequests[0].url).toBe(`${STAGING_BASE_URL}/v1/ai/models`);
        expect(capturedRequests[0].headers['authorization']).toBe(`Bearer ${VALID_BEARER_TOKEN}`);
        expect(capturedRequests[0].headers['accept']).toBe('application/json');
    });

    test('AF-STG-003: Authenticated prompt execution POST /v1/ai/execute parses output and usage', async () => {
        const request = buildTestRequest();
        const response = await adapter.invoke(request);

        expect(response.requestId).toBe(request.requestId);
        expect(response.providerId).toBe('airroofers-ai');
        expect(response.modelAlias).toBe('airroofers-sentinel');
        expect(response.output).toContain('Deployment manifest verified with compliance score 100%');
        expect(response.usage).toEqual({ inputTokens: 12, outputTokens: 24 });
        expect(response.finishReason).toBe('stop');
        expect(response.latencyMs).toBeGreaterThanOrEqual(1);

        expect(capturedRequests.length).toBe(1);
        const executed = capturedRequests[0];
        expect(executed.url).toBe(`${STAGING_BASE_URL}/v1/ai/execute`);
        expect(executed.method).toBe('POST');
        expect(executed.headers['authorization']).toBe(`Bearer ${VALID_BEARER_TOKEN}`);
        expect(executed.headers['x-correlation-id']).toBe(request.correlationId);
        expect(executed.headers['x-tenant-id']).toBe(request.tenantId);
        expect(executed.headers['x-request-id']).toBe(request.requestId);

        const body = JSON.parse(executed.body || '{}');
        expect(body.model_id).toBe('sentinel-guard-v1');
        expect(body.context.tenant_id).toBe(request.tenantId);
        expect(body.context.correlation_id).toBe(request.correlationId);
    });

    test('AF-STG-004: Error normalization: HTTP 401 maps to AUTHENTICATION_FAILED', async () => {
        simConfig.bearerToken = 'different-token-causing-401';
        const request = buildTestRequest();

        await expect(adapter.invoke(request)).rejects.toMatchObject({
            errorCode: 'AUTHENTICATION_FAILED',
            statusCode: 401,
        });

        await expect(adapter.discoverModels()).rejects.toMatchObject({
            errorCode: 'AUTHENTICATION_FAILED',
            statusCode: 401,
        });
    });

    test('AF-STG-005: Error normalization: HTTP 429 maps to PROVIDER_RATE_LIMITED', async () => {
        simConfig.rateLimitTenants = new Set(['tenant-rate-limited']);
        const request = buildTestRequest({ tenantId: 'tenant-rate-limited' });

        await expect(adapter.invoke(request)).rejects.toMatchObject({
            errorCode: 'PROVIDER_RATE_LIMITED',
            statusCode: 429,
        });
    });

    test('AF-STG-006: Error normalization: HTTP 502/503 maps to UPSTREAM_UNAVAILABLE', async () => {
        simConfig.upstreamStatus = 502;
        await expect(adapter.invoke(buildTestRequest())).rejects.toMatchObject({
            errorCode: 'UPSTREAM_UNAVAILABLE',
            statusCode: 502,
        });

        simConfig.upstreamStatus = 503;
        await expect(adapter.invoke(buildTestRequest())).rejects.toMatchObject({
            errorCode: 'UPSTREAM_UNAVAILABLE',
            statusCode: 502,
        });
    });

    test('AF-STG-007: Redaction invariant: bearer token NEVER leaks in diagnostics or errors', async () => {
        const sensitiveSecret = 'sk-prod-SECRET-TOKEN-LIVE-AIRROOFERS-999';
        credentialBroker.registerWorkloadSecret(CREDENTIAL_REF, sensitiveSecret);

        // 1. Upstream error payload containing the sensitive token (parsed error message)
        adapter.setHttpTransport(async () => {
            return {
                status: 200,
                body: JSON.stringify({
                    success: false,
                    code: 'UPSTREAM_FAULT',
                    error: `Upstream gateway error with bearer token: Bearer ${sensitiveSecret}`,
                }),
            };
        });

        try {
            await adapter.invoke(buildTestRequest());
            throw new Error('Invocation should have failed');
        } catch (err: any) {
            expect(err.message).not.toContain(sensitiveSecret);
            expect(JSON.stringify(err)).not.toContain(sensitiveSecret);
            expect(err.message).toContain('[REDACTED_SECRET]');
        }

        // 2. Output payload containing the sensitive token (sanitized on completion)
        adapter.setHttpTransport(async () => {
            return {
                status: 200,
                body: JSON.stringify({
                    success: true,
                    code: 200,
                    output: `Diagnostic report with token ${sensitiveSecret}`,
                    usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
                }),
            };
        });

        const redactedRes = await adapter.invoke(buildTestRequest());
        expect(redactedRes.output).not.toContain(sensitiveSecret);
        expect(redactedRes.output).toContain('[REDACTED_SECRET]');
    });

    test('AF-STG-008: Canonical domain policy: non-whitelisted domain rejected fail-closed', async () => {
        process.env['UGONDU_AIRROOFERS_AI_BASE_URL'] = 'https://unauthorized-evil.com';

        expect(() => adapter.getBaseUrl()).toThrow();
        try {
            adapter.getBaseUrl();
        } catch (err: any) {
            expect(err).toBeInstanceOf(AiGatewayError);
            expect(err.errorCode).toBe('AIRROOFERS_AI_ENDPOINT_DISALLOWED');
            expect(err.statusCode).toBe(403);
        }

        // Must reject invocation fail-closed
        await expect(adapter.invoke(buildTestRequest())).rejects.toMatchObject({
            errorCode: 'AIRROOFERS_AI_ENDPOINT_DISALLOWED',
            statusCode: 403,
        });
    });

    test('End-to-end InferenceGateway routing to airroofers-sentinel model alias', async () => {
        const providerRegistry = new ProviderAdapterRegistry(catalog, credentialBroker);
        providerRegistry.registerAdapter(adapter);

        const routingPolicy = new RoutingPolicyEngine(catalog);
        const quotaGuard = new QuotaGuard();
        const gateway = new InferenceGateway({
            catalog,
            credentialBroker,
            providerRegistry,
            routingPolicy,
            quotaGuard,
        });

        const gatewayResult = await gateway.invoke(buildTestRequest());
        expect(gatewayResult.providerId).toBe('airroofers-ai');
        expect(gatewayResult.output).toContain('Deployment manifest verified');
        expect(gatewayResult.usage?.inputTokens).toBe(12);
        expect(gatewayResult.usage?.outputTokens).toBe(24);
    });
});
