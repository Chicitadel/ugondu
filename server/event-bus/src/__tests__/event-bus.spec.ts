/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Event Bus — Unit & Contract Test Suite
 * File           : event-bus.spec.ts
 * Version        : 2026.3.1-LTS
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
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import http from 'http';
import axios from 'axios';
import {
    app,
    eventStore,
    deadLetterLog,
    setEventBusConfig,
    setSimulatedQueueDepth,
    validateEventEnvelope,
} from '../index';

function requestJson(
    server: http.Server,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, any>,
    headers: Record<string, string> = {}
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any }> {
    return new Promise((resolve, reject) => {
        const addr = server.address() as { port: number };
        const payload = body !== undefined ? JSON.stringify(body) : undefined;
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: addr.port,
                path,
                method,
                headers: {
                    ...(payload
                        ? {
                              'Content-Type': 'application/json',
                              'Content-Length': String(Buffer.byteLength(payload)),
                          }
                        : {}),
                    ...headers,
                },
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => (raw += chunk));
                res.on('end', () => {
                    try {
                        resolve({
                            status: res.statusCode || 0,
                            headers: res.headers,
                            body: raw ? JSON.parse(raw) : {},
                        });
                    } catch {
                        resolve({
                            status: res.statusCode || 0,
                            headers: res.headers,
                            body: raw,
                        });
                    }
                });
            }
        );
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

