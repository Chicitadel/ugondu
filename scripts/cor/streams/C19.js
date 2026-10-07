'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const { spawnSync } = require('child_process');

const STREAM_ID = 'C19';
const OBJECTIVE = 'Verify uppie tests pass independently';

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

    const npmCommand =
        process.platform === 'win32'
            ? 'npm.cmd'
            : 'npm';

    const result = spawnSync(process.execPath, ['C:\Users\Professional\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js', 
            'test',
            '--workspace',
            'server/uppie',
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

    if (result.error) {
        throw new Error(
            `C19_TEST_PROCESS_ERROR: ${result.error.message}`
        );
    }

    if (result.status !== 0) {
        throw new Error(
            `C19_TEST_FAILED: ${(result.stderr || '').slice(-8000)}`
        );
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
            'server/uppie test command completed with exit code 0'
        ],
        artifacts: [
            'server/uppie/package.json',
            'uppie-test-output'
        ],
        testExitCode: result.status,
        stdoutTail: (result.stdout || '').slice(-4000),
        stderrTail: (result.stderr || '').slice(-4000)
    };

    receipt.evidenceDigest = crypto
        .createHash('sha256')
        .update(canonicalize(receipt), 'utf8')
        .digest('hex');

    return receipt;
}

module.exports = {
    metadata,
    run
};
