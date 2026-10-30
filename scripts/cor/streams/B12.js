'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B12';
const OBJECTIVE = 'Verify locale validation script checks key parity';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const targetPath = path.join(context.root, 'scripts', 'validate-locales.js');
  if (!fs.existsSync(targetPath)) {
    throw new Error('B12_VALIDATE_LOCALES_SCRIPT_MISSING');
  }

  const source = fs.readFileSync(targetPath, 'utf8');

  if (!source.includes('requiredLocales') || !source.includes('function flatten(')) {
    throw new Error('B12_FLATTEN_OR_REQUIRED_LOCALES_MISSING');
  }
  if (!source.includes('sourceKeyNames.filter(k => !targetKeyNames.includes(k))')) {
    throw new Error('B12_MISSING_KEY_PARITY_CHECK_ABSENT');
  }
  if (!source.includes('targetKeyNames.filter(k => !sourceKeyNames.includes(k))')) {
    throw new Error('B12_EXTRA_KEY_PARITY_CHECK_ABSENT');
  }
  if (!source.includes('getPlaceholders(') || !source.includes('fakePrefixPattern')) {
    throw new Error('B12_PLACEHOLDER_OR_PREFIX_CHECK_ABSENT');
  }

  observations.push('Confirmed scripts/validate-locales.js enforces key parity, placeholder parity, and fake-prefix rejection across required locales');
  artifacts.push('scripts/validate-locales.js');
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