describe('Event Bus — Envelope Validation, Idempotency, Backpressure, DLQ & Tenant Isolation', () => {
    let server: http.Server;

    beforeAll((done) => {
        server = app.listen(0, '127.0.0.1', () => done());
    });

    afterAll((done) => {
        server.close(() => done());
    });

    beforeEach(() => {
        eventStore.clearForTesting();
        setEventBusConfig({ maxQueueDepth: 100, maxRetries: 3, retryDelayMs: 1 });
        setSimulatedQueueDepth(0);
        jest.restoreAllMocks();
    });

    it('exposes /health, /health/live, /health/ready, and /v1/metadata without cor_level', async () => {
        const health = await requestJson(server, 'GET', '/health');
        expect(health.status).toBe(200);
        expect(health.body.status).toBe('ok');
        expect(health.body.service).toBe('event-bus');
        expect(health.body.cor_level).toBeUndefined();

        const live = await requestJson(server, 'GET', '/health/live');
        expect(live.status).toBe(200);
        expect(live.body.status).toBe('live');

        const ready = await requestJson(server, 'GET', '/health/ready');
        expect(ready.status).toBe(200);
        expect(ready.body.status).toBe('ready');

        const meta = await requestJson(server, 'GET', '/v1/metadata');
        expect(meta.status).toBe(200);
        expect(meta.body.service).toBe('event-bus');
        expect(meta.body.supportedSchemaVersions).toContain('1.0.0');
    });

    it('enforces versioned event envelope schema validation', async () => {
        const invalidRes = await requestJson(server, 'POST', '/v1/events/publish', {
            type: 'DEPLOYMENT_COMPLETED',
        });
        expect(invalidRes.status).toBe(400);
        expect(invalidRes.body.code).toBe('SCHEMA_VALIDATION_FAILED');
        expect(Array.isArray(invalidRes.body.details)).toBe(true);

        const badVersion = validateEventEnvelope({
            eventId: 'evt-001',
            schemaVersion: '99.9',
            type: 'DEPLOYMENT_COMPLETED',
            tenantId: 'tenant_a',
            correlationId: 'corr-001',
            timestamp: new Date().toISOString(),
            payload: { ok: true },
        });
        expect(badVersion.valid).toBe(false);
    });

    it('enforces idempotency deduplication by eventId and redacts payload secrets', async () => {
        const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: {} } as any);

        const subRes = await requestJson(server, 'POST', '/v1/events/subscribe', {
            tenantId: 'tenant_alpha',
            type: 'DEPLOYMENT_STARTED',
            webhookUrl: 'https://hooks.airroofers.eu/events',
        });
        expect(subRes.status).toBe(201);

        const envelope = {
            eventId: 'evt-idemp-100',
            schemaVersion: '1.0.0',
            type: 'DEPLOYMENT_STARTED',
            tenantId: 'tenant_alpha',
            correlationId: 'corr-alpha-100',
            timestamp: new Date().toISOString(),
            payload: {
                environment: 'production',
                apiToken: 'super_secret_token_value',
                authHeader: 'Bearer raw_bearer_secret_123',
            },
        };

        const firstPub = await requestJson(server, 'POST', '/v1/events/publish', envelope);
        expect(firstPub.status).toBe(200);
        expect(firstPub.body.dispatched).toBe(true);
        expect(firstPub.body.deduplicated).toBe(false);
        expect(firstPub.body.deliveredCount).toBe(1);
        expect(firstPub.body.payload.apiToken).toBe('[REDACTED]');
        expect(firstPub.body.payload.authHeader).toBe('Bearer [REDACTED]');
        expect(postSpy).toHaveBeenCalledTimes(1);

        const secondPub = await requestJson(server, 'POST', '/v1/events/publish', envelope);
        expect(secondPub.status).toBe(200);
        expect(secondPub.body.dispatched).toBe(false);
        expect(secondPub.body.deduplicated).toBe(true);
        expect(secondPub.body.idempotentReplay).toBe(true);
        expect(postSpy).toHaveBeenCalledTimes(1);
    });

    it('enforces tenant isolation on subscribe and publish', async () => {
        const postSpy = jest.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: {} } as any);

        await requestJson(server, 'POST', '/v1/events/subscribe', {
            tenantId: 'tenant_one',
            type: 'RELEASE_PROMOTED',
            webhookUrl: 'https://hooks.tenant-one.example.com/Input',
        });

        await requestJson(server, 'POST', '/v1/events/subscribe', {
            tenantId: 'tenant_two',
            type: 'RELEASE_PROMOTED',
            webhookUrl: 'https://hooks.tenant-two.example.com/Input',
        });

        // Cross-tenant header mismatch on publish must fail with 403
        const crossTenantRes = await requestJson(
            server,
            'POST',
            '/v1/events/publish',
            {
                eventId: 'evt-cross-001',
                schemaVersion: '1.0.0',
                type: 'RELEASE_PROMOTED',
                tenantId: 'tenant_one',
                correlationId: 'corr-cross-001',
                timestamp: new Date().toISOString(),
                payload: { releaseId: 'rel_1' },
            },
            { 'x-tenant-id': 'tenant_two' }
        );
        expect(crossTenantRes.status).toBe(403);
        expect(crossTenantRes.body.code).toBe('CROSS_TENANT_ACCESS_DENIED');

        // Valid publish for tenant_one only dispatches to tenant_one's subscriber
        const validRes = await requestJson(
            server,
            'POST',
            '/v1/events/publish',
            {
                eventId: 'evt-tenant-one-001',
                schemaVersion: '1.0.0',
                type: 'RELEASE_PROMOTED',
                tenantId: 'tenant_one',
                correlationId: 'corr-one-001',
                timestamp: new Date().toISOString(),
                payload: { releaseId: 'rel_1' },
            },
            { 'x-tenant-id': 'tenant_one' }
        );
        expect(validRes.status).toBe(200);
        expect(validRes.body.deliveredCount).toBe(1);
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy.mock.calls[0][0]).toBe('https://hooks.tenant-one.example.com/Input');
    });

    it('enforces bounded queue backpressure and bounded retries with deadLetterLog', async () => {
        // 1. Backpressure rejection when queue is full
        setEventBusConfig({ maxQueueDepth: 2, maxRetries: 3, retryDelayMs: 1 });
        setSimulatedQueueDepth(2);

        const bpRes = await requestJson(server, 'POST', '/v1/events/publish', {
            eventId: 'evt-bp-001',
            schemaVersion: '1.0.0',
            type: 'AUDIT_EVENT',
            tenantId: 'tenant_bp',
            correlationId: 'corr-bp-001',
            timestamp: new Date().toISOString(),
            payload: { action: 'test' },
        });
        expect(bpRes.status).toBe(429);
        expect(bpRes.body.code).toBe('BACKPRESSURE_REJECTED');

        // 2. Bounded retries + dead-letter queue on persistent webhook failure
        setSimulatedQueueDepth(0);
        const postSpy = jest
            .spyOn(axios, 'post')
            .mockRejectedValue(new Error('Upstream webhook 502 Bad Gateway'));

        await requestJson(server, 'POST', '/v1/events/subscribe', {
            tenantId: 'tenant_dlq',
            type: 'AUDIT_EVENT',
            webhookUrl: 'https://failing-webhook.example.com/hook',
        });

        const dlqPub = await requestJson(server, 'POST', '/v1/events/publish', {
            eventId: 'evt-dlq-001',
            schemaVersion: '1.0.0',
            type: 'AUDIT_EVENT',
            tenantId: 'tenant_dlq',
            correlationId: 'corr-dlq-001',
            timestamp: new Date().toISOString(),
            payload: { secretPassword: 'my_secret_password', status: 'failed' },
        });

        expect(dlqPub.status).toBe(200);
        expect(dlqPub.body.deliveredCount).toBe(0);
        expect(dlqPub.body.deadLetteredCount).toBe(1);
        expect(postSpy).toHaveBeenCalledTimes(3);
        expect(deadLetterLog.length).toBe(1);
        expect(deadLetterLog[0].eventId).toBe('evt-dlq-001');
        expect(deadLetterLog[0].attempts).toBe(3);
        expect(deadLetterLog[0].payload.secretPassword).toBe('[REDACTED]');
    });
});
