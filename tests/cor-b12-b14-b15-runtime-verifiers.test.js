'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const b12 = require('../scripts/cor/streams/B12');
const b14 = require('../scripts/cor/streams/B14');
const b15 = require('../scripts/cor/streams/B15');
const root = path.resolve(__dirname, '..');

function context(repoRoot, streamId) {
  return {
    root: repoRoot,
    streamId,
    executionId: `runtime-regression-${streamId.toLowerCase()}`,
    commitSHA: 'a'.repeat(40),
    treeSHA: 'b'.repeat(40),
    startedAt: new Date().toISOString(),
  };
}

test('B12 executes locale validator and proves positive repo pass plus negative fixture rejections', async () => {
  assert.equal(b12.metadata.verificationMode, 'TEST');
  const receipt = await b12.run(context(root, 'B12'));
  assert.equal(receipt.status, 'PASS');
  assert.ok(receipt.artifacts.includes('scripts/validate-locales.js'));
  assert.ok(receipt.observations.some((obs) => obs.includes('exit status 0 and positive PASS confirmation')));
  assert.ok(receipt.observations.some((obs) => obs.includes('rejection of missing keys, extra keys, and fake locale prefix')));

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b12-missing-'));
  try {
    await assert.rejects(b12.run(context(fixtureRoot, 'B12')), /B12_VALIDATE_LOCALES_SCRIPT_MISSING/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }

  await assert.rejects(b12.run(context(root, 'B13')), /STREAM_CONTEXT_MISMATCH/);
});

test('B14 executes CapabilityRegistry and proves duplicate and invalid contract rejection', async () => {
  assert.equal(b14.metadata.verificationMode, 'TEST');
  const receipt = await b14.run(context(root, 'B14'));
  assert.equal(receipt.status, 'PASS');
  assert.ok(receipt.observations.some((obs) => obs.includes('CAPABILITY_ALREADY_REGISTERED')));
  assert.ok(receipt.observations.some((obs) => obs.includes('capabilities lacking required methods')));

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b14-missing-'));
  try {
    await assert.rejects(b14.run(context(fixtureRoot, 'B14')), /B14_CAPABILITY_REGISTRY_MISSING/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }

  await assert.rejects(b14.run(context(root, 'B15')), /STREAM_CONTEXT_MISMATCH/);
});

test('B15 executes recovery capability delegation and proves contract binding', async () => {
  assert.equal(b15.metadata.verificationMode, 'TEST');
  const receipt = await b15.run(context(root, 'B15'));
  assert.equal(receipt.status, 'PASS');
  assert.ok(receipt.observations.some((obs) => obs.includes('capability.diagnose(twin, scope) and capability.plan(diagnosis, scope) execute with contract arguments')));

  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b15-missing-'));
  try {
    await assert.rejects(b15.run(context(fixtureRoot, 'B15')), /B15_RECOVERY_ROUTE_MISSING/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }

  await assert.rejects(b15.run(context(root, 'B14')), /STREAM_CONTEXT_MISMATCH/);
});
