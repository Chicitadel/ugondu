/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Contract — Commercial Federation (AeroBill & Mandatag)
 * File           : commercial-federation-contract.test.js
 * Version        : 1.0.0
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-11-14
 * Last Modified  : 2026-11-14
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('node:assert/strict');
const http = require('node:http');
const { createHmac, generateKeyPairSync, sign } = require('node:crypto');
const { test, describe, before, after } = require('node:test');

const { signServiceIdentity, globalTrustRegistry } = require('../server/shared/dist/identity');
const {
  app,
  clearReplayCache,
  usageLedger,
  tenantLifecycleOverrides,
} = require('../server/billing-gateway/dist/index');

const svcKeys = generateKeyPairSync('ed25519');
const svcPriv = svcKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const svcPub = svcKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const SVC_KEY_ID = 'key_fed_svc_test_v1';

const mandatagRotKeys = generateKeyPairSync('ed25519');
const mandatagRotPriv = mandatagRotKeys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
const mandatagRotPub = mandatagRotKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const MANDATAG_ROT_KEY_ID = 'key_mandatag_rot_v2';

globalTrustRegistry.registerKey({
  keyId: SVC_KEY_ID,
  algorithm: 'ed25519',
  status: 'ACTIVE',
  purpose: 'service-identity',
  publicKey: svcPub,
});

function signMandatagJwt(payloadClaims, keyId = MANDATAG_ROT_KEY_ID, privPem = mandatagRotPriv) {
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: keyId })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payloadClaims)).toString('base64url');
  const sigB64 = sign(null, Buffer.from(`${headerB64}.${payloadB64}`), privPem).toString('base64url');
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

function signAeroBillWebhook(payload, secret) {
  return 'sha256=' + createHmac('sha256', secret).update(JSON.stringify(payload), 'utf8').digest('hex');
}

