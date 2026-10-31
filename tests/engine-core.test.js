/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Integration — Engine Core
 * File           : engine-core.test.js
 * Version        : 4.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-20
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
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Engineering. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');
const { generateKeyPairSync } = require('crypto');
const { test, before, after } = require('node:test');

function request(port, method, reqPath, body, extraHeaders = {}) {
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
        path: reqPath,
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
let serverProcess = null;
let mockBillingServer = null;
let engineModule = null;
const { AdmissionController } = require('../server/engine-core/dist/passport/gatekeeper/admission-controller.js');
const { passportGuardMiddleware } = require('../server/engine-core/dist/middleware/passport-guard.middleware.js');

if (!process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY || process.env.UGONDU_SERVICE_IDENTITY_PRIVATE_KEY === '<placeholder>') {
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
          if (parsed.token === 'community_token_123' || parsed.token === 'pro_token_valid'
              || parsed.token === 'community_token_tenant_mismatch') {
            const isPro = parsed.token === 'pro_token_valid';
            const tenantId = parsed.token === 'community_token_tenant_mismatch'
              ? 'tenant_other' : 'tenant_test_default';
            res.writeHead(200);
            res.end(
              JSON.stringify({
                authorized: true,
                outcome: 'authorized',
                edition: isPro ? 'Professional' : 'Community',
                tier: isPro ? 'professional' : 'community',
                tenantId,
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
                outcome: 'invalid',
                reason: 'Invalid or unlicensed token for target deployment scope',
              })
            );
          }
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    srv.listen(0, '127.0.0.1', () => {
      mockBillingServer = srv;
      process.env.BILLING_GATEWAY_URL = `http://127.0.0.1:${srv.address().port}/v1`;
      resolve(srv);
    });
  });
}

before(async () => {
  mockBillingServer = await ensureBillingAuthority();
  process.env.PORT = '0';
  process.env.NODE_ENV = 'test';
  process.env.UGONDU_DEV_EPHEMERAL_KEYS = 'true';
  const originalListen = http.Server.prototype.listen;
  http.Server.prototype.listen = function (...args) {
    serverProcess = this;
    return originalListen.apply(this, args);
  };
  engineModule = require('../server/engine-core/dist/index.js');
  http.Server.prototype.listen = originalListen;
  await new Promise((resolve) => {
    if (serverProcess && serverProcess.listening) resolve();
    else if (serverProcess) serverProcess.once('listening', resolve);
    else resolve();
  });
  if (serverProcess) {
    ENGINE_PORT = serverProcess.address().port;
  }
});

after(async () => {
  if (serverProcess) {
    await new Promise((resolve) => serverProcess.close(resolve));
  }
  if (mockBillingServer) {
    await new Promise((resolve) => mockBillingServer.close(resolve));
  }
});

test('ENG-PASS-004: unconfigured AdmissionController denies by default', () => {
  const denyByDefault = new AdmissionController({}, {}, {}, {}, {}, {}, {});
  assert.deepStrictEqual(
    denyByDefault.admit('plausible_but_unverified', { tenantId: 'tenant_a' }),
    { status: 'REJECTED' }
  );
});

test('ENG-PASS-005: passport middleware rejects repeated and comma-joined credential headers', () => {
  for (const header of [
    ['signed-token-a', 'signed-token-b'],
    'signed-token-a, signed-token-b',
  ]) {
    let status = 0;
    let payload = null;
    let nextCalled = false;
    const req = {
      headers: { 'x-ugondu-passport-id': header },
      body: { tenantId: 'tenant_test_default' },
    };
    const res = {
      status(code) { status = code; return this; },
      json(body) { payload = body; return this; },
    };
    passportGuardMiddleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(status, 403);
    assert.strictEqual(payload.code, 'PASSPORT_REQUIRED');
    assert.strictEqual(nextCalled, false);
  }
});

test('ENG-PASS-006: rejected passport credentials are never echoed in the response', () => {
  const secretLikeCredential = 'opaque-secret-passport-value';
  let status = 0;
  let payload = null;
  let nextCalled = false;
  const req = {
    headers: { 'x-ugondu-passport-id': secretLikeCredential },
    body: { tenantId: 'tenant_test_default' },
  };
  const res = {
    status(code) { status = code; return this; },
    json(body) { payload = body; return this; },
  };
  passportGuardMiddleware(req, res, () => { nextCalled = true; });
  assert.strictEqual(status, 403);
  assert.strictEqual(payload.code, 'PASSPORT_REJECTED');
  assert.strictEqual(JSON.stringify(payload).includes(secretLikeCredential), false);
  assert.strictEqual(nextCalled, false);
});

