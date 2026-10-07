'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const STREAM_ID = 'C17';
const OBJECTIVE = 'Verify core engine tests pass independently';

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
    throw new Error(`C17_OBJECTIVE_FAILED: ${message}`);
}

async function run(context) {
    if (!context || context.streamId !== STREAM_ID) {
        throw new Error('STREAM_CONTEXT_MISMATCH');
    }

    const packageFile = path.join(
        context.root,
        'server',
        'engine-core',
        'package.json'
    );

    if (!fs.existsSync(packageFile)) {
        fail('server/engine-core/package.json missing');
    }

    const pkg = JSON.parse(
        fs.readFileSync(packageFile, 'utf8')
    );

    if (!pkg.scripts || typeof pkg.scripts.test !== 'string') {
        fail('engine-core test script missing');
    }

    const result = spawnSync(
        process.platform === 'win32' ? 'npm.cmd' : 'npm',
        ['test', '--workspace', 'server/engine-core', '--', '--runInBand'],
        {
            cwd: context.root,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true
        }
    );

    const stdout = result.stdout || '';
    const stderr = result.stderr || '';

    if (result.error) {
        fail(result.error.message);
    }

    if (result.status !== 0) {
        fail(
            `engine-core tests failed with exit code ${result.status}\n` +
            stderr.slice(-8000)
        );
    }

    if (!/PASS|Tests:\s+\d+ passed/i.test(stdout)) {
        fail('test command did not produce a verifiable passing result');
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
            'engine-core test command executed successfully'
        ],
        artifacts: [
            'server/engine-core/package.json',
            'engine-core-test-output'
        ],
        testExitCode: result.status
    };

    receipt.evidenceDigest = crypto
        .createHash('sha256')
        .update(
            JSON.stringify(receipt),
            'utf8'
        )
        .digest('hex');

    return receipt;
}

module.exports = {
    metadata,
    run
};
