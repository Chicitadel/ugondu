'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A04';
const OBJECTIVE = 'Verify independence of cor-engine.js';

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
    const targetPath = path.join(context.root, 'scripts/cor-engine.js');
    if (!fs.existsSync(targetPath)) {
        throw new Error('COR_OBJECTIVE_TARGET_MISSING: scripts/cor-engine.js');
    }
    const probe = String.raw`
const Module = require('node:module');
let signerLoaded = false;
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (String(request).includes('cor-signer')) signerLoaded = true;
  return originalLoad.call(this, request, parent, isMain);
};
delete process.env.COR_SIGNING_KEY;
delete process.env.COR_PUBLIC_KEY;
const engine = require('./scripts/cor-engine.js');
if (signerLoaded) throw new Error('COR_ENGINE_IMPORTED_SIGNER');
for (const name of ['main', 'assertManifest', 'loadExecutor', 'verifyReceipt']) {
  if (typeof engine[name] !== 'function') throw new Error('COR_ENGINE_EXPORT_MISSING:' + name);
}
process.stdout.write('ENGINE_MODULE_LOADED_WITHOUT_SIGNER');
`;
    const env = { ...process.env, UGONDU_ROOT: context.root };
    delete env.COR_SIGNING_KEY;
    delete env.COR_PUBLIC_KEY;
    const result = spawnSync(process.execPath, ['-e', probe], {
        cwd: context.root,
        encoding: 'utf8',
        timeout: 10000,
        env
    });
    if (result.error || result.status !== 0 || !String(result.stdout).includes('ENGINE_MODULE_LOADED_WITHOUT_SIGNER')) {
        throw new Error('A04_ENGINE_SIGNER_INDEPENDENCE_FAILED: ' + String(result.stderr || result.stdout || result.error?.message));
    }
    artifacts.push('scripts/cor-engine.js');
    observations.push('Loaded the actual COR engine module in a child process without signing keys and confirmed no signer module was imported');
    return true;
}

module.exports = {
    metadata,
    run
};
