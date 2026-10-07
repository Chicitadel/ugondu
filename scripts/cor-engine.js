'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT =
    process.env.UGONDU_ROOT ||
    path.resolve(__dirname, '..');

const MANIFEST_PATH = path.join(
    ROOT,
    '.governance',
    'cor',
    'ugondu-cor-qualification-manifest.json'
);

const EVIDENCE_DIR =
    process.env.COR_EVIDENCE_DIR ||
    path.join(ROOT, '.cor_evidence');

const EXECUTOR_DIR =
    path.join(ROOT, 'scripts', 'cor', 'streams');

const EXPECTED_IDS = [
    'A01','A02','A03','A04','A05','A06','A07','A08',
    'B09','B10','B11','B12','B13','B14','B15','B16',
    'C17','C18','C19','C20','C21','C22',
    'D23','D24','D25','D26','D27','D28',
    'E29','E30','E31','E32','E33','E34',
    'F35','F36','F37','F38','F39','F40'
];

const canonicalize = require('canonicalize');

function canonical(value) {
    const result = canonicalize(value);
    if (result === undefined) throw new Error('CANONICALIZE_FAILED');
    return result;
}

function sha256Text(value) {
    return crypto
        .createHash('sha256')
        .update(value, 'utf8')
        .digest('hex');
}

function sha256Json(value) {
    return sha256Text(canonical(value));
}

function git(args) {
    return execFileSync(
        'git',
        args,
        {
            cwd: ROOT,
            encoding: 'utf8'
        }
    ).trim();
}

function block(reason) {
    process.stderr.write(`COR BLOCKED: ${reason}\n`);
    process.exit(1);
}

function readJson(file) {
    try {
        return JSON.parse(
            fs.readFileSync(file, 'utf8')
        );
    } catch (error) {
        block(
            `invalid JSON: ${path.relative(ROOT, file)}`
        );
    }
}

function assertClean() {
    if (git(['status', '--porcelain']) !== '') {
        block('candidate checkout is not clean');
    }
}

function assertManifest(manifest, commitSHA, treeSHA) {
    if (manifest.repository !== 'Chicitadel/ugondu') {
        block('manifest repository identity mismatch');
    }

    if (!Array.isArray(manifest.streams)) {
        block('manifest streams must be an array');
    }

    if (manifest.streams.length !== EXPECTED_IDS.length) {
        block('manifest must contain exactly 40 streams');
    }

    const ids = manifest.streams.map(
        stream => stream && stream.id
    );

    const expected = EXPECTED_IDS.join('|');
    const actual = ids.join('|');

    if (actual !== expected) {
        block(
            `stream registry mismatch: expected ${expected}, got ${actual}`
        );
    }

    for (const stream of manifest.streams) {
        if (!stream || stream.status !== 'PLANNED') {
            block(
                `${stream?.id || 'UNKNOWN'} is not PLANNED`
            );
        }

        if (
            typeof stream.objective !== 'string' ||
            stream.objective.trim() === ''
        ) {
            block(
                `${stream.id} has no objective`
            );
        }

        if (
            !Array.isArray(stream.location) ||
            stream.location.length === 0
        ) {
            block(
                `${stream.id} has no declared locations`
            );
        }
    }

    if (
        manifest.candidateCommit &&
        manifest.candidateCommit !== commitSHA
    ) {
        block(
            'manifest candidateCommit does not match current HEAD'
        );
    }

    if (
        manifest.candidateTree &&
        manifest.candidateTree !== treeSHA
    ) {
        block(
            'manifest candidateTree does not match current tree'
        );
    }
}

