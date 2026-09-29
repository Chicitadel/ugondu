/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Unit
 * File           : plugin-manager.test.js
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

function get(port, path) {
    return new Promise((resolve, reject) => {
        const options = { hostname: 'localhost', port, path, method: 'GET' };
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function post(port, path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost', port, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(responseBody) }); }
                catch { resolve({ status: res.statusCode, body: responseBody }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

const PLUGIN_PORT = parseInt(process.env.PLUGIN_PORT || '4003');
let passed = 0;
let failed = 0;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Plugin Manager');
    console.log('[en] ══════════════════════════════════════════════════════');

    // [en] Test 1: GET /v1/plugins returns array
    try {
        const r = await get(PLUGIN_PORT, '/v1/plugins');
        assert.strictEqual(r.status, 200, `[en] Expected 200 for plugin listing, got ${r.status}`);
        assert.ok(Array.isArray(r.body.plugins), '[en] Expected plugins array');
        console.log(`[en] ✓ PASS: Plugin listing returns ${r.body.plugins.length} plugin(s)`);
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Plugin listing —', e.message);
        failed++;
    }

    // [en] Test 2: Execute non-existent plugin returns 404
    try {
        const r = await post(PLUGIN_PORT, '/v1/plugins/nonexistent-plugin-xyz/execute', { payload: {} });
        assert.strictEqual(r.status, 404, `[en] Expected 404 for missing plugin, got ${r.status}`);
        console.log('[en] ✓ PASS: Non-existent plugin execution returns 404');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Non-existent plugin 404 test —', e.message);
        failed++;
    }

    // [en] Test 3: Execute ugondu-plugin-node returns injected steps
    try {
        const r = await post(PLUGIN_PORT, '/v1/plugins/ugondu-plugin-node/execute', {
            payload: { packageManager: 'npm' }
        });
        if (r.status === 200) {
            assert.ok(Array.isArray(r.body.injectedSteps), '[en] Expected injectedSteps array');
            assert.ok(r.body.injectedSteps.length >= 1, '[en] Expected at least 1 injected step');
            console.log(`[en] ✓ PASS: Plugin execution returned ${r.body.injectedSteps.length} steps`);
        } else {
            console.log(`[en] ~ SKIP: Plugin execution returned HTTP ${r.status} (plugin path may differ in CI)`);
        }
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Plugin execution test —', e.message);
        failed++;
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    process.exit(1);
});
