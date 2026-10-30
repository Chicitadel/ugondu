'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const a07 = require('../scripts/cor/streams/A07');
const root = path.resolve(__dirname, '..');

function context(repoRoot, streamId = 'A07') {
  return {
    root: repoRoot,
    streamId,
    executionId: 'a07-runtime-regression',
    commitSHA: 'a'.repeat(40),
    treeSHA: 'b'.repeat(40),
    startedAt: new Date().toISOString(),
  };
}

test('A07 executes the real registry validator and proves positive plus tampered-identity rejection', async () => {
  assert.equal(a07.metadata.verificationMode, 'TEST');
  const receipt = await a07.run(context(root));
  assert.equal(receipt.status, 'PASS');
  assert.ok(receipt.artifacts.includes('scripts/check-cor-stream-registry.js'));
  assert.ok(receipt.observations.some((value) => value.includes('all 40 executor contracts load and validate')));
  assert.ok(receipt.observations.some((value) => value.includes('rejects a tampered repository identity')));
});

test('A07 fails closed when the registry validator is absent', async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-a07-missing-'));
  try {
    await assert.rejects(a07.run(context(fixtureRoot)), /A07_STREAM_REGISTRY_VALIDATOR_MISSING/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('A07 rejects a mismatched stream execution identity', async () => {
  await assert.rejects(a07.run(context(root, 'A08')), /STREAM_CONTEXT_MISMATCH/);
});
