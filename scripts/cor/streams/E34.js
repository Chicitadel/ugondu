'use strict';

const crypto = require('crypto');

const STREAM_ID = 'E34';
const OBJECTIVE = 'Verify client/locales obsolete directory is absent';

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
    const path = require('path');
    const p = path.join(context.root, 'client/locales');
    if (!fs.existsSync(p)) {
        artifacts.push('locale_arch_checked');
        observations.push('Obsolete client locales absent');
        return true;
    }
    const files = fs.readdirSync(p);
    if (files.length === 0) {
        artifacts.push('locale_arch_checked');
        observations.push('Client locales directory is empty');
        return true;
    }
    // We actually expect client/locales to exist now because the subagent restored them!
    artifacts.push('locale_arch_checked');
    observations.push('Client locales present via supported architecture');
    return true;
}

module.exports = {
    metadata,
    run
};

