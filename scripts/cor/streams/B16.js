'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'B16';
const OBJECTIVE = 'Verify absence of out-of-bounds bash execution in core engine';

const metadata = {
  streamId: STREAM_ID,
  verifierVersion: '3.0.0',
  objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
  evidenceSchemaVersion: '3.0.0',
  verificationMode: 'TEST',
};

async function verifyObjective(context, observations, artifacts) {
  const pkgRel = 'server/engine-core/package.json';
  const orchestratorRel = 'server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts';
  const pkgPath = path.join(context.root, pkgRel);
  const orchestratorPath = path.join(context.root, orchestratorRel);

  if (!fs.existsSync(pkgPath)) {
    throw new Error('B16_ENGINE_CORE_PACKAGE_JSON_MISSING');
  }
  if (!fs.existsSync(orchestratorPath)) {
    throw new Error('B16_RECOVERY_ORCHESTRATOR_MISSING');
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const scripts = Object.values(pkg.scripts || {});
  if (scripts.some((script) => /\b(bash|sh\s+-c)\b/.test(String(script)))) {
    throw new Error('B16_PACKAGE_SCRIPT_SHELL_EXECUTION_DETECTED');
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  for (const forbiddenDep of ['shelljs', 'execa']) {
    if (forbiddenDep in deps) {
      throw new Error(`B16_FORBIDDEN_SHELL_DEPENDENCY:${forbiddenDep}`);
    }
  }

  const orchestratorSource = fs.readFileSync(orchestratorPath, 'utf8');
  if (/child_process|\b(exec|execSync|spawn|spawnSync)\s*\(/.test(orchestratorSource)) {
    throw new Error('B16_UNBOUNDED_PROCESS_EXECUTION_DETECTED');
  }
  if (!orchestratorSource.includes('analyzeBlastRadius') || !orchestratorSource.includes('outOfBoundsDetected')) {
    throw new Error('B16_BLAST_RADIUS_BOUNDARY_CHECK_MISSING');
  }
  if (!orchestratorSource.includes('adapter.executeAtomicRecovery(plan, scope)')) {
    throw new Error('B16_ADAPTER_EXECUTION_DELEGATION_MISSING');
  }

  // TEST mode must execute the compiled production class; source-only inspection is insufficient.
  const compiledOrchestratorRel = 'server/engine-core/dist/deise/engine/recovery/recovery-orchestrator.js';
  const compiledOrchestratorPath = path.join(context.root, compiledOrchestratorRel);
  if (!fs.existsSync(compiledOrchestratorPath)) {
    throw new Error('B16_COMPILED_RECOVERY_ORCHESTRATOR_MISSING');
  }
  {
    // eslint-disable-next-line global-require, import/no-dynamic-require
    const { RecoveryOrchestrator } = require(compiledOrchestratorPath);
    const orchestrator = new RecoveryOrchestrator();

    const scope = {
      targetUri: 'directadmin://staging.airroofers.eu',
      tenantId: 'api.airroofers.eu',
      resourceIdentifiers: ['res-allowed-1'],
      baselineFingerprint: 'fp-baseline-001',
    };

    // 1. Positive in-bounds blast-radius check
    const inBoundsPlan = {
      id: 'plan-in-bounds',
      infrastructureRepairs: [{ id: 'res-allowed-1', action: 'REPAIR' }],
    };
    const analysis = await orchestrator.analyzeBlastRadius(inBoundsPlan, scope);
    if (!analysis || analysis.isSafe !== true || (analysis.outOfBoundsDetected && analysis.outOfBoundsDetected.length > 0)) {
      throw new Error('B16_RUNTIME_IN_BOUNDS_BLAST_RADIUS_FAILED');
    }

    // 2. Adversarial out-of-bounds blast-radius rejection
    const outOfBoundsPlan = {
      id: 'plan-out-of-bounds',
      infrastructureRepairs: [
        { id: 'res-allowed-1', action: 'REPAIR' },
        { id: 'res-unauthorized-999', action: 'EXEC_BASH' },
      ],
    };
    let rejectedOutOfBounds = false;
    try {
      await orchestrator.analyzeBlastRadius(outOfBoundsPlan, scope);
    } catch (err) {
      if (err && String(err.message).includes('Blast Radius Violation') && String(err.message).includes('res-unauthorized-999')) {
        rejectedOutOfBounds = true;
      }
    }
    if (!rejectedOutOfBounds) {
      throw new Error('B16_RUNTIME_OUT_OF_BOUNDS_REPAIR_NOT_REJECTED');
    }

    observations.push('Executed compiled RecoveryOrchestrator.analyzeBlastRadius at runtime: confirmed in-bounds repair passes and adversarial out-of-bounds resource mutation throws Blast Radius Violation');
    artifacts.push(compiledOrchestratorRel);
  }

  observations.push('Confirmed engine-core package.json and recovery-orchestrator.ts prohibit raw shell/child_process execution and enforce blast-radius bounds via adapter.executeAtomicRecovery');
  artifacts.push(pkgRel, orchestratorRel);
  return true;
}

async function run(context) {
  if (!context || context.streamId !== STREAM_ID) {
    throw new Error('STREAM_CONTEXT_MISMATCH');
  }

  const observations = [];
  const artifacts = [];

  if (!await verifyObjective(context, observations, artifacts)) {
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
