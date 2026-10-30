'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execFileSync } = require('child_process');
const crypto = require('crypto');
const canonicalizeModule = require('canonicalize');
const canonicalize = canonicalizeModule.default || canonicalizeModule;

const STREAM_ID = 'A06';
const OBJECTIVE = 'Verify independent signature in cor-signer.js';

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
    const sourcePath = path.join(context.root, 'scripts/cor-signer.js');
    if (!fs.existsSync(sourcePath)) {
        throw new Error('COR_OBJECTIVE_TARGET_MISSING: scripts/cor-signer.js');
    }
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-cor-a06-'));
    const evidenceDir = path.join(root, '.cor_evidence');
    const signerPath = path.join(root, 'scripts', 'cor-signer.js');
    const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    try {
        fs.mkdirSync(path.dirname(signerPath), { recursive: true });
        fs.copyFileSync(sourcePath, signerPath);
        fs.writeFileSync(path.join(root, '.gitignore'), '.cor_evidence/\n', 'utf8');
        git(['init', '-b', 'main']);
        git(['config', 'user.name', 'COR Verifier']);
        git(['config', 'user.email', 'cor-verifier@example.invalid']);
        git(['add', '.gitignore', 'scripts/cor-signer.js']);
        git(['commit', '-m', 'isolated signer runtime fixture']);
        const commitSHA = git(['rev-parse', 'HEAD']);
        const treeSHA = git(['rev-parse', 'HEAD^{tree}']);

        fs.mkdirSync(evidenceDir, { recursive: true });
        const evidenceRoot = 'sha256:fixture-evidence-root';
        fs.writeFileSync(path.join(evidenceDir, 'evidence-ledger.json'), JSON.stringify({
            result: 'QUALIFICATION_PASS',
            candidate: { commitSHA, treeSHA },
            evidenceRoot
        }, null, 2) + '\n');
        fs.writeFileSync(path.join(evidenceDir, 'cor-finalization.json'), JSON.stringify({
            status: 'READY_FOR_COR_SIGNATURE',
            candidateSHA: commitSHA,
            treeSHA,
            qualificationEvidenceRoot: evidenceRoot,
            manifestDigest: 'sha256:fixture-manifest-digest',
            finalizationDigest: 'sha256:fixture-finalization-digest'
        }, null, 2) + '\n');

        const pair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        const signerEnv = {
            ...process.env,
            UGONDU_ROOT: root,
            COR_EVIDENCE_DIR: evidenceDir,
            COR_SIGNING_KEY: pair.privateKey,
            COR_PUBLIC_KEY: pair.publicKey
        };
        const valid = spawnSync(process.execPath, [signerPath], {
            cwd: root, encoding: 'utf8', timeout: 15000, env: signerEnv
        });
        if (valid.error || valid.status !== 0 || !String(valid.stdout).includes('COR_SIGNATURE_VALID: ' + commitSHA)) {
            throw new Error('A06_VALID_SIGNATURE_NOT_ISSUED: ' + String(valid.stderr || valid.stdout || valid.error?.message));
        }

        const bundle = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'FINAL_COR_BUNDLE.json'), 'utf8'));
        const payload = {
            schemaVersion: '3.0.0',
            repository: 'Chicitadel/ugondu',
            candidateSHA: commitSHA,
            candidateTree: treeSHA,
            manifestDigest: 'sha256:fixture-manifest-digest',
            evidenceRoot,
            finalizationDigest: 'sha256:fixture-finalization-digest',
            status: 'COR_SIGNATURE_VALID'
        };
        const verified = crypto.verify(
            'sha256',
            Buffer.from(JSON.stringify(payload), 'utf8'),
            pair.publicKey,
            Buffer.from(bundle.signature, 'base64')
        );
        if (!verified || bundle.candidateSHA !== commitSHA || bundle.candidateTree !== treeSHA) {
            throw new Error('A06_SIGNATURE_BUNDLE_VERIFICATION_FAILED');
        }

        const wrongPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        const invalid = spawnSync(process.execPath, [signerPath], {
            cwd: root,
            encoding: 'utf8',
            timeout: 15000,
            env: { ...signerEnv, COR_PUBLIC_KEY: wrongPair.publicKey }
        });
        if (invalid.status === 0 || !String(invalid.stderr).includes('private key does not correspond to trusted public key')) {
            throw new Error('A06_MISMATCHED_TRUST_ROOT_WAS_ACCEPTED');
        }

        artifacts.push('scripts/cor-signer.js');
        observations.push('Executed the real signer in an isolated clean Git candidate; verified its RSA-SHA256 bundle and proved a mismatched trusted public key is rejected');
        return true;
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}

module.exports = {
    metadata,
    run
};
