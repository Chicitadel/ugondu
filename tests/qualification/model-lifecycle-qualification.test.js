/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Model Lifecycle Qualification Test Suite
 * File           : model-lifecycle-qualification.test.js
 * Version        : 2.1.0
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
  const rawModel = { alias: 'airroofers-sentinel-v1', providerId: 'airroofers-ai', capabilities: { modalities: ['text'], streaming: false, toolCalling: true } };
  const lifecycle = new ModelLifecycle(rawModel);

  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISCOVERED);
  assert.strictEqual(lifecycle.canRoute(), false);
  assert.throws(() => lifecycle.assertRoutable(), (err) => err.errorCode === 'MODEL_DISABLED' && err.statusCode === 403);

  lifecycle.validateSchema();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.SCHEMA_VALIDATED);
  lifecycle.checkPolicy();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.POLICY_CHECKED);
  await lifecycle.probeCapability(async () => ({ ok: true }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.CAPABILITY_PROBED);
  await lifecycle.verifyInference(async () => ({ output: 'test-inference-response' }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.INFERENCE_VERIFIED);
  lifecycle.qualify();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.QUALIFIED);
  lifecycle.activate();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.ACTIVE);
  assert.strictEqual(lifecycle.canRoute(), true);
  assert.strictEqual(lifecycle.assertRoutable(), true);
});

test('LIFECYCLE-002: Transition order enforcement prohibits out-of-sequence jumps', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const lifecycle = new ModelLifecycle({ alias: 'skip-jump-model', providerId: 'airroofers-ai' });
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISCOVERED);
  assert.throws(() => lifecycle.activate(), (err) => err.errorCode === 'INVALID_STATE_TRANSITION');
  assert.throws(() => lifecycle.qualify(), (err) => err.errorCode === 'INVALID_STATE_TRANSITION');
  assert.throws(() => lifecycle.transitionTo(ModelLifecycleState.ACTIVE), (err) => err.errorCode === 'INVALID_STATE_TRANSITION');
});

test('LIFECYCLE-003: Negative path - missing credentials causes CREDENTIALS_MISSING and fails closed', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const broker = new CredentialBroker();
  const lifecycle = new ModelLifecycle({ alias: 'unauthenticated-sentinel', providerId: 'airroofers-ai', credentialRef: 'env://UNCONFIGURED_CREDENTIAL_KEY' });
  lifecycle.validateSchema();
  assert.strictEqual(lifecycle.state, ModelLifecycleState.SCHEMA_VALIDATED);
  assert.throws(() => lifecycle.checkPolicy({ credentialBroker: broker }), (err) => err.errorCode === 'CREDENTIALS_MISSING');
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-004: Negative path - expired credentials causes CREDENTIALS_EXPIRED and transitions to DISABLED', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const broker = new CredentialBroker();
  const pastExpiration = new Date(Date.now() - 3600000).toISOString();
  broker.registerWorkloadSecret(SECRET_REF, MOCK_SECRET_KEY, pastExpiration);
  const lifecycle = new ModelLifecycle({ alias: 'expired-sentinel', providerId: 'airroofers-ai', credentialRef: SECRET_REF });
  lifecycle.validateSchema();
  assert.throws(() => lifecycle.checkPolicy({ credentialBroker: broker }), (err) => err.errorCode === 'CREDENTIALS_EXPIRED');
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-005: Negative path - capability probe failure transitions to DISABLED', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const lifecycle = new ModelLifecycle({ alias: 'unsupported-capability-model', providerId: 'airroofers-ai' });
  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  await assert.rejects(async () => { await lifecycle.probeCapability(async () => ({ ok: false, reason: 'Modalities unsupported on sovereign edge' })); }, (err) => err.errorCode === 'CAPABILITY_UNSUPPORTED');
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-006: 429 rate limit backoff and circuit breaking trips to OPEN on threshold', async () => {
  const { ModelLifecycle, QualificationGatewayError } = await loadLifecycleModule();
  const lifecycle = new ModelLifecycle({ alias: 'rate-limited-model', providerId: 'airroofers-ai' }, { circuitBreakerOptions: { failureThreshold: 2, cooldownMs: 5000 } });
  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  await lifecycle.probeCapability(async () => ({ ok: true }));
  const mock429 = async () => { throw new QualificationGatewayError('PROVIDER_RATE_LIMITED', 'Upstream provider rate limited (429)', 429); };
  await assert.rejects(async () => { await lifecycle.verifyInference(mock429, { maxRetries: 2, initialBackoffMs: 10 }); }, (err) => err.errorCode === 'CIRCUIT_OPEN' || err.errorCode === 'PROVIDER_RATE_LIMITED');
  assert.strictEqual(lifecycle.circuitBreaker.isOpen(), true);
  await assert.rejects(async () => { await lifecycle.verifyInference(async () => ({ output: 'ok' })); }, (err) => err.errorCode === 'CIRCUIT_OPEN' && err.statusCode === 503);
});