test('ENG-001: /health/live and /health/ready return 200 with zero static cor_level', async () => {
  const live = await get(ENGINE_PORT, '/health/live');
  assert.strictEqual(live.status, 200, `Expected 200 on /health/live, got ${live.status}`);
  assert.strictEqual(live.body.status, 'alive');
  assert.strictEqual(live.body.cor_level, undefined, 'Health response must not contain static cor_level');

  const ready = await get(ENGINE_PORT, '/health/ready');
  assert.strictEqual(ready.status, 200, `Expected 200 on /health/ready, got ${ready.status}`);
  assert.strictEqual(ready.body.status, 'ready');
  assert.strictEqual(ready.body.cor_level, undefined, 'Readiness response must not contain static cor_level');
  console.log('[en] ✓ PASS: /health/live and /health/ready return 200 with zero static cor_level');
});

test('ENG-PASS-001: unregistered passport prefixes never authenticate', () => {
  for (const candidate of ['pp_forged', 'pass_forged', 'passport_admin', 'valid_unissued']) {
    assert.deepStrictEqual(
      engineModule.admitPassport(candidate, { tenantId: 'tenant_test_default' }),
      { status: 'REJECTED' },
      `Unregistered passport must be rejected: ${candidate}`
    );
  }
});

test('ENG-PASS-002: registered opaque passports are bound to their registered tenant', () => {
  engineModule.registerAdmissionPassport('registered_tenant_a', {
    tenantId: 'tenant_a',
    expiresAt: Date.now() + 60_000,
  });
  assert.deepStrictEqual(
    engineModule.admitPassport('registered_tenant_a', { tenantId: 'tenant_a' }),
    { status: 'ADMITTED', tenantId: 'tenant_a' }
  );
  assert.deepStrictEqual(
    engineModule.admitPassport('registered_tenant_a', { tenantId: 'tenant_b' }),
    { status: 'REJECTED' }
  );

  engineModule.registerAdmissionPassport('registered_revoked', {
    tenantId: 'tenant_a',
    revoked: true,
  });
  assert.deepStrictEqual(
    engineModule.admitPassport('registered_revoked', { tenantId: 'tenant_a' }),
    { status: 'REJECTED' }
  );

  engineModule.registerAdmissionPassport('registered_expired', {
    tenantId: 'tenant_a',
    expiresAt: Date.now() - 1,
  });
  assert.deepStrictEqual(
    engineModule.admitPassport('registered_expired', { tenantId: 'tenant_a' }),
    { status: 'REJECTED' }
  );
});

test('ENG-PASS-003: signed passports require valid claims and exact tenant binding', () => {
  const token = engineModule.issueSignedPassport({ tenantId: 'tenant_signed_a', ttlMs: 60_000 });
  assert.deepStrictEqual(
    engineModule.admitPassport(token, { tenantId: 'tenant_signed_a' }),
    { status: 'ADMITTED', tenantId: 'tenant_signed_a' }
  );
  assert.deepStrictEqual(
    engineModule.admitPassport(token, { tenantId: 'tenant_signed_b' }),
    { status: 'REJECTED' }
  );
  const tokenParts = token.split('.');
  tokenParts[2] = (tokenParts[2][0] === 'A' ? 'B' : 'A') + tokenParts[2].slice(1);
  const tampered = tokenParts.join('.');
  assert.deepStrictEqual(
    engineModule.admitPassport(tampered, { tenantId: 'tenant_signed_a' }),
    { status: 'REJECTED' }
  );
  assert.throws(
    () => engineModule.issueSignedPassport({ tenantId: '', ttlMs: 60_000 }),
    /PASSPORT_TENANT_REQUIRED/
  );
  assert.throws(
    () => engineModule.issueSignedPassport({ tenantId: 'tenant_signed_a', ttlMs: 0 }),
    /PASSPORT_TTL_OUT_OF_RANGE/
  );
});

test('ENG-002: Missing required fields returns 400', async () => {
  const r = await post(ENGINE_PORT, '/v1/deploy/resolve', {});
  assert.strictEqual(r.status, 400, `[en] Expected 400 for missing fields, got ${r.status}`);
  console.log('[en] ✓ PASS: Missing fields returns 400');
});

