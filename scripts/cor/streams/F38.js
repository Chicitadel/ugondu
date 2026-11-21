'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const path = require('path');

const STREAM_ID = 'F38';
const OBJECTIVE = 'Verify blast radius analysis dry run block';
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
  const scope = { resourceIdentifiers: ['resource-1'] };
  const safe = await orchestrator.analyzeBlastRadius({ infrastructureRepairs: [{ id: 'resource-1' }] }, scope);
  if (!safe.isSafe || safe.outOfBoundsDetected.length !== 0) throw new Error('F38_VALID_SCOPE_REJECTED');
  let outOfBoundsRejected = false;
  try {
    await orchestrator.analyzeBlastRadius({ infrastructureRepairs: [{ id: 'outside-resource' }] }, scope);
  } catch (error) {
    outOfBoundsRejected = String(error.message).includes('Blast Radius Violation');
  }
  if (!outOfBoundsRejected) throw new Error('F38_OUT_OF_BOUNDS_MUTATION_ACCEPTED');
  let unsafeDryRunRejected = false;
  try {
    await orchestrator.dryRun({}, { dryRun: async () => ({ safe: false }) }, scope);
  } catch { unsafeDryRunRejected = true; }
  if (!unsafeDryRunRejected) throw new Error('F38_UNSAFE_DRY_RUN_ACCEPTED');
  const safeDryRun = await orchestrator.dryRun({}, { dryRun: async () => ({ safe: true }) }, scope);
  if (!safeDryRun.success) throw new Error('F38_SAFE_DRY_RUN_REJECTED');
  observations.push('Live RecoveryOrchestrator accepted in-scope repairs and safe dry-runs, while rejecting out-of-scope mutations and unsafe dry-runs');
  artifacts.push('server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js');
}

module.exports = { metadata, run };
