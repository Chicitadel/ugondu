/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration & Security — Plugin Manager
 * File           : plugin-manager.test.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-20
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

if (typeof global.__t !== 'function') {
  global.__t = (key) => `[en] ${key}`;
}

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { generateKeyPairSync } = require('crypto');
const { test, before, after } = require('node:test');

const { signServiceIdentity, globalTrustRegistry } = require('../server/shared/dist/identity');

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
    // Ignore cleanup errors
  }
}
process.on('exit', cleanupTamperedFixture);

function get(port, urlPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const token = signServiceIdentity('test-suite', 'plugin-manager', 'execute', serviceTestPrivateKey, SERVICE_TEST_KEY_ID);
    const headers = {
      Authorization: `Bearer ${token}`,
      ...extraHeaders
    };
    const options = { hostname: '127.0.0.1', port, path: urlPath, method: 'GET', headers };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
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
      Authorization: `Bearer ${token}`,
      ...extraHeaders
    };
    const options = { hostname: '127.0.0.1', port, path: urlPath, method: 'POST', headers };
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => (responseBody += chunk));
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

let PLUGIN_PORT = parseInt(process.env.PLUGIN_PORT || '4003', 10);
let serverProcess = null;
let serverStartedByUs = false;

before(async () => {
  cleanupTamperedFixture();
  try {
    await new Promise((resolve, reject) => {
      const req = http.get({ hostname: '127.0.0.1', port: PLUGIN_PORT, path: '/health' }, res => {
        if (res.statusCode === 200) resolve();
        else reject();
      });
      req.on('error', reject);
      req.end();
    });
  } catch {
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
  }
});

after(() => {
  cleanupTamperedFixture();
  if (serverStartedByUs && serverProcess && typeof serverProcess.close === 'function') {
    serverProcess.close();
  }
});

test('PM-001: GET /v1/plugins returns verified plugins array', async () => {
  const r = await get(PLUGIN_PORT, '/v1/plugins');
  assert.strictEqual(r.status, 200, `[en] Expected 200 for plugin listing, got ${r.status}`);
  assert.ok(Array.isArray(r.body.plugins), '[en] Expected plugins array');
  assert.ok(r.body.plugins.length >= 1, '[en] Expected at least 1 verified plugin');
  console.log(`[en] ✓ PASS: Plugin listing returns ${r.body.plugins.length} verified plugin(s)`);
});

test('PM-002: Execute non-existent plugin returns 404', async () => {
  const r = await post(PLUGIN_PORT, '/v1/plugins/nonexistent-plugin-xyz/execute', {
    tenantId: 'system',
    payload: {}
  });
  assert.strictEqual(r.status, 404, `[en] Expected 404 for missing plugin, got ${r.status}`);
  console.log('[en] ✓ PASS: Non-existent plugin execution returns 404');
});

test('PM-003: Path traversal on execute returns 403 PATH_TRAVERSAL_DETECTED', async () => {
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
});

test('PM-004: Path traversal on activate returns 403 PATH_TRAVERSAL_DETECTED', async () => {
  const r = await post(PLUGIN_PORT, `/v1/plugins/${encodeURIComponent('../../etc/passwd')}/activate`, {
    tenantId: 'tenant-test'
  });
  assert.strictEqual(r.status, 403, `Expected 403 for traversal on activate, got ${r.status}`);
  assert.strictEqual(r.body.error, 'PATH_TRAVERSAL_DETECTED', 'Expected PATH_TRAVERSAL_DETECTED');
  console.log('[en] ✓ PASS: Path traversal protection strictly enforced on activate (403 PATH_TRAVERSAL_DETECTED)');
});

test('PM-005: Tenant plugin authorization — unauthorized tenant returns 403 PLUGIN_NOT_AUTHORIZED', async () => {
  const r = await post(PLUGIN_PORT, '/v1/plugins/ugondu-plugin-node/execute', {
    tenantId: 'unauthorized-tenant-xyz',
    payload: { packageManager: 'npm' }
  });
  assert.strictEqual(r.status, 403, `Expected 403 for unauthorized tenant, got ${r.status}`);
  assert.strictEqual(r.body.error, 'PLUGIN_NOT_AUTHORIZED', 'Expected PLUGIN_NOT_AUTHORIZED');
  assert.strictEqual(r.body.plugin, 'ugondu-plugin-node', 'Expected plugin name in response');
  console.log('[en] ✓ PASS: Unauthorized tenant strictly rejected with 403 PLUGIN_NOT_AUTHORIZED');
});

test('PM-006: Tenant activation authorizes execution and returns execution receipt', async () => {
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
});

test('PM-007: Tampered cryptographic signature rejected with 403 INVALID_PLUGIN_SIGNATURE', async () => {
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
  } finally {
    cleanupTamperedFixture();
  }
});
