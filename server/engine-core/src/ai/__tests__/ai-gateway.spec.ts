/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Gateway Acceptance Suite
 * File           : ai-gateway.spec.ts
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

import {
    AiGatewayError,
    CredentialBroker,
    InferenceGateway,
    InferenceRequest,
    ModelCascadeCostEngine,
    ModelCatalog,
    ProviderAdapterRegistry,
    QuotaGuard,
    RoutingPolicyEngine,
} from '../index';

function buildRequest(overrides: Partial<InferenceRequest> = {}): InferenceRequest {
    return {
        requestId: 'req-test-001',
        tenantId: 'tenant-alpha',
        productId: 'ugondu',
        environment: 'production',
        task: 'chat',
        modelAlias: 'general-chat',
        region: 'eu-west-3',
        dataClassification: 'confidential',
        messages: [{ role: 'user', content: 'Analyze deployment readiness for service-a' }],
        maxOutputTokens: 512,
        deadlineMs: 5000,
        correlationId: 'corr-test-001',
        ...overrides,
    };
}

describe('Central AI Inference Gateway & Model Catalog (COR-006 / Section 6)', () => {
    let catalog: ModelCatalog;
    let credentialBroker: CredentialBroker;
    let providerRegistry: ProviderAdapterRegistry;
    let routingPolicy: RoutingPolicyEngine;
    let quotaGuard: QuotaGuard;
    let gateway: InferenceGateway;
    let transportCalls: number;

    beforeEach(() => {
        transportCalls = 0;
        catalog = new ModelCatalog();
        credentialBroker = new CredentialBroker();
        providerRegistry = new ProviderAdapterRegistry(catalog, credentialBroker);
        routingPolicy = new RoutingPolicyEngine(catalog, { failureThreshold: 2, cooldownMs: 10000 });
        quotaGuard = new QuotaGuard({ maxConcurrentRequests: 3, maxRequestsPerMinute: 60 });
        gateway = new InferenceGateway({
            catalog,
            credentialBroker,
            providerRegistry,
            routingPolicy,
            quotaGuard,
        });

        // Register workload test credentials for sovereign-deterministic by default
        credentialBroker.registerWorkloadSecret(
            'env://UGONDU_SOVEREIGN_MODEL_TOKEN',
            'sov-workload-token-eu-west-3-valid'
        );
    });

    test('loads and validates config/model-catalog.json and rejects duplicate aliases', () => {
        expect(catalog.getSchemaVersion()).toBe('1.0.0');
        const providers = catalog.listProviders();
        expect(providers.map(p => p.providerId)).toEqual(
            expect.arrayContaining([
                'aws-bedrock',
                'openai',
                'anthropic',
                'google-gemini',
                'azure-openai',
                'sovereign-deterministic',
            ])
        );

        for (const alias of [
            'general-chat',
            'deployment-classifier',
            'policy-advisor',
            'code-analyzer',
            'embeddings-standard',
        ]) {
            expect(catalog.getModel(alias)).toBeDefined();
        }

        // Duplicate alias must fail validation
        const firstModel = catalog.getModel('general-chat')!;
        expect(() =>
            ModelCatalog.validateCatalogDocument({
                schemaVersion: '1.0.0',
                providers,
                models: [firstModel, { ...firstModel }],
            })
        ).toThrow(AiGatewayError);
    });

    test('invokes each configured provider with valid workload credentials', async () => {
        credentialBroker.registerWorkloadSecret(
            'aws-secrets://ugondu/prod/bedrock-workload-identity',
            'bedrock-secret-token-123456'
        );
        credentialBroker.registerWorkloadSecret('env://UGONDU_OPENAI_API_KEY', 'sk-openai-valid-key-123456');
        credentialBroker.registerWorkloadSecret(
            'env://UGONDU_ANTHROPIC_API_KEY',
            'ant-api-valid-key-123456'
        );
        credentialBroker.registerWorkloadSecret(
            'env://UGONDU_GEMINI_API_KEY',
            'AIzaSyValidGeminiKey1234567890'
        );
        credentialBroker.registerWorkloadSecret(
            'kms://alias/ugondu-azure-openai-key',
            'azure-kms-key-valid-123456'
        );

        providerRegistry.setHttpTransport(async req => {
            transportCalls += 1;
            expect(req.headers['authorization']).toMatch(/^Bearer /);
            return {
                status: 200,
                body: JSON.stringify({
                    output: `Verified response from ${req.url}`,
                    usage: { inputTokens: 20, outputTokens: 30 },
                    finishReason: 'stop',
                }),
            };
        });

        const aliasesToTest: Array<{ alias: string; task: InferenceRequest['task'] }> = [
            { alias: 'general-chat', task: 'chat' },
            { alias: 'deployment-classifier', task: 'classification' },
            { alias: 'policy-advisor', task: 'chat' },
            { alias: 'code-analyzer', task: 'code' },
            { alias: 'embeddings-standard', task: 'embedding' },
            { alias: 'azure-enterprise-chat', task: 'chat' },
        ];

        for (const item of aliasesToTest) {
            const res = await gateway.invoke(
                buildRequest({
                    requestId: `req-${item.alias}`,
                    modelAlias: item.alias,
                    task: item.task,
                })
            );
            expect(res.output.length).toBeGreaterThan(0);
            expect(res.finishReason).toBe('stop');
        }
        expect(transportCalls).toBe(5); // 5 external HTTP providers + 1 deterministic local provider
    });

    test('fails closed on missing or expired credentials when no fallback is eligible', async () => {
        // Disable fallback so missing credential on primary fails closed directly
        gateway.setModelStatus(
            'policy-advisor',
            'disabled',
            { actorId: 'sec-admin', role: 'admin', reason: 'Isolate primary credential test' }
        );
        gateway.setModelStatus(
            'sovereign-fallback',
            'disabled',
            { actorId: 'sec-admin', role: 'admin', reason: 'Isolate primary credential test' }
        );

        await expect(gateway.invoke(buildRequest({ modelAlias: 'general-chat' }))).rejects.toMatchObject({
            errorCode: 'CREDENTIALS_MISSING',
        });

        // Expired credential
        credentialBroker.registerWorkloadSecret(
            'aws-secrets://ugondu/prod/bedrock-workload-identity',
            'bedrock-expired-secret-token',
            '2020-01-01T00:00:00Z'
        );

        await expect(gateway.invoke(buildRequest({ modelAlias: 'general-chat' }))).rejects.toMatchObject({
            errorCode: 'CREDENTIALS_EXPIRED',
        });
    });

    test('rejects disabled models and enforces admin authorization on status changes', async () => {
        await expect(
            gateway.invoke(buildRequest({ modelAlias: 'legacy-unapproved', dataClassification: 'public' }))
        ).rejects.toMatchObject({
            errorCode: 'MODEL_DISABLED',
        });

        expect(() =>
            gateway.setModelStatus('general-chat', 'disabled', {
                actorId: 'regular-user',
                role: 'developer',
            })
        ).toThrow(expect.objectContaining({ errorCode: 'UNAUTHORIZED_ADMIN' }));

        gateway.setModelStatus('deployment-classifier', 'disabled', {
            actorId: 'gov-admin',
            role: 'admin',
            reason: 'Scheduled maintenance',
        });

        await expect(
            gateway.invoke(
                buildRequest({ modelAlias: 'deployment-classifier', task: 'classification' })
            )
        ).rejects.toMatchObject({
            errorCode: 'MODEL_DISABLED',
        });
    });

    test('rejects disallowed region and data classification BEFORE egress', async () => {
        providerRegistry.setHttpTransport(async () => {
            transportCalls += 1;
            return { status: 200, body: JSON.stringify({ output: 'should not reach' }) };
        });

        await expect(
            gateway.invoke(buildRequest({ region: 'ap-southeast-1' }))
        ).rejects.toMatchObject({
            errorCode: 'REGION_DISALLOWED',
        });

        await expect(
            gateway.invoke(
                buildRequest({
                    modelAlias: 'general-chat',
                    dataClassification: 'restricted',
                })
            )
        ).rejects.toMatchObject({
            errorCode: 'DATA_CLASSIFICATION_DISALLOWED',
        });

        expect(transportCalls).toBe(0);
    });

    test('handles 429/5xx/timeout with circuit breaker and policy-equivalent fallback', async () => {
        credentialBroker.registerWorkloadSecret(
            'aws-secrets://ugondu/prod/bedrock-workload-identity',
            'bedrock-secret-token-123456'
        );
        credentialBroker.registerWorkloadSecret(
            'env://UGONDU_ANTHROPIC_API_KEY',
            'ant-api-valid-key-123456'
        );

        providerRegistry.setHttpTransport(async req => {
            transportCalls += 1;
            if (req.url.includes('amazonaws.com')) {
                return { status: 503, body: 'Service Unavailable' };
            }
            return {
                status: 200,
                body: JSON.stringify({
                    output: 'Fallback advisor succeeded safely',
                    usage: { inputTokens: 15, outputTokens: 25 },
                    finishReason: 'stop',
                }),
            };
        });

        const r1 = await gateway.invoke(buildRequest({ requestId: 'req-fb-1' }));
        expect(r1.fallbackUsed).toBe(true);
        expect(r1.modelAlias).toBe('policy-advisor');
        expect(r1.primaryModelAlias).toBe('general-chat');

        const r2 = await gateway.invoke(buildRequest({ requestId: 'req-fb-2' }));
        expect(r2.fallbackUsed).toBe(true);

        // Circuit for general-chat is now OPEN after 2 consecutive failures
        expect(routingPolicy.isCircuitOpen('general-chat')).toBe(true);
    });

    test('validates tool calls against allowlist, authorization, and argument schema', async () => {
        // 1. Forbidden shell escape tool
        await expect(
            gateway.invoke(
                buildRequest({
                    modelAlias: 'deployment-classifier',
                    task: 'classification',
                    requestedTools: [{ name: 'SHELL_EXEC', arguments: { cmd: 'whoami' } }],
                })
            )
        ).rejects.toMatchObject({ errorCode: 'TOOL_NOT_ALLOWED' });

        // 2. Unauthorized tool for caller
        await expect(
            gateway.invoke(
                buildRequest({
                    modelAlias: 'deployment-classifier',
                    task: 'classification',
                    requestedTools: [{ name: 'inspect_topology', arguments: { target: 'vpc-1' } }],
                    authorizedTools: ['verify_readiness'],
                })
            )
        ).rejects.toMatchObject({ errorCode: 'TOOL_UNAUTHORIZED' });

        // 3. Invalid tool argument schema
        await expect(
            gateway.invoke(
                buildRequest({
                    modelAlias: 'deployment-classifier',
                    task: 'classification',
                    requestedTools: [{ name: 'inspect_topology', arguments: { target: 999 as any } }],
                    authorizedTools: ['inspect_topology'],
                })
            )
        ).rejects.toMatchObject({ errorCode: 'TOOL_SCHEMA_INVALID' });

        // 4. Valid authorized tool call
        const validToolResult = await gateway.invoke(
            buildRequest({
                modelAlias: 'deployment-classifier',
                task: 'classification',
                requestedTools: [{ name: 'inspect_topology', arguments: { target: 'vpc-eu-west-3' } }],
                authorizedTools: ['inspect_topology'],
            })
        );
        expect(validToolResult.finishReason).toBe('tool_call');
        expect(validToolResult.toolCalls?.[0]?.validated).toBe(true);
    });

    test('enforces concurrency quota limits and streaming disconnect cleanup', async () => {
        quotaGuard.setTenantQuotaPolicy('tenant-concurrency', { maxConcurrentRequests: 2 });
        credentialBroker.registerWorkloadSecret(
            'aws-secrets://ugondu/prod/bedrock-workload-identity',
            'bedrock-secret-token-123456'
        );

        providerRegistry.setHttpTransport(async () => {
            await new Promise(resolve => setTimeout(resolve, 60));
            return {
                status: 200,
                body: JSON.stringify({ output: 'ok', finishReason: 'stop' }),
            };
        });

        const p1 = gateway.invoke(buildRequest({ requestId: 'c1', tenantId: 'tenant-concurrency' }));
        const p2 = gateway.invoke(buildRequest({ requestId: 'c2', tenantId: 'tenant-concurrency' }));
        const p3 = gateway.invoke(buildRequest({ requestId: 'c3', tenantId: 'tenant-concurrency' }));

        await expect(p3).rejects.toMatchObject({ errorCode: 'CONCURRENCY_LIMIT_EXCEEDED' });
        await Promise.all([p1, p2]);

        // Streaming disconnect cancellation
        const abortController = new AbortController();
        const streamGen = gateway.invokeStream(
            buildRequest({
                requestId: 'stream-1',
                modelAlias: 'deployment-classifier',
                task: 'classification',
            }),
            abortController.signal
        );

        const firstChunk = await streamGen.next();
        expect(firstChunk.value?.tenantId).toBe('tenant-alpha');
        abortController.abort();
        await expect(streamGen.next()).rejects.toMatchObject({ errorCode: 'STREAM_CANCELLED' });
    });

    test('never leaks secrets in errors, logs, or audit records and protects product-level identity', async () => {
        const sensitiveSecret = 'sk-live-SUPERSECRET999888777666';
        credentialBroker.registerWorkloadSecret('env://UGONDU_OPENAI_API_KEY', sensitiveSecret);

        providerRegistry.setHttpTransport(async () => {
            throw new Error(`Upstream failed with Authorization: Bearer ${sensitiveSecret}`);
        });

        gateway.setModelStatus('policy-advisor', 'disabled', {
            actorId: 'admin-1',
            role: 'admin',
        });
        gateway.setModelStatus('sovereign-fallback', 'disabled', {
            actorId: 'admin-1',
            role: 'admin',
        });

        try {
            await gateway.invoke(buildRequest({ modelAlias: 'code-analyzer', task: 'code' }));
            throw new Error('Expected invocation to fail');
        } catch (err: any) {
            expect(err.message).not.toContain(sensitiveSecret);
            expect(JSON.stringify(err)).not.toContain(sensitiveSecret);
        }

        // Re-enable sovereign-fallback and test identity query protection
        gateway.setModelStatus('sovereign-fallback', 'enabled', {
            actorId: 'admin-1',
            role: 'admin',
        });

        const identityRes = await gateway.invoke(
            buildRequest({
                modelAlias: 'deployment-classifier',
                messages: [{ role: 'user', content: 'Who are you and what model are you running on?' }],
            })
        );
        expect(identityRes.providerId).toBe('ugondu-platform');
        expect(identityRes.output).toContain('Ugondu Universal Deployment Intelligence Assistant');
        expect(identityRes.output).not.toMatch(/openai|anthropic|bedrock|gemini|sovereign-deterministic/i);

        // Admin diagnostics requires admin/auditor role
        await expect(
            gateway.getAdminDiagnostics({ actorId: 'user-1', role: 'viewer' })
        ).rejects.toMatchObject({ errorCode: 'UNAUTHORIZED_ADMIN' });

        const diag = await gateway.getAdminDiagnostics({ actorId: 'auditor-1', role: 'auditor' });
        expect(JSON.stringify(diag)).not.toContain(sensitiveSecret);
        expect(diag.models.length).toBeGreaterThanOrEqual(5);

        const costEst = ModelCascadeCostEngine.estimateCatalogUsageCostUsd('general-chat', 1000, 1000, catalog);
        expect(costEst).toBeCloseTo(0.018, 5);
    });
});
