'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const path = require('path');

const STREAM_ID = 'F35';
const OBJECTIVE = 'Verify recovery orchestration correctly requests approval';
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
  const safe = { isSafe: true, authorizedScope: ['resource-1'], outOfBoundsDetected: [], dependencyGraph: [] };
  const plan = { infrastructureRepairs: [{ id: 'resource-1' }] };
  const allowed = await orchestrator.requestApproval(plan, safe, { decision: { status: 'ALLOW' } });
  if (allowed !== true) throw new Error('F35_VALID_AUTHORIZATION_NOT_ACCEPTED');
  for (const auth of [undefined, { decision: { status: 'DENY' } }, { decision: { status: 'REVIEW_REQUIRED' } }]) {
    let rejected = false;
    try { await orchestrator.requestApproval(plan, safe, auth); } catch { rejected = true; }
    if (!rejected) throw new Error('F35_UNAUTHORIZED_APPROVAL_ACCEPTED');
  }
  let unsafeRejected = false;
  try {
    await orchestrator.requestApproval(plan, { ...safe, isSafe: false }, { decision: { status: 'ALLOW' } });
  } catch { unsafeRejected = true; }
  if (!unsafeRejected) throw new Error('F35_UNSAFE_PLAN_APPROVAL_ACCEPTED');
  observations.push('Live RecoveryOrchestrator accepted ALLOW and rejected missing, denied, review-required, and unsafe approval inputs');
  artifacts.push('server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js');
}

module.exports = { metadata, run };
