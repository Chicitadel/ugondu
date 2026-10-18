/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration
 * File           : billing-gateway.test.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : COMMERCIAL | INTERNAL
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

'use strict';

const assert = require('assert');
const http = require('http');
const { generateKeyPairSync } = require('crypto');

const { signServiceIdentity, globalTrustRegistry } = require('../server/shared/dist/identity');
const { seedTestTokens } = require('../server/billing-gateway/dist/test/seeder');
const { app, clearReplayCache } = require('../server/billing-gateway/dist/index');

const serviceTestKeys = generateKeyPairSync('ed25519');
const serviceTestPrivateKey = serviceTestKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const serviceTestPublicKey = serviceTestKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const SERVICE_TEST_KEY_ID = 'key_service_test_v1';

globalTrustRegistry.registerKey({
    keyId: SERVICE_TEST_KEY_ID,
    algorithm: 'ed25519',
    status: 'ACTIVE',
    purpose: 'service-identity',
    publicKey: serviceTestPublicKey,
});

function request(port, method, reqPath, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const serviceToken = signServiceIdentity(
            'engine-core',
            'billing-gateway',
            'execute',
            serviceTestPrivateKey,
            SERVICE_TEST_KEY_ID
        );
        const data = body !== undefined ? JSON.stringify(body) : null;
        const options = {
            hostname: '127.0.0.1',
            port,
            path: reqPath,
            method,
            headers: {
                ...(data
                    ? {
                          'Content-Type': 'application/json',
                          'Content-Length': Buffer.byteLength(data),
                      }
                    : {}),
                Authorization: `Bearer ${serviceToken}`,
                ...extraHeaders,
            },
        };
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => (responseBody += chunk));
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: JSON.parse(responseBody),
                    });
                } catch {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: responseBody,
                    });
                }
            });
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
}

function post(port, reqPath, body, extraHeaders = {}) {
    return request(port, 'POST', reqPath, body, extraHeaders);
}

function get(port, reqPath, extraHeaders = {}) {
    return request(port, 'GET', reqPath, undefined, extraHeaders);
}

