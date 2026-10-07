'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const STREAM_ID = 'C21';
const OBJECTIVE = 'Verify Dockerfile immutability and security constraints'; // Update to match your actual objective if different

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '2.0.0',
    objectiveHash: crypto
        .createHash('sha256')
        .update(OBJECTIVE, 'utf8')
        .digest('hex'),
    evidenceSchemaVersion: '2.0.0',
    verificationMode: 'STATIC'
};

async function run(context) {
    if (!context || context.streamId !== STREAM_ID) {
        throw new Error('STREAM_CONTEXT_MISMATCH');
    }

    const dockerfilePath = path.join(context.root, 'server', 'engine-core', 'Dockerfile');
    if (!fs.existsSync(dockerfilePath)) {
        throw new Error('C21_DOCKERFILE_MISSING');
    }

    const content = fs.readFileSync(dockerfilePath, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));

    let hasNonRootUser = false;
    let hasEntrypointOrCmd = false;
    const digests = [];

    for (const line of lines) {
        if (line.startsWith('FROM ')) {
            if (!line.includes('@sha256:')) {
                throw new Error(`C21_MUTABLE_BASE_IMAGE: ${line}`);
            }
            if (line.includes(':latest')) {
                throw new Error(`C21_LATEST_TAG_PROHIBITED: ${line}`);
            }
            const match = line.match(/@sha256:([a-f0-9]{64})/i);
            if (match) {
                digests.push(match[1]);
            } else {
                throw new Error(`C21_MISSING_DIGEST: ${line}`);
            }
        }
        
        if (line.startsWith('USER ')) {
            const user = line.substring(5).trim();
            if (user !== 'root' && user !== '0') {
                hasNonRootUser = true;
            }
        }
        
        if (line.includes('/var/run/docker.sock') || line.includes('--privileged')) {
            throw new Error('C21_SECURITY_VIOLATION_DOCKER_SOCKET_OR_PRIVILEGED');
        }
        
        if (line.startsWith('ENTRYPOINT ') || line.startsWith('CMD ')) {
            hasEntrypointOrCmd = true;
        }
    }

    if (!hasNonRootUser) throw new Error('C21_NON_ROOT_USER_REQUIRED');
    if (!hasEntrypointOrCmd) throw new Error('C21_ENTRYPOINT_CMD_REQUIRED');

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
            `Every FROM uses @sha256. Digests: ${digests.join(', ')}`,
            'No :latest or mutable certification tags found',
            'USER is non-root',
            'No privileged mode or Docker socket found',
            'ENTRYPOINT/CMD exists'
        ],
        artifacts: [
            'server/engine-core/Dockerfile'
        ]
    };

    receipt.evidenceDigest = crypto
        .createHash('sha256')
        .update(JSON.stringify(receipt), 'utf8')
        .digest('hex');

    return receipt;
}

module.exports = { metadata, run };
