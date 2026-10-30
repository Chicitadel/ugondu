'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const { runJestRuntimeProbe } = require('../run-jest-runtime-probe');

const STREAM_ID = 'B10';
const OBJECTIVE = 'Verify unit-test translation fixture rule enforcement';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

const PROBE = `
test('global translation fixture returns deterministic English keys', () => {
  expect((global as any).__t('cor_runtime_probe')).toBe('[en] cor_runtime_probe');
});

test('shared-module translation fixture returns deterministic English keys', () => {
  const shared = require('@ugondu/shared');
  expect(shared.__t('cor_runtime_probe')).toBe('[en] cor_runtime_probe');
});
`;

const ADVERSARIAL_SETUP = `
(global as any).__t = (key: string) => '[fr] ' + key;
jest.mock('@ugondu/shared', () => ({
  __t: (key: string) => '[fr] ' + key,
}));
`;

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) {
    throw new Error('STREAM_CONTEXT_MISMATCH');
  }
  const setupPath = path.join(context.root, 'server', 'engine-core', 'jest.setup.ts');
  const configPath = path.join(context.root, 'server', 'engine-core', 'jest.config.js');
  if (!fs.existsSync(setupPath)) throw new Error('B10_JEST_SETUP_MISSING');
  if (!fs.existsSync(configPath)) throw new Error('B10_JEST_CONFIG_MISSING');

  const positive = runJestRuntimeProbe({
    repoRoot: context.root,
    probeName: '__cor_b10_translation_fixture',
    probeSource: PROBE,
  });
  if (positive.status !== 0) {
    throw new Error('B10_TRANSLATION_RUNTIME_FIXTURE_NOT_PROVEN:' + (positive.error || positive.stderr || positive.stdout).slice(-3000));
  }

  const negative = runJestRuntimeProbe({
    repoRoot: context.root,
    probeName: '__cor_b10_translation_adversarial',
    probeSource: PROBE,
    setupSource: ADVERSARIAL_SETUP,
  });
  if (negative.status === 0 || negative.status == null) {
    throw new Error('B10_ADVERSARIAL_TRANSLATION_FIXTURE_WAS_NOT_REJECTED');
  }

  const observations = [
    'Executed the real Jest setup; both global __t and @ugondu/shared __t returned deterministic [en] values.',
    'Adversarial setup returning [fr] values failed the runtime probe as required.',
  ];
  const artifacts = [
    'server/engine-core/jest.config.js',
    'server/engine-core/jest.setup.ts',
    'scripts/cor/run-jest-runtime-probe.js',
  ];

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

module.exports = { metadata, run };
