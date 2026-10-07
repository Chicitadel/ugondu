'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const fs = require('fs');
const path = require('path');

const STREAM_ID = 'D24';
const OBJECTIVE = 'Verify en.json exists in server shared locales';

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

    const file =
        path.join(
            context.root,
            'server',
            'shared',
            'locales',
            'en.json'
        );

    if (!fs.existsSync(file)) {
        throw new Error('D24_EN_LOCALE_MISSING');
    }

    let parsed;

    try {
        parsed =
            JSON.parse(
                fs.readFileSync(file, 'utf8')
            );
    } catch (error) {
        throw new Error(
            `D24_EN_LOCALE_INVALID_JSON: ${error.message}`
        );
    }

    if (
        !parsed ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
    ) {
        throw new Error(
            'D24_EN_LOCALE_INVALID_OBJECT'
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
            'server/shared/locales/en.json exists',
            'en.json parses as a JSON object'
        ],
        artifacts: [
            'server/shared/locales/en.json'
        ]
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
