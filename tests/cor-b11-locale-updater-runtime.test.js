'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const b11 = require('../scripts/cor/streams/B11');
const root = path.resolve(__dirname, '..');

function context(repoRoot, streamId = 'B11') {
  return {
    root: repoRoot,
    streamId,
    executionId: 'b11-locale-updater-runtime',
    commitSHA: 'c'.repeat(40),
    treeSHA: 'd'.repeat(40),
    startedAt: new Date().toISOString(),
  };
}

test('B11 executes locale updater and proves translation preservation plus missing/extra key rejection', async () => {
  assert.equal(b11.metadata.verificationMode, 'TEST');
  const receipt = await b11.run(context(root));
  assert.equal(receipt.status, 'PASS');
  assert.ok(receipt.artifacts.includes('scripts/update-locales.js'));
  assert.equal(receipt.observations.length, 2);
});

test('B11 fails closed when the locale updater is absent', async () => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-b11-missing-'));
  try {
    await assert.rejects(b11.run(context(fixtureRoot)), /B11_UPDATE_LOCALES_SCRIPT_MISSING/);
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('B11 rejects a mismatched stream execution identity', async () => {
  await assert.rejects(b11.run(context(root, 'B12')), /STREAM_CONTEXT_MISMATCH/);
});
