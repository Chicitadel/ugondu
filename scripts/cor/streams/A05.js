'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A05';
const OBJECTIVE = 'Verify independence of cor-finalize.js';

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
    const targetPath = path.join(context.root, 'scripts/cor-finalize.js');
    if (!fs.existsSync(targetPath)) {
        throw new Error('COR_OBJECTIVE_TARGET_MISSING: scripts/cor-finalize.js');
    }
    const source = fs.readFileSync(targetPath, 'utf8');
    assert.ok(source.includes('verifyReceipt('), 'COR_OBJECTIVE_NOT_PROVEN: cor-finalize.js must independently verify stream receipts');
    assert.ok(source.includes('READY_FOR_COR_SIGNATURE'), 'COR_OBJECTIVE_NOT_PROVEN: cor-finalize.js must emit READY_FOR_COR_SIGNATURE finalization state');
    assert.ok(!source.includes('COR_SIGNING_KEY'), 'COR_OBJECTIVE_NOT_PROVEN: cor-finalize.js must not access COR_SIGNING_KEY');

    artifacts.push('cor-finalize.js');
    observations.push('Verified A05 specific objective against scripts/cor-finalize.js');
    return true;
}

module.exports = {
    metadata,
    run
};
