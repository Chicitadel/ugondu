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
  await lifecycle.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
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
  await assert.rejects(
    async () => { await lifecycle.probeCapability(async () => ({ ok: false, reason: 'Modalities unsupported on sovereign edge' })); },
    (err) => err.errorCode === 'CAPABILITY_PROBE_FAILED' && err.statusCode === 503
  );
  assert.strictEqual(lifecycle.state, ModelLifecycleState.DISABLED);
  assert.strictEqual(lifecycle.canRoute(), false);
});

test('LIFECYCLE-006: 429 rate limit backoff and circuit breaking trips to OPEN on threshold', async () => {
  const { ModelLifecycle, QualificationGatewayError } = await loadLifecycleModule();
  const lifecycle = new ModelLifecycle({ alias: 'rate-limited-model', providerId: 'airroofers-ai' }, { circuitBreakerOptions: { failureThreshold: 2, cooldownMs: 5000 } });
  lifecycle.validateSchema();
  lifecycle.checkPolicy();
  await lifecycle.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
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
  await lifecycle.runFullLifecycle({
    credentialBroker: broker,
    probeFn: async () => ({ ok: true, source: 'airroofers-live-transport' }),
    receiptMetadata: { diagnosticOutput: `Verified with Bearer ${MOCK_SECRET_KEY}` },
    executeFn: async () => ({ output: `Verified with Bearer ${MOCK_SECRET_KEY}` }),
  });
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
  await lifecycle.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
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
  const mockProbe = async (model) => ({ ok: true, source: 'airroofers-live-transport' });
  const report = await runModelQualification({
    mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: [{ alias: 'sentinel-guard-v1', providerId: 'airroofers-ai', capabilities: { modalities: ['text'], streaming: false, toolCalling: true } }],
    probeFn: mockProbe,
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
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-012: Missing catalog throws MODEL_CATALOG_UNAVAILABLE instead of fabricating synthetic sentinel', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  await assert.rejects(async () => { await runModelQualification({ rootDir: path.resolve(__dirname, '../../nonexistent_dir_000') }); }, (err) => err.errorCode === 'MODEL_CATALOG_UNAVAILABLE' && err.statusCode === 503);
});

test('LIFECYCLE-013: Live sovereign mode without genuine capability probe fails closed with CAPABILITY_PROBE_REQUIRED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const report = await runModelQualification({
    mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: [{ alias: 'missing-probe-check', providerId: 'airroofers-ai' }],
    executeProbe: async () => ({ output: 'ok' }),
  });
  assert.strictEqual(report.summary.activeCount, 0);
  assert.strictEqual(report.summary.disabledCount, 1);
  assert.strictEqual(report.diagnostics[0].errorCode, 'CAPABILITY_PROBE_REQUIRED');
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
    await lc.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
    await lc.verifyInference(async () => ({ output: 'mocked output' }));
    assert.strictEqual(lc.liveInferenceReceipt?.testOnly, true);
    lc.qualify({ liveExecution: true }); // Caller-injected Boolean flag must be disallowed
    assert.throws(() => lc.activate(), (err) => err.errorCode === 'LIVE_INFERENCE_RECEIPT_REQUIRED' && err.statusCode === 403);
    assert.strictEqual(lc.state, 'QUALIFIED');
    assert.strictEqual(lc.canRoute(), false);
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-016: Missing probeFn in probeCapability throws CAPABILITY_PROBE_REQUIRED (503)', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const lc = new ModelLifecycle({ alias: 'probe-missing-fn-guard', providerId: 'airroofers-ai' });
  lc.validateSchema();
  lc.checkPolicy();
  await assert.rejects(async () => { await lc.probeCapability(null); }, (err) => err.errorCode === 'CAPABILITY_PROBE_REQUIRED' && err.statusCode === 503);
  assert.strictEqual(lc.state, ModelLifecycleState.DISABLED);
});

test('LIFECYCLE-017: Fake probeFn without source: airroofers-live-transport throws CAPABILITY_PROBE_FAILED (503)', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const lc = new ModelLifecycle({ alias: 'probe-fake-source-guard', providerId: 'airroofers-ai' });
  lc.validateSchema();
  lc.checkPolicy();
  await assert.rejects(async () => { await lc.probeCapability(async () => ({ ok: true })); }, (err) => err.errorCode === 'CAPABILITY_PROBE_FAILED' && err.statusCode === 503);
  assert.strictEqual(lc.state, ModelLifecycleState.DISABLED);
});

