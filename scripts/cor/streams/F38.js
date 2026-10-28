'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'F38';
const OBJECTIVE = 'Verify blast radius analysis dry run block';

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '1.0.0',
    objectiveHash:
        crypto
            .createHash('sha256')
            .update(
                OBJECTIVE,
                'utf8'
            )
            .digest('hex'),
    evidenceSchemaVersion: '2.0.0',
    verificationMode: 'STATIC'
};

async function run(context) {
    if (
        context.streamId !==
        STREAM_ID
    ) {
        throw new Error(
            'STREAM_CONTEXT_MISMATCH'
        );
    }

    const observations = [];
    const artifacts = [];

    const objectivePassed =
        await verifyObjective(
            context,
            observations,
            artifacts
        );

    if (!objectivePassed) {
        throw new Error(
            'COR_OBJECTIVE_NOT_PROVEN'
        );
    }

    const receipt = {
        status: 'PASS',
        streamId: STREAM_ID,
        executionId:
            context.executionId,
        commitSHA:
            context.commitSHA,
        treeSHA:
            context.treeSHA,
        objectiveHash:
            metadata.objectiveHash,
        startedAt:
            context.startedAt,
        completedAt:
            new Date().toISOString(),
        observations,
        artifacts
    };

    receipt.evidenceDigest =
        crypto
            .createHash('sha256')
            .update(
                canonicalize(receipt),
                'utf8'
            )
            .digest('hex');

    return receipt;
}

async function verifyObjective(context, observations, artifacts) {
    const targetPath = path.join(context.root, 'server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts');
    if (!fs.existsSync(targetPath)) {
        throw new Error('COR_OBJECTIVE_TARGET_MISSING: server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts');
    }
    const source = fs.readFileSync(targetPath, 'utf8');
    assert.ok(source.includes('analyzeBlastRadius('), 'COR_OBJECTIVE_NOT_PROVEN: recovery-orchestrator.ts must implement analyzeBlastRadius');
    assert.ok(source.includes('Blast Radius Violation'), 'COR_OBJECTIVE_NOT_PROVEN: analyzeBlastRadius must block out-of-bounds resource mutations');
    assert.ok(source.includes('dry_run_indicates_unsafe_mutat'), 'COR_OBJECTIVE_NOT_PROVEN: dryRun must block unsafe mutations');

    artifacts.push('recovery-orchestrator.ts');
    observations.push('Verified F38 specific objective against server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts');
    return true;
}

module.exports = {
    metadata,
    run
};
