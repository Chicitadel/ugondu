'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A07';
const OBJECTIVE = 'Verify stream registry validator exists';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const targetPath = path.join(context.root, 'scripts', 'check-cor-stream-registry.js');
  if (!fs.existsSync(targetPath)) {
    throw new Error('A07_STREAM_REGISTRY_VALIDATOR_MISSING');
  }

  const source = fs.readFileSync(targetPath, 'utf8');

  if (!source.includes("manifest.repository !== 'Chicitadel/ugondu'")) {
    throw new Error('A07_REPOSITORY_IDENTITY_CHECK_MISSING');
  }
  if (!source.includes('EXPECTED_IDS') || !source.includes('manifest.streams.length !== 40')) {
    throw new Error('A07_STREAM_COUNT_CHECK_MISSING');
  }
  if (!source.includes('assertNoVerifierStub(executorSource, stream.id)')) {
    throw new Error('A07_STUB_REJECTION_CHECK_MISSING');
  }
  if (!source.includes('executor.metadata.objectiveHash !== objectiveHash')) {
    throw new Error('A07_OBJECTIVE_HASH_CHECK_MISSING');
  }

  observations.push('Confirmed scripts/check-cor-stream-registry.js validates repository identity, 40-stream registry completeness, stub rejection, and objectiveHash integrity');
  artifacts.push('scripts/check-cor-stream-registry.js');
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
