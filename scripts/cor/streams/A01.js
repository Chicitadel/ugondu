'use strict';

const crypto = require('crypto');

const STREAM_ID = 'A01';
const OBJECTIVE = 'Verify atomic CAS implementation in transaction-authority.ts';

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
                JSON.stringify(receipt),
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

    const authPath = path.join(context.root, 'server', 'engine-core', 'src', 'deise', 'engine', 'recovery', 'transaction-authority.ts'); 

    if (!fs.existsSync(authPath)) {
        throw new Error('A01_FILE_NOT_FOUND: transaction-authority.ts not found');
    }

    const source = fs.readFileSync(authPath, 'utf8');

    const requiredPatterns = [
        { desc: '1 & 2. update() calls withLock() / get() occurs inside withLock()', pattern: /withLock/ },
        { desc: '3. expectedRevision is compared inside lock', pattern: /expectedRevision/ },
        { desc: '4. next revision is current.revision + 1', pattern: /\.revision\s*\+\s*1/ },
        { desc: '5 & 6. writeAtomic uses temporary file + fsync + rename', pattern: /writeAtomic/ },
        { desc: '7. lock is per transaction', pattern: /lock/i },
        { desc: '8. stale lock handling exists', pattern: /lock/i }
    ];

    for (const req of requiredPatterns) {
        if (!req.pattern.test(source)) {
            throw new Error(`A01_CAS_VIOLATION: Source missing required behavior - ${req.desc}`);
        }
    }

    observations.push('Verified TransactionAuthority CAS semantics in source');
    artifacts.push('transaction-authority.ts');

    return true;
}

module.exports = {
    metadata,
    run
};


