'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');

function svcAuthHeader() {
  const secret = (process.env.INTERNAL_SERVICE_SECRET || 'ugondu-test-internal-secret-0001').trim();
  const payload = JSON.stringify({
    serviceId: 'engine-core',
    iat: Math.floor(Date.now() / 1000),
    nonce: crypto.randomBytes(12).toString('hex'),
  });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return { 'x-ugondu-service-auth': `${encoded}.${sig}` };
}

function httpJson(port, method, reqPath, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
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
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch {
            parsed = raw;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { ok: res.ok, status: res.status, body: json };
}

function signAeroBillWebhook(payload, secret) {
  const hex = crypto.createHmac('sha256', secret).update(JSON.stringify(payload), 'utf8').digest('hex');
  return `sha256=${hex}`;
}

async function runLiveStagingFederationAcceptance(t) {
  const requireLive = process.env.UGONDU_REQUIRE_LIVE_FEDERATION === 'true';
  const aeroStage = (process.env.AEROBILL_STAGING_URL || '').trim().replace(/\/+$/, '');
  const mandatagStage = (process.env.MANDATAG_STAGING_URL || '').trim().replace(/\/+$/, '');
  const aeroKey = (process.env.AEROBILL_API_KEY || '').trim();
  const mandatagKey = (process.env.MANDATAG_API_KEY || '').trim();
  const webhookSecret = (process.env.AEROBILL_WEBHOOK_SECRET || '').trim();

  if (!aeroStage || !mandatagStage || !aeroKey || !mandatagKey || !webhookSecret) {
    const reason =
      'Live authorized AeroBill/Mandatag staging credentials not configured (AEROBILL_STAGING_URL, MANDATAG_STAGING_URL, AEROBILL_API_KEY, MANDATAG_API_KEY, AEROBILL_WEBHOOK_SECRET)';
    if (requireLive) assert.fail(`[FED-LIVE-FAIL-CLOSED] ${reason}`);
    t.skip(reason);
    return;
  }

  const runId = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const tenantA = `tenant_cor_staging_${runId}`;
  const tenantB = `tenant_cor_iso_${runId}`;
  const aeroHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${aeroKey}` };
  const mndHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${mandatagKey}` };

  // 1. Authority health & JWKS
  const aeroHealth = await fetchJson(`${aeroStage}/health`);
  assert.equal(aeroHealth.ok, true, `AeroBill health failed: ${aeroHealth.status}`);
  const mndJwks = await fetchJson(`${mandatagStage}/api/v1/keys/jwks`);
  assert.equal(mndJwks.ok, true, `Mandatag JWKS failed: ${mndJwks.status}`);
  assert.ok(Array.isArray(mndJwks.body?.keys) && mndJwks.body.keys.length > 0, 'JWKS must expose >=1 key');

  // 2. Fail-closed invalid credentials on both authorities
  const badAero = await fetchJson(`${aeroStage}/api/v1/subscriptions/${encodeURIComponent(tenantA)}`, {
    headers: { Authorization: 'Bearer ab_prod_invalid_0000' },
  });
  assert.equal(badAero.status, 401, 'AeroBill must reject invalid Bearer key with 401');

  const badMnd = await fetchJson(`${mandatagStage}/api/v1/entitlements/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer mnd_prod_invalid_0000' },
    body: JSON.stringify({ tenantId: tenantA, edition: 'enterprise' }),
  });
  assert.equal(badMnd.status, 401, 'Mandatag must reject invalid Bearer key with 401');

  // 3. Non-charging checkout session + idempotency + conflict
  const checkoutIdemp = `chk_live_${runId}`;
  const chk1 = await fetchJson(`${aeroStage}/api/v1/checkout/sessions`, {
    method: 'POST',
    headers: { ...aeroHeaders, 'Idempotency-Key': checkoutIdemp },
    body: JSON.stringify({ tenantId: tenantA, edition: 'professional' }),
  });
  assert.ok(chk1.status === 200 || chk1.status === 201, `Checkout failed: ${chk1.status}`);
  assert.ok(chk1.body?.sessionId && chk1.body?.checkoutUrl, 'Checkout must return sessionId and checkoutUrl');
  assert.equal(chk1.body?.status, 'open', 'Non-charging staging checkout must remain open (unpaid)');

  const chkReplay = await fetchJson(`${aeroStage}/api/v1/checkout/sessions`, {
    method: 'POST',
    headers: { ...aeroHeaders, 'Idempotency-Key': checkoutIdemp },
    body: JSON.stringify({ tenantId: tenantA, edition: 'professional' }),
  });
  assert.equal(chkReplay.status, 200);
  assert.equal(chkReplay.body?.sessionId, chk1.body.sessionId);

  const chkConflict = await fetchJson(`${aeroStage}/api/v1/checkout/sessions`, {
    method: 'POST',
    headers: { ...aeroHeaders, 'Idempotency-Key': checkoutIdemp },
    body: JSON.stringify({ tenantId: tenantA, edition: 'enterprise' }),
  });
  assert.equal(chkConflict.status, 409, 'Idempotency-Key payload mismatch must return 409');

  // 4. Upgrade, subscription read, tenant isolation & invoices
  const upg = await fetchJson(`${aeroStage}/api/v1/subscriptions/upgrade`, {
    method: 'POST',
    headers: { ...aeroHeaders, 'Idempotency-Key': `upg_live_${runId}` },
    body: JSON.stringify({ tenantId: tenantA, targetEdition: 'enterprise' }),
  });
  assert.equal(upg.status, 200);
  assert.ok(upg.body?.sessionId && upg.body?.upgradeUrl);

  const subA = await fetchJson(`${aeroStage}/api/v1/subscriptions/${encodeURIComponent(tenantA)}`, { headers: aeroHeaders });
  assert.equal(subA.status, 200);
  assert.equal(subA.body?.edition, 'enterprise');

  const subB = await fetchJson(`${aeroStage}/api/v1/subscriptions/${encodeURIComponent(tenantB)}`, { headers: aeroHeaders });
  assert.equal(subB.status, 200);
  assert.equal(subB.body?.status, 'none', 'Unrelated tenant must remain isolated');

  const invA = await fetchJson(`${aeroStage}/api/v1/invoices?tenantId=${encodeURIComponent(tenantA)}`, { headers: aeroHeaders });
  assert.equal(invA.status, 200);
  assert.ok(Array.isArray(invA.body?.invoices));

  // 5. Usage metering + idempotency + conflict
  const meterEvt = `meter_live_${runId}`;
  const m1 = await fetchJson(`${aeroStage}/api/v1/metering/usage`, {
    method: 'POST',
    headers: aeroHeaders,
    body: JSON.stringify({ eventId: meterEvt, tenantId: tenantA, metric: 'deployments', quantity: 1, timestamp: new Date().toISOString() }),
  });
  assert.ok(m1.status === 200 || m1.status === 202);
  const mDup = await fetchJson(`${aeroStage}/api/v1/metering/usage`, {
    method: 'POST',
    headers: aeroHeaders,
    body: JSON.stringify({ eventId: meterEvt, tenantId: tenantA, metric: 'deployments', quantity: 1, timestamp: new Date().toISOString() }),
  });
  assert.equal(mDup.status, 200);
  const mConflict = await fetchJson(`${aeroStage}/api/v1/metering/usage`, {
    method: 'POST',
    headers: aeroHeaders,
    body: JSON.stringify({ eventId: meterEvt, tenantId: tenantA, metric: 'deployments', quantity: 99, timestamp: new Date().toISOString() }),
  });
  assert.equal(mConflict.status, 409);

  // 6. End-to-end Ugondu gateway: JWKS sync -> signed payment webhook -> Mandatag refresh -> authorize -> refund revoke -> blocked
  const prevEnv = {
    NODE_ENV: process.env.NODE_ENV,
    AEROBILL_URL: process.env.AEROBILL_URL,
    MANDATAG_AUTHORITY_URL: process.env.MANDATAG_AUTHORITY_URL,
  };
  process.env.NODE_ENV = 'test';
  process.env.AEROBILL_URL = aeroStage;
  process.env.MANDATAG_AUTHORITY_URL = `${mandatagStage}/api/v1`;

  const gw = require('../server/billing-gateway/dist/index.js');
  gw.clearReplayCache();
  gw.tenantLifecycleOverrides.clear();

  const server = await new Promise((resolve) => {
    const s = gw.app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const gwPort = server.address().port;

  try {
    const syncRes = await httpJson(gwPort, 'POST', '/v1/keys/mandatag/sync', {}, svcAuthHeader());
    assert.equal(syncRes.status, 200);
    assert.ok(syncRes.body.registered >= 1);

    const payEvt = {
      eventId: `evt_pay_live_${runId}`,
      type: 'payment.succeeded',
      tenantId: tenantA,
      invoiceId: `inv_live_${runId}`,
      edition: 'enterprise',
      timestamp: new Date().toISOString(),
    };
    const payRes = await httpJson(gwPort, 'POST', '/v1/webhooks/aerobill', payEvt, {
      'x-aerobill-signature': signAeroBillWebhook(payEvt, webhookSecret),
      'x-aerobill-timestamp': String(Math.floor(Date.now() / 1000)),
    });
    assert.equal(payRes.status, 200);
    assert.equal(payRes.body.outcome, 'ENTITLEMENT_ACTIVATED');

    const authOk = await httpJson(
      gwPort,
      'POST',
      '/v1/authorize',
      { token: payRes.body.entitlementToken, requiredEdition: 'enterprise' },
      svcAuthHeader()
    );
    assert.equal(authOk.status, 200);
    assert.equal(authOk.body.authorized, true);

    const refEvt = {
      eventId: `evt_ref_live_${runId}`,
      type: 'invoice.refunded',
      tenantId: tenantA,
      invoiceId: `inv_live_${runId}`,
      reason: 'staging_acceptance_refund',
      timestamp: new Date().toISOString(),
    };
    const refRes = await httpJson(gwPort, 'POST', '/v1/webhooks/aerobill', refEvt, {
      'x-aerobill-signature': signAeroBillWebhook(refEvt, webhookSecret),
      'x-aerobill-timestamp': String(Math.floor(Date.now() / 1000)),
    });
    assert.equal(refRes.status, 200);
    assert.equal(refRes.body.outcome, 'ENTITLEMENT_REVOKED');

    const authBlocked = await httpJson(
      gwPort,
      'POST',
      '/v1/authorize',
      { token: payRes.body.entitlementToken, requiredEdition: 'enterprise' },
      svcAuthHeader()
    );
    assert.equal(authBlocked.status, 403);
    assert.equal(authBlocked.body.authorized, false);
  } finally {
    await new Promise((r) => server.close(r));
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

if (require.main === module) {
  test('FED-007: Live staging commercial federation acceptance suite (non-charging)', runLiveStagingFederationAcceptance);
}

module.exports = { runLiveStagingFederationAcceptance };
