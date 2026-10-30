'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const { runJestRuntimeProbe } = require('../run-jest-runtime-probe');

const STREAM_ID = 'B09';
const OBJECTIVE = 'Verify removal of global upm bypass from jest.setup.ts';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

const PROBE = `
import { UpmExecutionGate } from './upm/policy-gate';

test('the real UPM gate rejects execution without its configured secret and is not mocked', async () => {
  expect(jest.isMockFunction(UpmExecutionGate.evaluate)).toBe(false);
  expect(process.env.UGONDU_UPM_SECRET).toBe('');
  const context: any = {
    intentHash: 'intent-probe',
    twinHash: 'twin-probe',
    ir: { nodes: [] },
    policyVersion: 'cor-probe',
    envelope: { edition: 'probe', allowedActions: [], tenantId: 'probe' },
    activePolicies: [],
  };
  await expect(UpmExecutionGate.evaluate(context)).rejects.toThrow();
});
`;

const ADVERSARIAL_SETUP = `
jest.mock('./src/upm/policy-gate', () => ({
  UpmExecutionGate: {
    evaluate: jest.fn().mockResolvedValue({
      decision: { status: 'ALLOW' },
      cryptographicSeal: 'forged-test-seal',
    }),
  },
}));
`;

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) {
    throw new Error('STREAM_CONTEXT_MISMATCH');
  }
  const setupPath = path.join(context.root, 'server', 'engine-core', 'jest.setup.ts');
  if (!fs.existsSync(setupPath)) throw new Error('B09_JEST_SETUP_MISSING');

  const positive = runJestRuntimeProbe({
    repoRoot: context.root,
    probeName: '__cor_b09_upm_enforcement',
    probeSource: PROBE,
    env: { UGONDU_UPM_SECRET: '' },
  });
  if (positive.status !== 0) {
    throw new Error('B09_UPM_RUNTIME_ENFORCEMENT_NOT_PROVEN:' + (positive.error || positive.stderr || positive.stdout).slice(-3000));
  }

  const negative = runJestRuntimeProbe({
    repoRoot: context.root,
    probeName: '__cor_b09_upm_adversarial_mock',
    probeSource: PROBE,
    setupSource: ADVERSARIAL_SETUP,
    env: { UGONDU_UPM_SECRET: '' },
  });
  if (negative.status === 0 || negative.status == null) {
    throw new Error('B09_ADVERSARIAL_GATE_MOCK_WAS_NOT_REJECTED');
  }

  const observations = [
    'Executed the actual engine-core Jest setup and UPM gate; the gate rejected execution without UGONDU_UPM_SECRET.',
    'Adversarial Jest setup that mocks UpmExecutionGate.evaluate failed the runtime probe as required.',
  ];
  const artifacts = [
    'server/engine-core/jest.config.js',
    'server/engine-core/jest.setup.ts',
    'server/engine-core/src/upm/policy-gate.ts',
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
