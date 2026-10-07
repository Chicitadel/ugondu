'use strict';

const crypto = require('crypto');

const STREAM_ID = 'B09';
const OBJECTIVE = 'Verify removal of global upm bypass from jest.setup.ts';

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
const path = require('path');

async function verifyObjective(context, observations, artifacts) {
    const p1 = path.join(process.env.UGONDU_ROOT || '.', 'server/engine-core/jest.setup.ts');
    const p2 = path.join(process.env.UGONDU_ROOT || '.', 'server/capabilities/jest.setup.ts');
    if (fs.existsSync(p1) && fs.readFileSync(p1, 'utf8').includes('verifyAuthorization')) return false;
    if (fs.existsSync(p2) && fs.readFileSync(p2, 'utf8').includes('verifyAuthorization')) return false;
    observations.push('no global bypass');
    return true;
}

module.exports = {
    metadata,
    run
};

