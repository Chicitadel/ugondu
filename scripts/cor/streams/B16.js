'use strict';

const crypto = require('crypto');

const STREAM_ID = 'B16';
const OBJECTIVE = 'Verify absence of out-of-bounds bash execution in core engine';

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
    const p = require('path').join(context.workspaceRoot, 'server', 'engine-core', 'src');
    function search(dir) {
        if (!fs.existsSync(dir)) return true;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const f = require('path').join(dir, file);
            if (fs.statSync(f).isDirectory()) {
                if (!search(f)) return false;
            } else if (f.endsWith('.ts')) {
                const c = fs.readFileSync(f, 'utf8');
                if (c.includes('spawn("bash"') || c.includes('exec("bash"')) return false;
            }
        }
        return true;
    }
    if (!search(p)) return false;
    artifacts.push('verified_source'); observations.push('no bash execution found in src');
    return true;
}

module.exports = {
    metadata,
    run
};

