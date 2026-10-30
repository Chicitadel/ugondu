'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B14';
const OBJECTIVE = 'Verify capability registry rejects duplicates';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const candidates = [
    'server/engine-core/src/deise/engine/recovery/capability-registry.ts',
    'server/engine-core/src/fabric/capabilities/capability-registry.ts',
  ];

  const foundRel = candidates.find((rel) => fs.existsSync(path.join(context.root, rel)));
  if (!foundRel) {
    throw new Error('B14_CAPABILITY_REGISTRY_MISSING');
  }

  const source = fs.readFileSync(path.join(context.root, foundRel), 'utf8');

  if (!source.includes('this.plugins.has(capability.capabilityId)')) {
    throw new Error('B14_DUPLICATE_CAPABILITY_CHECK_MISSING');
  }
  if (!source.includes('CAPABILITY_ALREADY_REGISTERED')) {
    throw new Error('B14_DUPLICATE_CAPABILITY_ERROR_MISSING');
  }

  observations.push('Confirmed CapabilityRegistry checks this.plugins.has(capability.capabilityId) and throws CAPABILITY_ALREADY_REGISTERED on duplicate registration');
  artifacts.push(foundRel);
  return true;
}

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) {
    throw new Error('STREAM_CONTEXT_MISMATCH');
  }

  const observations = [];
  const artifacts = [];

  if (!verifyObjective(context, observations, artifacts)) {
    throw new Error('COR_OBJECTIVE_NOT_PROVEN');
  }

  const receipt = {
    status: 'PASS',
    streamId: STREAM_ID,
    executionId: context.executionId,
    commitSHA: context.commitSHA,
    treeSHA: context.treeSHA,
    objectiveHash: metadata.objectiveHash,
    startedAt: context.startedAt,
    completedAt: new Date().toISOString(),
    observations,
    artifacts,
  };

  receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
  return receipt;
}

module.exports = {
  metadata,
  run,
};
