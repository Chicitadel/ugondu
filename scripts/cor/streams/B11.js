'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B11';
const OBJECTIVE = 'Verify locale update script does not overwrite translations';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const targetPath = path.join(context.root, 'scripts', 'update-locales.js');
  if (!fs.existsSync(targetPath)) {
    throw new Error('B11_UPDATE_LOCALES_SCRIPT_MISSING');
  }

  const source = fs.readFileSync(targetPath, 'utf8');

  if (!source.includes('function mergeMissing(')) {
    throw new Error('B11_MERGE_MISSING_FUNCTION_ABSENT');
  }
  if (!source.includes('sortedTarget[k] = tgt[k]')) {
    throw new Error('B11_EXISTING_TRANSLATION_PRESERVATION_MISSING');
  }
  if (!source.includes('Missing translation key') || !source.includes('Extra translation key') || !source.includes('block(')) {
    throw new Error('B11_MISSING_OR_EXTRA_KEY_BLOCK_ABSENT');
  }
  if (/sortedTarget\[k\]\s*=\s*src\[k\]/.test(source)) {
    throw new Error('B11_SOURCE_OVERWRITE_DETECTED');
  }

  observations.push('Confirmed scripts/update-locales.js preserves existing target translations via sortedTarget[k] = tgt[k] and blocks missing or extra keys');
  artifacts.push('scripts/update-locales.js');
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
