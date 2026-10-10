'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'C20';
const OBJECTIVE = 'Verify aws-sdk is not a production dependency in engine-core';

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

const fs = require('fs');
const path = require('path');

async function verifyObjective(context, observations, artifacts) {
    const fs = require('fs');
    const path = require('path');
    const pkgPath = path.join(context.root, 'server', 'engine-core', 'package.json');

    if (!fs.existsSync(pkgPath)) {
        throw new Error('C20_FILE_NOT_FOUND: server/engine-core/package.json');
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    if (
        pkg.dependencies &&
        Object.keys(pkg.dependencies).some(name => name.startsWith('@aws-sdk/'))
    ) {
        throw new Error('C20_AWS_PRODUCTION_DEPENDENCY');
    }

    const prodDeps = pkg.dependencies ? Object.keys(pkg.dependencies) : [];
    const devDeps = pkg.devDependencies ? Object.keys(pkg.devDependencies) : [];

    artifacts.push('server/engine-core/package.json');

    observations.push(`Production dependency list: ${prodDeps.join(', ') || 'none'}`);
    observations.push(`Dev dependency list: ${devDeps.join(', ') || 'none'}`);
    observations.push('Verified @aws-sdk is not a production dependency in engine-core');

    return true;
}

module.exports = {
    metadata,
    run
};

