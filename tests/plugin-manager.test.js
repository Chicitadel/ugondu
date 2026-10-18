/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration & Security
 * File           : plugin-manager.test.js
 * Version        : 1.2.0
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
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

if (typeof global.__t !== 'function') {
    global.__t = (key) => `[en] ${key}`;
}

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { signServiceIdentity, globalTrustRegistry } = require('../server/shared/dist/identity');
const { generateKeyPairSync } = require('crypto');

const serviceTestKeys = generateKeyPairSync('ed25519');
const serviceTestPrivateKey = serviceTestKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const serviceTestPublicKey = serviceTestKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const SERVICE_TEST_KEY_ID = 'key_service_test_v1';
globalTrustRegistry.registerKey({
    keyId: SERVICE_TEST_KEY_ID,
    algorithm: 'ed25519',
    status: 'ACTIVE',
    purpose: 'service-identity',
    publicKey: serviceTestPublicKey
});

const tamperedPluginDir = path.resolve(__dirname, '../plugins/tampered-test-plugin');
function cleanupTamperedFixture() {
    try {
        if (fs.existsSync(tamperedPluginDir)) {
            fs.rmSync(tamperedPluginDir, { recursive: true, force: true });
        }
    } catch {
        // Ignore cleanup errors on exit
    }
}
process.on('exit', cleanupTamperedFixture);

