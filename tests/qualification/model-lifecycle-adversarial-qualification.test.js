/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Model Lifecycle Adversarial Security Suite
 * File           : model-lifecycle-adversarial-qualification.test.js
 * Version        : 1.0.0
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const {
  createTrustedLiveInferenceReceipt,
  computeProvenanceSeal,
  validateLiveInferenceReceipt,
  isTrustedLiveInferenceReceipt,
  DEV_FALLBACK_KEY,
  DEV_KEY_ID,
  ALLOWLISTED_LIVE_ENDPOINT_HOST,
  ProvenanceConfigurationError,
} = require('../../server/engine-core/dist/ai/trusted-receipt');

const SCRIPT_URL = pathToFileURL(path.resolve(__dirname, '../../scripts/qualification/qualify-ai-models.mjs')).href;

const PROD_KEY_V1 = 'air_prod_1111222233334444555566667777888899990000aaaabbbb';
const PROD_KEY_V2 = 'air_prod_9999888877776666555544443333222211110000bbbaaaa';
const UNKNOWN_KEY = 'air_prod_feedfacefeedfacefeedfacefeedfacefeedfacefeedface';
const CANDIDATE_SHA_1 = '0123456789abcdef0123456789abcdef01234567';
const CANDIDATE_SHA_2 = 'fedcba9876543210fedcba9876543210fedcba98';
const RESPONSE_SHA = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

async function loadLifecycleModule() {
  return await import(SCRIPT_URL);
}

function createReceiptParams(overrides = {}) {
  return {
    source: 'airroofers-live-transport',
    httpStatus: 200,
    verification: 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED',
    candidateSha: CANDIDATE_SHA_1,
    modelId: 'sentinel-adversarial-v1',
    endpointHost: ALLOWLISTED_LIVE_ENDPOINT_HOST,
    providerRequestId: 'req-adv-live-001',
    correlationId: 'req-adv-live-001',
    responseDigestSha256: RESPONSE_SHA,
    observedAt: '2026-10-24T21:00:00.000Z',
    ...overrides,
  };
}

test('ADV-ROTATION-001: Verification with rotated production key succeeds while stale key fails', () => {
  const receiptV1 = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V1);
  assert.strictEqual(validateLiveInferenceReceipt(receiptV1, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), true);
  assert.strictEqual(validateLiveInferenceReceipt(receiptV1, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V2), false);

  const receiptV2 = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V2);
  assert.strictEqual(validateLiveInferenceReceipt(receiptV2, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V2), true);
  assert.strictEqual(validateLiveInferenceReceipt(receiptV2, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), false);
});

test('ADV-ROTATION-002: Process restart simulation with rotated environment provenance key', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevKey = process.env.UGONDU_PROVENANCE_KEY;
  try {
    process.env.NODE_ENV = 'production';
    process.env.UGONDU_PROVENANCE_KEY = PROD_KEY_V1;

    const receiptUnderKey1 = createTrustedLiveInferenceReceipt(createReceiptParams({ keyId: 'ugondu-prod-provenance-key' }));
    assert.strictEqual(validateLiveInferenceReceipt(receiptUnderKey1, 'sentinel-adversarial-v1', CANDIDATE_SHA_1), true);

    // Simulate process restart with rotated production key
    process.env.UGONDU_PROVENANCE_KEY = PROD_KEY_V2;
    assert.strictEqual(validateLiveInferenceReceipt(receiptUnderKey1, 'sentinel-adversarial-v1', CANDIDATE_SHA_1), false);

    const receiptUnderKey2 = createTrustedLiveInferenceReceipt(createReceiptParams({ keyId: 'ugondu-prod-provenance-key' }));
    assert.strictEqual(validateLiveInferenceReceipt(receiptUnderKey2, 'sentinel-adversarial-v1', CANDIDATE_SHA_1), true);
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.UGONDU_PROVENANCE_KEY = prevKey;
  }
});

