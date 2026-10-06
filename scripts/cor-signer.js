const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const evidenceDir = process.env.COR_EVIDENCE_DIR || path.join(root, '.cor_evidence');
const ledgerPath = path.join(evidenceDir, 'evidence-ledger.json');

if (!fs.existsSync(ledgerPath)) {
    console.error('Evidence ledger not found.');
    process.exit(1);
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

if (ledger.status !== 'COR_CERTIFIED') {
    console.error('Cannot sign uncertified schedule.');
    process.exit(1);
}

// 1. Independent Verification of Identity
const sha = require('child_process').execSync('git rev-parse HEAD', { cwd: root }).toString().trim();
const treeSha = require('child_process').execSync('git write-tree', { cwd: root }).toString().trim();

if (ledger.candidate.commitSHA !== sha) {
    console.error('COR BLOCKED: Evidence candidate SHA does not match current HEAD.');
    process.exit(1);
}
if (ledger.candidate.treeSHA !== treeSha) {
    console.error('COR BLOCKED: Evidence tree SHA does not match current source tree.');
    process.exit(1);
}

// 2. Persistent Trust Root
let privateKeyPem = process.env.COR_SIGNING_KEY;
let publicKeyPem = process.env.COR_PUBLIC_KEY;

if (!privateKeyPem) {
    console.warn('WARN: COR_SIGNING_KEY not provided. Using ephemeral key for demonstration. A physical certification must provide a persistent HSM/KMS-backed signing key via environment.');
    const keys = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    privateKeyPem = keys.privateKey;
    publicKeyPem = keys.publicKey;
}

const dataToSign = Buffer.from(JSON.stringify(ledger.streams) + ledger.candidate.commitSHA + ledger.candidate.treeSHA);

const sign = crypto.createSign('SHA256');
sign.update(dataToSign);
sign.end();
const signature = sign.sign(privateKeyPem, 'hex');

const corBundle = {
    candidateSHA: ledger.candidate.commitSHA,
    treeSHA: ledger.candidate.treeSHA,
    status: ledger.status,
    signature: signature,
    publicKey: publicKeyPem,
    timestamp: new Date().toISOString(),
    evidenceDigest: crypto.createHash('sha256').update(JSON.stringify(ledger.streams)).digest('hex')
};

const bundlePath = path.join(evidenceDir, 'FINAL_COR_BUNDLE.json');
fs.writeFileSync(bundlePath, JSON.stringify(corBundle, null, 2));

console.log('COR CERTIFIED — LAUNCH APPROVED');
console.log('Signature: ' + signature);
