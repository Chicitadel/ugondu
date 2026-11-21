'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A08';
const OBJECTIVE = 'Verify COR certification workflow exists';

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
    const targetPath = path.join(context.root, '.github/workflows/cor.yml');
    if (!fs.existsSync(targetPath)) {
        throw new Error('COR_OBJECTIVE_TARGET_MISSING: .github/workflows/cor.yml');
    }
    const source = fs.readFileSync(targetPath, 'utf8');
    assert.ok(source.includes('GITHUB_SHA'), 'COR_OBJECTIVE_NOT_PROVEN: cor.yml must assert exact GITHUB_SHA checkout');
    assert.ok(source.includes('scripts/cor-engine.js'), 'COR_OBJECTIVE_NOT_PROVEN: cor.yml must execute scripts/cor-engine.js');
    assert.ok(source.includes('scripts/cor-finalize.js'), 'COR_OBJECTIVE_NOT_PROVEN: cor.yml must execute scripts/cor-finalize.js');

    artifacts.push('cor.yml');
    observations.push('Verified A08 specific objective against .github/workflows/cor.yml');
    return true;
}

module.exports = {
    metadata,
    run
};