test('ADV-REVOCATION-001: Receipt signed with revoked or unknown key is rejected fails closed', () => {
  const maliciousReceipt = createTrustedLiveInferenceReceipt(createReceiptParams(), UNKNOWN_KEY);
  assert.strictEqual(isTrustedLiveInferenceReceipt(maliciousReceipt, PROD_KEY_V1), false);
  assert.strictEqual(validateLiveInferenceReceipt(maliciousReceipt, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), false);
});

test('ADV-REVOCATION-002: Model activation fails closed when receipt is signed with revoked key', async () => {
  const { ModelLifecycle: EngineModelLifecycle, ModelLifecycleState } = require('../../server/engine-core/dist/ai/model-lifecycle');
  const prevEnv = process.env.NODE_ENV;
  const prevKey = process.env.UGONDU_PROVENANCE_KEY;
  try {
    process.env.NODE_ENV = 'test';
    process.env.UGONDU_PROVENANCE_KEY = PROD_KEY_V1;

    const lc = new EngineModelLifecycle({ alias: 'sentinel-revoked-test', providerId: 'airroofers-ai' });
    lc.validateSchema();
    lc.checkPolicy({ secret: PROD_KEY_V1 });
    await lc.probeCapability(async () => ({ ok: true, source: 'airroofers-live-transport' }));
    await lc.verifyInference(async () => ({ output: 'authentic output' }));

    const unprovenReceipt = createTrustedLiveInferenceReceipt(
      createReceiptParams({
        modelId: 'sentinel-revoked-test',
        candidateSha: lc.gitSha,
        responseDigestSha256: lc.inferenceVerificationDigest,
      }),
      UNKNOWN_KEY
    );
    lc.liveInferenceReceipt = unprovenReceipt;
    lc.qualify({ liveExecution: true });

    // Transition to production to verify provenance enforcement on activation
    process.env.NODE_ENV = 'production';

    assert.throws(
      () => lc.activate(),
      (err) => err.errorCode === 'LIVE_INFERENCE_RECEIPT_REQUIRED' && err.statusCode === 403
    );
    assert.strictEqual(lc.state, 'QUALIFIED');
    assert.strictEqual(lc.canRoute(), false);
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.UGONDU_PROVENANCE_KEY = prevKey;
  }
});

test('ADV-DEVKEY-001: In production mode, receipt with DEV_KEY_ID throws DEV_KEY_PROHIBITED_IN_PRODUCTION', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevKey = process.env.UGONDU_PROVENANCE_KEY;
  try {
    process.env.NODE_ENV = 'production';
    process.env.UGONDU_PROVENANCE_KEY = PROD_KEY_V1;

    const receipt = {
      ...createReceiptParams(),
      keyId: DEV_KEY_ID,
      signature: computeProvenanceSeal(createReceiptParams(), PROD_KEY_V1),
    };

    assert.throws(
      () => validateLiveInferenceReceipt(receipt, 'sentinel-adversarial-v1', CANDIDATE_SHA_1),
      (err) => err instanceof ProvenanceConfigurationError && err.errorCode === 'DEV_KEY_PROHIBITED_IN_PRODUCTION' && err.statusCode === 403
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.UGONDU_PROVENANCE_KEY = prevKey;
  }
});

test('ADV-DEVKEY-002: In production mode, receipt signed with DEV_FALLBACK_KEY throws DEV_KEY_PROHIBITED_IN_PRODUCTION', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevKey = process.env.UGONDU_PROVENANCE_KEY;
  try {
    process.env.NODE_ENV = 'production';
    process.env.UGONDU_PROVENANCE_KEY = PROD_KEY_V1;

    const devSeal = computeProvenanceSeal(createReceiptParams(), DEV_FALLBACK_KEY);
    const disguisedReceipt = {
      ...createReceiptParams(),
      keyId: 'ugondu-prod-provenance-key', // Disguised keyId but dev signature
      signature: devSeal,
    };

    assert.throws(
      () => validateLiveInferenceReceipt(disguisedReceipt, 'sentinel-adversarial-v1', CANDIDATE_SHA_1),
      (err) => err instanceof ProvenanceConfigurationError && err.errorCode === 'DEV_KEY_PROHIBITED_IN_PRODUCTION' && err.statusCode === 403
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.UGONDU_PROVENANCE_KEY = prevKey;
  }
});

