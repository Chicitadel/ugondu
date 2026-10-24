/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Model Lifecycle Qualification Test Suite
 * File           : model-lifecycle-qualification.test.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST
 *
 * Notice:
 * Rigorous qualification test suite verifying model lifecycle transitions,
 * zero synthetic inference enforcement, fail-closed offline activation guards,
 * circuit breaking, secret redaction, and authentic live qualification.
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { CredentialBroker } = require('../../server/engine-core/dist/ai');

const SCRIPT_URL = pathToFileURL(path.resolve(__dirname, '../../scripts/qualification/qualify-ai-models.mjs')).href;
const MOCK_SECRET_KEY = 'air_prod_' + 'feedface1234567890abcdef1234567890abcdef12345678';
const SECRET_REF = 'env://UGONDU_AIRROOFERS_AI_KEY';

async function loadLifecycleModule() {
  return await import(SCRIPT_URL);
}

test('LIFECYCLE-001: Newly discovered model defaults to DISCOVERED and cannot route until ACTIVE', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();

  const rawModel = {
    alias: 'airroofers-sentinel-v1',
    providerId: 'airroofers-ai',
    capabilities: { modalities: ['text'], streaming: false, toolCalling: true },
  };

  const lifecycle = new ModelLifecycle(rawModel);

  // Newly discovered model must default to DISCOVERED
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISCOVERED);
  assert.strictEqual(lifecycle.canRoute(), false, 'DISCOVERED model must never be routable');

  // assertRoutable must throw MODEL_DISABLED
  assert.throws(
    () => lifecycle.assertRoutable(),
    (err) => err.errorCode === 'MODEL_DISABLED' && err.statusCode === 403
  );

  // Transitions: DISCOVERED -> SCHEMA_VALIDATED -> POLICY_CHECKED -> CAPABILITY_PROBED -> INFERENCE_VERIFIED -> QUALIFIED -> ACTIVE
  lifecycle.validateSchema();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.SCHEMA_VALIDATED);
  assert.strictEqual(lifecycle.canRoute(), false);

  lifecycle.checkPolicy();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.POLICY_CHECKED);
  assert.strictEqual(lifecycle.canRoute(), false);

  await lifecycle.probeCapability(async () => ({ ok: true }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.CAPABILITY_PROBED);
  assert.strictEqual(lifecycle.canRoute(), false);

  await lifecycle.verifyInference(async () => ({ output: 'test-inference-response' }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.INFERENCE_VERIFIED);
  assert.strictEqual(lifecycle.canRoute(), false);

  lifecycle.qualify();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.QUALIFIED);
  assert.strictEqual(lifecycle.canRoute(), false);

  // Finally transition to ACTIVE
  lifecycle.activate();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.ACTIVE);
  assert.strictEqual(lifecycle.canRoute(), true, 'ACTIVE model must be routable');
  assert.strictEqual(lifecycle.assertRoutable(), true);
});

test('LIFECYCLE-002: Transition order enforcement prohibits out-of-sequence jumps', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();

  const lifecycle = new ModelLifecycle({ alias: 'skip-jump-model', providerId: 'airroofers-ai' });
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISCOVERED);

  // Attempting to jump directly from DISCOVERED to ACTIVE or QUALIFIED must fail closed
  assert.throws(
    () => lifecycle.activate(),
    (err) => err.errorCode === 'INVALID_STATE_TRANSITION'
  );
  assert.throws(
    () => lifecycle.qualify(),
    (err) => err.errorCode === 'INVALID_STATE_TRANSITION'
  );
  assert.throws(
    () => lifecycle.transitionTo(ModelLifecycleState.ACTIVE),
    (err) => err.errorCode === 'INVALID_STATE_TRANSITION'
  );
});

