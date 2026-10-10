/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Autonomy Authorization Suite
 * File           : autonomy-authorization.test.js
 * Version        : 1.0.0
 * Author         : Deployment Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';
const assert = require('assert');
const { requireFullAutonomyContext } = require('../server/engine-core/dist/autonomy/state_machine');

let passed = 0; let failed = 0;
function report(n, desc, fn) {
  try { fn(); console.log(`[PASS] Test ${n}: ${desc}`); passed++; }
  catch(err) { console.error(`[FAIL] Test ${n}: ${desc} ->`, err.message); failed++; }
}

function buildValidL5Context() {
  return {
    authenticatedAuthority: 'engine-core',
    targetAuthorization: true,
    capabilityIntersectionVerified: true,
    policyVersionHash: 'a'.repeat(64),
    healthEvidence: { healthy: true, verifiedAt: Math.floor(Date.now() / 1000) },
    rollbackReadiness: true,
    executionTrustScore: 0.99,
    autonomyPolicyLevel: 5,
    policyViolations: []
  };
}

report(1, 'L5 rejected with only policyViolations empty — all other fields missing', () => {
  const r = requireFullAutonomyContext({ policyViolations: [], autonomyPolicyLevel: 5 }, 5);
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.reason, 'INVALID_AUTHENTICATED_AUTHORITY');
});

report(2, 'L5 rejected with stale health evidence (>30s)', () => {
  const ctx = buildValidL5Context();
  ctx.healthEvidence.verifiedAt = Math.floor(Date.now() / 1000) - 31;
  const r = requireFullAutonomyContext(ctx, 5);
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.reason, 'HEALTH_EVIDENCE_STALE');
});

report(3, 'L5 rejected with rollbackReadiness false', () => {
  const ctx = buildValidL5Context();
  ctx.rollbackReadiness = false;
  const r = requireFullAutonomyContext(ctx, 5);
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.reason, 'ROLLBACK_NOT_READY');
});

report(4, 'L5 rejected with executionTrustScore 0.90 (below 0.95)', () => {
  const ctx = buildValidL5Context();
  ctx.executionTrustScore = 0.90;
  const r = requireFullAutonomyContext(ctx, 5);
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.reason, 'TRUST_SCORE_INSUFFICIENT');
});

report(5, 'L5 rejected with autonomyPolicyLevel 4', () => {
  const ctx = buildValidL5Context();
  ctx.autonomyPolicyLevel = 4;
  const r = requireFullAutonomyContext(ctx, 5);
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.reason, 'AUTONOMY_LEVEL_INSUFFICIENT');
});

report(6, 'L5 approved with complete valid trusted context', () => {
  const ctx = buildValidL5Context();
  const r = requireFullAutonomyContext(ctx, 5);
  assert.strictEqual(r.approved, true);
  assert.strictEqual(r.reason, 'L5_FULL_CONTEXT_APPROVED');
});

report(7, 'L6 rejected with autonomyPolicyLevel 5', () => {
  const ctx = buildValidL5Context();
  ctx.autonomyPolicyLevel = 5;
  const r = requireFullAutonomyContext(ctx, 6);
  assert.strictEqual(r.approved, false);
  assert.strictEqual(r.reason, 'AUTONOMY_LEVEL_INSUFFICIENT');
});

report(8, 'L6 approved with autonomyPolicyLevel 6 and full context', () => {
  const ctx = buildValidL5Context();
  ctx.autonomyPolicyLevel = 6;
  const r = requireFullAutonomyContext(ctx, 6);
  assert.strictEqual(r.approved, true);
  assert.strictEqual(r.reason, 'L6_FULL_CONTEXT_APPROVED');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