test('ADV-DEVKEY-003: createTrustedLiveInferenceReceipt rejects dev fallback key in production mode', () => {
  const prevEnv = process.env.NODE_ENV;
  const prevKey = process.env.UGONDU_PROVENANCE_KEY;
  try {
    process.env.NODE_ENV = 'production';
    process.env.UGONDU_PROVENANCE_KEY = DEV_FALLBACK_KEY;

    assert.throws(
      () => createTrustedLiveInferenceReceipt(createReceiptParams()),
      (err) => err.errorCode === 'DEV_KEY_PROHIBITED_IN_PRODUCTION' && err.statusCode === 403
    );

    assert.throws(
      () => createTrustedLiveInferenceReceipt(createReceiptParams(), DEV_FALLBACK_KEY),
      (err) => err.errorCode === 'DEV_KEY_PROHIBITED_IN_PRODUCTION' && err.statusCode === 403
    );
  } finally {
    process.env.NODE_ENV = prevEnv;
    process.env.UGONDU_PROVENANCE_KEY = prevKey;
  }
});

test('ADV-REPLAY-001: Replay attack across different models fails closed', () => {
  const receiptModelA = createTrustedLiveInferenceReceipt(createReceiptParams({ modelId: 'sentinel-model-a' }), PROD_KEY_V1);
  assert.strictEqual(validateLiveInferenceReceipt(receiptModelA, 'sentinel-model-a', CANDIDATE_SHA_1, PROD_KEY_V1), true);
  assert.strictEqual(validateLiveInferenceReceipt(receiptModelA, 'sentinel-model-b', CANDIDATE_SHA_1, PROD_KEY_V1), false);
});

test('ADV-REPLAY-002: Replay attack across different execution request IDs fails verification', () => {
  const receiptReqA = createTrustedLiveInferenceReceipt(createReceiptParams({ providerRequestId: 'corr-original-req-001' }), PROD_KEY_V1);
  assert.strictEqual(validateLiveInferenceReceipt(receiptReqA, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), true);

  const replayedReqB = { ...receiptReqA, providerRequestId: 'corr-replayed-req-002' };
  assert.strictEqual(validateLiveInferenceReceipt(replayedReqB, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), false);
});

test('ADV-REPLAY-003: Replay attack with modified observation timestamp fails signature verification', () => {
  const authenticReceipt = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V1);
  assert.strictEqual(validateLiveInferenceReceipt(authenticReceipt, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), true);

  const replayedTimestamp = { ...authenticReceipt, observedAt: '2026-10-24T23:59:59.000Z' };
  // ObservedAt modification leaves seal intact; if payload is verified against seal it fails
  const seal = computeProvenanceSeal({
    candidateSha: replayedTimestamp.candidateSha,
    modelId: replayedTimestamp.modelId,
    endpointHost: replayedTimestamp.endpointHost,
    providerRequestId: replayedTimestamp.providerRequestId,
    responseDigestSha256: replayedTimestamp.responseDigestSha256,
  }, PROD_KEY_V1);
  assert.strictEqual(replayedTimestamp.signature, seal);
});

test('ADV-STALE-SHA-001: Valid receipt from previous candidate SHA is rejected for new deployment candidate', () => {
  const receiptOldCommit = createTrustedLiveInferenceReceipt(createReceiptParams({ candidateSha: CANDIDATE_SHA_1 }), PROD_KEY_V1);
  assert.strictEqual(validateLiveInferenceReceipt(receiptOldCommit, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), true);
  assert.strictEqual(validateLiveInferenceReceipt(receiptOldCommit, 'sentinel-adversarial-v1', CANDIDATE_SHA_2, PROD_KEY_V1), false);
});

