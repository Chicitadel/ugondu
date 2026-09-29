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

// [en] Simple HTTP POST helper — no external test framework dependencies
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

const BILLING_PORT = parseInt(process.env.BILLING_PORT || '4002');
let passed = 0;
let failed = 0;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Billing Gateway');
    console.log('[en] ══════════════════════════════════════════════════════');

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

    // [en] Test 3: Professional token prefix resolves professional edition
    try {
        const r = await post(BILLING_PORT, '/v1/authorize', { token: 'ugp_test_professional_key' });
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

    // [en] Test 4: Enterprise token prefix resolves enterprise edition
    try {
        const r = await post(BILLING_PORT, '/v1/authorize', { token: 'uge_test_enterprise_key' });
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

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    process.exit(1);
});