let passed = 0;
let failed = 0;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Billing Gateway');
    console.log('[en] ══════════════════════════════════════════════════════');

    delete process.env.IDENTITY_AUTHORITY_URL;
    clearReplayCache();
    seedTestTokens();

    const server = await new Promise((resolve, reject) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
        s.on('error', reject);
    });
    const BILLING_PORT = server.address().port;

    try {
        // Test 1: Health, live, ready, metadata endpoints & W3C traceparent
        try {
            const tp = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
            const h = await get(BILLING_PORT, '/health', {
                traceparent: tp,
                'x-correlation-id': 'corr-bg-001',
            });
            assert.strictEqual(h.status, 200);
            assert.strictEqual(h.body.status, 'ok');
            assert.strictEqual(h.body.cor_level, undefined);
            assert.strictEqual(h.headers['traceparent'], tp);
            assert.strictEqual(h.headers['x-correlation-id'], 'corr-bg-001');

            const live = await get(BILLING_PORT, '/health/live');
            assert.strictEqual(live.status, 200);
            assert.strictEqual(live.body.status, 'live');

            const ready = await get(BILLING_PORT, '/health/ready');
            assert.strictEqual(ready.status, 200);
            assert.strictEqual(ready.body.status, 'ready');

            const meta = await get(BILLING_PORT, '/v1/metadata');
            assert.strictEqual(meta.status, 200);
            assert.strictEqual(meta.body.service, 'billing-gateway');
            console.log('[en] ✓ PASS: Health, liveness, readiness, metadata & W3C traceparent verified');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Health/metadata test —', e.message);
            failed++;
        }

        // Test 2: Missing token returns 401
        try {
            const r = await post(BILLING_PORT, '/v1/authorize', {});
            assert.strictEqual(r.status, 401, `[en] Expected 401 for missing token, got ${r.status}`);
            assert.strictEqual(r.body.code, 'AUTH_TOKEN_MISSING');
            console.log('[en] ✓ PASS: Missing token returns 401');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Missing token returns 401 —', e.message);
            failed++;
        }

        // Test 3: Seeded active community token returns 200
        try {
            const r = await post(BILLING_PORT, '/v1/authorize', { token: 'community_token_123' });
            assert.strictEqual(r.status, 200, `[en] Expected 200 for active community token, got ${r.status}`);
            assert.strictEqual(r.body.edition, 'community');
            assert.strictEqual(r.body.outcome, 'authorized');
            assert.strictEqual(r.body.capabilities.maxPlugins, 1);
            assert.strictEqual(r.body.capabilities.allowAtomic, false);
            console.log('[en] ✓ PASS: Seeded active community token returns 200 with community capabilities');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Active community token test —', e.message);
            failed++;
        }

        // Test 4: Seeded active professional token returns 200
        try {
            const r = await post(BILLING_PORT, '/v1/authorize', { token: 'ugp_demo123' });
            assert.strictEqual(r.status, 200, `[en] Expected 200 for professional token, got ${r.status}`);
            assert.strictEqual(r.body.edition, 'professional');
            assert.strictEqual(r.body.capabilities.allowAtomic, true);
            assert.strictEqual(r.body.capabilities.allowRollback, true);
            assert.strictEqual(r.body.capabilities.maxPlugins, 5);
            console.log('[en] ✓ PASS: Professional token resolves professional edition with full capabilities');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Professional token test —', e.message);
            failed++;
        }

        // Test 5: Seeded active enterprise token returns 200
        try {
            const r = await post(BILLING_PORT, '/v1/authorize', { token: 'uge_corp456' });
            assert.strictEqual(r.status, 200, `[en] Expected 200 for enterprise token, got ${r.status}`);
            assert.strictEqual(r.body.edition, 'enterprise');
            assert.strictEqual(r.body.capabilities.allowTelemetry, true);
            assert.strictEqual(r.body.capabilities.maxPlugins, 250);
            console.log('[en] ✓ PASS: Enterprise token resolves enterprise edition with telemetry');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Enterprise token test —', e.message);
            failed++;
        }

        // Test 6: Unverified token returns 402 Payment Required
        try {
            const r = await post(BILLING_PORT, '/v1/authorize', { token: 'unverified_token_unknown_001' });
            assert.strictEqual(r.status, 402, `[en] Expected 402 for unverified token, got ${r.status}`);
            assert.strictEqual(r.body.code, 'LICENSE_INVALID');
            assert.strictEqual(r.body.outcome, 'invalid');
            console.log('[en] ✓ PASS: Unverified token returns 402 LICENSE_INVALID');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Unverified token test —', e.message);
            failed++;
        }

        // Test 7: Suspended token returns 403 Forbidden
        try {
            const r = await post(BILLING_PORT, '/v1/authorize', { token: 'ugp_suspended_001' });
            assert.strictEqual(r.status, 403, `[en] Expected 403 for suspended token, got ${r.status}`);
            assert.strictEqual(r.body.code, 'LICENSE_SUSPENDED');
            assert.strictEqual(r.body.outcome, 'suspended');
            console.log('[en] ✓ PASS: Suspended token returns 403 LICENSE_SUSPENDED');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Suspended token test —', e.message);
            failed++;
        }

        // Test 8: Expired and revoked tokens return 403 Forbidden
        try {
            const expRes = await post(BILLING_PORT, '/v1/authorize', { token: 'ugp_expired_001' });
            assert.strictEqual(expRes.status, 403, `[en] Expected 403 for expired token, got ${expRes.status}`);
            assert.strictEqual(expRes.body.code, 'LICENSE_EXPIRED');
            assert.strictEqual(expRes.body.outcome, 'expired');

            const revRes = await post(BILLING_PORT, '/v1/authorize', { token: 'ugp_revoked_001' });
            assert.strictEqual(revRes.status, 403, `[en] Expected 403 for revoked token, got ${revRes.status}`);
            assert.strictEqual(revRes.body.code, 'LICENSE_REVOKED');
            assert.strictEqual(revRes.body.outcome, 'revoked');
            console.log('[en] ✓ PASS: Expired and revoked tokens return 403');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Expired/revoked token test —', e.message);
            failed++;
        }
    } finally {
        await new Promise((resolve) => server.close(() => resolve()));
        if (require('../server/billing-gateway/dist/index').serverInstance) {
            require('../server/billing-gateway/dist/index').serverInstance.close();
        }
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
    process.exit(0);
}

runTests().catch((err) => {
    console.error('[en] Fatal test suite error:', err);
    process.exit(1);
});