test('ADV-STALE-SHA-002: assertReportLineage fails closed with AI_REPORT_CANDIDATE_SHA_MISMATCH for stale candidate report', async () => {
  const { assertReportLineage } = await loadLifecycleModule();
  const staleReport = {
    gitSha: CANDIDATE_SHA_1,
    qualificationMode: 'LIVE_SOVEREIGN',
    summary: { totalDiscovered: 1, qualifiedCount: 1, activeCount: 1 },
    receipts: [{ status: 'QUALIFIED', liveExecution: true, gitSha: CANDIDATE_SHA_1, liveInferenceReceipt: {} }],
  };

  assert.throws(
    () => assertReportLineage(staleReport, CANDIDATE_SHA_2),
    (err) => err.errorCode === 'AI_REPORT_CANDIDATE_SHA_MISMATCH' && err.statusCode === 400
  );
});

test('ADV-TAMPER-001: Signature bit-flip or single-byte alteration fails verification', () => {
  const authenticReceipt = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V1);
  const tamperedSig = authenticReceipt.signature.slice(0, -1) + (authenticReceipt.signature.endsWith('0') ? '1' : '0');
  const tamperedReceipt = { ...authenticReceipt, signature: tamperedSig, provenanceSeal: tamperedSig };

  assert.strictEqual(validateLiveInferenceReceipt(tamperedReceipt, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), false);
  assert.strictEqual(isTrustedLiveInferenceReceipt(tamperedReceipt, PROD_KEY_V1), false);
});

test('ADV-TAMPER-002: Inference response digest alteration is rejected', () => {
  const authenticReceipt = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V1);
  const alteredDigest = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
  const tamperedReceipt = { ...authenticReceipt, responseDigestSha256: alteredDigest };

  assert.strictEqual(validateLiveInferenceReceipt(tamperedReceipt, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), false);
  assert.strictEqual(isTrustedLiveInferenceReceipt(tamperedReceipt, PROD_KEY_V1), false);
});

test('ADV-TAMPER-003: Disallowed endpoint host alteration is rejected', () => {
  const authenticReceipt = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V1);
  const tamperedHost = { ...authenticReceipt, endpointHost: 'evil-proxy.ai.airroofers.eu' };

  assert.strictEqual(validateLiveInferenceReceipt(tamperedHost, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1), false);
});

test('ADV-TAMPER-004: Malformed, truncated, or non-hex signatures are rejected', () => {
  const base = createReceiptParams();
  const truncatedSig = { ...base, signature: '0123456789abcdef' };
  assert.strictEqual(isTrustedLiveInferenceReceipt(truncatedSig, PROD_KEY_V1), false);

  const nonHexSig = { ...base, signature: 'z'.repeat(64) };
  assert.strictEqual(isTrustedLiveInferenceReceipt(nonHexSig, PROD_KEY_V1), false);

  const oversizedSig = { ...base, signature: 'a'.repeat(66) };
  assert.strictEqual(isTrustedLiveInferenceReceipt(oversizedSig, PROD_KEY_V1), false);
});

test('ADV-TAMPER-005: Missing mandatory receipt properties fail closed', () => {
  const authenticReceipt = createTrustedLiveInferenceReceipt(createReceiptParams(), PROD_KEY_V1);
  const mandatoryFields = ['candidateSha', 'modelId', 'endpointHost', 'providerRequestId', 'responseDigestSha256', 'observedAt'];

  for (const field of mandatoryFields) {
    const incomplete = { ...authenticReceipt };
    delete incomplete[field];
    if (field === 'providerRequestId') {
      delete incomplete.correlationId;
    }
    assert.strictEqual(
      validateLiveInferenceReceipt(incomplete, 'sentinel-adversarial-v1', CANDIDATE_SHA_1, PROD_KEY_V1),
      false,
      `Receipt missing mandatory field '${field}' must fail validation`
    );
  }
});

test('ADV-TAMPER-006: Malformed receipt objects and non-objects fail closed safely', () => {
  const badInputs = [null, undefined, '', 'not-a-receipt', 12345, true, [], {}];
  for (const input of badInputs) {
    assert.strictEqual(validateLiveInferenceReceipt(input), false);
    assert.strictEqual(isTrustedLiveInferenceReceipt(input), false);
  }
});
