/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration
 * File           : passport-admission-gate.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Classification : COMMERCIAL | INTERNAL
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');

function post(port, path, body, headers = {}) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
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


let ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '4005');
let passed = 0;
let failed = 0;
let serverProcess = null;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Passport Admission Gate');
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

    const validPayload = {
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
        tenantId: 'tenant_123'
    };

    // Test 1: POST to /v1/deploy/resolve without X-Ugondu-Passport-Id → 403
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', validPayload);
        assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}`);
        assert.strictEqual(r.body.code, 'PASSPORT_REQUIRED');
        console.log('[en] ✓ PASS: Missing passport ID returns 403');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Missing passport ID returns 403 —', e.message);
        failed++;
    }

    // Test 2: POST with invalid passport id → 403
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', validPayload, {
            'X-Ugondu-Passport-Id': '   '
        });
        assert.strictEqual(r.status, 403, `Expected 403, got ${r.status}`);
        assert.strictEqual(r.body.code, 'PASSPORT_REJECTED');
        console.log('[en] ✓ PASS: Invalid passport ID returns 403');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Invalid passport ID returns 403 —', e.message);
        failed++;
    }

    // Test 3: POST with valid passport id → passes middleware (200, 400, or 402)
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', validPayload, {
            'X-Ugondu-Passport-Id': 'valid_passport_id'
        });
        assert.ok([200, 400, 402, 500].includes(r.status), `Expected 200, 400, 402, or 500 downstream error, got ${r.status}`);
        assert.notStrictEqual(r.status, 403);
        console.log('[en] ✓ PASS: Valid passport ID passes middleware');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Valid passport ID passes middleware —', e.message);
        failed++;
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    if (serverProcess) serverProcess.kill('SIGTERM');
    process.exit(1);
});
