/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Analytics Evidence Kinds Suite
 * File           : analytics-evidence-kinds.test.js
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
const { DoraAnalyticsEngine, DeploymentStatus, EvidenceKind } = require('../server/engine-core/dist/analytics/dora');

let passed = 0; let failed = 0;
function report(n, desc, fn) {
  try { fn(); console.log(`[PASS] Test ${n}: ${desc}`); passed++; }
  catch(err) { console.error(`[FAIL] Test ${n}: ${desc} ->`, err.message); failed++; }
}

report(1, 'Empty events — performanceTier kind is BENCHMARK', () => {
  const r = DoraAnalyticsEngine.calculateMetrics([], 86400000);
  assert.strictEqual(r.evidenceKinds.performanceTier, 'BENCHMARK');
});

report(2, 'Measured events — changeLeadTimeMs kind is MEASURED', () => {
  const now = Date.now();
  const events = [
    { id: 'e1', status: DeploymentStatus.SUCCESS, triggerTimestampMs: now - 3600000, completionTimestampMs: now - 1800000 },
    { id: 'e2', status: DeploymentStatus.SUCCESS, triggerTimestampMs: now - 7200000, completionTimestampMs: now - 5400000 }
  ];
  const r = DoraAnalyticsEngine.calculateMetrics(events, 86400000);
  assert.strictEqual(r.evidenceKinds.changeLeadTimeMs, 'MEASURED');
});

report(3, 'changeFailureRatePercentage kind is CALCULATED', () => {
  const now = Date.now();
  const events = [
    { id: 'e1', status: DeploymentStatus.SUCCESS, triggerTimestampMs: now - 3600000, completionTimestampMs: now },
    { id: 'e2', status: DeploymentStatus.FAILED, triggerTimestampMs: now - 7200000, completionTimestampMs: now - 3600000 }
  ];
  const r = DoraAnalyticsEngine.calculateMetrics(events, 86400000);
  assert.strictEqual(r.evidenceKinds.changeFailureRatePercentage, 'CALCULATED');
});

report(4, 'deploymentReworkRatePercentage kind is CALCULATED', () => {
  const r = DoraAnalyticsEngine.calculateMetrics([], 86400000);
  assert.strictEqual(r.evidenceKinds.deploymentReworkRatePercentage, 'CALCULATED');
});

report(5, 'failedDeploymentRecoveryTimeMs kind is CALCULATED', () => {
  const r = DoraAnalyticsEngine.calculateMetrics([], 86400000);
  assert.strictEqual(r.evidenceKinds.failedDeploymentRecoveryTimeMs, 'CALCULATED');
});

report(6, 'performanceTier kind is never MEASURED', () => {
  const now = Date.now();
  const events = [
    { id: 'e1', status: DeploymentStatus.SUCCESS, triggerTimestampMs: now - 3600000, completionTimestampMs: now }
  ];
  const r = DoraAnalyticsEngine.calculateMetrics(events, 86400000);
  assert.notStrictEqual(r.evidenceKinds.performanceTier, 'MEASURED',
    'BENCHMARK classification must never be labelled as MEASURED');
  assert.strictEqual(r.evidenceKinds.performanceTier, 'BENCHMARK');
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
