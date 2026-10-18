/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Integration — Engine Core
 * File           : engine-core.test.js
 * Version        : 4.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-09-29
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
 * - ISO 27001
 * - SOC 2 Type II
 * - OWASP ASVS
 * - NIST SP 800-53 / 800-207
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Global Release Operations Command
 *
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Engineering. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');

function request(port, method, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const data = body !== undefined ? JSON.stringify(body) : '';
        const headers = {
            'Content-Type': 'application/json',
            ...extraHeaders,
        };
        if (body !== undefined) {
            headers['Content-Length'] = Buffer.byteLength(data);
        }
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port,
                path,
                method,
                headers,
            },
            (res) => {
                let responseBody = '';
                res.on('data', (chunk) => (responseBody += chunk));
                res.on('end', () => {
                    try {
                        resolve({ status: res.statusCode, body: JSON.parse(responseBody), headers: res.headers });
                    } catch {
                        resolve({ status: res.statusCode, body: responseBody, headers: res.headers });
                    }
                });
            }
        );
        req.on('error', reject);
        if (body !== undefined) {
            req.write(data);
        }
        req.end();
    });
}

function post(port, path, body, extraHeaders = { 'X-Ugondu-Passport-Id': 'valid_passport_id' }) {
    return request(port, 'POST', path, body, extraHeaders);
}

function get(port, path, extraHeaders = {}) {
    return request(port, 'GET', path, undefined, extraHeaders);
}

let ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '4001', 10);
let passed = 0;
let failed = 0;
let serverProcess = null;
let mockBillingServer = null;

if (!process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY || process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY === '<placeholder>') {
    const { generateKeyPairSync } = require('crypto');
    const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    process.env.UGONDU_SERVICE_TEST_PUBKEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
    process.env.UGONDU_SERVICE_TEST_KEY_ID = 'key_service_test_v1';
}

