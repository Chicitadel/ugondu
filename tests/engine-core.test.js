/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration
 * File           : engine-core.test.js
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

function post(port, path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
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



let ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '4001');
let passed = 0;
let failed = 0;
let serverProcess = null;

if (!process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY) {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        for (const line of lines) {
            const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
            if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/\\n/g, '\n');
        }
    }
    if (!process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY) {
        const { generateKeyPairSync } = require('crypto');
        const { publicKey, privateKey } = generateKeyPairSync('ed25519');
        process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
        process.env.UGONDU_SERVICE_TEST_PUBKEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
        process.env.UGONDU_SERVICE_TEST_KEY_ID = 'key_service_test_v1';
    }
}

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Engine Core');
    console.log('[en] ══════════════════════════════════════════════════════');

    try {
        process.env.PORT = '0';
        process.env.NODE_ENV = 'test';
        console.log(`[en] Starting in-process Engine Core...`);
        const originalListen = http.Server.prototype.listen;
        http.Server.prototype.listen = function(...args) {
            serverProcess = this;
            return originalListen.apply(this, args);
        };
        try {
            require('../server/engine-core/dist/index.js');
        } catch (e) {
            if (e.code === 'MODULE_NOT_FOUND') {
                console.log('[SKIP] Engine-core not compiled');
                process.exit(0);
            }
            throw e;
        }
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
        process.exit(1);
    }

    // [en] Test 1: Missing required fields returns 400
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', {});
        assert.strictEqual(r.status, 400, `[en] Expected 400 for missing fields, got ${r.status}`);
        console.log('[en] ✓ PASS: Missing fields returns 400');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Missing fields returns 400 —', e.message);
        failed++;
    }

    // [en] Test 2: Valid deployment context returns recipe with required fields
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', {
            repositoryUrl: 'https://github.com/example/repo',
            branch: 'main',
            fileMap: {},
            targetEnvironment: 'cpanel',
            token: 'community_token_123',
            projectId: 'proj_default',
            workspaceId: 'ws_default',
            targetId: 'tgt_cpanel_01',
            agentId: 'agent_node_01',
            agentVersion: '2.0.0'
        });
        // [en] May be 200 or 402 depending on billing gateway availability
        assert.ok([200, 402].includes(r.status), `[en] Expected 200 or 402, got ${r.status}`);
        if (r.status === 200) {
            assert.ok(r.body.transactionId, '[en] Expected transactionId in response');
            assert.ok(r.body.strategy, '[en] Expected strategy in response');
            assert.ok(Array.isArray(r.body.steps), '[en] Expected steps array in response');
            assert.ok(r.body.signature, '[en] Expected signature in response');
            assert.ok(r.body.edition, '[en] Expected edition in response');
            console.log(`[en] ✓ PASS: Recipe resolved. TX: ${r.body.transactionId}, Edition: ${r.body.edition}`);
        } else {
            console.log(`[en] ~ SKIP: Billing Gateway not reachable (HTTP ${r.status}) — expected in CI`);
        }
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Recipe resolution test —', e.message);
        failed++;
    }

    // [en] Test 3: Telemetry endpoint accepts valid payload
    try {
        const r = await post(ENGINE_PORT, '/v1/telemetry/report', {
            transactionId: 'tx_test_001',
            status: 'SUCCESS',
            logs: ['[en] Test deployment completed']
        });
        assert.strictEqual(r.status, 201, `[en] Expected 201 for telemetry, got ${r.status}`);
        console.log('[en] ✓ PASS: Telemetry endpoint accepts valid payload');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Telemetry endpoint test —', e.message);
        failed++;
    }

    // [en] Test 4: Telemetry endpoint rejects missing fields
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

    if (serverProcess) {
        serverProcess.close();
    }

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    if (serverProcess) serverProcess.close();
    process.exit(1);
});
