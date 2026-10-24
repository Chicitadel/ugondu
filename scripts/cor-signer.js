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

const LEDGER =
    path.join(EVIDENCE_DIR, 'evidence-ledger.json');

const FINALIZATION =
    path.join(EVIDENCE_DIR, 'cor-finalization.json');

const OUTPUT =
    path.join(EVIDENCE_DIR, 'FINAL_COR_BUNDLE.json');

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
            `invalid evidence: ${file}`
        );
    }
}

function sha256(value) {
    return crypto
        .createHash('sha256')
        .update(value, 'utf8')
        .digest('hex');
}

function clean() {
    return git([
        'status',
        '--porcelain'
    ]) === '';
}

if (!process.env.COR_SIGNING_KEY) {
    block(
        'persistent COR_SIGNING_KEY is required'
    );
}

if (!process.env.COR_PUBLIC_KEY) {
    block(
        'trusted COR_PUBLIC_KEY is required'
    );
}

if (!clean()) {
    block(
        'source tree is not clean before signing'
    );
}

if (!fs.existsSync(LEDGER)) {
    block(
        'qualification ledger missing'
    );
}

if (!fs.existsSync(FINALIZATION)) {
    block(
        'independent finalization missing'
    );
}

const ledger =
    readJson(LEDGER);

const finalization =
    readJson(FINALIZATION);

if (
    ledger.result !==
    'QUALIFICATION_PASS'
) {
    block(
        'qualification is not PASS'
    );
}

if (
    finalization.status !==
    'READY_FOR_COR_SIGNATURE'
) {
    block(
        'finalization authority did not authorize signing'
    );
}

const commitSHA =
    git(['rev-parse', 'HEAD']);

const treeSHA =
    git(['rev-parse', 'HEAD^{tree}']);

if (
    ledger.candidate.commitSHA !==
    commitSHA
) {
    block(
        'qualification commit mismatch'
    );
}

if (
    ledger.candidate.treeSHA !==
    treeSHA
) {
    block(
        'qualification tree mismatch'
    );
}

if (
    finalization.candidateSHA !==
    commitSHA
) {
    block(
        'finalization commit mismatch'
    );
}

if (
    finalization.treeSHA !==
    treeSHA
) {
    block(
        'finalization tree mismatch'
    );
}

if (
    finalization.qualificationEvidenceRoot !==
    ledger.evidenceRoot
) {
    block(
        'finalization evidence root mismatch'
    );
}

const privateKey =
    crypto.createPrivateKey(
        process.env.COR_SIGNING_KEY
    );

const publicKey =
    crypto.createPublicKey(
        process.env.COR_PUBLIC_KEY
    );

const TEST_PAYLOAD = Buffer.from('COR_KEY_TEST_PAYLOAD', 'utf8');
const testSignature = crypto.sign('sha256', TEST_PAYLOAD, privateKey);
const testVerified = crypto.verify('sha256', TEST_PAYLOAD, publicKey, testSignature);

if (!testVerified) {
    block('private key does not correspond to trusted public key');
}

const payload = {
    schemaVersion: '3.0.0',
    repository: 'Chicitadel/ugondu',
    candidateSHA: commitSHA,
    candidateTree: treeSHA,
    manifestDigest:
        finalization.manifestDigest,
    evidenceRoot:
        ledger.evidenceRoot,
    finalizationDigest:
        finalization.finalizationDigest,
    status:
        'COR_SIGNATURE_VALID'
};

const payloadText =
    JSON.stringify(payload);

const signature =
    crypto.sign(
        'sha256',
        Buffer.from(
            payloadText,
            'utf8'
        ),
        privateKey
    );

const verified =
    crypto.verify(
        'sha256',
        Buffer.from(
            payloadText,
            'utf8'
        ),
        publicKey,
        signature
    );

if (!verified) {
    block(
        'self-verification of COR signature failed'
    );
}

const exportedPublicKey =
    publicKey.export({
        type: 'spki',
        format: 'der'
    });

const publicKeyFingerprint =
    sha256(
        exportedPublicKey.toString(
            'base64'
        )
    );

const bundle = {
    ...payload,
    payloadDigest:
        `sha256:${sha256(payloadText)}`,
    signatureAlgorithm:
        'RSA-SHA256',
    publicKeyFingerprint:
        `sha256:${publicKeyFingerprint}`,
    signature:
        signature.toString('base64'),
    issuedAt:
        new Date().toISOString()
};

fs.writeFileSync(
    OUTPUT,
    JSON.stringify(
        bundle,
        null,
        2
    ) + '\n',
    {
        encoding: 'utf8',
        mode: 0o600
    }
);

if (!clean()) {
    block(
        'source tree changed during signing'
    );
}

process.stdout.write(
    `COR_SIGNATURE_VALID: ${commitSHA}\n`
);