function httpJson(port, method, reqPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: reqPath,
        method,
        headers: {
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => { raw += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: raw ? JSON.parse(raw) : {} });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function svcAuthHeader() {
  const tok = signServiceIdentity('engine-core', 'billing-gateway', 'execute', svcPriv, SVC_KEY_ID);
  return { Authorization: `Bearer ${tok}` };
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

describe('UG-COR-COMMERCIAL-FEDERATION-001: AeroBill & Mandatag Commercial Lifecycle', () => {
  let gatewayServer;
  let aeroServer;
  let mandatagServer;
  let gatewayPort;
  let aeroPort;
  let mandatagPort;

  const state = {
    aerobillDown: false,
    checkoutCalls: 0,
    upgradeCalls: 0,
    meterEvents: [],
    refreshCalls: 0,
    revokeCalls: 0,
    lastIssuedToken: '',
  };

  const savedEnv = {
    NODE_ENV: process.env.NODE_ENV,
    AEROBILL_URL: process.env.AEROBILL_URL,
    MANDATAG_AUTHORITY_URL: process.env.MANDATAG_AUTHORITY_URL,
    AEROBILL_WEBHOOK_SECRET: process.env.AEROBILL_WEBHOOK_SECRET,
  };

  before(async () => {
    aeroServer = http.createServer(async (req, res) => {
      if (state.aerobillDown) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AEROBILL_UNAVAILABLE' }));
        return;
      }
      const body = await readJsonBody(req);
      if (req.method === 'POST' && req.url === '/api/v1/checkout/sessions') {
        state.checkoutCalls++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sessionId: `cs_live_${state.checkoutCalls}`,
          checkoutUrl: `http://127.0.0.1:${aeroPort}/pay/cs_live_${state.checkoutCalls}`,
          edition: body.edition,
          status: 'open',
        }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/v1/subscriptions/upgrade') {
        state.upgradeCalls++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sessionId: `upg_live_${state.upgradeCalls}`,
          upgradeUrl: `http://127.0.0.1:${aeroPort}/upgrade/upg_live_${state.upgradeCalls}`,
          targetEdition: body.targetEdition,
          status: 'pending_confirmation',
        }));
        return;
      }
      if (req.method === 'GET' && req.url.startsWith('/api/v1/subscriptions/')) {
        const tenantId = decodeURIComponent(req.url.split('/').pop());
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tenantId, subscriptionId: 'sub_live_001', status: 'active', edition: 'enterprise' }));
        return;
      }
      if (req.method === 'GET' && req.url.startsWith('/api/v1/invoices')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ invoices: [{ invoiceId: 'inv_live_001', status: 'paid', amountCents: 19900 }] }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/v1/metering/usage') {
        state.meterEvents.push(body);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ accepted: true, eventId: body.eventId }));
        return;
      }
      res.writeHead(404).end();
    });

    mandatagServer = http.createServer(async (req, res) => {
      const body = await readJsonBody(req);
      if (req.method === 'GET' && req.url === '/api/v1/keys/jwks') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          keys: [{ keyId: MANDATAG_ROT_KEY_ID, algorithm: 'ed25519', status: 'ACTIVE', purpose: 'service-identity', publicKey: mandatagRotPub }],
        }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/v1/entitlements/refresh') {
        state.refreshCalls++;
        const now = Math.floor(Date.now() / 1000);
        const token = signMandatagJwt({
          iss: 'https://license.airroofers.eu',
          sub: body.tenantId,
          edition: body.edition || 'enterprise',
          status: 'active',
          iat: now,
          exp: now + 3600,
        });
        state.lastIssuedToken = token;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tenantId: body.tenantId, edition: body.edition || 'enterprise', status: 'active', token }));
        return;
      }
      if (req.method === 'POST' && req.url === '/api/v1/entitlements/revoke') {
        state.revokeCalls++;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ tenantId: body.tenantId, revoked: true, reason: body.reason }));
        return;
      }
      res.writeHead(404).end();
    });

    await new Promise((r) => aeroServer.listen(0, '127.0.0.1', r));
    await new Promise((r) => mandatagServer.listen(0, '127.0.0.1', r));
    aeroPort = aeroServer.address().port;
    mandatagPort = mandatagServer.address().port;

    process.env.NODE_ENV = 'test';
    process.env.AEROBILL_URL = `http://127.0.0.1:${aeroPort}`;
    process.env.MANDATAG_AUTHORITY_URL = `http://127.0.0.1:${mandatagPort}/api/v1`;
    process.env.AEROBILL_WEBHOOK_SECRET = 'whsec_test_federation_secret';

    clearReplayCache();
    usageLedger.clear();
    tenantLifecycleOverrides.clear();

    await new Promise((r) => {
      gatewayServer = app.listen(0, '127.0.0.1', r);
    });
    gatewayPort = gatewayServer.address().port;
  });

  after(async () => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    usageLedger.clear();
    tenantLifecycleOverrides.clear();
    await new Promise((r) => (gatewayServer ? gatewayServer.close(r) : r()));
    await new Promise((r) => (aeroServer ? aeroServer.close(r) : r()));
    await new Promise((r) => (mandatagServer ? mandatagServer.close(r) : r()));
  });

  test('FED-001: Mandatag JWKS key discovery registers rotated Ed25519 verification key', async () => {
    const syncRes = await httpJson(gatewayPort, 'POST', '/v1/keys/mandatag/sync', {}, svcAuthHeader());
    assert.equal(syncRes.status, 200);
    assert.equal(syncRes.body.synced, true);
    assert.equal(syncRes.body.registeredKeys, 1);

    const now = Math.floor(Date.now() / 1000);
    const rotatedJwt = signMandatagJwt({
      iss: 'https://license.airroofers.eu',
      sub: 'tenant_fed_rot_01',
      edition: 'enterprise',
      status: 'active',
      iat: now,
      exp: now + 3600,
    });
    const authRes = await httpJson(gatewayPort, 'POST', '/v1/authorize', { token: rotatedJwt }, svcAuthHeader());
    assert.equal(authRes.status, 200);
    assert.equal(authRes.body.tenantId, 'tenant_fed_rot_01');
    assert.equal(authRes.body.edition, 'enterprise');
  });

  test('FED-002: AeroBill checkout session, upgrade, subscription & invoice APIs execute real HTTP transactions and fail closed', async () => {
    const csRes = await httpJson(
      gatewayPort,
      'POST',
      '/v1/checkout/session',
      { tenantId: 'tenant_fed_01', edition: 'enterprise' },
      { ...svcAuthHeader(), 'Idempotency-Key': 'cs-idemp-001' }
    );
    assert.equal(csRes.status, 200);
    assert.equal(csRes.body.delegatedTo, 'AeroBill APR');
    assert.equal(csRes.body.sessionId, 'cs_live_1');
    assert.equal(state.checkoutCalls, 1);

    const upgRes = await httpJson(
      gatewayPort,
      'POST',
      '/v1/upgrade/session',
      { tenantId: 'tenant_fed_01', targetEdition: 'enterprise', subscriptionId: 'sub_live_001' },
      svcAuthHeader()
    );
    assert.equal(upgRes.status, 200);
    assert.equal(upgRes.body.sessionId, 'upg_live_1');

    const subRes = await httpJson(gatewayPort, 'GET', '/v1/subscriptions/tenant_fed_01', undefined, svcAuthHeader());
    assert.equal(subRes.status, 200);
    assert.equal(subRes.body.subscriptionId, 'sub_live_001');

    const invRes = await httpJson(gatewayPort, 'GET', '/v1/invoices/tenant_fed_01', undefined, svcAuthHeader());
    assert.equal(invRes.status, 200);
    assert.equal(invRes.body.invoices[0].invoiceId, 'inv_live_001');

    state.aerobillDown = true;
    try {
      const failRes = await httpJson(gatewayPort, 'POST', '/v1/checkout/session', { edition: 'enterprise' }, svcAuthHeader());
      assert.equal(failRes.status, 503);
      assert.equal(failRes.body.code, 'UPSTREAM_UNAVAILABLE');
    } finally {
      state.aerobillDown = false;
    }
  });

  test('FED-003: AeroBill payment.succeeded webhook triggers Mandatag refresh and activates entitlement', async () => {
    const payload = {
      eventId: 'evt_pay_ok_001',
      eventType: 'payment.succeeded',
      tenantId: 'tenant_fed_01',
      invoiceId: 'inv_live_001',
      subscriptionId: 'sub_live_001',
      edition: 'enterprise',
    };
    const whRes = await httpJson(gatewayPort, 'POST', '/v1/webhooks/aerobill', payload, {
      'x-aerobill-signature': signAeroBillWebhook(payload, process.env.AEROBILL_WEBHOOK_SECRET),
      'x-aerobill-timestamp': String(Date.now()),
    });
    assert.equal(whRes.status, 200);
    assert.equal(whRes.body.processed, true);
    assert.equal(whRes.body.synced, true);
    assert.equal(state.refreshCalls, 1);
    assert.ok(whRes.body.entitlementToken.startsWith('eyJ'));

    const authRes = await httpJson(
      gatewayPort,
      'POST',
      '/v1/authorize',
      { token: whRes.body.entitlementToken, requiredCapability: 'allowRollback' },
      svcAuthHeader()
    );
    assert.equal(authRes.status, 200);
    assert.equal(authRes.body.edition, 'enterprise');
    assert.equal(authRes.body.capabilities.allowRollback, true);
  });

  test('FED-004: Webhook rejects forged signatures, stale timestamps, and deduplicates replays', async () => {
    const payload = {
      eventId: 'evt_pay_ok_001',
      eventType: 'payment.succeeded',
      tenantId: 'tenant_fed_01',
      invoiceId: 'inv_live_001',
    };

    const badSig = await httpJson(gatewayPort, 'POST', '/v1/webhooks/aerobill', payload, {
      'x-aerobill-signature': 'sha256=deadbeef',
      'x-aerobill-timestamp': String(Date.now()),
    });
    assert.equal(badSig.status, 401);

    const staleTs = await httpJson(gatewayPort, 'POST', '/v1/webhooks/aerobill', payload, {
      'x-aerobill-signature': signAeroBillWebhook(payload, process.env.AEROBILL_WEBHOOK_SECRET),
      'x-aerobill-timestamp': String(Date.now() - 10 * 60 * 1000),
    });
    assert.equal(staleTs.status, 401);

    const dupRes = await httpJson(gatewayPort, 'POST', '/v1/webhooks/aerobill', payload, {
      'x-aerobill-signature': signAeroBillWebhook(payload, process.env.AEROBILL_WEBHOOK_SECRET),
      'x-aerobill-timestamp': String(Date.now()),
    });
    assert.equal(dupRes.status, 200);
    assert.equal(dupRes.body.deduplicated, true);
    assert.equal(state.refreshCalls, 1);
  });

  test('FED-005: Refund/cancellation revokes Mandatag entitlement and blocks authorization immediately', async () => {
    const refundPayload = {
      eventId: 'evt_refund_001',
      eventType: 'charge.refunded',
      tenantId: 'tenant_fed_01',
      invoiceId: 'inv_live_001',
      reason: 'customer_refund',
    };
    const whRes = await httpJson(gatewayPort, 'POST', '/v1/webhooks/aerobill', refundPayload, {
      'x-aerobill-signature': signAeroBillWebhook(refundPayload, process.env.AEROBILL_WEBHOOK_SECRET),
      'x-aerobill-timestamp': String(Date.now()),
    });
    assert.equal(whRes.status, 200);
    assert.equal(whRes.body.status, 'revoked');
    assert.equal(state.revokeCalls, 1);

    const denied = await httpJson(
      gatewayPort,
      'POST',
      '/v1/authorize',
      { token: state.lastIssuedToken },
      svcAuthHeader()
    );
    assert.equal(denied.status, 403);
    assert.equal(denied.body.code, 'LICENSE_REVOKED');

    const nowIso = new Date().toISOString();
    const restoreEvent = {
      eventId: 'evt_mandatag_restore_01',
      eventType: 'ENTITLEMENT_RESTORED',
      tenantId: 'tenant_fed_01',
      subjectId: 'sub_live_001',
      entitlementVersion: 2,
      sequence: 1,
      effectiveAt: nowIso,
      issuedAt: nowIso,
      payload: { reason: 'dispute_resolved' },
    };
    const restoreSig = sign(null, Buffer.from(JSON.stringify(restoreEvent), 'utf8'), mandatagRotPriv).toString('base64url');
    const mRes = await httpJson(gatewayPort, 'POST', '/v1/webhooks/mandatag', {
      ...restoreEvent,
      signature: restoreSig,
      signatureKeyId: MANDATAG_ROT_KEY_ID,
    });
    assert.equal(mRes.status, 200);
    assert.equal(mRes.body.processed, true);

    const restored = await httpJson(gatewayPort, 'POST', '/v1/authorize', { token: state.lastIssuedToken }, svcAuthHeader());
    assert.equal(restored.status, 200);
  });

  test('FED-006: Durable tenant-bound usage metering reconciles to AeroBill and queues retries on outage', async () => {
    const ts = new Date().toISOString();
    const meter1 = await httpJson(
      gatewayPort,
      'POST',
      '/v1/metering/usage',
      { eventId: 'meter_evt_001', tenantId: 'tenant_fed_01', metric: 'deployments', quantity: 3, timestamp: ts },
      svcAuthHeader()
    );
    assert.equal(meter1.status, 200);
    assert.equal(meter1.body.outcome, 'RECONCILED');
    assert.equal(state.meterEvents.length, 1);

    const replaySame = await httpJson(
      gatewayPort,
      'POST',
      '/v1/metering/usage',
      { eventId: 'meter_evt_001', tenantId: 'tenant_fed_01', metric: 'deployments', quantity: 3, timestamp: ts },
      svcAuthHeader()
    );
    assert.equal(replaySame.status, 200);
    assert.equal(replaySame.body.outcome, 'IDEMPOTENT_REPLAY');
    assert.equal(state.meterEvents.length, 1);

    const conflict = await httpJson(
      gatewayPort,
      'POST',
      '/v1/metering/usage',
      { eventId: 'meter_evt_001', tenantId: 'tenant_fed_01', metric: 'deployments', quantity: 99, timestamp: ts },
      svcAuthHeader()
    );
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.code, 'REPLAY_DETECTED');

    state.aerobillDown = true;
    const queued = await httpJson(
      gatewayPort,
      'POST',
      '/v1/metering/usage',
      { eventId: 'meter_evt_002', tenantId: 'tenant_fed_01', metric: 'deployments', quantity: 5, timestamp: ts },
      svcAuthHeader()
    );
    assert.equal(queued.status, 202);
    assert.equal(queued.body.outcome, 'QUEUED_RETRY');

    state.aerobillDown = false;
    const flushRes = await httpJson(gatewayPort, 'POST', '/v1/metering/flush', {}, svcAuthHeader());
    assert.equal(flushRes.status, 200);
    assert.equal(flushRes.body.reconciled, 1);
    assert.equal(flushRes.body.remaining, 0);
    assert.equal(state.meterEvents.length, 2);
  });

  test('FED-007: Live staging federation acceptance gate (fails closed when UGONDU_REQUIRE_LIVE_FEDERATION=true)', async (t) => {
    const { runLiveStagingFederationAcceptance } = require('./commercial-federation-live-staging.test.js');
    await runLiveStagingFederationAcceptance(t);
  });
});
