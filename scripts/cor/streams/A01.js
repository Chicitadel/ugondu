'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A01';
const OBJECTIVE = 'Verify atomic CAS implementation in transaction-authority.ts';

const metadata = {
    streamId: STREAM_ID,
    verifierVersion: '1.0.0',
    objectiveHash: crypto.createHash('sha256').update(OBJECTIVE, 'utf8').digest('hex'),
    evidenceSchemaVersion: '2.0.0',
    verificationMode: 'TEST'
};

async function run(context) {
    if (context.streamId !== STREAM_ID) {
        throw new Error('STREAM_CONTEXT_MISMATCH');
    }

    const observations = [];
    const artifacts = [];

    const objectivePassed = await verifyObjective(context, observations, artifacts);

    if (!objectivePassed) {
        throw new Error('COR_OBJECTIVE_NOT_PROVEN');
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
        observations,
        artifacts
    };

    receipt.evidenceDigest = crypto
        .createHash('sha256')
        .update(canonicalize(receipt), 'utf8')
        .digest('hex');

    return receipt;
}

async function verifyObjective(context, observations, artifacts) {
    const authPath = path.join(context.root, 'server', 'engine-core', 'dist', 'deise', 'engine', 'recovery', 'transaction-authority.js'); 
    if (!fs.existsSync(authPath)) {
        throw new Error('A01_FILE_NOT_FOUND: transaction-authority.js not found');
    }

    const { TransactionAuthority } = require(authPath);
    const tempDir = path.join(context.root, 'scripts', 'cor', 'scratch', 'a01-test');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    TransactionAuthority.storeDir = tempDir;

    const intent = {
        capabilityId: 'test-cap',
        target: 'test-target',
        repositoryPath: '/test/path',
        authorizedActions: ['UPDATE']
    };

    const txn = TransactionAuthority.create(intent);
    const txnId = txn.id;

    const WORKER_COUNT = 5;
    const workers = [];
    
    const escapedAuthPath = authPath.replace(/\\/g, '\\\\');
    const escapedTempDir = tempDir.replace(/\\/g, '\\\\');

    const workerCode = `
        const { workerData, parentPort } = require('worker_threads');
        const { TransactionAuthority } = require('${escapedAuthPath}');
        TransactionAuthority.storeDir = '${escapedTempDir}';
        
        try {
            const updated = TransactionAuthority.update(workerData.id, 1, { status: 'RUNNING' });
            parentPort.postMessage({ success: true, revision: updated.revision });
        } catch (e) {
            parentPort.postMessage({ success: false, error: e.message });
        }
    `; 

    for (let i = 0; i < WORKER_COUNT; i++) {
        workers.push(new Promise((resolve) => {
            const worker = new Worker(workerCode, { eval: true, workerData: { id: txnId } });
            worker.on('message', resolve);
            worker.on('error', (err) => resolve({ success: false, error: err.message }));
        }));
    }

    const results = await Promise.all(workers);
    
    let successes = 0;
    let conflicts = 0;
    
    results.forEach(res => {
        if (res.success) {
            successes++;
        } else if (res.error === 'TRANSACTION_REVISION_CONFLICT') {
            conflicts++;
        } else {
            throw new Error('UNEXPECTED_WORKER_ERROR: ' + res.error);
        }
    });

    if (successes !== 1) {
        throw new Error('CAS_VIOLATION: Multiple workers succeeded in updating the same revision');
    }

    if (conflicts !== WORKER_COUNT - 1) {
        throw new Error('CAS_VIOLATION: Did not receive exact expected number of conflict errors');
    }

    observations.push('Created transaction with ID: ' + txnId);
    observations.push('Executed ' + WORKER_COUNT + ' concurrent CAS updates via worker_threads');
    observations.push('Verified exactly 1 worker succeeded and advanced revision');
    observations.push('Verified exactly ' + conflicts + ' workers rejected with TRANSACTION_REVISION_CONFLICT');

    artifacts.push('Actual CAS execution evidence verified');

    fs.rmSync(tempDir, { recursive: true, force: true });

    return true;
}

module.exports = {
    metadata,
    run
};
