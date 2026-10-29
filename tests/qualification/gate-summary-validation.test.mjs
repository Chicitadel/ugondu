import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateGateSummary } = require('../../scripts/cor/gate-summary-validation');

const passingSummary = () => ({
  schemaVersion: '3.0.0',
  commitSHA: 'a'.repeat(40),
  treeSHA: 'b'.repeat(40),
  totalGates: 40,
  passedGates: 40,
  allGatesPassed: true,
  skippedGates: [],
  notRunGates: [],
  failedGates: [],
});

test('accepts a complete candidate-bound 40/40 summary', () => {
  assert.equal(validateGateSummary(passingSummary()), null);
});

test('rejects omitted skipped/not-run/failed arrays rather than treating them as empty', () => {
  for (const field of ['skippedGates', 'notRunGates', 'failedGates']) {
    const summary = passingSummary();
    delete summary[field];
    assert.match(validateGateSummary(summary), new RegExp(field));
  }
});

test('rejects non-array gate status fields', () => {
  for (const field of ['skippedGates', 'notRunGates', 'failedGates']) {
    const summary = passingSummary();
    summary[field] = null;
    assert.match(validateGateSummary(summary), new RegExp(field));
  }
});

test('rejects skipped, not-run, or failed gates', () => {
  for (const field of ['skippedGates', 'notRunGates', 'failedGates']) {
    const summary = passingSummary();
    summary[field] = ['GATE-UNKNOWN'];
    assert.match(validateGateSummary(summary), new RegExp(field));
  }
});

test('rejects inconsistent counts, missing success assertion, and unknown schema', () => {
  const badCounts = passingSummary();
  badCounts.passedGates = 39;
  assert.match(validateGateSummary(badCounts), /40 total and 40 passed/);

  const badResult = passingSummary();
  badResult.allGatesPassed = false;
  assert.match(validateGateSummary(badResult), /allGatesPassed/);

  const badSchema = passingSummary();
  badSchema.schemaVersion = '2.0.0';
  assert.match(validateGateSummary(badSchema), /schemaVersion/);
});
