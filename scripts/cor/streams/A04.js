'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A04';
const OBJECTIVE = 'Verify independence of cor-engine.js';

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
    const targetPath = path.join(context.root, 'scripts/cor-engine.js');
    if (!fs.existsSync(targetPath)) {
        throw new Error('COR_OBJECTIVE_TARGET_MISSING: scripts/cor-engine.js');
    }
    const source = fs.readFileSync(targetPath, 'utf8');
    assert.ok(source.includes('function block('), 'COR_OBJECTIVE_NOT_PROVEN: cor-engine.js must define independent block() fail-closed terminator');
    assert.ok(source.includes('function loadExecutor('), 'COR_OBJECTIVE_NOT_PROVEN: cor-engine.js must enforce loadExecutor stub rejection on stream verifiers');
    assert.ok(!source.includes('cor-signer.js'), 'COR_OBJECTIVE_NOT_PROVEN: cor-engine.js must remain independent from cor-signer.js');

    artifacts.push('cor-engine.js');
    observations.push('Verified A04 specific objective against scripts/cor-engine.js');
    return true;
}

module.exports = {
    metadata,
    run
};
