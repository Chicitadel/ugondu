/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Unit & Contract Test Suite
 * File           : billing-gateway.spec.ts
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
import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateKeyPairSync } from 'crypto';
import axios from 'axios';
import {
    signServiceIdentity,
    globalTrustRegistry,
    Logger,
    parseTraceparent,
    generateTraceparent,
    createOutboundPropagationHeaders,
} from '@ugondu/shared';
import {
    app,
    tokenStore,
    clearReplayCache,
    resolveAllowedOrigins,
    resolveEditionEntitlements,
    CENTRAL_EDITION_TABLE,
    BillingErrorCode,
} from '../index';
import { JsonLicenseDatabase, LicenseStoreError } from '../db';

const testKeys = generateKeyPairSync('ed25519');
const privateKeyPem = testKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const publicKeyPem = testKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const TEST_KEY_ID = 'key_bg_unit_test_v1';

globalTrustRegistry.registerKey({
    keyId: TEST_KEY_ID,
    algorithm: 'ed25519',
    status: 'ACTIVE',
    purpose: 'service-identity',
    publicKey: publicKeyPem,
});

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

function makeServiceAuthHeader(): Record<string, string> {
    const svcToken = signServiceIdentity(
        'engine-core',
        'billing-gateway',
        'execute',
        privateKeyPem,
        TEST_KEY_ID
    );
    return { Authorization: `Bearer ${svcToken}` };
}