function get(port, urlPath, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const token = signServiceIdentity('test-suite', 'plugin-manager', 'execute', serviceTestPrivateKey, SERVICE_TEST_KEY_ID);
        const headers = {
            'Authorization': `Bearer ${token}`,
            ...extraHeaders
        };
        const options = { hostname: 'localhost', port, path: urlPath, method: 'GET', headers };
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

function post(port, urlPath, body, extraHeaders = {}) {
    return new Promise((resolve, reject) => {
        const token = signServiceIdentity('test-suite', 'plugin-manager', 'execute', serviceTestPrivateKey, SERVICE_TEST_KEY_ID);
        const data = JSON.stringify(body);
        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data),
            'Authorization': `Bearer ${token}`,
            ...extraHeaders
        };
        const options = {
            hostname: 'localhost',
            port,
            path: urlPath,
            method: 'POST',
            headers
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

const DEFAULT_PLUGIN_PORT = parseInt(process.env.PLUGIN_PORT || '4003', 10);
let PLUGIN_PORT = DEFAULT_PLUGIN_PORT;
let passed = 0;
let failed = 0;
let serverProcess = null;

async function runTests() {
    cleanupTamperedFixture();

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration & Security Test Suite — Plugin Manager');
    console.log('[en] ══════════════════════════════════════════════════════');

    let serverStartedByUs = false;
    try {
        await new Promise((resolve, reject) => {
            const req = http.get({ hostname: 'localhost', port: PLUGIN_PORT, path: '/health' }, res => {
                if (res.statusCode === 200) resolve();
                else reject();
            });
            req.on('error', reject);
            req.end();
        });
        console.log(`[en] Connected to existing Plugin Manager on port ${PLUGIN_PORT}`);
    } catch {
        console.log('[en] Starting Plugin Manager in-process on ephemeral port...');
        process.env.UGONDU_SERVICE_TEST_PUBKEY = serviceTestPublicKey;
        process.env.UGONDU_SERVICE_TEST_KEY_ID = SERVICE_TEST_KEY_ID;
        const { app } = require('../server/plugin-manager/dist/index.js');
        await new Promise((resolve, reject) => {
            serverProcess = app.listen(0, '127.0.0.1', () => {
                PLUGIN_PORT = serverProcess.address().port;
                serverStartedByUs = true;
                resolve();
            });
            serverProcess.on('error', reject);
        });
        console.log(`[en] Plugin Manager started in-process and healthy on port ${PLUGIN_PORT}`);
    }

    try {
        // [en] Test 1: GET /v1/plugins returns verified plugins array
        try {
            const r = await get(PLUGIN_PORT, '/v1/plugins');
            assert.strictEqual(r.status, 200, `[en] Expected 200 for plugin listing, got ${r.status}`);
            assert.ok(Array.isArray(r.body.plugins), '[en] Expected plugins array');
            assert.ok(r.body.plugins.length >= 1, '[en] Expected at least 1 verified plugin');
            console.log(`[en] ✓ PASS: Plugin listing returns ${r.body.plugins.length} verified plugin(s)`);
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Plugin listing —', e.message);
            failed++;
        }

        // [en] Test 2: Execute non-existent plugin returns 404
        try {
            const r = await post(PLUGIN_PORT, '/v1/plugins/nonexistent-plugin-xyz/execute', {
                tenantId: 'system',
                payload: {}
            });
            assert.strictEqual(r.status, 404, `[en] Expected 404 for missing plugin, got ${r.status}`);
            console.log('[en] ✓ PASS: Non-existent plugin execution returns 404');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Non-existent plugin 404 test —', e.message);
            failed++;
        }

        // [en] Test 3: Path traversal on execute returns 403 PATH_TRAVERSAL_DETECTED
        try {
            const traversalAttempts = [
                '../../etc/passwd',
                '../plugins',
                '../../../../windows/win.ini'
            ];
            for (const badPlugin of traversalAttempts) {
                const r = await post(PLUGIN_PORT, `/v1/plugins/${encodeURIComponent(badPlugin)}/execute`, {
                    tenantId: 'system',
                    payload: {}
                });
                assert.strictEqual(r.status, 403, `Expected 403 for traversal ${badPlugin}, got ${r.status}`);
                assert.strictEqual(r.body.error, 'PATH_TRAVERSAL_DETECTED', `Expected PATH_TRAVERSAL_DETECTED for ${badPlugin}`);
            }
            console.log('[en] ✓ PASS: Path traversal protection strictly enforced on execute (403 PATH_TRAVERSAL_DETECTED)');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Path traversal execute test —', e.message);
            failed++;
        }

        // [en] Test 4: Path traversal on activate returns 403 PATH_TRAVERSAL_DETECTED
        try {
            const r = await post(PLUGIN_PORT, `/v1/plugins/${encodeURIComponent('../../etc/passwd')}/activate`, {
                tenantId: 'tenant-test'
            });
            assert.strictEqual(r.status, 403, `Expected 403 for traversal on activate, got ${r.status}`);
            assert.strictEqual(r.body.error, 'PATH_TRAVERSAL_DETECTED', 'Expected PATH_TRAVERSAL_DETECTED');
            console.log('[en] ✓ PASS: Path traversal protection strictly enforced on activate (403 PATH_TRAVERSAL_DETECTED)');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Path traversal activate test —', e.message);
            failed++;
        }

        // [en] Test 5: Tenant plugin authorization — unauthorized tenant returns 403 PLUGIN_NOT_AUTHORIZED
        try {
            const r = await post(PLUGIN_PORT, '/v1/plugins/ugondu-plugin-node/execute', {
                tenantId: 'unauthorized-tenant-xyz',
                payload: { packageManager: 'npm' }
            });
            assert.strictEqual(r.status, 403, `Expected 403 for unauthorized tenant, got ${r.status}`);
            assert.strictEqual(r.body.error, 'PLUGIN_NOT_AUTHORIZED', 'Expected PLUGIN_NOT_AUTHORIZED');
            assert.strictEqual(r.body.plugin, 'ugondu-plugin-node', 'Expected plugin name in response');
            console.log('[en] ✓ PASS: Unauthorized tenant strictly rejected with 403 PLUGIN_NOT_AUTHORIZED');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Tenant authorization test —', e.message);
            failed++;
        }

        // [en] Test 6: Tenant activation authorizes execution and returns execution receipt
        try {
            const act = await post(PLUGIN_PORT, '/v1/plugins/ugondu-plugin-node/activate', {
                tenantId: 'tenant-test-authorized'
            });
            assert.strictEqual(act.status, 200, 'Expected 200 for activation');

            const execRes = await post(PLUGIN_PORT, '/v1/plugins/ugondu-plugin-node/execute', {
                tenantId: 'tenant-test-authorized',
                payload: { packageManager: 'npm' }
            });
            assert.strictEqual(execRes.status, 200, `Expected 200 after activation, got ${execRes.status}`);
            assert.ok(execRes.body.receipt && execRes.body.receipt.receiptHash, 'Expected signed/hashed execution receipt');
            console.log(`[en] ✓ PASS: Tenant activation successfully authorizes plugin execution (HTTP ${execRes.status})`);
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Tenant activation flow test —', e.message);
            failed++;
        }

        // [en] Test 7: Tampered cryptographic signature rejected with 403 INVALID_PLUGIN_SIGNATURE
        try {
            if (!fs.existsSync(tamperedPluginDir)) {
                fs.mkdirSync(tamperedPluginDir, { recursive: true });
            }
            fs.writeFileSync(path.join(tamperedPluginDir, 'index.js'), 'console.log("malicious");');
            fs.writeFileSync(path.join(tamperedPluginDir, 'manifest.json'), JSON.stringify({
                name: 'tampered-test-plugin',
                version: '1.0.0',
                description: 'Plugin with forged signature',
                hooks: ['pre-sync'],
                signature: Buffer.alloc(64, 0x99).toString('base64')
            }, null, 2));

            const r = await post(PLUGIN_PORT, '/v1/plugins/tampered-test-plugin/execute', {
                tenantId: 'system',
                payload: {}
            });
            assert.strictEqual(r.status, 403, `Expected 403 for forged signature, got ${r.status}`);
            assert.strictEqual(r.body.error, 'INVALID_PLUGIN_SIGNATURE', 'Expected INVALID_PLUGIN_SIGNATURE');
            console.log('[en] ✓ PASS: Cryptographic manifest signature strictly verified and forged signature rejected');
            passed++;
        } catch (e) {
            console.error('[en] ✗ FAIL: Cryptographic signature test —', e.message);
            failed++;
        } finally {
            cleanupTamperedFixture();
        }

    } finally {
        cleanupTamperedFixture();
        if (serverStartedByUs && serverProcess && typeof serverProcess.close === 'function') {
            serverProcess.close();
        }
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    cleanupTamperedFixture();
    console.error('[en] Fatal test suite error:', err);
    if (serverProcess && typeof serverProcess.close === 'function') serverProcess.close();
    process.exit(1);
});