test('LIFECYCLE-007: Secret redaction in all receipts, diagnostics, and error messages', async () => {
  const { ModelLifecycle, redactSecrets } = await loadLifecycleModule();
  const broker = new CredentialBroker();
  broker.registerWorkloadSecret(SECRET_REF, MOCK_SECRET_KEY);
  const rawModel = { alias: 'secret-protected-model', providerId: 'airroofers-ai', credentialRef: SECRET_REF, capabilities: { modalities: ['text'], streaming: false, toolCalling: true } };
  const lifecycle = new ModelLifecycle(rawModel);
  await lifecycle.runFullLifecycle({ credentialBroker: broker, receiptMetadata: { diagnosticOutput: `Verified with Bearer ${MOCK_SECRET_KEY}` }, executeFn: async () => ({ output: `Verified with Bearer ${MOCK_SECRET_KEY}` }) });
  const receiptStr = JSON.stringify(lifecycle.getReceipt());
  assert.strictEqual(receiptStr.includes(MOCK_SECRET_KEY), false);
  assert.ok(receiptStr.includes('[REDACTED_SECRET]'));
  const diagStr = JSON.stringify(lifecycle.getDiagnostics());
  assert.strictEqual(diagStr.includes(MOCK_SECRET_KEY), false);
  const textWithBearer = `Authorization: Bearer ${MOCK_SECRET_KEY} with api_key air_prod_1234567890abcdef1234567890abcdef1234567890abcdef`;
  assert.strictEqual(redactSecrets(textWithBearer), 'Authorization: Bearer [REDACTED_SECRET] with api_key [REDACTED_SECRET]');
});

test('LIFECYCLE-008: Offline qualification produces 0 active models and records liveExecution: false', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const report = await runModelQualification({ offline: true });
  assert.ok(report);
  assert.strictEqual(report.reportType, 'AI_MODEL_QUALIFICATION_REPORT');
  assert.strictEqual(report.qualificationMode, 'CATALOG_OFFLINE');
  assert.ok(report.summary.totalDiscovered >= 1);
  assert.strictEqual(report.summary.qualifiedCount, 0);
  assert.strictEqual(report.summary.activeCount, 0);
  assert.ok(report.summary.disabledCount >= 1);
  for (const receipt of report.receipts) {
    assert.strictEqual(receipt.liveExecution, false);
    assert.strictEqual(receipt.status, 'UNQUALIFIED');
  }
});

