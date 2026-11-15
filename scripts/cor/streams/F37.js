'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const path = require('path');

const STREAM_ID = 'F37';
const OBJECTIVE = 'Verify immutable recovery twin hashing';
const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '2.0.0',
  verificationMode: 'TEST',
};

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');
  const target = path.join(context.root, 'server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js');
  let RecoveryOrchestrator;
  try { ({ RecoveryOrchestrator } = require(target)); }
  catch (error) { throw new Error(STREAM_ID + '_COMPILED_ORCHESTRATOR_UNAVAILABLE: ' + error.message); }
  const orchestrator = new RecoveryOrchestrator();
  const observations = [];
  const artifacts = [];
  await verifyObjective(orchestrator, observations, artifacts, context);
  const receipt = {
    status: 'PASS', streamId: STREAM_ID, executionId: context.executionId,
    commitSHA: context.commitSHA, treeSHA: context.treeSHA,
    objectiveHash: metadata.objectiveHash, startedAt: context.startedAt,
    completedAt: new Date().toISOString(), observations, artifacts,
  };
  receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
  return receipt;
}

async function verifyObjective(orchestrator, observations, artifacts) {
  const adapter = {
    captureState: async () => ({
      provider: { platform: 'test', region: 'local' },
      topology: { nodes: [{ id: 'node-1', type: 'compute' }] },
      runtime: { variables: { version: '1' } },
    }),
  };
  const twin = await orchestrator.capture(adapter, { resourceIdentifiers: ['node-1'] });
  const supplied = twin.immutableEvidenceSnapshotId;
  if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)) {
    throw new Error('F37_IMMUTABLE_SNAPSHOT_DIGEST_MISSING');
  }
  const unsigned = { ...twin };
  delete unsigned.immutableEvidenceSnapshotId;
  const expected = crypto.createHash('sha256').update(JSON.stringify(unsigned), 'utf8').digest('hex');
  if (supplied !== expected) throw new Error('F37_SNAPSHOT_DIGEST_MISMATCH');
  const changed = { ...unsigned, runtime: { variables: { version: '2' } } };
  const changedDigest = crypto.createHash('sha256').update(JSON.stringify(changed), 'utf8').digest('hex');
  if (changedDigest === supplied) throw new Error('F37_SNAPSHOT_DIGEST_NOT_CONTENT_BOUND');
  observations.push('Live capture produced a SHA-256 content digest; mutation of captured state changed the expected digest');
  artifacts.push('server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js');
}

module.exports = { metadata, run };
