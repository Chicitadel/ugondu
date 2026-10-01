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
const { spawn } = require('child_process');

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

function waitForServer(port, retries = 30, interval = 200) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
            attempts++;
            const req = http.get({ hostname: 'localhost', port, path: '/health' }, res => {
                if (res.statusCode === 200) {
                    return resolve();
                }
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

const ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '4005');
let passed = 0;
let failed = 0;
let serverProcess = null;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Passport Admission Gate');
    console.log('[en] ══════════════════════════════════════════════════════');

    try {
        await new Promise((resolve, reject) => {
            const req = http.get({ hostname: 'localhost', port: ENGINE_PORT, path: '/health' }, res => {
                if (res.statusCode === 200) return resolve();
                reject(new Error('Not 200'));
            });
            req.on('error', reject);
            req.end();
        });
        console.log(`[en] Using running Engine Core on port ${ENGINE_PORT}`);
    } catch {
        console.log(`[en] Spawning Engine Core process on port ${ENGINE_PORT}...`);
        const serverPath = require('path').resolve(__dirname, '../server/engine-core/dist/index.js');
        serverProcess = spawn('node', [serverPath], {
            env: { ...process.env, PORT: String(ENGINE_PORT) },
            stdio: 'pipe'
        });

        try {
            await waitForServer(ENGINE_PORT);
            console.log(`[en] Engine Core spawned and healthy on port ${ENGINE_PORT}`);
        } catch (e) {
            console.error(`[en] Failed to auto-start Engine Core: ${e.message}`);
            process.exit(1);
        }
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
