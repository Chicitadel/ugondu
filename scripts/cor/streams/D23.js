'use strict';

const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;
const fs = require('fs');
const path = require('path');

const STREAM_ID = 'D23';
const OBJECTIVE = 'Verify localized string injection in client actions';

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

    const goFilePath = path.join(context.root, 'client', 'engine', 'actions_extended.go');
    if (!fs.existsSync(goFilePath)) {
        throw new Error('D23_FILE_MISSING_ACTIONS_EXTENDED');
    }

    const content = fs.readFileSync(goFilePath, 'utf8');

    // 1. the localization package is imported
    if (!/import\s*\([\s\S]*?"[^"]*?(i18n|locales|localization)"[\s\S]*?\)/.test(content) && !/import\s+"[^"]*?(i18n|locales|localization)"/.test(content)) {
        throw new Error('D23_MISSING_LOCALIZATION_IMPORT');
    }

    const locApiMatches = [...content.matchAll(/(?:i18n|locales)\.[A-Za-z]+\(\s*"([A-Z0-9_]+)"/g)];
    if (locApiMatches.length === 0) {
        throw new Error('D23_NO_LOCALIZATION_API_CALLS_FOUND');
    }
    const locTokens = locApiMatches.map(m => m[1]);

    if (/errors\.New\(\s*"[A-Za-z][^"]+"\s*\)/.test(content)) {
        throw new Error('D23_HARDCODED_ENGLISH_STRING_ERRORS_NEW');
    }
    if (/fmt\.Errorf\(\s*"[A-Za-z][^"]+"\s*(,.*)?\)/.test(content)) {
        throw new Error('D23_HARDCODED_ENGLISH_STRING_FMT_ERRORF');
    }
    if (/fmt\.Print(f|ln)?\(\s*"[A-Za-z][^"]+"\s*(,.*)?\)/.test(content)) {
        throw new Error('D23_HARDCODED_ENGLISH_STRING_FMT_PRINT');
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
            'actions_extended.go imports localization package',
            'User-facing messages are not hardcoded (no raw errors.New/fmt.Print strings)',
            `Localization API matches found for tokens: ${locTokens.join(', ')}`
        ],
        artifacts: [
            'client/engine/actions_extended.go'
        ]
    };

    receipt.evidenceDigest = crypto
        .createHash('sha256')
        .update(canonicalize(receipt), 'utf8')
        .digest('hex');

    return receipt;
}

module.exports = { metadata, run };