test('ENG-003: Deterministic 200 signed recipe & idempotent replay verified', async () => {
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

  const replay = await post(ENGINE_PORT, '/v1/deploy/resolve', payload);
  assert.strictEqual(replay.status, 200);
  assert.strictEqual(replay.body.transactionId, r.body.transactionId, 'Idempotent replay must return identical transactionId');
  console.log(`[en] ✓ PASS: Deterministic 200 signed recipe & idempotent replay verified (TX: ${r.body.transactionId})`);
});

test('ENG-PASS-007: AeroBill tenant mismatch rejects deployment despite valid passport', async () => {
  const r = await post(ENGINE_PORT, '/v1/deploy/resolve', {
    repositoryUrl: 'https://github.com/example/repo',
    branch: 'main',
    fileMap: {},
    targetEnvironment: 'cpanel',
    token: 'community_token_tenant_mismatch',
    projectId: 'proj_default',
    workspaceId: 'ws_default',
    targetId: 'tgt_cpanel_01',
    agentId: 'agent_node_01',
    agentVersion: '2.0.0',
    idempotencyKey: `idem_tenant_mismatch_${Date.now()}`,
  });
  assert.strictEqual(r.status, 403, `Expected 403 for passport/AeroBill tenant mismatch, got ${r.status}`);
  assert.strictEqual(r.body.code, 'PASSPORT_BILLING_TENANT_MISMATCH');
});

test('ENG-PASS-009: store outage or corruption fails closed (REJECTED)', () => {
  assert.ok(engineModule.passportStore, 'passportStore must be exposed by engineModule');

  // Register a test passport
  const failClosedPassport = `pp_fail_closed_${Date.now()}`;
  engineModule.registerAdmissionPassport(failClosedPassport, {
    tenantId: 'tenant_fail_closed',
    expiresAt: Date.now() + 60_000,
  });

  // Verify normal admission
  assert.deepStrictEqual(
    engineModule.admitPassport(failClosedPassport, { tenantId: 'tenant_fail_closed' }),
    { status: 'ADMITTED', tenantId: 'tenant_fail_closed' }
  );

  // Simulate persistent store outage
  engineModule.passportStore.simulateOutage(true);
  try {
    const admissionDuringOutage = engineModule.admitPassport(failClosedPassport, { tenantId: 'tenant_fail_closed' });
    assert.deepStrictEqual(
      admissionDuringOutage,
      { status: 'REJECTED' },
      'Admission MUST fail closed (REJECTED) when shared passport store experiences an outage'
    );
  } finally {
    engineModule.passportStore.simulateOutage(false);
  }

  // Restore and verify normal operation resumed
  assert.deepStrictEqual(
    engineModule.admitPassport(failClosedPassport, { tenantId: 'tenant_fail_closed' }),
    { status: 'ADMITTED', tenantId: 'tenant_fail_closed' }
  );
});

test('ENG-004: Unlicensed deployment request deterministically returns 402', async () => {
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
});

test('ENG-005: Telemetry endpoint accepts valid payload', async () => {
  const r = await post(ENGINE_PORT, '/v1/telemetry/report', {
    transactionId: 'tx_test_001',
    status: 'SUCCESS',
    logs: ['[en] Test deployment completed'],
  });
  assert.strictEqual(r.status, 201, `[en] Expected 201 for telemetry, got ${r.status}`);
  console.log('[en] ✓ PASS: Telemetry endpoint accepts valid payload');
});

test('ENG-006: Telemetry endpoint rejects missing fields', async () => {
  const r = await post(ENGINE_PORT, '/v1/telemetry/report', {});
  assert.strictEqual(r.status, 400, `[en] Expected 400 for missing telemetry fields, got ${r.status}`);
  console.log('[en] ✓ PASS: Telemetry endpoint rejects missing fields');
});

test('ENG-PASS-011: validly signed but unregistered passports fail closed', () => {
  const token = engineModule.issueSignedPassport({
    tenantId: 'tenant_signed_unregistered',
    ttlMs: 60_000,
  });
  // Issuance registers the token; clearing the authoritative store models a
  // missing registration on another host or after loss of durable state.
  engineModule.passportStore.clear();
  assert.deepStrictEqual(
    engineModule.admitPassport(token, { tenantId: 'tenant_signed_unregistered' }),
    { status: 'REJECTED' },
    'A valid signature must not bypass mandatory registration'
  );
});
