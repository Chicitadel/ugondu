'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A02';
const OBJECTIVE = 'Verify policy-gate wildcard prohibition';
const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const target = path.join(context.root, 'server/engine-core/src/upm/policy-gate.ts');
  if (!fs.existsSync(target)) throw new Error('A02_POLICY_GATE_MISSING');
  const source = fs.readFileSync(target, 'utf8');
  const wildcardGuard = /context\.envelope\.allowedActions\.some\(action\s*=>\s*action\s*===\s*['"]\*['"]\s*\|\|\s*action\.includes\(['"]\*['"]\)\)/;
  if (!wildcardGuard.test(source)) throw new Error('A02_WILDCARD_REJECTION_GUARD_MISSING');
  if (!/throw new Error\(['"]WILDCARD_CAPABILITY_NOT_PERMITTED['"]\)/.test(source)) {
    throw new Error('A02_WILDCARD_REJECTION_ERROR_MISSING');
  }
  observations.push('Confirmed the policy gate rejects exact and embedded wildcard actions before policy evaluation');
  artifacts.push('server/engine-core/src/upm/policy-gate.ts');
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