function loadExecutor(stream, commitSHA) {
    const executorPath = path.join(EXECUTOR_DIR, `${stream.id}.js`);

    if (!fs.existsSync(executorPath)) {
        block(`${stream.id} verifier file is missing`);
    }

    const source = fs.readFileSync(executorPath, 'utf8');

    if (/return\s+true\s*;/.test(source) && !/throw\s+new\s+Error|fail\(/.test(source) && !/assert/.test(source)) {
        block(`${stream.id} verifier rejected: obvious return true stub`);
    }

    if (source.includes('verified_source') && source.match(/artifacts\.push\(['"]verified_source['"]\)/)) {
        block(`${stream.id} verifier rejected: obvious verified_source stub`);
    }

    let executor;
    try {
        executor = require(executorPath);
    } catch (error) {
        block(`${stream.id} verifier could not be loaded`);
    }

    if (!executor || typeof executor.run !== 'function' || !executor.metadata) {
        block(`${stream.id} verifier does not satisfy the COR executor contract`);
    }

    if (!['STATIC', 'TEST', 'PHYSICAL', 'INDEPENDENT', 'MANUAL'].includes(executor.metadata.verificationMode)) {
        block(`${stream.id} verifier missing valid verificationMode in metadata`);
    }

    if (executor.metadata.streamId !== stream.id) {
        block(
            `${stream.id} verifier metadata stream identity mismatch`
        );
    }

    const objectiveHash =
        sha256Text(stream.objective);

    if (
        executor.metadata.objectiveHash !== objectiveHash
    ) {
        block(
            `${stream.id} verifier objective hash mismatch`
        );
    }

    return executor;
}

function verifyReceipt(
    stream,
    receipt,
    commitSHA,
    treeSHA,
    executionId
) {
    if (!receipt || typeof receipt !== 'object') {
        block(
            `${stream.id} returned no receipt`
        );
    }

    const required = [
        'status',
        'streamId',
        'executionId',
        'commitSHA',
        'treeSHA',
        'startedAt',
        'completedAt',
        'observations',
        'artifacts',
        'evidenceDigest'
    ];

    for (const field of required) {
        if (!(field in receipt)) {
            block(
                `${stream.id} receipt missing ${field}`
            );
        }
    }

    if (receipt.status !== 'PASS') {
        block(
            `${stream.id} did not PASS`
        );
    }

    if (receipt.streamId !== stream.id) {
        block(
            `${stream.id} stream identity mismatch`
        );
    }

    if (receipt.executionId !== executionId) {
        block(
            `${stream.id} execution identity mismatch`
        );
    }

    if (receipt.commitSHA !== commitSHA) {
        block(
            `${stream.id} commit mismatch`
        );
    }

    if (receipt.treeSHA !== treeSHA) {
        block(
            `${stream.id} tree mismatch`
        );
    }

    if (
        !Array.isArray(receipt.observations) ||
        receipt.observations.length === 0
    ) {
        block(
            `${stream.id} produced no objective observations`
        );
    }

    if (
        !Array.isArray(receipt.artifacts) ||
        receipt.artifacts.length === 0
    ) {
        block(
            `${stream.id} produced no objective artifacts`
        );
    }

    const unsigned = {
        ...receipt
    };

    delete unsigned.evidenceDigest;

    const expectedDigest =
        sha256Json(unsigned);

    if (
        receipt.evidenceDigest !== expectedDigest
    ) {
        block(
            `${stream.id} evidence digest mismatch`
        );
    }
}

function writeEvidence(file, value) {
    fs.mkdirSync(
        path.dirname(file),
        {
            recursive: true
        }
    );

    const temporary =
        `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;

    fs.writeFileSync(
        temporary,
        JSON.stringify(value, null, 2) + '\n',
        {
            encoding: 'utf8',
            mode: 0o600
        }
    );

    fs.renameSync(
        temporary,
        file
    );
}

async function main() {
    assertClean();

    const commitSHA =
        git(['rev-parse', 'HEAD']);

    const treeSHA =
        git(['rev-parse', 'HEAD^{tree}']);

    if (!fs.existsSync(MANIFEST_PATH)) {
        block('current Ugondu COR manifest is missing');
    }

    const manifest =
        readJson(MANIFEST_PATH);

    assertManifest(
        manifest,
        commitSHA,
        treeSHA
    );

    const executionStartedAt =
        new Date().toISOString();

    const ledger = {
        schemaVersion: '3.0.0',
        result: 'QUALIFICATION_RUNNING',
        candidate: {
            repository: 'Chicitadel/ugondu',
            commitSHA,
            treeSHA
        },
        manifestDigest:
            sha256Json(manifest),
        executionStartedAt,
        streams: []
    };

    for (const stream of manifest.streams) {
        const executor =
            loadExecutor(
                stream,
                commitSHA
            );

        const executionId =
            `COR-${stream.id}-${crypto.randomUUID()}`;

        const context =
            Object.freeze({
                root: ROOT,
                repository: 'Chicitadel/ugondu',
                streamId: stream.id,
                objective: stream.objective,
                declaredLocations: Object.freeze(
                    [...stream.location]
                ),
                commitSHA,
                treeSHA,
                executionId,
                startedAt:
                    new Date().toISOString()
            });

        let receipt;

        try {
            receipt =
                await executor.run(
                    context
                );
        } catch (error) {
            block(
                `${stream.id} verifier failed: ${error?.message || 'unknown error'}`
            );
        }

        verifyReceipt(
            stream,
            receipt,
            commitSHA,
            treeSHA,
            executionId
        );

        ledger.streams.push({
            ...receipt,
            objective: stream.objective
        });
    }

    if (
        ledger.streams.length !== 40
    ) {
        block(
            'qualification did not produce exactly 40 receipts'
        );
    }

    const finalCommitSHA =
        git(['rev-parse', 'HEAD']);

    const finalTreeSHA =
        git(['rev-parse', 'HEAD^{tree}']);

    if (finalCommitSHA !== commitSHA) {
        block(
            'source commit changed during qualification'
        );
    }

    if (finalTreeSHA !== treeSHA) {
        block(
            'source tree changed during qualification'
        );
    }

    assertClean();

    ledger.result =
        'QUALIFICATION_PASS';

    ledger.executionCompletedAt =
        new Date().toISOString();

    ledger.evidenceRoot =
        sha256Json(
            ledger.streams
        );

    writeEvidence(
        path.join(
            EVIDENCE_DIR,
            'evidence-ledger.json'
        ),
        ledger
    );

    process.stdout.write(
        `QUALIFICATION PASS: 40 streams; candidate=${commitSHA}\n`
    );
}

main().catch(
    error =>
        block(
            error?.message ||
            'unexpected COR engine failure'
        )
);