test('LIFECYCLE-003: Negative path - missing credentials causes CREDENTIALS_MISSING and fails closed', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();

  const broker = new CredentialBroker(); // Vault empty: no credentials registered

  const lifecycle = new ModelLifecycle({
    alias: 'unauthenticated-sentinel',
    providerId: 'airroofers-ai',
    credentialRef: 'env://UNCONFIGURED_CREDENTIAL_KEY',
  });

  lifecycle.validateSchema();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.SCHEMA_VALIDATED);

  // Attempting checkPolicy with missing credential reference must throw CREDENTIALS_MISSING and transition to DISABLED
  assert.throws(
    () => lifecycle.checkPolicy({ credentialBroker: broker }),
    (err) => err.errorCode === 'CREDENTIALS_MISSING'
  );

  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
  assert.throws(() => lifecycle.assertRoutable(), (err) => err.errorCode === 'MODEL_DISABLED');
});

test('LIFECYCLE-004: Negative path - expired credentials causes CREDENTIALS_EXPIRED and transitions to DISABLED', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();

  const broker = new CredentialBroker();
  const pastExpiration = new Date(Date.now() - 3600000).toISOString();
  broker.registerWorkloadSecret(SECRET_REF, MOCK_SECRET_KEY, pastExpiration);

  const lifecycle = new ModelLifecycle({
    alias: 'expired-sentinel',
    providerId: 'airroofers-ai',
    credentialRef: SECRET_REF,
  });

  lifecycle.validateSchema();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.SCHEMA_VALIDATED);

  // Expired credentials resolution must throw CREDENTIALS_EXPIRED and transition to DISABLED
  assert.throws(
    () => lifecycle.checkPolicy({ credentialBroker: broker }),
    (err) => err.errorCode === 'CREDENTIALS_EXPIRED'
  );

  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-005: Negative path - capability probe failure transitions to DISABLED', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();

  const lifecycle = new ModelLifecycle({
    alias: 'unsupported-capability-model',
    providerId: 'airroofers-ai',
  });

  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.POLICY_CHECKED);

  // Probe returns unsupported/falsy capability
  await assert.rejects(
    async () => {
      await lifecycle.probeCapability(async () => ({ ok: false, reason: 'Modalities unsupported on sovereign edge' }));
    },
    (err) => err.errorCode === 'CAPABILITY_UNSUPPORTED'
  );

  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
  assert.throws(() => lifecycle.assertRoutable(), (err) => err.errorCode === 'MODEL_DISABLED');
});

