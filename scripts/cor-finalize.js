'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT =
    process.env.UGONDU_ROOT ||
    path.resolve(__dirname, '..');

const EVIDENCE_DIR =
    process.env.COR_EVIDENCE_DIR ||
    path.join(ROOT, '.cor_evidence');

const MANIFEST =
    path.join(
        ROOT,
        '.governance',
        'cor',
        'ugondu-cor-qualification-manifest.json'
    );

const LEDGER =
    path.join(
        EVIDENCE_DIR,
        'evidence-ledger.json'
    );

const OUTPUT =
    path.join(
        EVIDENCE_DIR,
        'cor-finalization.json'
    );

const IDS = [
    'A01','A02','A03','A04','A05','A06','A07','A08',
    'B09','B10','B11','B12','B13','B14','B15','B16',
    'C17','C18','C19','C20','C21','C22',
    'D23','D24','D25','D26','D27','D28',
    'E29','E30','E31','E32','E33','E34',
    'F35','F36','F37','F38','F39','F40'
];

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
    process.stderr.write(
        `COR BLOCKED: ${reason}\n`
    );
    process.exit(1);
}

function readJson(file) {
    try {
        return JSON.parse(
            fs.readFileSync(
                file,
                'utf8'
            )
        );
    } catch {
        block(
            `invalid evidence file: ${path.relative(ROOT, file)}`
        );
    }
}

function digest(value) {
    return crypto
        .createHash('sha256')
        .update(
            JSON.stringify(value),
            'utf8'
        )
        .digest('hex');
}

function assertClean() {
    if (
        git(['status', '--porcelain']) !== ''
    ) {
        block(
            'working tree is not clean'
        );
    }
}

function verifyReceipt(receipt, commitSHA, treeSHA) {
    if (
        receipt.status !== 'PASS'
    ) {
        block(
            `${receipt.streamId} is not PASS`
        );
    }

    if (
        receipt.commitSHA !== commitSHA
    ) {
        block(
            `${receipt.streamId} commit mismatch`
        );
    }

    if (
        receipt.treeSHA !== treeSHA
    ) {
        block(
            `${receipt.streamId} tree mismatch`
        );
    }

    const unsigned = {
        ...receipt
    };

    delete unsigned.evidenceDigest;
    delete unsigned.objective;

    if (
        digest(unsigned) !==
        receipt.evidenceDigest
    ) {
        block(
            `${receipt.streamId} evidence digest invalid`
        );
    }
}

assertClean();

if (!fs.existsSync(MANIFEST)) {
    block(
        'qualification manifest missing'
    );
}

if (!fs.existsSync(LEDGER)) {
    block(
        'qualification evidence ledger missing'
    );
}

const manifest =
    readJson(MANIFEST);

const ledger =
    readJson(LEDGER);

if (
    manifest.repository !==
    'Chicitadel/ugondu'
) {
    block(
        'manifest repository mismatch'
    );
}

if (
    manifest.streams?.length !== 40
) {
    block(
        'manifest does not contain exactly 40 streams'
    );
}

const manifestIds =
    manifest.streams.map(
        stream => stream.id
    );

if (
    JSON.stringify(manifestIds) !==
    JSON.stringify(IDS)
) {
    block(
        'manifest stream registry mismatch'
    );
}

if (
    manifest.streams.some(
        stream => stream.status !== 'PLANNED'
    )
) {
    block(
        'manifest contains self-certified stream status'
    );
}

if (
    ledger.result !==
    'QUALIFICATION_PASS'
) {
    block(
        'qualification result is not PASS'
    );
}

const commitSHA =
    git(['rev-parse', 'HEAD']);

const treeSHA =
    git(['rev-parse', 'HEAD^{tree}']);

if (
    ledger.candidate?.repository !==
    'Chicitadel/ugondu'
) {
    block(
        'ledger repository mismatch'
    );
}

if (
    ledger.candidate.commitSHA !==
    commitSHA
) {
    block(
        'ledger commit differs from HEAD'
    );
}

if (
    ledger.candidate.treeSHA !==
    treeSHA
) {
    block(
        'ledger tree differs from HEAD'
    );
}

if (
    ledger.manifestDigest !==
    digest(manifest)
) {
    block(
        'ledger manifest digest mismatch'
    );
}

if (
    !Array.isArray(ledger.streams) ||
    ledger.streams.length !== 40
) {
    block(
        '40 qualification receipts required'
    );
}

const receiptIds =
    ledger.streams.map(
        receipt => receipt.streamId
    );

if (
    new Set(receiptIds).size !== 40
) {
    block(
        'duplicate stream receipts detected'
    );
}

if (
    JSON.stringify(
        [...receiptIds].sort()
    ) !==
    JSON.stringify(
        [...IDS].sort()
    )
) {
    block(
        'receipt registry does not equal A01-F40'
    );
}

for (
    const receipt of ledger.streams
) {
    verifyReceipt(
        receipt,
        commitSHA,
        treeSHA
    );
}

if (
    digest(ledger.streams) !==
    ledger.evidenceRoot
) {
    block(
        'qualification evidence root mismatch'
    );
}

assertClean();

const finalCommitSHA =
    git(['rev-parse', 'HEAD']);

const finalTreeSHA =
    git(['rev-parse', 'HEAD^{tree}']);

if (
    finalCommitSHA !== commitSHA ||
    finalTreeSHA !== treeSHA
) {
    block(
        'candidate changed during finalization'
    );
}

const finalization = {
    schemaVersion: '2.0.0',
    repository: 'Chicitadel/ugondu',
    candidateSHA: commitSHA,
    treeSHA,
    manifestDigest:
        digest(manifest),
    qualificationEvidenceRoot:
        ledger.evidenceRoot,
    status:
        'READY_FOR_COR_SIGNATURE',
    finalizedAt:
        new Date().toISOString()
};

finalization.finalizationDigest =
    digest(finalization);

fs.mkdirSync(
    EVIDENCE_DIR,
    {
        recursive: true
    }
);

fs.writeFileSync(
    OUTPUT,
    JSON.stringify(
        finalization,
        null,
        2
    ) + '\n',
    {
        encoding: 'utf8',
        mode: 0o600
    }
);

console.log(
    'Independent COR finalization PASS'
);
