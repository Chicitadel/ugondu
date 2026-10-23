/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Air Roofers AI Credential Canary
 * File           : airroofers-ai-credential-canary.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-23
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {
  AirRoofersAiProviderAdapter, CredentialBroker, ModelCatalog,
} = require('../../server/engine-core/dist/ai');

const AIRROOFERS_SECRET_REF = 'env://UGONDU_AIRROOFERS_AI_KEY';
const AIRROOFERS_CANARY_SECRET = 'air_prod_' + 'a1b2c3d4e5f678901234567890abcdef1234567890abcdef';
const AIRROOFERS_BASE_URL = 'https://ai.airroofers.eu';
const SERVICE_KEY_FORMAT_REGEX = /^air_prod_[0-9a-f]{48}$/;

function validateAirRoofersKeyFormat(candidate) {
  if (typeof candidate !== 'string') return false;
  return SERVICE_KEY_FORMAT_REGEX.test(candidate.trim());
}

function makeCanaryRequest(overrides = {}) {
  return {
    requestId: 'req-canary-sovereign-001', tenantId: 'tenant-airroofers-fr', productId: 'ugondu',
    environment: 'production', task: 'chat', modelAlias: 'sovereign-eu-chat', region: 'eu-west-3',
    dataClassification: 'confidential', messages: [{ role: 'user', content: 'Verify sovereign AI fabric connectivity and credentials' }],
    maxOutputTokens: 256, deadlineMs: 5000, correlationId: 'corr-canary-sovereign-001', ...overrides,
  };
}

test('CANARY-001: Candidate secret format enforcement (air_prod_<48_hex_chars>) and vault registration', () => {
  const malformedCandidates = [
    'mock-token-12345', 'sk-ant-api03-invalid-placeholder',
    'air_dev_a1b2c3d4e5f678901234567890abcdef1234567890abcdef',
    'air_prod_short', 'air_prod_' + 'z'.repeat(48), '', null, undefined,
  ];

  for (const candidate of malformedCandidates) {
    assert.strictEqual(validateAirRoofersKeyFormat(candidate), false, `Malformed must fail: ${candidate}`);
  }

  assert.strictEqual(validateAirRoofersKeyFormat(AIRROOFERS_CANARY_SECRET), true);
  assert.strictEqual(AIRROOFERS_CANARY_SECRET.startsWith('air_prod_'), true);
  assert.strictEqual(AIRROOFERS_CANARY_SECRET.length, 57);

  const broker = new CredentialBroker();
  broker.registerWorkloadSecret(AIRROOFERS_SECRET_REF, AIRROOFERS_CANARY_SECRET);
  const handle = broker.resolveHandle(AIRROOFERS_SECRET_REF);

  assert.strictEqual(handle.credentialRef, AIRROOFERS_SECRET_REF);
  assert.strictEqual(handle.scheme, 'env');
  assert.strictEqual(handle.keyId, 'UGONDU_AIRROOFERS_AI_KEY');
  const expectedHash = crypto.createHash('sha256').update(AIRROOFERS_CANARY_SECRET).digest('hex').slice(0, 16);
  assert.strictEqual(handle.fingerprintSha256, expectedHash);
  assert.strictEqual(String(handle).includes(AIRROOFERS_CANARY_SECRET), false);
});