async function ensureBillingAuthority() {
    return new Promise((resolve) => {
        const srv = http.createServer((req, res) => {
            if (req.method === 'POST' && req.url === '/v1/authorize') {
                let raw = '';
                req.on('data', (c) => (raw += c));
                req.on('end', () => {
                    let parsed = {};
                    try {
                        parsed = JSON.parse(raw || '{}');
                    } catch {
                        parsed = {};
                    }
                    res.setHeader('Content-Type', 'application/json');
                    if (parsed.token === 'community_token_123' || parsed.token === 'pro_token_valid') {
                        const isPro = parsed.token === 'pro_token_valid';
                        res.writeHead(200);
                        res.end(
                            JSON.stringify({
                                authorized: true,
                                outcome: 'authorized',
                                edition: isPro ? 'Professional' : 'Community',
                                tier: isPro ? 'professional' : 'community',
                                tenantId: 'tenant_test_default',
                                capabilities: {
                                    maxDeploymentsPerDay: 50,
                                    maxPlugins: 5,
                                    allowAtomic: isPro,
                                    allowRollback: isPro,
                                    customDomains: true,
                                },
                                features: {
                                    maxDeploymentsPerDay: 50,
                                    maxPlugins: 5,
                                    customDomains: true,
                                },
                            })
                        );
                    } else {
                        res.writeHead(402);
                        res.end(
                            JSON.stringify({
                                authorized: false,
                                error: 'LICENSE_INVALID',
                                message: 'Payment or valid entitlement required.',
                            })
                        );
                    }
                });
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ready' }));
        });
        srv.listen(0, '127.0.0.1', () => {
            mockBillingServer = srv;
            const addr = srv.address();
            process.env.BILLING_GATEWAY_URL = `http://127.0.0.1:${addr.port}/v1`;
            resolve();
        });
    });
}

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Engine Core (Deterministic COR-004)');
    console.log('[en] ══════════════════════════════════════════════════════');

    await ensureBillingAuthority();

    try {
        process.env.PORT = '0';
        process.env.NODE_ENV = 'test';
        process.env.UGONDU_DEV_EPHEMERAL_KEYS = 'true';
        const originalListen = http.Server.prototype.listen;
        http.Server.prototype.listen = function (...args) {
            serverProcess = this;
            return originalListen.apply(this, args);
        };
        require('../server/engine-core/dist/index.js');
        await new Promise((resolve) => {
            if (serverProcess && serverProcess.listening) resolve();
            else if (serverProcess) serverProcess.once('listening', resolve);
            else resolve();
        });
        if (serverProcess) {
            ENGINE_PORT = serverProcess.address().port;
        }
        console.log(`[en] Engine Core started in-process on port ${ENGINE_PORT}`);
    } catch (e) {
        console.error(`[en] Failed to start Engine Core: ${e.message}`);
        if (mockBillingServer) mockBillingServer.close();
        process.exit(1);
    }

    // Test 1: Health & Readiness Endpoints (COR-005 & COR-013)
    try {
        const live = await get(ENGINE_PORT, '/health/live');
        assert.strictEqual(live.status, 200, `Expected 200 on /health/live, got ${live.status}`);
        assert.strictEqual(live.body.status, 'alive');
        assert.strictEqual(live.body.cor_level, undefined, 'Health response must not contain static cor_level');

        const ready = await get(ENGINE_PORT, '/health/ready');
        assert.strictEqual(ready.status, 200, `Expected 200 on /health/ready, got ${ready.status}`);
        assert.strictEqual(ready.body.status, 'ready');
        assert.strictEqual(ready.body.cor_level, undefined, 'Readiness response must not contain static cor_level');

        console.log('[en] ✓ PASS: /health/live and /health/ready return 200 with zero static cor_level');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Health & readiness test —', e.message);
        failed++;
    }

    // Test 2: Missing required fields returns 400
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', {});
        assert.strictEqual(r.status, 400, `[en] Expected 400 for missing fields, got ${r.status}`);
        console.log('[en] ✓ PASS: Missing fields returns 400');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Missing fields returns 400 —', e.message);
        failed++;
    }

    // Test 3: Valid deployment context deterministically returns 200 with signed recipe (COR-004 & COR-016)
    try {
        const payload = {
            repositoryUrl: 'https://github.com/example/repo',
            branch: 'main',
            fileMap: {},
            targetEnvironment: 'cpanel',
            token: 'community_token_123',
            projectId: 'proj_default',
            workspaceId: 'ws_default',
            targetId: 'tgt_cpanel_01',
            agentId: 'agent_node_01',
            agentVersion: '2.0.0',
            idempotencyKey: `idem_engine_test_${Date.now()}`,
        };
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', payload);
        assert.strictEqual(r.status, 200, `[en] Expected exact 200 for licensed deployment request, got ${r.status}`);
        assert.ok(r.body.transactionId, '[en] Expected transactionId in response');
        assert.ok(r.body.strategy, '[en] Expected strategy in response');
        assert.ok(Array.isArray(r.body.steps), '[en] Expected steps array in response');
        assert.ok(r.body.signature, '[en] Expected signature in response');
        assert.ok(r.body.edition, '[en] Expected edition in response');
        assert.ok(r.body.planHash, '[en] Expected planHash in response');
        assert.ok(r.body.lifecycleState, '[en] Expected lifecycleState in response');

        // Idempotent replay with same key & payload returns same transactionId
        const replay = await post(ENGINE_PORT, '/v1/deploy/resolve', payload);
        assert.strictEqual(replay.status, 200);
        assert.strictEqual(replay.body.transactionId, r.body.transactionId, 'Idempotent replay must return identical transactionId');

        console.log(`[en] ✓ PASS: Deterministic 200 signed recipe & idempotent replay verified (TX: ${r.body.transactionId})`);
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Recipe resolution test —', e.message);
        failed++;
    }

    // Test 4: Unlicensed deployment request deterministically returns 402 (COR-004)
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', {
            repositoryUrl: 'https://github.com/example/repo',
            branch: 'main',
            fileMap: {},
            targetEnvironment: 'cpanel',
            token: 'unlicensed_invalid_token_999',
            projectId: 'proj_default',
            workspaceId: 'ws_default',
            targetId: 'tgt_cpanel_01',
            agentId: 'agent_node_01',
            agentVersion: '2.0.0',
        });
        assert.strictEqual(r.status, 402, `[en] Expected exact 402 for unlicensed deployment request, got ${r.status}`);
        console.log('[en] ✓ PASS: Unlicensed deployment request deterministically returns 402');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: License denial 402 test —', e.message);
        failed++;
    }

    // Test 5: Telemetry endpoint accepts valid payload
    try {
        const r = await post(ENGINE_PORT, '/v1/telemetry/report', {
            transactionId: 'tx_test_001',
            status: 'SUCCESS',
            logs: ['[en] Test deployment completed'],
        });
        assert.strictEqual(r.status, 201, `[en] Expected 201 for telemetry, got ${r.status}`);
        console.log('[en] ✓ PASS: Telemetry endpoint accepts valid payload');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Telemetry endpoint test —', e.message);
        failed++;
    }

    // Test 6: Telemetry endpoint rejects missing fields
    try {
        const r = await post(ENGINE_PORT, '/v1/telemetry/report', {});
        assert.strictEqual(r.status, 400, `[en] Expected 400 for missing telemetry fields, got ${r.status}`);
        console.log('[en] ✓ PASS: Telemetry endpoint rejects missing fields');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Telemetry missing fields test —', e.message);
        failed++;
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (serverProcess) serverProcess.close();
    if (mockBillingServer) mockBillingServer.close();

    if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
    console.error('[en] Fatal test suite error:', err);
    if (serverProcess) serverProcess.close();
    if (mockBillingServer) mockBillingServer.close();
    process.exit(1);
});