test('LIFECYCLE-018: Live qualification with fake probeFn fails closed with CAPABILITY_PROBE_FAILED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const report = await runModelQualification({
    mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: [{ alias: 'synthetic-probe-model', providerId: 'airroofers-ai' }],
    probeFn: async () => ({ ok: true }), // Missing source: airroofers-live-transport
    executeProbe: async () => ({ output: 'ok' }),
  });
  assert.strictEqual(report.summary.activeCount, 0);
  assert.strictEqual(report.summary.disabledCount, 1);
  assert.strictEqual(report.diagnostics[0].errorCode, 'CAPABILITY_PROBE_FAILED');
});

test('LIFECYCLE-019: Decoupling between live canary receipt and fleet qualification with count reconciliation', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const canaryReceiptPath = path.resolve(__dirname, '../../docs/security/evidence/live_ai_canary_receipt.json');
  if (fs.existsSync(canaryReceiptPath)) {
    const canary = JSON.parse(fs.readFileSync(canaryReceiptPath, 'utf8'));
    assert.strictEqual(canary.receiptType, 'AIRROOFERS_LIVE_AI_CANARY_RECEIPT');
    assert.strictEqual(typeof canary.returnedModelId, 'string');
    assert.ok(canary.availableModelCount > 0);
  }

  const report = await runModelQualification({ offline: true });
  assert.strictEqual(report.reportType, 'AI_MODEL_QUALIFICATION_REPORT');
  assert.strictEqual(report.qualificationMode, 'CATALOG_OFFLINE');
  assert.strictEqual(report.summary.activeCount, 0);
  assert.strictEqual(report.summary.qualifiedCount, 0);
  assert.strictEqual(report.summary.totalDiscovered, report.summary.qualifiedCount + report.summary.disabledCount + report.summary.pendingCount);
  assert.ok(report.summary.disabledCount > 0);

  const reportPath = path.resolve(__dirname, '../../docs/security/evidence/ai_model_qualification_report.json');
  assert.ok(fs.existsSync(reportPath));
  const loc = fs.readFileSync(reportPath, 'utf8').trim().split(/\r?\n/).length;
  assert.ok(loc <= 500, `Report LOC (${loc}) must be strictly <= 500`);
  assert.ok(loc >= 50 && loc <= 75, `Report LOC (${loc}) must follow compact diagnostic structure (50-70 LOC)`);
});

test('LIFECYCLE-020: In production mode, runModelQualification rejects arbitrary executeProbe injection with MOCK_ADAPTER_INJECTION_PROHIBITED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await assert.rejects(async () => { await runModelQualification({ mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu', executeProbe: async () => ({ output: 'mocked' }) }); }, (err) => err.errorCode === 'MOCK_ADAPTER_INJECTION_PROHIBITED' && err.statusCode === 403);
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-021: In production mode, runModelQualification rejects manual discoveredModels injection with DISCOVERY_MOCK_PROHIBITED', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    await assert.rejects(async () => { await runModelQualification({ mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu', discoveredModels: [{ alias: 'injected-mock-model', providerId: 'airroofers-ai' }] }); }, (err) => err.errorCode === 'DISCOVERY_MOCK_PROHIBITED' && err.statusCode === 403);
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-022: In production mode, ModelLifecycle rejects mockAdapter flag in verifyInference with MOCK_ADAPTER_INJECTION_PROHIBITED', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const lc = new ModelLifecycle({ alias: 'prod-mock-guard', providerId: 'airroofers-ai' });
    lc.validateSchema();
    lc.checkPolicy({ secret: MOCK_SECRET_KEY });
    await lc.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
    await assert.rejects(async () => { await lc.verifyInference(async () => ({ output: 'output' }), { mockAdapter: true }); }, (err) => err.errorCode === 'MOCK_ADAPTER_INJECTION_PROHIBITED' && err.statusCode === 403);
    assert.strictEqual(lc.state, ModelLifecycleState.DISABLED);
    assert.strictEqual(lc.canRoute(), false);
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-023: In production mode, ModelLifecycle rejects mockAdapter in runFullLifecycle', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const lc = new ModelLifecycle({ alias: 'prod-full-mock-guard', providerId: 'airroofers-ai' });
    await assert.rejects(async () => { await lc.runFullLifecycle({ secret: MOCK_SECRET_KEY, mockAdapter: true }); }, (err) => err.errorCode === 'MOCK_ADAPTER_INJECTION_PROHIBITED' && err.statusCode === 403);
    assert.strictEqual(lc.state, ModelLifecycleState.DISABLED);
    assert.strictEqual(lc.canRoute(), false);
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-024: Tamper resistance - qualify cannot clear testOnly: true on mock-verified model', async () => {
  const { ModelLifecycle, ModelLifecycleState } = await loadLifecycleModule();
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const lc = new ModelLifecycle({ alias: 'tamper-guard', providerId: 'airroofers-ai' });
    lc.validateSchema();
    lc.checkPolicy({ secret: MOCK_SECRET_KEY });
    await lc.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
    await lc.verifyInference(async () => ({ output: 'mocked output' }));
    assert.strictEqual(lc.liveInferenceReceipt?.testOnly, true);
    lc.qualify({ testOnly: false, liveExecution: true });
    assert.strictEqual(lc.getReceipt()?.testOnly, true);
    assert.throws(() => lc.activate(), (err) => err.errorCode === 'LIVE_INFERENCE_RECEIPT_REQUIRED' && err.statusCode === 403);
    assert.strictEqual(lc.state, ModelLifecycleState.QUALIFIED);
    assert.strictEqual(lc.canRoute(), false);
  } finally { process.env.NODE_ENV = prevEnv; }
});