test('CANARY-002: Request construction to https://ai.airroofers.eu/v1/ai/execute with Bearer auth and sovereign headers', async () => {
  const prevEnv = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  process.env.UGONDU_AIRROOFERS_AI_BASE_URL = AIRROOFERS_BASE_URL;

  try {
    const catalog = new ModelCatalog();
    const broker = new CredentialBroker();
    broker.registerWorkloadSecret(AIRROOFERS_SECRET_REF, AIRROOFERS_CANARY_SECRET);

    let capturedRequest = null;
    const mockTransport = async (req) => {
      capturedRequest = req;
      return {
        status: 200,
        body: JSON.stringify({
          success: true, execution_id: 'aix_canary_001',
          output: 'Air Roofers sovereign AI live canary verified',
          token_metrics: { prompt_tokens: 16, completion_tokens: 24, total_tokens: 40 },
          finishReason: 'stop',
        }),
      };
    };

    const adapter = new AirRoofersAiProviderAdapter(catalog, broker, mockTransport);
    assert.strictEqual(adapter.getBaseUrl(), AIRROOFERS_BASE_URL);

    const req = makeCanaryRequest();
    const result = await adapter.invoke(req);

    assert.ok(capturedRequest, 'Transport must capture outbound request');
    assert.strictEqual(capturedRequest.url, `${AIRROOFERS_BASE_URL}/v1/ai/execute`);
    assert.strictEqual(capturedRequest.method, 'POST');
    assert.strictEqual(capturedRequest.headers['authorization'], `Bearer ${AIRROOFERS_CANARY_SECRET}`);
    assert.strictEqual(capturedRequest.headers['x-correlation-id'], req.correlationId);
    assert.strictEqual(capturedRequest.headers['x-tenant-id'], req.tenantId);
    assert.strictEqual(capturedRequest.headers['x-request-id'], req.requestId);
    assert.strictEqual(capturedRequest.headers['content-type'], 'application/json');
    assert.strictEqual(capturedRequest.headers['accept'], 'application/json');

    const body = JSON.parse(capturedRequest.body);
    assert.strictEqual(body.model_id, 'airroofers-sentinel-v1');
    assert.strictEqual(body.payload.task, 'chat');
    assert.strictEqual(body.context.tenant_id, req.tenantId);
    assert.strictEqual(body.context.product_id, 'ugondu');
    assert.strictEqual(body.context.environment, 'production');
    assert.strictEqual(body.context.region, 'eu-west-3');

    assert.strictEqual(result.providerId, 'airroofers-ai');
    assert.strictEqual(result.output, 'Air Roofers sovereign AI live canary verified');
    assert.strictEqual(result.usage.inputTokens, 16);
    assert.strictEqual(result.usage.outputTokens, 24);
    assert.strictEqual(result.finishReason, 'stop');
  } finally {
    if (prevEnv !== undefined) process.env.UGONDU_AIRROOFERS_AI_BASE_URL = prevEnv;
    else delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  }
});

test('CANARY-003: Negative rejection when key is missing fails closed with CREDENTIALS_MISSING (503)', async () => {
  const prevEnv = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  process.env.UGONDU_AIRROOFERS_AI_BASE_URL = AIRROOFERS_BASE_URL;

  try {
    const catalog = new ModelCatalog();
    const emptyBroker = new CredentialBroker();
    const adapter = new AirRoofersAiProviderAdapter(catalog, emptyBroker, async () => ({ status: 200, body: '{}' }));

    const health = await adapter.healthCheck();
    assert.strictEqual(health.ok, false);
    assert.strictEqual(health.credentialsConfigured, false);
    assert.strictEqual(health.reasonCode, 'CREDENTIALS_MISSING');

    await assert.rejects(() => adapter.invoke(makeCanaryRequest()), (err) => {
      assert.strictEqual(err.errorCode, 'CREDENTIALS_MISSING');
      assert.strictEqual(err.statusCode, 503);
      return true;
    });

    await assert.rejects(() => adapter.discoverModels(), (err) => {
      assert.strictEqual(err.errorCode, 'CREDENTIALS_MISSING');
      assert.strictEqual(err.statusCode, 503);
      return true;
    });
  } finally {
    if (prevEnv !== undefined) process.env.UGONDU_AIRROOFERS_AI_BASE_URL = prevEnv;
    else delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  }
});

test('CANARY-004: Negative rejection when key is malformed or invalid fails with AUTHENTICATION_FAILED (401)', async () => {
  const prevEnv = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  process.env.UGONDU_AIRROOFERS_AI_BASE_URL = AIRROOFERS_BASE_URL;

  try {
    const catalog = new ModelCatalog();
    const broker = new CredentialBroker();
    const badKey = 'air_prod_' + 'deadbeef'.repeat(6);
    broker.registerWorkloadSecret(AIRROOFERS_SECRET_REF, badKey);

    const rejectingTransport = async (req) => {
      assert.strictEqual(req.headers['authorization'], `Bearer ${badKey}`);
      return {
        status: 401,
        body: JSON.stringify({ error: 'Unauthorized', code: 'AUTHENTICATION_FAILED', message: 'Invalid or revoked credential' }),
      };
    };

    const adapter = new AirRoofersAiProviderAdapter(catalog, broker, rejectingTransport);

    await assert.rejects(() => adapter.invoke(makeCanaryRequest()), (err) => {
      assert.strictEqual(err.errorCode, 'AUTHENTICATION_FAILED');
      assert.strictEqual(err.statusCode, 401);
      return true;
    });

    await assert.rejects(() => adapter.discoverModels(), (err) => {
      assert.strictEqual(err.errorCode, 'AUTHENTICATION_FAILED');
      assert.strictEqual(err.statusCode, 401);
      return true;
    });
  } finally {
    if (prevEnv !== undefined) process.env.UGONDU_AIRROOFERS_AI_BASE_URL = prevEnv;
    else delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  }
});

