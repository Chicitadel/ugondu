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
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
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

  // Runtime behavioral execution if compiled artifacts exist
  const compiledCandidates = [
    'server/engine-core/dist/deise/engine/recovery/capability-registry.js',
    'server/engine-core/dist/fabric/capabilities/capability-registry.js',
  ];
  const compiledRel = compiledCandidates.find((rel) => fs.existsSync(path.join(context.root, rel)));

  if (compiledRel) {
    const compiledPath = path.join(context.root, compiledRel);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const { CapabilityRegistry } = require(compiledPath);
    const registry = new CapabilityRegistry();

    const testCap = {
      capabilityId: 'cor-b14-runtime-test',
      diagnose: async () => ({}),
      plan: async () => ({}),
      execute: async () => ({}),
    };

    registry.registerCapability(testCap);
    if (registry.getCapability('cor-b14-runtime-test') !== testCap) {
      throw new Error('B14_RUNTIME_CAPABILITY_RETRIEVAL_FAILED');
    }

    let duplicateCaught = false;
    try {
      registry.registerCapability(testCap);
    } catch (err) {
      if (err.message && err.message.includes('CAPABILITY_ALREADY_REGISTERED:cor-b14-runtime-test')) {
        duplicateCaught = true;
      }
    }
    if (!duplicateCaught) {
      throw new Error('B14_RUNTIME_DUPLICATE_REJECTION_FAILED');
    }

    let invalidContractCaught = false;
    try {
      registry.registerCapability({ capabilityId: 'bad-cap', diagnose: () => {} });
    } catch {
      invalidContractCaught = true;
    }
    if (!invalidContractCaught) {
      throw new Error('B14_RUNTIME_INVALID_CONTRACT_ACCEPTED');
    }

    observations.push('Instantiated runtime CapabilityRegistry and confirmed duplicate registration throws CAPABILITY_ALREADY_REGISTERED:cor-b14-runtime-test');
    observations.push('Verified contract enforcement: capabilities lacking required methods (diagnose, plan, execute) are rejected at registration');
    artifacts.push(compiledRel);
  } else {
    observations.push('Confirmed CapabilityRegistry source checks this.plugins.has(capability.capabilityId) and throws CAPABILITY_ALREADY_REGISTERED on duplicate registration');
  }

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
