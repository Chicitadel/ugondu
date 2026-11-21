'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const previousDir = process.env.UGONDU_TRANSACTION_DIR;
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-transaction-failure-'));
process.env.UGONDU_TRANSACTION_DIR = stateDir;

const { RecoveryOrchestrator } = require('../server/engine-core/dist/deise/engine/recovery/recovery-orchestrator');

test('failed atomic recovery persists FAILED once and preserves the original failure instead of revision conflict', async () => {
  let rollbackCalled = false;
  const adapter = {
    checkDrift: async () => true,
    executeAtomicRecovery: async () => ({ success: false, checkpointId: 'checkpoint-failure-001' }),
    rollback: async (checkpointId) => {
      assert.equal(checkpointId, 'checkpoint-failure-001');
      rollbackCalled = true;
    },
  };

  const orchestrator = new RecoveryOrchestrator();
  await assert.rejects(
    orchestrator.executeAtomically(
      {},
      adapter,
      { baselineFingerprint: 'sha256:baseline', resourceIdentifiers: [] },
    ),
    (error) => error.message !== 'TRANSACTION_REVISION_CONFLICT',
  );

  assert.equal(rollbackCalled, true);
  const transactionFiles = fs.readdirSync(stateDir).filter((name) => name.endsWith('.json'));
  assert.equal(transactionFiles.length, 1);
  const transaction = JSON.parse(fs.readFileSync(path.join(stateDir, transactionFiles[0]), 'utf8'));
  assert.equal(transaction.status, 'FAILED');
  assert.equal(transaction.revision, 3);
});

test.after(() => {
  fs.rmSync(stateDir, { recursive: true, force: true });
  if (previousDir === undefined) delete process.env.UGONDU_TRANSACTION_DIR;
  else process.env.UGONDU_TRANSACTION_DIR = previousDir;
});


test('rollback failure still records the transaction as FAILED and preserves rollback error', async () => {
  const before = new Set(fs.readdirSync(stateDir).filter((name) => name.endsWith('.json')));
  const adapter = {
    checkDrift: async () => true,
    executeAtomicRecovery: async () => ({ success: false, checkpointId: 'checkpoint-rollback-failure-002' }),
    rollback: async () => {
      throw new Error('rollback operation failed');
    },
  };

  const orchestrator = new RecoveryOrchestrator();
  await assert.rejects(
    orchestrator.executeAtomically(
      {},
      adapter,
      { baselineFingerprint: 'sha256:baseline', resourceIdentifiers: [] },
    ),
    /rollback operation failed/,
  );

  const created = fs.readdirSync(stateDir)
    .filter((name) => name.endsWith('.json') && !before.has(name));
  assert.equal(created.length, 1);
  const transaction = JSON.parse(fs.readFileSync(path.join(stateDir, created[0]), 'utf8'));
  assert.equal(transaction.status, 'FAILED');
  assert.equal(transaction.revision, 3);
});
