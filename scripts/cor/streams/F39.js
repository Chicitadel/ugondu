'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const fs = require('fs');
const path = require('path');

const STREAM_ID = 'F39';
const OBJECTIVE = 'Verify execution atomically handles check drift';

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '2.0.0',
    objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
    evidenceSchemaVersion: '2.0.0',
    verificationMode: 'TEST'
};

async function verifyObjective(context, observations, artifacts) {
    const orchestratorPath = path.join(context.root, 'server', 'engine-core', 'dist', 'deise', 'engine', 'recovery', 'recovery-orchestrator.js');
    if (!fs.existsSync(orchestratorPath)) throw new Error('F39_ORCHESTRATOR_NOT_FOUND');

    const { RecoveryOrchestrator } = require(orchestratorPath);
    const orchestrator = new RecoveryOrchestrator();

    let driftDetected = false;
    let rollbackInvoked = false;
    let executionContinued = false;
    let actualError = null;

    const adapter = {
        checkDrift: async (scope, baselineFingerprint) => {
            driftDetected = true;
            return false;
        },
        executeAtomicRecovery: async (plan, scope) => {
            executionContinued = true;
            return { success: false, checkpointId: 'cp-123' };
        },
        rollback: async (checkpointId) => {
            rollbackInvoked = true;
        }
    };

    const scope = { baselineFingerprint: 'mock-fingerprint', resourceIdentifiers: [] };
    const plan = {};

    try {
        await orchestrator.executeAtomically(plan, adapter, scope);
    } catch (e) {
        actualError = e;
    }

    if (!driftDetected) throw new Error("F39_DRIFT_NOT_DETECTED: Execution failed to detect check drift");
    if (executionContinued) throw new Error("F39_UNAUTHORIZED_CONTINUATION: Execution continued after drift detection");

    let executionRefused = false;
    if (actualError && actualError.message === 'environment_drift_detected') {
        executionRefused = true;
    } else if (actualError) {
        throw new Error("F39_UNEXPECTED_ERROR: " + actualError.message);
    }

    const adapter2 = {
        checkDrift: async (scope, baselineFingerprint) => true,
        executeAtomicRecovery: async (plan, scope) => {
            return { success: false, checkpointId: 'cp-123', evidence: 'failed' };
        },
        rollback: async (checkpointId) => {
            rollbackInvoked = true;
        }
    };
    
    try {
        await orchestrator.executeAtomically(plan, adapter2, scope);
    } catch(e) {
        // Throws 'atomic_execution_failed_and_wa' or equivalent
    }

    if (!executionRefused) throw new Error("F39_EXECUTION_NOT_REFUSED: Did not refuse execution on drift");
    if (!rollbackInvoked) throw new Error("F39_ROLLBACK_NOT_INVOKED: Rollback/recovery path was not invoked");

    observations.push('Verified execution atomically handles check drift by refusing execution');
    observations.push('Verified execution atomically invokes rollback when atomic execution fails');
    artifacts.push('execution-recovery-evidence');

    return {
        driftDetected,
        executionContinued,
        rollbackInvoked
    };
}

async function run(context) {
    if (context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');

    const observations = [];
    const artifacts = [];

    const objResult = await verifyObjective(context, observations, artifacts);

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
        driftDetected: objResult.driftDetected,
        executionContinued: objResult.executionContinued,
        rollbackInvoked: objResult.rollbackInvoked
    };

    receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
    return receipt;
}

module.exports = {
    metadata,
    run
};