test('LIFECYCLE-009: Attempting to mark a model ACTIVE without real live execution fails closed', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const lifecycle = new ModelLifecycle({ alias: 'sentinel-fake-active', providerId: 'airroofers-ai' });
  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  await lifecycle.probeCapability(async () => ({ ok: true }));
  await assert.rejects(async () => { await lifecycle.verifyInference(null); }, (err) => err.errorCode === 'EXECUTION_FUNCTION_REQUIRED');
  await assert.rejects(async () => { await lifecycle.verifyInference(async () => ({ output: '' })); }, (err) => err.errorCode === 'INFERENCE_OUTPUT_EMPTY');
  await lifecycle.verifyInference(async () => ({ output: 'authentic-probe-output', latencyMs: 35, correlationId: 'corr-fake-active-01' }));
  assert.strictEqual(lifecycle.state, ModelLifecycleState.INFERENCE_VERIFIED);
  lifecycle.qualify({ liveExecution: false });
  assert.strictEqual(lifecycle.state, ModelLifecycleState.QUALIFIED);
  assert.throws(() => lifecycle.activate(), (err) => err.errorCode === 'LIVE_EXECUTION_REQUIRED' && err.statusCode === 403);
  assert.strictEqual(lifecycle.state, ModelLifecycleState.QUALIFIED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-010: Live qualification passes when valid credentials and executor are provided', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const mockExecutor = async (model) => ({ output: `Authentic live probe output for ${model.alias}`, latencyMs: 42, correlationId: 'corr-test-live-qual-001' });
  const report = await runModelQualification({
    mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: [{ alias: 'sentinel-guard-v1', providerId: 'airroofers-ai', capabilities: { modalities: ['text'], streaming: false, toolCalling: true } }],
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
  assert.strictEqual(receipt.inferenceDigestSha256.length, 64);
});

test('LIFECYCLE-011: Production qualification in offline mode fails closed with LIVE_QUALIFICATION_REQUIRED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await assert.rejects(async () => { await runModelQualification({ offline: true }); }, (err) => err.errorCode === 'LIVE_QUALIFICATION_REQUIRED');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('LIFECYCLE-012: Missing catalog throws MODEL_CATALOG_UNAVAILABLE instead of fabricating synthetic sentinel', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  await assert.rejects(
    async () => { await runModelQualification({ rootDir: path.resolve(__dirname, '../../nonexistent_dir_000') }); },
    (err) => err.errorCode === 'MODEL_CATALOG_UNAVAILABLE' && err.statusCode === 503
  );
});

test('LIFECYCLE-013: Production mode without genuine capability probe fails closed with CAPABILITY_PROBE_REQUIRED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const report = await runModelQualification({
      mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
      discoveredModels: [{ alias: 'prod-probe-check', providerId: 'airroofers-ai' }],
      executeProbe: async () => ({ output: 'ok' }),
    });
    // In production without probeFn, model qualification fails capability probe check and defaults to DISABLED
    assert.strictEqual(report.summary.activeCount, 0);
    assert.strictEqual(report.summary.disabledCount, 1);
    assert.strictEqual(report.diagnostics[0].errorCode, 'CAPABILITY_PROBE_REQUIRED');
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});

test('LIFECYCLE-014: Endpoint and credential validation throws typed errors (400, 403, 503)', async () => {
  const { validateEndpointAndCredentials } = await loadLifecycleModule();
  assert.throws(() => validateEndpointAndCredentials('https://ai.airroofers.eu', ''), (err) => err.errorCode === 'CREDENTIALS_MISSING' && err.statusCode === 503);
  assert.throws(() => validateEndpointAndCredentials('https://ai.airroofers.eu', 'bad_key'), (err) => err.errorCode === 'CREDENTIALS_INVALID' && err.statusCode === 400);
  assert.throws(() => validateEndpointAndCredentials('', MOCK_SECRET_KEY), (err) => err.errorCode === 'AIRROOFERS_AI_ENDPOINT_REQUIRED' && err.statusCode === 400);
  assert.throws(() => validateEndpointAndCredentials('http://ai.airroofers.eu', MOCK_SECRET_KEY), (err) => err.errorCode === 'AIRROOFERS_AI_ENDPOINT_INSECURE' && err.statusCode === 403);
  assert.throws(() => validateEndpointAndCredentials('https://malicious-host.com', MOCK_SECRET_KEY), (err) => err.errorCode === 'AIRROOFERS_AI_ENDPOINT_DISALLOWED' && err.statusCode === 403);
});

test('LIFECYCLE-015: In production mode, injected mock executor marks receipt testOnly and fails closed with LIVE_INFERENCE_RECEIPT_REQUIRED', async () => {
  const { ModelLifecycle } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const lc = new ModelLifecycle({ alias: 'prod-guard', providerId: 'airroofers-ai' });
    lc.validateSchema();
    lc.checkPolicy({ secret: MOCK_SECRET_KEY });
    await lc.probeCapability(async () => ({ ok: true }));
    await lc.verifyInference(async () => ({ output: 'mocked output' }));
    assert.strictEqual(lc.liveInferenceReceipt?.testOnly, true);
    lc.qualify({ liveExecution: true }); // Caller-injected Boolean flag must be disallowed
    assert.throws(() => lc.activate(), (err) => err.errorCode === 'LIVE_INFERENCE_RECEIPT_REQUIRED' && err.statusCode === 403);
    assert.strictEqual(lc.state, 'QUALIFIED');
    assert.strictEqual(lc.canRoute(), false);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});
