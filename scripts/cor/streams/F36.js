'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const STREAM_ID = 'F36';
const OBJECTIVE = 'Verify recovery execution verifies authorization';
const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '2.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '2.0.0',
  verificationMode: 'TEST',
};

const CHILD = String.raw`
const path = require('node:path');
process.env.UGONDU_UPM_SECRET = 'cor-f36-test-secret';
const root = process.cwd();
const policy = require(path.join(root, 'server/engine-core/dist/upm/policy-gate.js'));
const registry = require(path.join(root, 'server/engine-core/dist/deise/engine/recovery/capability-registry.js'));
const route = require(path.join(root, 'server/engine-core/dist/routes/recovery.js'));
let executionReached = false;
policy.UpmExecutionGate.evaluate = async () => ({
  decision: { status: 'DENY', timestamp: new Date(), policyVersion: '1.0.0' }
});
const capabilityId = 'cor-f36-deny-' + process.pid;
registry.GlobalCapabilityRegistry.registerCapability({
  capabilityId,
  diagnose: async () => ({ diagnosis: 'test' }),
  plan: async () => ({
    infrastructureRepairs: [{
      id: 'resource-1', kind: 'WRITE_FILE', provider: 'local',
      resourceType: 'file', targetPath: '/tmp/cor-f36-must-not-execute', content: 'x'
    }]
  }),
  execute: async () => { throw new Error('CAPABILITY_EXECUTE_SHOULD_NOT_BE_CALLED'); }
});
const adapter = {
  captureState: async () => ({ provider: { platform: 'test' }, topology: { nodes: [] }, runtime: { variables: {} } }),
  fingerprintRepository: async () => 'baseline-fingerprint',
  dryRun: async () => ({ safe: true }),
  executeAtomicRecovery: async () => { executionReached = true; return { success: true, evidence: {} }; },
  rollback: async () => ({ success: true })
};
(async () => {
  try {
    await route.executeGovernedRecovery({
      capabilityId, target: 'resource-1', repositoryPath: 'test',
      authorizedActions: ['WRITE_FILE']
    }, adapter, false);
    throw new Error('UNAUTHORIZED_RECOVERY_WAS_ACCEPTED');
  } catch (error) {
    if (error.message !== 'UNAUTHORIZED') throw error;
  }
  if (executionReached) throw new Error('UNAUTHORIZED_RECOVERY_EXECUTED');
  process.stdout.write('DENIED_BEFORE_MUTATION');
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
`;

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');
  const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-f36-'));
  try {
    const result = spawnSync(process.execPath, ['-e', CHILD], {
      cwd: context.root,
      encoding: 'utf8',
      timeout: 20000,
      env: { ...process.env, UGONDU_TRANSACTION_DIR: stateDir },
    });
    if (result.error) throw new Error('F36_RUNTIME_PROBE_FAILED: ' + result.error.message);
    if (result.status !== 0 || !String(result.stdout).includes('DENIED_BEFORE_MUTATION')) {
      throw new Error('F36_UNAUTHORIZED_EXECUTION_NOT_BLOCKED: ' + String(result.stderr || result.stdout));
    }
    const receipt = {
      status: 'PASS', streamId: STREAM_ID, executionId: context.executionId,
      commitSHA: context.commitSHA, treeSHA: context.treeSHA,
      objectiveHash: metadata.objectiveHash, startedAt: context.startedAt,
      completedAt: new Date().toISOString(),
      observations: ['Executed compiled executeGovernedRecovery with a DENY policy decision; confirmed denial occurred before adapter mutation'],
      artifacts: [
        'server/engine-core/dist/routes/recovery.js',
        'server/engine-core/dist/upm/policy-gate.js',
        'server/engine-core/dist/deise/engine/recovery/capability-registry.js',
      ],
    };
    receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
    return receipt;
  } finally {
    fs.rmSync(stateDir, { recursive: true, force: true });
  }
}

module.exports = { metadata, run };
