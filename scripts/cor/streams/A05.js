'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
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
    verificationMode: 'TEST'
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
    const positiveProbe = String.raw`
const Module = require('node:module');
let signerLoaded = false;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (String(request).includes('cor-signer')) signerLoaded = true;
  return originalLoad.call(this, request, parent, isMain);
};
delete process.env.COR_SIGNING_KEY;
delete process.env.COR_PUBLIC_KEY;
const finalizer = require('./scripts/cor-finalize.js');
if (signerLoaded) throw new Error('COR_FINALIZER_IMPORTED_SIGNER');
if (typeof finalizer.finalize !== 'function' || typeof finalizer.verifyReceipt !== 'function') {
  throw new Error('COR_FINALIZER_API_MISSING');
}
const receipt = {
  status: 'PASS', streamId: 'A01', commitSHA: 'a'.repeat(40), treeSHA: 'b'.repeat(40),
  observations: ['runtime receipt'], artifacts: ['runtime-artifact']
};
receipt.evidenceDigest = finalizer.digest(receipt);
finalizer.verifyReceipt(receipt, receipt.commitSHA, receipt.treeSHA);
process.stdout.write('FINALIZER_VERIFIED_RECEIPT_WITHOUT_SIGNER');
`;
    const negativeProbe = String.raw`
const finalizer = require('./scripts/cor-finalize.js');
const receipt = { status: 'FAIL', streamId: 'A01', commitSHA: 'a'.repeat(40), treeSHA: 'b'.repeat(40), evidenceDigest: 'invalid' };
finalizer.verifyReceipt(receipt, receipt.commitSHA, receipt.treeSHA);
process.exitCode = 0;
`;
    const env = { ...process.env, UGONDU_ROOT: context.root };
    delete env.COR_SIGNING_KEY;
    delete env.COR_PUBLIC_KEY;
    const positive = spawnSync(process.execPath, ['-e', positiveProbe], {
        cwd: context.root, encoding: 'utf8', timeout: 10000, env
    });
    if (positive.error || positive.status !== 0 || !String(positive.stdout).includes('FINALIZER_VERIFIED_RECEIPT_WITHOUT_SIGNER')) {
        throw new Error('A05_FINALIZER_RUNTIME_INDEPENDENCE_FAILED: ' + String(positive.stderr || positive.stdout || positive.error?.message));
    }
    const negative = spawnSync(process.execPath, ['-e', negativeProbe], {
        cwd: context.root, encoding: 'utf8', timeout: 10000, env
    });
    if (negative.status === 0) {
        throw new Error('A05_FINALIZER_ACCEPTED_INVALID_RECEIPT');
    }
    artifacts.push('scripts/cor-finalize.js');
    observations.push('Loaded finalizer without signing keys or signer dependency; actual receipt verifier accepted a valid digest and rejected a FAIL receipt');
    return true;
}

module.exports = {
    metadata,
    run
};