test('LIFECYCLE-025: assertReportLineage fails closed with AI_REPORT_CANDIDATE_SHA_MISMATCH on stale gitSha', async () => {
  const { assertReportLineage } = await loadLifecycleModule();
  const report = { gitSha: 'stale-sha-00000000000000000000000000000000', qualificationMode: 'CATALOG_OFFLINE', summary: { totalDiscovered: 1, qualifiedCount: 0, activeCount: 0 } };
  assert.throws(() => assertReportLineage(report, 'expected-sha-1111111111111111111111111111111'), (err) => err.errorCode === 'AI_REPORT_CANDIDATE_SHA_MISMATCH' && err.statusCode === 400);
});

test('LIFECYCLE-026: assertReportLineage fails closed with AI_REPORT_COUNT_INVARIANT_FAILED on count mismatch', async () => {
  const { assertReportLineage } = await loadLifecycleModule();
  const sha = 'target-sha-2222222222222222222222222222222';
  const badActive = { gitSha: sha, qualificationMode: 'LIVE_SOVEREIGN', summary: { totalDiscovered: 2, qualifiedCount: 1, activeCount: 2 } };
  assert.throws(() => assertReportLineage(badActive, sha), (err) => err.errorCode === 'AI_REPORT_COUNT_INVARIANT_FAILED' && err.statusCode === 400);
  const badQualified = { gitSha: sha, qualificationMode: 'LIVE_SOVEREIGN', summary: { totalDiscovered: 1, qualifiedCount: 2, activeCount: 0 } };
  assert.throws(() => assertReportLineage(badQualified, sha), (err) => err.errorCode === 'AI_REPORT_COUNT_INVARIANT_FAILED' && err.statusCode === 400);
});

test('LIFECYCLE-027: assertReportLineage fails closed with CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION when offline report claims qualified/active', async () => {
  const { assertReportLineage } = await loadLifecycleModule();
  const sha = 'target-sha-3333333333333333333333333333333';
  const report = { gitSha: sha, qualificationMode: 'CATALOG_OFFLINE', summary: { totalDiscovered: 5, qualifiedCount: 1, activeCount: 0 } };
  assert.throws(() => assertReportLineage(report, sha), (err) => err.errorCode === 'CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION' && err.statusCode === 403);
});

test('LIFECYCLE-028: assertReportLineage fails closed with ACTIVE_MODELS_WITHOUT_LIVE_RECEIPTS when active model lacks candidate live receipt', async () => {
  const { assertReportLineage } = await loadLifecycleModule();
  const sha = 'target-sha-4444444444444444444444444444444';
  const report = {
    gitSha: sha, qualificationMode: 'LIVE_SOVEREIGN',
    summary: { totalDiscovered: 1, qualifiedCount: 1, activeCount: 1 },
    receipts: [{ status: 'QUALIFIED', liveExecution: true, gitSha: sha, liveInferenceReceipt: null }],
  };
  assert.throws(() => assertReportLineage(report, sha), (err) => err.errorCode === 'ACTIVE_MODELS_WITHOUT_LIVE_RECEIPTS' && err.statusCode === 403);
});

test('LIFECYCLE-029: assertCurrentLiveReport fails closed with LIVE_AI_QUALIFICATION_REQUIRED for offline reports', async () => {
  const { assertCurrentLiveReport } = await loadLifecycleModule();
  const sha = 'target-sha-5555555555555555555555555555555';
  const offlineReport = { gitSha: sha, qualificationMode: 'CATALOG_OFFLINE', summary: { totalDiscovered: 5, qualifiedCount: 0, activeCount: 0, disabledCount: 5 } };
  assert.throws(() => assertCurrentLiveReport(offlineReport, sha), (err) => err.errorCode === 'LIVE_AI_QUALIFICATION_REQUIRED' && err.statusCode === 403);
});

