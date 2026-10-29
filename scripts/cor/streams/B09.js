'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B09';
const OBJECTIVE = 'Verify removal of global upm bypass from jest.setup.ts';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const primarySetup = path.join(context.root, 'server', 'engine-core', 'jest.setup.ts');
  if (!fs.existsSync(primarySetup)) {
    throw new Error('B09_JEST_SETUP_MISSING');
  }

  const candidateRelPaths = [
    'server/engine-core/jest.setup.ts',
    'server/engine-core/jest.setup.js',
    'server/capabilities/jest.setup.ts',
    'server/capabilities/jest.setup.js',
  ];

  const forbiddenPattern = /UGONDU_UPM_BYPASS|UpmExecutionGate|policy-gate|upm[_\s-]*bypass/i;

  for (const relPath of candidateRelPaths) {
    const fullPath = path.join(context.root, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const source = fs.readFileSync(fullPath, 'utf8');
    if (forbiddenPattern.test(source)) {
      throw new Error(`B09_GLOBAL_UPM_BYPASS_PRESENT:${relPath}`);
    }
    artifacts.push(relPath);
  }

  observations.push('Confirmed jest setup files contain no global UPM bypass env flags or policy-gate mocks');
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
