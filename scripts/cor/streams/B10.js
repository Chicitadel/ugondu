'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B10';
const OBJECTIVE = 'Verify unit-test translation fixture rule enforcement';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const setupPath = path.join(context.root, 'server', 'engine-core', 'jest.setup.ts');
  if (!fs.existsSync(setupPath)) {
    throw new Error('B10_JEST_SETUP_MISSING');
  }

  const source = fs.readFileSync(setupPath, 'utf8');

  if (!source.includes('(global as any).__t') || !source.includes('`[en] ${key}`')) {
    throw new Error('B10_GLOBAL_TRANSLATION_FIXTURE_MISSING');
  }

  if (!/jest\.mock\(['"]@ugondu\/shared['"][\s\S]*?__t:\s*\([^)]*\)\s*=>\s*`\[en\] \$\{key\}`/.test(source)) {
    throw new Error('B10_SHARED_MODULE_TRANSLATION_FIXTURE_MISSING');
  }

  observations.push('Confirmed server/engine-core/jest.setup.ts enforces deterministic [en] ${key} translation fixture rules for global and @ugondu/shared __t bindings');
  artifacts.push('server/engine-core/jest.setup.ts');
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
