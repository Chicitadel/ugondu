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
const crypto = require('crypto');

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

if (!process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY || process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY === '<placeholder>') {
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
    for (const k of Object.keys(process.env)) {
        if (process.env[k] === '<placeholder>') delete process.env[k];
    }
    if (!process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY) {
        const { generateKeyPairSync } = require('crypto');
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
        process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
        process.env.UGONDU_SERVICE_TEST_PUBKEY = publicKey.export({ type: 'spki', format: 'pem' }).toString();
        process.env.UGONDU_SERVICE_TEST_KEY_ID = 'key_service_test_v1';
    }
}

let ENGINE_PORT = parseInt(process.env.ENGINE_PORT || '4005');
let passed = 0;
let failed = 0;
let serverProcess = null;
let engineCore = null;

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
            engineCore = require('../server/engine-core/dist/index.js');
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
        tenantId: 'tenant_test_default'
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
            'X-Ugondu-Passport-Id': 'INVALID-PASSPORT-ID'
        });
        console.log(r);
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

    // Test 4: the legacy controller cannot admit any identifier without a trusted verifier.
    try {
        const { AdmissionController } = require('../server/engine-core/dist/passport/gatekeeper/admission-controller.js');
        const legacyController = new AdmissionController({}, {}, {}, {}, {}, {}, {});
        assert.strictEqual(legacyController.admit('passport_forged_123', { tenantId: 'tenant_test_default' }).status, 'REJECTED');
        console.log('[en] ✓ PASS: Legacy admission controller fails closed');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Legacy admission controller fails closed —', e.message);
        failed++;
    }

    // Test 5: passport-like identifiers without registration or a valid signature must be rejected.
    try {
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', validPayload, {
            'X-Ugondu-Passport-Id': 'passport_forged_123'
        });
        assert.strictEqual(r.status, 403, `Expected 403 for unregistered passport-like ID, got ${r.status}`);
        assert.strictEqual(r.body.code, 'PASSPORT_REJECTED');
        console.log('[en] ✓ PASS: Unregistered passport-like identifier is rejected');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Unregistered passport-like identifier is rejected —', e.message);
        failed++;
    }

    // Test 6: a registered passport cannot be replayed across tenant contexts.
    try {
        engineCore.registerAdmissionPassport('registered_tenant_a', { tenantId: 'tenant_A' });
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', { ...validPayload, tenantId: 'tenant_B' }, {
            'X-Ugondu-Passport-Id': 'registered_tenant_a'
        });
        assert.strictEqual(r.status, 403, `Expected 403 for tenant mismatch, got ${r.status}`);
        assert.strictEqual(r.body.code, 'PASSPORT_REJECTED');
        console.log('[en] ✓ PASS: Registered passport tenant mismatch is rejected');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Registered passport tenant mismatch is rejected —', e.message);
        failed++;
    }

    // Test 7: expired and revoked registered passports fail closed.
    for (const [id, metadata] of [
        ['expired_registered', { tenantId: 'tenant_test_default', expiresAt: Date.now() - 1000 }],
        ['revoked_registered', { tenantId: 'tenant_test_default', revoked: true }]
    ]) {
        try {
            engineCore.registerAdmissionPassport(id, metadata);
            const r = await post(ENGINE_PORT, '/v1/deploy/resolve', validPayload, {
                'X-Ugondu-Passport-Id': id
            });
            assert.strictEqual(r.status, 403, `Expected 403 for ${id}, got ${r.status}`);
            assert.strictEqual(r.body.code, 'PASSPORT_REJECTED');
            console.log(`[en] ✓ PASS: ${id} is rejected`);
            passed++;
        } catch (e) {
            console.error(`[en] ✗ FAIL: ${id} is rejected —`, e.message);
            failed++;
        }
    }

    // Test 8: a correctly signed, unexpired passport is still accepted for its tenant.
    try {
        const tenantId = 'tenant_signed_test';
        const token = engineCore.issueSignedPassport({ tenantId, ttlMs: 60_000 });
        const r = await post(ENGINE_PORT, '/v1/deploy/resolve', { ...validPayload, tenantId }, {
            'X-Ugondu-Passport-Id': token
        });
        assert.ok([200, 400, 402, 500].includes(r.status), `Expected signed passport to pass middleware, got ${r.status}`);
        assert.notStrictEqual(r.status, 403);
        console.log('[en] ✓ PASS: Valid signed passport remains accepted');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Valid signed passport remains accepted —', e.message);
        failed++;
    }

    // Test 9: execution envelopes must use a real cryptographic signer; no synthetic signature fallback.
    try {
        const { AdmissionController } = require('../server/engine-core/dist/passport/gatekeeper/admission-controller.js');
        const validators = [
            { validate: async () => {} },
            { validate: async () => {} },
            { validate: async () => {} },
            { validate: async () => {} },
            { validate: async () => {} },
            { validate: async () => {} },
            { validateState: async () => {} }
        ];
        const unconfigured = new AdmissionController(...validators);
        await assert.rejects(
            () => unconfigured.verifyPreMutation({ id: 'passport_signature_test' }, { id: 'context_signature_test' }),
            /EXECUTION_ENVELOPE_SIGNER_NOT_CONFIGURED/
        );

        const configured = new AdmissionController(...validators);
        configured.configureExecutionEnvelopeSigner((payload) =>
            crypto.sign(null, Buffer.from(payload, 'utf8'), engineCore.keyState.privateKey).toString('base64url')
        );
        const envelope = await configured.verifyPreMutation(
            { id: 'passport_signature_test' },
            { id: 'context_signature_test' }
        );
        const signedPayload = JSON.stringify({
            passportId: envelope.passportId,
            contextId: envelope.contextId,
            verifiedAt: envelope.verifiedAt.toISOString()
        });
        assert.strictEqual(
            crypto.verify(null, Buffer.from(signedPayload, 'utf8'), engineCore.keyState.publicKey, Buffer.from(envelope.signature.slice(4), 'base64url')),
            true,
            'Execution envelope signature must verify against the managed public key'
        );
        assert.strictEqual(
            crypto.verify(null, Buffer.from(signedPayload.replace('context_signature_test', 'other_context'), 'utf8'), engineCore.keyState.publicKey, Buffer.from(envelope.signature.slice(4), 'base64url')),
            false,
            'Signature must bind the execution context'
        );
        const { Provisioner } = require('../server/engine-core/dist/fabric/provisioner.js');
        const resourceController = {
            allocateResources: async (task) => ({ status: 'ALLOCATED', contextId: task.contextId })
        };
        const provisioner = new Provisioner(resourceController, engineCore.keyState.publicKey);
        const tenantId = 'tenant_signature_test';
        const authorizedEnvelope = {
            ...envelope,
            securityContext: { tenantId, tenant: { id: tenantId } }
        };
        const provisioned = await provisioner.provision(authorizedEnvelope, { contextId: envelope.contextId });
        assert.strictEqual(provisioned.status, 'ALLOCATED');

        await assert.rejects(
            () => provisioner.provision({ ...authorizedEnvelope, signature: 'SIG:forged' }, { contextId: envelope.contextId }),
            /EXECUTION_ENVELOPE_SIGNATURE_INVALID/
        );
        await assert.rejects(
            () => new Provisioner(resourceController).provision(authorizedEnvelope, { contextId: envelope.contextId }),
            /EXECUTION_ENVELOPE_VERIFIER_NOT_CONFIGURED/
        );
        console.log('[en] ✓ PASS: Execution envelope uses verifiable cryptographic signature');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Execution envelope uses verifiable cryptographic signature —', e.message);
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
