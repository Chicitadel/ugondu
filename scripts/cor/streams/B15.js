'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B15';
const OBJECTIVE = 'Verify recovery diagnosis delegates to capability';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'STATIC',
};

function verifyObjective(context, observations, artifacts) {
  const relPath = 'server/engine-core/src/routes/recovery.ts';
  const targetPath = path.join(context.root, relPath);
  if (!fs.existsSync(targetPath)) {
    throw new Error('B15_RECOVERY_ROUTE_MISSING');
  }

  const source = fs.readFileSync(targetPath, 'utf8');

  if (!source.includes('GlobalCapabilityRegistry.getCapability(')) {
    throw new Error('B15_CAPABILITY_LOOKUP_MISSING');
  }
  if (!/await\s+capability\.diagnose\(\s*twin\s*,\s*scope\s*\)/.test(source)) {
    throw new Error('B15_CAPABILITY_DIAGNOSE_DELEGATION_MISSING');
  }
  if (!/await\s+capability\.plan\(\s*diagnosis\s*,\s*scope\s*\)/.test(source)) {
    throw new Error('B15_CAPABILITY_PLAN_DELEGATION_MISSING');
  }

  observations.push('Confirmed recovery route resolves the capability from GlobalCapabilityRegistry and delegates diagnosis and planning to capability.diagnose(twin, scope) and capability.plan(diagnosis, scope)');
  artifacts.push(relPath);
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
