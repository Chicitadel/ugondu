'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const fs = require('fs');
const path = require('path');

const STREAM_ID = 'E33';
const OBJECTIVE = 'Verify zh.json exists in server shared locales';

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

    const file = path.join(context.root, 'server', 'shared', 'locales', 'zh.json');

    if (!fs.existsSync(file)) {
        throw new Error('E33_ZH_LOCALE_MISSING');
    }

    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        throw new Error(`E33_ZH_LOCALE_INVALID_JSON: ${error.message}`);
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length === 0) {
        throw new Error('E33_ZH_LOCALE_INVALID_OBJECT');
    }

    const enFile = path.join(context.root, 'server', 'shared', 'locales', 'en.json');
    if (!fs.existsSync(enFile)) {
        throw new Error('E33_EN_LOCALE_BASELINE_MISSING');
    }
    {
        const enParsed = JSON.parse(fs.readFileSync(enFile, 'utf8'));
        const enKeys = Object.keys(enParsed).sort();
        const localeKeys = Object.keys(parsed).sort();
        if (JSON.stringify(enKeys) !== JSON.stringify(localeKeys)) {
            throw new Error('E33_ZH_LOCALE_KEY_PARITY_MISMATCH');
        }
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
            'server/shared/locales/zh.json exists',
            'zh.json parses as a non-empty JSON object with top-level key parity'
        ],
        artifacts: [
            'server/shared/locales/zh.json'
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
