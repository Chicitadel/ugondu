'use strict';

const crypto = require('crypto');

const STREAM_ID = 'E29';
const OBJECTIVE = 'Verify it.json exists in server shared locales';

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
    const fs = require('fs');
    const p = require('path').join(context.workspaceRoot, 'server', 'shared', 'locales', 'it.json');
    if (!fs.existsSync(p)) return false;
    try {
        const j = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (!j || typeof j !== 'object') return false;
    } catch(e) { return false; }
    artifacts.push('verified_source'); observations.push('it.json exists and parses');
    return true;
}

module.exports = {
    metadata,
    run
};

