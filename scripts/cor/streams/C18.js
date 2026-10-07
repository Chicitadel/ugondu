'use strict';

const crypto = require('crypto');
const { spawnSync } = require('child_process');

const STREAM_ID = 'C18';
const OBJECTIVE = 'Verify capabilities tests pass independently';

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '2.0.0',
    objectiveHash: crypto
        .createHash('sha256')
        .update(OBJECTIVE, 'utf8')
        .digest('hex'),
    evidenceSchemaVersion: '2.0.0',
    verificationMode: 'TEST'
};

function runTest(context) {
    const npmCommand =
        process.platform === 'win32'
            ? 'npm.cmd'
            : 'npm';

    return spawnSync(
        npmCommand,
        [
            'test',
            '--workspace',
            'server/capabilities',
            '--',
            '--runInBand'
        ],
        {
            cwd: context.root,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: false
        }
    );
}

async function run(context) {
    if (!context || context.streamId !== STREAM_ID) {
        throw new Error('STREAM_CONTEXT_MISMATCH');
    }

    const startedAt = new Date().toISOString();
    const result = runTest(context);

    if (result.error) {
        throw new Error(
            `C18_TEST_PROCESS_ERROR: ${result.error.message}`
        );
    }

    if (result.status !== 0) {
        throw new Error(
            `C18_TEST_FAILED: ${(result.stderr || '').slice(-8000)}`
        );
    }

    const receipt = {
        status: 'PASS',
        streamId: STREAM_ID,
        executionId: context.executionId,
        commitSHA: context.commitSHA,
        treeSHA: context.treeSHA,
        objectiveHash: metadata.objectiveHash,
        startedAt,
        completedAt: new Date().toISOString(),
        observations: [
            'server/capabilities test command completed with exit code 0'
        ],
        artifacts: [
            'server/capabilities/package.json',
            'capabilities-test-output'
        ],
        testExitCode: result.status,
        stdoutTail: (result.stdout || '').slice(-4000),
        stderrTail: (result.stderr || '').slice(-4000)
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