describe('Portable persistent license-store contract', () => {
    let root: string;

    beforeEach(() => {
        root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-license-store-'));
    });

    afterEach(() => {
        fs.rmSync(root, { recursive: true, force: true });
    });

    it('persists license records atomically and reloads them across store instances', () => {
        const first = new JsonLicenseDatabase(root);
        expect(first.isReady()).toBe(true);

        first.set('token-durable-1', 'tenant-durable', 'professional', {
            entitlements: ['deploy.atomic'],
        });

        const dbPath = path.join(root, 'billing.json');
        expect(fs.existsSync(dbPath)).toBe(true);
        if (process.platform !== 'win32') {
            expect(fs.statSync(dbPath).mode & 0o777).toBe(0o600);
        }

        const second = new JsonLicenseDatabase(root);
        expect(second.isReady()).toBe(true);
        expect(second.get('token-durable-1')).toMatchObject({
            tenant_id: 'tenant-durable',
            edition: 'professional',
            status: 'active',
            entitlements: ['deploy.atomic'],
        });
    });

    it('fails readiness and rejects writes when persisted state is corrupt', () => {
        fs.writeFileSync(path.join(root, 'billing.json'), '{not-json', { mode: 0o600 });
        const store = new JsonLicenseDatabase(root);

        expect(store.isReady()).toBe(false);
        expect(store.get('any-token')).toBeNull();

        let thrown: unknown;
        try {
            store.set('token-corrupt', 'tenant-x', 'free');
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(LicenseStoreError);
        expect(thrown).toMatchObject({ code: 'LICENSE_STORE_INVALID_DATA' });
        expect(fs.readFileSync(path.join(root, 'billing.json'), 'utf8')).toBe('{not-json');
    });

    it('does not fall back to memory or temporary storage when the configured data path is unusable', () => {
        const blocker = path.join(root, 'not-a-directory');
        fs.writeFileSync(blocker, 'reserved');

        const store = new JsonLicenseDatabase(blocker);
        expect(store.isReady()).toBe(false);
        expect(() => store.set('token-no-store', 'tenant-x', 'free')).toThrow(LicenseStoreError);
        expect(fs.readFileSync(blocker, 'utf8')).toBe('reserved');
    });

    it('rolls back the in-memory mutation when a persistent write fails', () => {
        const store = new JsonLicenseDatabase(root);
        expect(store.isReady()).toBe(true);

        fs.rmSync(root, { recursive: true, force: true });
        fs.writeFileSync(root, 'block-directory-recreation');

        expect(() => store.set('token-write-fail', 'tenant-x', 'free')).toThrow(LicenseStoreError);
        expect(store.isReady()).toBe(false);
        expect(store.get('token-write-fail')).toBeNull();
    });
});

describe('Billing Gateway — Governance, Entitlements, Telemetry & License Lifecycle', () => {
    let server: http.Server;

    beforeAll((done) => {
        server = app.listen(0, '127.0.0.1', () => done());
    });

    afterAll((done) => {
        server.close(() => done());
    });

    beforeEach(() => {
        tokenStore.clearForTesting();
        clearReplayCache();
        delete process.env.IDENTITY_AUTHORITY_URL;
        delete process.env.ALLOWED_ORIGINS;
        jest.restoreAllMocks();
    });

    describe('Central Edition Catalog & CORS Configuration', () => {
        it('resolves all canonical editions and capability limits without inline ternaries', () => {
            expect(Object.keys(CENTRAL_EDITION_TABLE)).toEqual([
                'community',
                'free',
                'professional',
                'business',
                'enterprise',
                'sovereign',
            ]);

            const free = resolveEditionEntitlements('FREE');
            expect(free?.capabilities.maxPlugins).toBe(1);
            expect(free?.capabilities.allowAtomic).toBe(false);
            expect(free?.capabilities.allowRollback).toBe(false);
            expect(free?.capabilities.allowTelemetry).toBe(false);

            const prof = resolveEditionEntitlements('professional');
            expect(prof?.capabilities.maxPlugins).toBe(5);
            expect(prof?.capabilities.allowAtomic).toBe(true);
            expect(prof?.capabilities.allowRollback).toBe(true);
            expect(prof?.capabilities.allowTelemetry).toBe(false);

            const biz = resolveEditionEntitlements('business');
            expect(biz?.capabilities.maxPlugins).toBe(50);
            expect(biz?.capabilities.allowTelemetry).toBe(true);

            const ent = resolveEditionEntitlements('enterprise');
            expect(ent?.capabilities.maxPlugins).toBe(250);
            expect(ent?.capabilities.allowTelemetry).toBe(true);

            const sov = resolveEditionEntitlements('sovereign');
            expect(sov?.capabilities.maxPlugins).toBe(999);
            expect(sov?.capabilities.allowTelemetry).toBe(true);

            expect(resolveEditionEntitlements('unknown_tier')).toBeNull();
        });

        it('defaults CORS origin to http://localhost:4001 and honors ALLOWED_ORIGINS', () => {
            const defaults = resolveAllowedOrigins();
            expect(defaults).toContain('http://localhost:4001');
            expect(defaults).not.toContain('http://localhost:3000');

            process.env.ALLOWED_ORIGINS = 'https://console.airroofers.eu, http://localhost:4001';
            expect(resolveAllowedOrigins()).toEqual([
                'https://console.airroofers.eu',
                'http://localhost:4001',
            ]);
        });
    });

    describe('Health, Readiness, Metadata & W3C Telemetry Context', () => {
        it('exposes /health, /health/live, /health/ready, and /v1/metadata without cor_level', async () => {
            const incomingTraceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
            const healthRes = await requestJson(server, 'GET', '/health', undefined, {
                traceparent: incomingTraceparent,
                'x-correlation-id': 'corr-test-101',
            });
            expect(healthRes.status).toBe(200);
            expect(healthRes.body.status).toBe('ok');
            expect(healthRes.body.service).toBe('billing-gateway');
            expect(healthRes.body.cor_level).toBeUndefined();
            expect(healthRes.headers['traceparent']).toBe(incomingTraceparent);
            expect(healthRes.headers['x-correlation-id']).toBe('corr-test-101');

            const liveRes = await requestJson(server, 'GET', '/health/live');
            expect(liveRes.status).toBe(200);
            expect(liveRes.body.status).toBe('live');

            const readyRes = await requestJson(server, 'GET', '/health/ready');
            expect(readyRes.status).toBe(200);
            expect(readyRes.body.status).toBe('ready');
            expect(readyRes.body.checks.tokenStore).toBe('ok');

            const metaRes = await requestJson(server, 'GET', '/v1/metadata');
            expect(metaRes.status).toBe(200);
            expect(metaRes.body.service).toBe('billing-gateway');
            expect(metaRes.body.editions).toContain('sovereign');
        });

        it('parses and generates W3C traceparent and redacts key and value-level secrets in Logger', () => {
            const tp = generateTraceparent();
            const parsed = parseTraceparent(tp);
            expect(parsed).not.toBeNull();
            expect(parsed?.version).toBe('00');

            const outbound = createOutboundPropagationHeaders({
                traceId: parsed!.traceId,
                spanId: parsed!.spanId,
                traceFlags: '01',
                correlationId: 'corr-xyz',
            });
            expect(outbound['traceparent']).toBe(tp);
            expect(outbound['x-correlation-id']).toBe('corr-xyz');

            const fakePem = ['-----BEGIN', 'RSA PRIVATE', 'KEY-----', 'MIIBOgIBAAJBAKj34', '-----END', 'RSA PRIVATE', 'KEY-----'].join(' ');
            const fakeJwt = 'eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJ0ZW5hbnRfMDEifQ.c2lnbmF0dXJlX2hlcmU';
            const fakeAwsSecret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

            const entry = Logger.formatEntry('INFO', `Auth header Bearer secret_tok_999 and ${fakeJwt}`, {
                apiKey: 'raw_api_key',
                nestedMessage: `Key material: ${fakePem} and AWS=${fakeAwsSecret}`,
                trace_id: '4bf92f3577b34da6a3ce929d0e0e4736',
                span_id: '00f067aa0ba902b7',
                correlation_id: 'corr-logger-01',
            });

            const serialized = JSON.stringify(entry);
            expect(entry.trace_id).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
            expect(entry.span_id).toBe('00f067aa0ba902b7');
            expect(entry.correlation_id).toBe('corr-logger-01');
            expect(serialized).not.toContain('secret_tok_999');
            expect(serialized).not.toContain('raw_api_key');
            expect(serialized).not.toContain('MIIBOgIBAAJBAKj34');
            expect(serialized).not.toContain(fakeJwt);
            expect(serialized).not.toContain(fakeAwsSecret);
            expect(serialized).toContain('[REDACTED]');
        });
    });

    describe('License Authorization Outcomes & Replay/Idempotency Protection', () => {
        it('returns 401 AUTH_TOKEN_MISSING when token is omitted', async () => {
            const res = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                {},
                makeServiceAuthHeader()
            );
            expect(res.status).toBe(401);
            expect(res.body.code).toBe(BillingErrorCode.AUTH_TOKEN_MISSING);
            expect(res.body.outcome).toBe('invalid');
        });

        it('returns 200 authorized for seeded active tokens and resolves capabilities from catalog', async () => {
            tokenStore.registerToken('ugp_active_prof', 'tenant_prof_01', 'professional', {
                status: 'active',
            });

            const res = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_active_prof', repositoryUrl: 'https://github.com/org/repo' },
                makeServiceAuthHeader()
            );
            expect(res.status).toBe(200);
            expect(res.body.outcome).toBe('authorized');
            expect(res.body.tenantId).toBe('tenant_prof_01');
            expect(res.body.edition).toBe('professional');
            expect(res.body.capabilities.maxPlugins).toBe(5);
            expect(res.body.capabilities.allowAtomic).toBe(true);
            expect(res.body.capabilities.allowRollback).toBe(true);
        });

        it('distinguishes invalid (402), expired (403), revoked (403), suspended (403), insufficient_entitlement (403), and upstream_unavailable (503)', async () => {
            // 1. Unverified / invalid token -> 402
            const invalidRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'unverified_tok_000' },
                makeServiceAuthHeader()
            );
            expect(invalidRes.status).toBe(402);
            expect(invalidRes.body.code).toBe(BillingErrorCode.LICENSE_INVALID);
            expect(invalidRes.body.outcome).toBe('invalid');

            // 2. Expired token -> 403
            tokenStore.registerToken('ugp_exp_tok', 'tenant_exp', 'professional', {
                status: 'expired',
                expiresAt: '2021-01-01T00:00:00.000Z',
            });
            const expRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_exp_tok' },
                makeServiceAuthHeader()
            );
            expect(expRes.status).toBe(403);
            expect(expRes.body.code).toBe(BillingErrorCode.LICENSE_EXPIRED);
            expect(expRes.body.outcome).toBe('expired');

            // 3. Revoked token -> 403
            tokenStore.registerToken('ugp_rev_tok', 'tenant_rev', 'professional', {
                status: 'revoked',
            });
            const revRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_rev_tok' },
                makeServiceAuthHeader()
            );
            expect(revRes.status).toBe(403);
            expect(revRes.body.code).toBe(BillingErrorCode.LICENSE_REVOKED);
            expect(revRes.body.outcome).toBe('revoked');

            // 4. Suspended token -> 403
            tokenStore.registerToken('ugp_susp_tok', 'tenant_susp', 'professional', {
                status: 'suspended',
                suspendedReason: 'Account billing hold',
            });
            const suspRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_susp_tok' },
                makeServiceAuthHeader()
            );
            expect(suspRes.status).toBe(403);
            expect(suspRes.body.code).toBe(BillingErrorCode.LICENSE_SUSPENDED);
            expect(suspRes.body.outcome).toBe('suspended');

            // 5. Insufficient entitlement -> 403
            tokenStore.registerToken('ugp_free_tok', 'tenant_free', 'free', {
                status: 'active',
            });
            const insuffRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                {
                    token: 'ugp_free_tok',
                    requiredEdition: 'sovereign',
                },
                makeServiceAuthHeader()
            );
            expect(insuffRes.status).toBe(403);
            expect(insuffRes.body.code).toBe(BillingErrorCode.INSUFFICIENT_ENTITLEMENT);
            expect(insuffRes.body.outcome).toBe('insufficient_entitlement');

            // 6. Upstream unavailable -> 503 fail-closed
            jest.spyOn(axios, 'post').mockRejectedValueOnce(
                Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
            );
            const upstreamRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_remote_tok', requireUpstream: true },
                makeServiceAuthHeader()
            );
            expect(upstreamRes.status).toBe(503);
            expect(upstreamRes.body.code).toBe(BillingErrorCode.UPSTREAM_UNAVAILABLE);
            expect(upstreamRes.body.outcome).toBe('upstream_unavailable');
        });

        it('enforces nonce replay protection and Idempotency-Key deduplication', async () => {
            tokenStore.registerToken('ugp_replay_tok', 'tenant_rep', 'business', {
                status: 'active',
            });

            // Nonce replay check
            const firstNonceRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_replay_tok', nonce: 'nonce-abc-123' },
                makeServiceAuthHeader()
            );
            expect(firstNonceRes.status).toBe(200);

            const secondNonceRes = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_replay_tok', nonce: 'nonce-abc-123' },
                makeServiceAuthHeader()
            );
            expect(secondNonceRes.status).toBe(409);
            expect(secondNonceRes.body.code).toBe(BillingErrorCode.REPLAY_DETECTED);

            // Idempotency-Key check
            const idempHeaders = {
                ...makeServiceAuthHeader(),
                'Idempotency-Key': 'idemp-key-001',
            };
            const firstIdemp = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_replay_tok', repositoryUrl: 'https://github.com/org/one' },
                idempHeaders
            );
            expect(firstIdemp.status).toBe(200);

            const replaySamePayload = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_replay_tok', repositoryUrl: 'https://github.com/org/one' },
                {
                    ...makeServiceAuthHeader(),
                    'Idempotency-Key': 'idemp-key-001',
                }
            );
            expect(replaySamePayload.status).toBe(200);
            expect(replaySamePayload.body.idempotentReplay).toBe(true);

            const replayConflictingPayload = await requestJson(
                server,
                'POST',
                '/v1/authorize',
                { token: 'ugp_replay_tok', repositoryUrl: 'https://github.com/org/different' },
                {
                    ...makeServiceAuthHeader(),
                    'Idempotency-Key': 'idemp-key-001',
                }
            );
            expect(replayConflictingPayload.status).toBe(409);
            expect(replayConflictingPayload.body.code).toBe(BillingErrorCode.REPLAY_DETECTED);
        });
    });
});
