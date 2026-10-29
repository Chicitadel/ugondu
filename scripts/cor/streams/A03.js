'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A03';
const OBJECTIVE = 'Verify recovery logic binding envelope hash';
const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const recoveryPath = path.join(context.root, 'server/engine-core/src/routes/recovery.ts');
  const policyPath = path.join(context.root, 'server/engine-core/src/upm/policy-gate.ts');
  if (!fs.existsSync(recoveryPath)) throw new Error('A03_RECOVERY_ROUTE_MISSING');
  if (!fs.existsSync(policyPath)) throw new Error('A03_POLICY_GATE_MISSING');
  const recovery = fs.readFileSync(recoveryPath, 'utf8');
  const policy = fs.readFileSync(policyPath, 'utf8');

  if (!/const\s+envelopeHash\s*=\s*sha256\(context\.envelope\)/.test(recovery)) {
    throw new Error('A03_RECOVERY_ENVELOPE_HASH_NOT_DERIVED');
  }
  if (!/verifyAuthorization\(auth,\s*ir,\s*\{[\s\S]{0,500}?envelopeHash\s*,/.test(recovery)) {
    throw new Error('A03_RECOVERY_ENVELOPE_HASH_NOT_BOUND_TO_AUTHORIZATION');
  }
  if (!/auth\.envelopeHash\s*!==\s*expected\.envelopeHash/.test(policy)) {
    throw new Error('A03_POLICY_EXPECTED_ENVELOPE_HASH_NOT_CHECKED');
  }
  if (!/envelopeHash:\s*auth\.envelopeHash/.test(policy)) {
    throw new Error('A03_ENVELOPE_HASH_NOT_INCLUDED_IN_SEAL_PAYLOAD');
  }

  observations.push('Confirmed recovery derives the envelope hash from the active envelope and supplies it to authorization verification');
  observations.push('Confirmed policy authorization compares the expected envelope hash and binds the hash into the cryptographic seal payload');
  artifacts.push('server/engine-core/src/routes/recovery.ts', 'server/engine-core/src/upm/policy-gate.ts');
  return true;
}

async function run(context) {
  if (context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');
  const observations = [];
  const artifacts = [];
  if (!verifyObjective(context, observations, artifacts)) throw new Error('COR_OBJECTIVE_NOT_PROVEN');
  const receipt = {
    status: 'PASS', streamId: STREAM_ID, executionId: context.executionId,
    commitSHA: context.commitSHA, treeSHA: context.treeSHA,
    objectiveHash: metadata.objectiveHash, startedAt: context.startedAt,
    completedAt: new Date().toISOString(), observations, artifacts,
  };
  receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
  return receipt;
}

module.exports = { metadata, run };