test('CANARY-005: Model discovery mapping (/v1/ai/models) routes with Bearer authentication', async () => {
  const prevEnv = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  process.env.UGONDU_AIRROOFERS_AI_BASE_URL = AIRROOFERS_BASE_URL;

  try {
    const catalog = new ModelCatalog();
    const broker = new CredentialBroker();
    broker.registerWorkloadSecret(AIRROOFERS_SECRET_REF, AIRROOFERS_CANARY_SECRET);

    let capturedReq = null;
    const transport = async (req) => {
      capturedReq = req;
      return {
        status: 200,
        body: JSON.stringify({
          models: [
            { id: 'airroofers-sentinel-v1', name: 'Air Roofers Sentinel V1', status: 'enabled' },
            { id: 'airroofers-sovereign-v2', name: 'Air Roofers Sovereign V2', status: 'enabled' },
          ],
        }),
      };
    };

    const adapter = new AirRoofersAiProviderAdapter(catalog, broker, transport);
    const discovery = await adapter.discoverModels();

    assert.ok(capturedReq);
    assert.strictEqual(capturedReq.url, `${AIRROOFERS_BASE_URL}/v1/ai/models`);
    assert.strictEqual(capturedReq.method, 'GET');
    assert.strictEqual(capturedReq.headers['authorization'], `Bearer ${AIRROOFERS_CANARY_SECRET}`);
    assert.strictEqual(capturedReq.headers['accept'], 'application/json');

    assert.strictEqual(discovery.models.length, 2);
    assert.strictEqual(discovery.models[0].id, 'airroofers-sentinel-v1');
    assert.strictEqual(discovery.models[1].id, 'airroofers-sovereign-v2');
    assert.ok(discovery.discoveredAt);
  } finally {
    if (prevEnv !== undefined) process.env.UGONDU_AIRROOFERS_AI_BASE_URL = prevEnv;
    else delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  }
});

test('CANARY-006: Zero secret leakage in errors, diagnostics, and telemetry payloads', async () => {
  const prevEnv = process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  process.env.UGONDU_AIRROOFERS_AI_BASE_URL = AIRROOFERS_BASE_URL;

  try {
    const catalog = new ModelCatalog();
    const broker = new CredentialBroker();
    broker.registerWorkloadSecret(AIRROOFERS_SECRET_REF, AIRROOFERS_CANARY_SECRET);

    const errorTransport = async () => ({
      status: 502,
      body: JSON.stringify({ error: `Provider error with token ${AIRROOFERS_CANARY_SECRET}` }),
    });

    const adapter = new AirRoofersAiProviderAdapter(catalog, broker, errorTransport);

    await assert.rejects(() => adapter.invoke(makeCanaryRequest()), (err) => {
      const errorString = JSON.stringify({
        name: err.name, code: err.errorCode, message: err.message, details: err.details, stack: err.stack,
      });
      assert.strictEqual(errorString.includes(AIRROOFERS_CANARY_SECRET), false, 'Error must not leak secret');
      return true;
    });

    const sampleLog = `Outbound request authenticated using secret ${AIRROOFERS_CANARY_SECRET}`;
    const redacted = broker.redactString(sampleLog);
    assert.strictEqual(redacted.includes(AIRROOFERS_CANARY_SECRET), false);
    assert.ok(redacted.includes('[REDACTED_SECRET]'));
  } finally {
    if (prevEnv !== undefined) process.env.UGONDU_AIRROOFERS_AI_BASE_URL = prevEnv;
    else delete process.env.UGONDU_AIRROOFERS_AI_BASE_URL;
  }
});
