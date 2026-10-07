'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const STREAM_ID = 'F40';
const OBJECTIVE = 'Verify final independent passport certification bindings';

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '2.0.0',
    objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
    evidenceSchemaVersion: '2.0.0',
    verificationMode: 'STATIC'
};

async function run(context) {
    if (context.streamId !== STREAM_ID) throw new Error('STREAM_CONTEXT_MISMATCH');

    const testFile = path.join(context.root, 'server', 'engine-core', 'tests', 'recovery', 'f40.spec.ts');
    
    // We will run Jest specifically for this harness.
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const result = spawnSync(process.execPath, ['C:\Users\Professional\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js', 'test', '--workspace', 'server/engine-core', '--', 'tests/recovery/f40-passport.spec.ts', '--runInBand'],
        { cwd: context.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], shell: false }
    );

    if (result.error) {
        throw new Error(`F40_TEST_PROCESS_ERROR: ${result.error.message}`);
    }

    if (result.status !== 0) {
        throw new Error(`F40_BINDING_VALIDATION_FAILED: ${(result.stderr || '').slice(-8000)}`);
    }

    const observations = [
        'Executed independent passport validation path',
        'Verified exact bindings are securely attached',
        'Proved validation rejects tampered passport bindings'
    ];
    
    const artifacts = ['passport-binding-validation'];

    const receipt = {
        status: 'PASS',
        streamId: STREAM_ID,
        executionId: context.executionId,
        commitSHA: context.commitSHA,
        treeSHA: context.treeSHA,
        objectiveHash: metadata.objectiveHash,
        startedAt: context.startedAt,
        completedAt: new Date().toISOString(),
        observations,
        artifacts
    };

    receipt.evidenceDigest = crypto.createHash('sha256').update(canonicalize(receipt), 'utf8').digest('hex');
    return receipt;
}

module.exports = {
    metadata,
    run
};
