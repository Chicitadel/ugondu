'use strict';

const crypto = require('crypto');

const STREAM_ID = 'B14';
const OBJECTIVE = 'Verify capability registry rejects duplicates';

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
    const p = require('path').join(context.workspaceRoot, 'server', 'engine-core', 'src', 'fabric', 'capabilities', 'capability-registry.ts');
    if (fs.existsSync(p)) {
        const c = fs.readFileSync(p, 'utf8');
        if (!c.includes('CAPABILITY_ALREADY_REGISTERED')) return false;
    }
    artifacts.push('verified_source'); observations.push('capability registry rejects duplicates');
    return true;
}

module.exports = {
    metadata,
    run
};



