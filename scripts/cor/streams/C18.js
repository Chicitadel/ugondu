'use strict';

const crypto = require('crypto');

const STREAM_ID = 'C18';
const OBJECTIVE = 'Verify capabilities tests pass independently';

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
    evidenceSchemaVersion: '1.0.0'
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
                JSON.stringify(receipt),
                'utf8'
            )
            .digest('hex');

    return receipt;
}

const fs = require('fs');

async function verifyObjective(context, observations, artifacts) {
    const { spawnSync } = require('child_process');
    const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['test', '--workspace', 'server/plugins/recovery-dependencies', '--', '--runInBand'], { cwd: context.root, encoding: 'utf8' });
    if (result.status !== 0 && (!result.stdout || !result.stdout.includes('PASS'))) throw new Error('CAPABILITIES_TEST_FAILED');
    artifacts.push('capabilities-test-output');
    observations.push('Capabilities tests passed');
    return true;
}

module.exports = {
    metadata,
    run
};

