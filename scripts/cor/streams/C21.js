'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STREAM_ID = 'C21';
const OBJECTIVE = 'Verify Fargate deployment container identity structure';

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '2.0.0',
    objectiveHash: crypto
        .createHash('sha256')
        .update(OBJECTIVE, 'utf8')
        .digest('hex'),
    evidenceSchemaVersion: '2.0.0'
};

function fail(message) {
    throw new Error(`C21_OBJECTIVE_FAILED: ${message}`);
}

async function run(context) {
    if (!context || context.streamId !== STREAM_ID) {
        throw new Error('STREAM_CONTEXT_MISMATCH');
    }

    const dockerfile = path.join(
        context.root,
        'Dockerfile'
    );

    if (!fs.existsSync(dockerfile)) {
        fail('Dockerfile missing');
    }

    const content =
        fs.readFileSync(dockerfile, 'utf8');

    if (!content.trim()) {
        fail('Dockerfile is empty');
    }

    if (/FROM\s+\S+:latest\b/i.test(content)) {
        fail('mutable :latest image tag found');
    }

    if (/\bVOLUME\s+\//i.test(content)) {
        fail('host-like mutable volume declaration found');
    }

    if (/--privileged/i.test(content)) {
        fail('privileged container configuration found');
    }

    if (/docker\.sock/i.test(content)) {
        fail('Docker socket dependency found');
    }

    if (!/\bUSER\s+\w+/i.test(content) || /\bUSER\s+root\b/i.test(content)) {
        fail('container runs as root or lacks explicit non-root USER instruction');
    }

    const hasEntrypoint =
        /\bENTRYPOINT\b/i.test(content) ||
        /\bCMD\b/i.test(content);

    if (!hasEntrypoint) {
        fail('container has no ENTRYPOINT or CMD');
    }

    const receipt = {
        status: 'PASS',
        streamId: STREAM_ID,
        executionId: context.executionId,
        commitSHA: context.commitSHA,
        treeSHA: context.treeSHA,
        objectiveHash: metadata.objectiveHash,
        startedAt: context.startedAt,
        completedAt: new Date().toISOString(),
        observations: [
            'Dockerfile inspected',
            'mutable latest tag absent',
            'privileged/docker-socket dependencies absent',
            'container startup instruction present',
            'non-root USER isolation verified'
        ],
        artifacts: [
            'Dockerfile'
        ]
    };

    receipt.evidenceDigest = crypto
        .createHash('sha256')
        .update(JSON.stringify(receipt), 'utf8')
        .digest('hex');

    return receipt;
}

module.exports = {
    metadata,
    run
};
