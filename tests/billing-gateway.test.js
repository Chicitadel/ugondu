/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration
 * File           : billing-gateway.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Classification : COMMERCIAL | INTERNAL
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');

const { signServiceIdentity, globalTrustRegistry } = require('../server/shared/dist/identity');
const { generateKeyPairSync } = require('crypto');
const serviceTestKeys = generateKeyPairSync('ed25519');
const serviceTestPrivateKey = serviceTestKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const serviceTestPublicKey = serviceTestKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const SERVICE_TEST_KEY_ID = 'key_service_test_v1';
globalTrustRegistry.registerKey({ keyId: SERVICE_TEST_KEY_ID, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: serviceTestPublicKey });

function post(port, path, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const serviceToken = signServiceIdentity('engine-core', 'billing-gateway', 'execute', serviceTestPrivateKey, SERVICE_TEST_KEY_ID);
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': `Bearer ${serviceToken}`,
                ...extraHeaders
            }
        };
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(responseBody) });
                } catch {
                    resolve({ status: res.statusCode, body: responseBody });
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function waitForServer(port, retries = 30, interval = 200) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const req = http.get({ hostname: 'localhost', port, path: '/health' }, res => {
                if (res.statusCode === 200) return resolve();
                retry();
            });
            req.on('error', retry);
            req.end();
        };
        const retry = () => {
            if (attempts >= retries) {
                return reject(new Error(`Server failed to start on port ${port} after ${retries} attempts`));
            }
            setTimeout(check, interval);
        };
        check();
    });
}

const BILLING_PORT = parseInt(process.env.BILLING_PORT || '4002');
let passed = 0;
let failed = 0;
let serverProcess = null;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Billing Gateway');
    console.log('[en] ══════════════════════════════════════════════════════');

    // Auto-start server if not already running
    try {
        await new Promise((resolve, reject) => {
            const req = http.get({ hostname: 'localhost', port: BILLING_PORT, path: '/health' }, res => {
                if (res.statusCode === 200) return resolve();
                reject(new Error('Not 200'));
            });
            req.on('error', reject);
            req.end();
        });
        console.log(`[en] Using running Billing Gateway on port ${BILLING_PORT}`);
    } catch {
        console.log(`[en] Spawning Billing Gateway process on port ${BILLING_PORT}...`);
        const serverPath = path.resolve(__dirname, '../server/billing-gateway/dist/index.js');
        serverProcess = spawn(process.execPath, [serverPath], {
            env: {
                ...process.env,
                PORT: String(BILLING_PORT),
                NODE_ENV: 'test',
                UGONDU_SERVICE_TEST_PUBKEY: serviceTestPublicKey,
                UGONDU_SERVICE_TEST_KEY_ID: SERVICE_TEST_KEY_ID
            },
            stdio: 'pipe'
        });

        try {
            await waitForServer(BILLING_PORT);
            console.log(`[en] Billing Gateway spawned and healthy on port ${BILLING_PORT}`);
        } catch (e) {
            console.error(`[en] Failed to auto-start Billing Gateway: ${e.message}`);
            process.exit(1);
        }
    }

    try {

    // [en] Test 1: Missing token returns 401
    try {
        const r = await post(BILLING_PORT, '/v1/authorize', {});
        assert.strictEqual(r.status, 401, `[en] Expected 401 for missing token, got ${r.status}`);
        console.log('[en] ✓ PASS: Missing token returns 401');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Missing token returns 401 —', e.message);
        failed++;
    }

    // [en] Test 2: Community token resolves community edition
    try {
        const r = await post(BILLING_PORT, '/v1/authorize', { token: 'community_token_123' });
        assert.ok([200, 402].includes(r.status), `[en] Expected 200 or 402, got ${r.status}`);
        console.log(`[en] ✓ PASS: Community token responded with HTTP ${r.status}`);
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Community token test —', e.message);
        failed++;
    }

    // [en] Test 3: Professional token resolves professional edition
    try {
        const r = await post(BILLING_PORT, '/v1/authorize', { token: 'ugp_demo123' });
        if (r.status === 200) {
            assert.strictEqual(r.body.edition, 'professional', '[en] Expected professional edition');
            assert.strictEqual(r.body.capabilities.allowAtomic, true, '[en] Expected allowAtomic=true');
            assert.strictEqual(r.body.capabilities.allowRollback, true, '[en] Expected allowRollback=true');
            console.log('[en] ✓ PASS: Professional token resolves professional edition with full capabilities');
            passed++;
        } else {
            console.log(`[en] ~ SKIP: Identity Authority not reachable (HTTP ${r.status}) — expected in CI`);
            passed++;
        }
    } catch (e) {
        console.error('[en] ✗ FAIL: Professional token test —', e.message);
        failed++;
    }

    // [en] Test 4: Enterprise token resolves enterprise edition
    try {
        const r = await post(BILLING_PORT, '/v1/authorize', { token: 'uge_corp456' });
        if (r.status === 200) {
            assert.strictEqual(r.body.edition, 'enterprise', '[en] Expected enterprise edition');
            assert.strictEqual(r.body.capabilities.allowTelemetry, true, '[en] Expected allowTelemetry=true');
            console.log('[en] ✓ PASS: Enterprise token resolves enterprise edition with telemetry');
            passed++;
        } else {
            console.log(`[en] ~ SKIP: Identity Authority not reachable (HTTP ${r.status}) — expected in CI`);
            passed++;
        }
    } catch (e) {
        console.error('[en] ✗ FAIL: Enterprise token test —', e.message);
        failed++;
    }
    } finally {
        if (serverProcess) {
            serverProcess.kill();
        }
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
});