test('LIFECYCLE-006: 429 rate limit backoff and circuit breaking trips to OPEN on threshold', async () => {
  const { ModelLifecycle, ModelLifecycleState, QualificationGatewayError } = await loadLifecycleModule();

  const lifecycle = new ModelLifecycle(
    { alias: 'rate-limited-model', providerId: 'airroofers-ai' },
    { circuitBreakerOptions: { failureThreshold: 2, cooldownMs: 5000 } }
  );

  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  await lifecycle.probeCapability(async () => ({ ok: true }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.CAPABILITY_PROBED);

  let callCount = 0;
  const mock429Executor = async () => {
    callCount++;
    throw new QualificationGatewayError('PROVIDER_RATE_LIMITED', 'Upstream provider rate limited (429)', 429);
  };

  // Inference verification under 429 triggers backoff retry and trips circuit breaker
  await assert.rejects(
    async () => {
      await lifecycle.verifyInference(mock429Executor, { maxRetries: 2, initialBackoffMs: 10 });
    },
    (err) => err.errorCode === 'CIRCUIT_OPEN' || err.errorCode === 'PROVIDER_RATE_LIMITED'
  );

  // Circuit breaker must now be in OPEN state
  assert.strictEqual(lifecycle.circuitBreaker.isOpen(), true, 'Circuit breaker must be OPEN');
  assert.strictEqual(lifecycle.circuitBreaker.state, 'OPEN');
  assert.ok(lifecycle.circuitBreaker.consecutiveFailures >= 2);

  // Subsequent call while OPEN must reject immediately with CIRCUIT_OPEN
  await assert.rejects(
    async () => {
      await lifecycle.verifyInference(async () => ({ output: 'ok' }));
    },
    (err) => err.errorCode === 'CIRCUIT_OPEN' && err.statusCode === 503
  );
});

test('LIFECYCLE-007: Secret redaction in all receipts, diagnostics, and error messages', async () => {
  const { ModelLifecycle, redactSecrets } = await loadLifecycleModule();

  const broker = new CredentialBroker();
  broker.registerWorkloadSecret(SECRET_REF, MOCK_SECRET_KEY);

  const rawModel = {
    alias: 'secret-protected-model',
    providerId: 'airroofers-ai',
    credentialRef: SECRET_REF,
    capabilities: { modalities: ['text'], streaming: false, toolCalling: true },
  };

  const lifecycle = new ModelLifecycle(rawModel);
  await lifecycle.runFullLifecycle({
    credentialBroker: broker,
    receiptMetadata: { diagnosticOutput: `Verified with Bearer ${MOCK_SECRET_KEY}` },
    executeFn: async () => ({ output: `Verified with Bearer ${MOCK_SECRET_KEY}` }),
  });

  const receipt = lifecycle.getReceipt();
  const receiptStr = JSON.stringify(receipt);
  assert.strictEqual(receiptStr.includes(MOCK_SECRET_KEY), false, 'Receipt must NEVER contain raw secret');
  assert.ok(receiptStr.includes('[REDACTED_SECRET]'), 'Receipt must contain redacted placeholder');

  const diagnostics = lifecycle.getDiagnostics();
  const diagStr = JSON.stringify(diagnostics);
  assert.strictEqual(diagStr.includes(MOCK_SECRET_KEY), false, 'Diagnostics must NEVER contain raw secret');

  // Verify standalone redactSecrets utility
  const textWithBearer = `Authorization: Bearer ${MOCK_SECRET_KEY} with api_key air_prod_1234567890abcdef1234567890abcdef1234567890abcdef`;
  const sanitized = redactSecrets(textWithBearer);
  assert.strictEqual(sanitized.includes(MOCK_SECRET_KEY), false);
  assert.strictEqual(sanitized.includes('air_prod_1234567890abcdef1234567890abcdef1234567890abcdef'), false);
  assert.strictEqual(sanitized, 'Authorization: Bearer [REDACTED_SECRET] with api_key [REDACTED_SECRET]');
});

test('LIFECYCLE-008: Offline qualification produces 0 active models and records liveExecution: false', async () => {
  const { runModelQualification } = await loadLifecycleModule();

  const report = await runModelQualification({ offline: true });
  assert.ok(report);
  assert.strictEqual(report.reportType, 'AI_MODEL_QUALIFICATION_REPORT');
  assert.strictEqual(report.qualificationMode, 'CATALOG_OFFLINE');
  assert.ok(report.summary.totalDiscovered >= 1);
  assert.strictEqual(report.summary.qualifiedCount, 0, 'Offline mode must produce 0 qualified models');
  assert.strictEqual(report.summary.activeCount, 0, 'Offline mode must produce 0 active models');
  assert.ok(report.summary.disabledCount >= 1, 'Offline models must be transitioned to DISABLED');

  assert.ok(Array.isArray(report.receipts));
  assert.ok(report.receipts.length > 0);
  for (const receipt of report.receipts) {
    assert.strictEqual(receipt.liveExecution, false, 'Every offline receipt must record liveExecution: false');
    assert.strictEqual(receipt.status, 'UNQUALIFIED');
  }

  // Evidence file must be created on disk
  const evidencePath = path.resolve(__dirname, '../../docs/security/evidence/ai_model_qualification_report.json');
  assert.ok(fs.existsSync(evidencePath), 'Qualification evidence file must exist');

  const onDiskContent = fs.readFileSync(evidencePath, 'utf8');
  assert.strictEqual(onDiskContent.includes(MOCK_SECRET_KEY), false, 'Evidence report on disk must contain zero secrets');

  const parsed = JSON.parse(onDiskContent);
  assert.strictEqual(parsed.qualificationMode, 'CATALOG_OFFLINE');
  assert.strictEqual(parsed.summary.activeCount, 0);
  assert.strictEqual(parsed.summary.qualifiedCount, 0);
});

test('LIFECYCLE-009: Attempting to mark a model ACTIVE without real live execution fails closed', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();

  const rawModel = { alias: 'sentinel-fake-active', providerId: 'airroofers-ai' };
  const lifecycle = new ModelLifecycle(rawModel);

  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  await lifecycle.probeCapability(async () => ({ ok: true }));

  // Case A: Missing verifyInference executor must throw EXECUTION_FUNCTION_REQUIRED
  await assert.rejects(
    async () => {
      await lifecycle.verifyInference(null);
    },
    (err) => err.errorCode === 'EXECUTION_FUNCTION_REQUIRED'
  );

  // Case B: Empty inference output must throw INFERENCE_OUTPUT_EMPTY
  await assert.rejects(
    async () => {
      await lifecycle.verifyInference(async () => ({ output: '' }));
    },
    (err) => err.errorCode === 'INFERENCE_OUTPUT_EMPTY'
  );

  // Complete inference verification with valid output
  await lifecycle.verifyInference(async () => ({ output: 'authentic-probe-output', latencyMs: 35, correlationId: 'corr-fake-active-01' }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.INFERENCE_VERIFIED);

  // Case C: qualify with liveExecution: false explicitly
  lifecycle.qualify({ liveExecution: false });
  assert.strictEqual(lifecycle.state, ModelLifecycleState.QUALIFIED);

  // Attempting to activate a model whose receipt has liveExecution: false must throw LIVE_EXECUTION_REQUIRED
  assert.throws(
    () => lifecycle.activate(),
    (err) => err.errorCode === 'LIVE_EXECUTION_REQUIRED' && err.statusCode === 403
  );
  assert.strictEqual(lifecycle.state, ModelLifecycleState.QUALIFIED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-010: Live qualification passes when valid credentials and executor are provided', async () => {
  const { runModelQualification } = await loadLifecycleModule();

  const mockExecutor = async (model) => ({
    output: `Authentic live probe output for ${model.alias}`,
    latencyMs: 42,
    correlationId: 'corr-test-live-qual-001',
  });

  const report = await runModelQualification({
    mode: 'LIVE_SOVEREIGN',
    secret: MOCK_SECRET_KEY,
    baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: [
      { alias: 'sentinel-guard-v1', providerId: 'airroofers-ai', capabilities: { modalities: ['text'], streaming: false, toolCalling: true } },
    ],
    executeProbe: mockExecutor,
  });

  assert.ok(report);
  assert.strictEqual(report.qualificationMode, 'LIVE_SOVEREIGN');
  assert.strictEqual(report.summary.totalDiscovered, 1);
  assert.strictEqual(report.summary.qualifiedCount, 1);
  assert.strictEqual(report.summary.activeCount, 1);
  assert.strictEqual(report.summary.disabledCount, 0);

  const receipt = report.receipts[0];
  assert.strictEqual(receipt.status, 'QUALIFIED');
  assert.strictEqual(receipt.liveExecution, true);
  assert.strictEqual(receipt.verification, 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED');
  assert.ok(receipt.inferenceDigestSha256);
  assert.strictEqual(receipt.inferenceDigestSha256.length, 64);
});

test('LIFECYCLE-011: Production qualification in offline mode fails closed with LIVE_QUALIFICATION_REQUIRED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  try {
    await assert.rejects(
      async () => {
        await runModelQualification({ offline: true });
      },
      (err) => err.errorCode === 'LIVE_QUALIFICATION_REQUIRED' && /LIVE_QUALIFICATION_REQUIRED/.test(err.message)
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});