test('LIFECYCLE-030: Reconcile endpoint model discovery - dynamic 30 models vs offline catalog 12 models', async () => {
  const { runModelQualification } = await loadLifecycleModule();
  const offlineReport = await runModelQualification({ offline: true });
  assert.strictEqual(offlineReport.qualificationMode, 'CATALOG_OFFLINE');
  assert.strictEqual(offlineReport.summary.totalDiscovered, 12);
  assert.strictEqual(offlineReport.summary.qualifiedCount, 0);
  assert.strictEqual(offlineReport.summary.activeCount, 0);
  assert.strictEqual(offlineReport.summary.disabledCount, 12);
  assert.ok(offlineReport.reconciliation);
  assert.strictEqual(offlineReport.reconciliation.status, 'RECONCILED');

  const fleet30 = Array.from({ length: 30 }, (_, i) => ({
    id: `sovereign-model-${String(i + 1).padStart(2, '0')}`,
    alias: `sovereign-model-${String(i + 1).padStart(2, '0')}`,
    providerId: 'airroofers-ai',
    capabilities: { modalities: ['text'], streaming: false, toolCalling: true },
  }));

  const liveReport = await runModelQualification({
    mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: fleet30,
    probeFn: async () => ({ ok: true, source: 'airroofers-live-transport' }),
    executeProbe: async (m) => ({ output: `Inference response for ${m.alias}`, latencyMs: 25 }),
  });

  assert.strictEqual(liveReport.qualificationMode, 'LIVE_SOVEREIGN');
  assert.strictEqual(liveReport.summary.totalDiscovered, 30);
  assert.strictEqual(liveReport.summary.qualifiedCount, 30);
  assert.strictEqual(liveReport.summary.activeCount, 30);
  assert.strictEqual(liveReport.summary.disabledCount, 0);
  assert.ok(liveReport.summary.activeCount <= liveReport.summary.qualifiedCount);
  assert.ok(liveReport.summary.qualifiedCount <= liveReport.summary.totalDiscovered);
});

test('LIFECYCLE-031: Live qualification with partial model failures keeps unproven models disabled and maintains count invariants', async () => {
  const { runModelQualification, ModelLifecycleState } = await loadLifecycleModule();
  const fleet30 = Array.from({ length: 30 }, (_, i) => ({
    id: `sovereign-model-${String(i + 1).padStart(2, '0')}`,
    alias: `sovereign-model-${String(i + 1).padStart(2, '0')}`,
    providerId: 'airroofers-ai',
  }));

  const liveReport = await runModelQualification({
    mode: 'LIVE_SOVEREIGN', secret: MOCK_SECRET_KEY, baseUrl: 'https://ai.airroofers.eu',
    discoveredModels: fleet30,
    probeFn: async (m) => {
      const idx = parseInt(m.alias.replace('sovereign-model-', ''), 10);
      return idx > 20 ? { ok: false, reason: 'Modalities unsupported on sovereign edge' } : { ok: true, source: 'airroofers-live-transport' };
    },
    executeProbe: async (m) => ({ output: `Verified ${m.alias}`, latencyMs: 30 }),
  });

  assert.strictEqual(liveReport.summary.totalDiscovered, 30);
  assert.strictEqual(liveReport.summary.qualifiedCount, 20);
  assert.strictEqual(liveReport.summary.activeCount, 20);
  assert.strictEqual(liveReport.summary.disabledCount, 10);
  assert.strictEqual(liveReport.summary.pendingCount, 0);
  assert.ok(liveReport.summary.activeCount <= liveReport.summary.qualifiedCount);
  assert.ok(liveReport.summary.qualifiedCount <= liveReport.summary.totalDiscovered);

  const disabledModels = liveReport.diagnostics.filter((d) => d.state === ModelLifecycleState.DISABLED);
  assert.strictEqual(disabledModels.length, 10);
  for (const d of disabledModels) {
    assert.strictEqual(d.canRoute, false);
    assert.strictEqual(d.errorCode, 'CAPABILITY_PROBE_FAILED');
  }
});

test('LIFECYCLE-032: Public AI barrel strictly prohibits minting exports and exposes only validation primitives', () => {
  const aiBarrel = require('../../server/engine-core/dist/ai');
  assert.strictEqual(aiBarrel.createTrustedLiveInferenceReceipt, undefined);
  assert.strictEqual(aiBarrel.TrustedReceiptService?.createReceipt, undefined);
  assert.strictEqual(aiBarrel.computeProvenanceSeal, undefined);
  assert.strictEqual(aiBarrel.getProvenanceSigningKey, undefined);
  assert.strictEqual(aiBarrel.getProvenanceSigningKeyInfo, undefined);
  assert.strictEqual(typeof aiBarrel.TrustedReceiptService?.validateReceipt, 'function');
  assert.strictEqual(typeof aiBarrel.TrustedReceiptService?.isTrustedReceipt, 'function');
  assert.strictEqual(typeof aiBarrel.validateLiveInferenceReceipt, 'function');
  assert.strictEqual(typeof aiBarrel.isTrustedLiveInferenceReceipt, 'function');
});
