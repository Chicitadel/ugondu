/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration — Event Bus
 * File           : event-bus.test.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-18
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');
const { test, before, after } = require('node:test');

const {
  app,
  eventStore,
  deadLetterLog,
  setEventBusConfig,
  setSimulatedQueueDepth,
} = require('../server/event-bus/dist/index');

function request(port, method, reqPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = body !== undefined ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port,
      path: reqPath,
      method,
      headers: {
        ...(data
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {}),
        ...extraHeaders,
      },
    };
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: JSON.parse(responseBody),
          });
        } catch {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: responseBody,
          });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let server;
let BUS_PORT;

before(async () => {
  eventStore.clearForTesting();
  setEventBusConfig({ maxQueueDepth: 50, maxRetries: 2, retryDelayMs: 5 });
  setSimulatedQueueDepth(0);

  server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.on('error', reject);
  });
  BUS_PORT = server.address().port;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('EB-001: Health, live, ready, metadata & W3C traceparent', async () => {
  const tp = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  const h = await request(BUS_PORT, 'GET', '/health', undefined, {
    traceparent: tp,
    'x-correlation-id': 'corr-eb-001',
  });
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.status, 'ok');
  assert.strictEqual(h.body.cor_level, undefined);
  assert.strictEqual(h.headers['traceparent'], tp);
  assert.strictEqual(h.headers['x-correlation-id'], 'corr-eb-001');

  const live = await request(BUS_PORT, 'GET', '/health/live');
  assert.strictEqual(live.status, 200);
  assert.strictEqual(live.body.status, 'live');

  const ready = await request(BUS_PORT, 'GET', '/health/ready');
  assert.strictEqual(ready.status, 200);
  assert.strictEqual(ready.body.status, 'ready');

  const meta = await request(BUS_PORT, 'GET', '/v1/metadata');
  assert.strictEqual(meta.status, 200);
  assert.strictEqual(meta.body.service, 'event-bus');
  console.log('[en] ✓ PASS: Health, liveness, readiness, metadata & W3C traceparent verified');
});

test('EB-002: Envelope schema validation rejects malformed payload with 400', async () => {
  const r = await request(BUS_PORT, 'POST', '/v1/events/publish', {
    eventId: 'evt-bad',
  });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.code, 'SCHEMA_VALIDATION_FAILED');
  console.log('[en] ✓ PASS: Envelope schema validation rejects malformed payload with 400');
});

test('EB-003: Idempotency deduplication and payload secret redaction verified', async () => {
  const envelope = {
    eventId: 'evt-int-001',
    schemaVersion: '1.0.0',
    type: 'DEPLOYMENT_SUCCEEDED',
    tenantId: 'tenant_int_01',
    correlationId: 'corr-int-001',
    timestamp: new Date().toISOString(),
    payload: {
      releaseId: 'rel_100',
      apiSecret: 'secret_value_should_be_redacted',
      authToken: 'Bearer tok_abc_123',
    },
  };

  const first = await request(BUS_PORT, 'POST', '/v1/events/publish', envelope);
  assert.strictEqual(first.status, 200);
  assert.strictEqual(first.body.dispatched, true);
  assert.strictEqual(first.body.deduplicated, false);
  assert.strictEqual(first.body.payload.apiSecret, '[REDACTED]');

  const duplicate = await request(BUS_PORT, 'POST', '/v1/events/publish', envelope);
  assert.strictEqual(duplicate.status, 200);
  assert.strictEqual(duplicate.body.dispatched, false);
  assert.strictEqual(duplicate.body.deduplicated, true);
  assert.strictEqual(duplicate.body.idempotentReplay, true);
  console.log('[en] ✓ PASS: Idempotency deduplication and payload secret redaction verified');
});

test('EB-004: Tenant isolation and SSRF webhook guard verified', async () => {
  const crossRes = await request(
    BUS_PORT,
    'POST',
    '/v1/events/publish',
    {
      eventId: 'evt-int-cross',
      schemaVersion: '1.0.0',
      type: 'DEPLOYMENT_SUCCEEDED',
      tenantId: 'tenant_int_01',
      correlationId: 'corr-int-002',
      timestamp: new Date().toISOString(),
      payload: { ok: true },
    },
    { 'x-tenant-id': 'tenant_int_02' }
  );
  assert.strictEqual(crossRes.status, 403);
  assert.strictEqual(crossRes.body.code, 'CROSS_TENANT_ACCESS_DENIED');

  const ssrfSub = await request(BUS_PORT, 'POST', '/v1/events/subscribe', {
    tenantId: 'tenant_int_01',
    type: 'DEPLOYMENT_SUCCEEDED',
    webhookUrl: 'http://169.254.169.254/latest/meta-data/',
  });
  assert.strictEqual(ssrfSub.status, 400);
  assert.strictEqual(ssrfSub.body.code, 'SSRF_BLOCKED');
  console.log('[en] ✓ PASS: Tenant isolation and SSRF webhook guard verified');
});

test('EB-005: Backpressure (429) and dead-letter queue verified', async () => {
  setEventBusConfig({ maxQueueDepth: 1, maxRetries: 2, retryDelayMs: 1 });
  setSimulatedQueueDepth(1);
  const bp = await request(BUS_PORT, 'POST', '/v1/events/publish', {
    eventId: 'evt-int-bp',
    schemaVersion: '1.0.0',
    type: 'DEPLOYMENT_SUCCEEDED',
    tenantId: 'tenant_int_01',
    correlationId: 'corr-int-003',
    timestamp: new Date().toISOString(),
    payload: { ok: true },
  });
  assert.strictEqual(bp.status, 429);
  assert.strictEqual(bp.body.code, 'BACKPRESSURE_REJECTED');

  setSimulatedQueueDepth(0);
  await request(BUS_PORT, 'POST', '/v1/events/subscribe', {
    tenantId: 'tenant_dlq_test',
    type: 'AUDIT_ALERT',
    webhookUrl: 'http://203.0.113.1:9/unreachable',
  });
  eventStore.addSubscriber('AUDIT_ALERT', 'http://127.0.0.1:65530/blocked', 'tenant_dlq_test');

  const dlqPub = await request(BUS_PORT, 'POST', '/v1/events/publish', {
    eventId: 'evt-int-dlq-01',
    schemaVersion: '1.0.0',
    type: 'AUDIT_ALERT',
    tenantId: 'tenant_dlq_test',
    correlationId: 'corr-int-dlq',
    timestamp: new Date().toISOString(),
    payload: { password: 'secret_dlq_password' },
  });
  assert.strictEqual(dlqPub.status, 200);
  assert.strictEqual(dlqPub.body.deadLetteredCount, 1);
  assert.ok(deadLetterLog.length >= 1);
  assert.strictEqual(deadLetterLog[0].payload.password, '[REDACTED]');
  console.log('[en] ✓ PASS: Backpressure (429) and dead-letter queue verified');
});
