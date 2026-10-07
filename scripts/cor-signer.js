'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const EVIDENCE_DIR =
  process.env.COR_EVIDENCE_DIR || path.join(ROOT, '.cor_evidence');

const LEDGER = path.join(EVIDENCE_DIR, 'evidence-ledger.json');
const FINALIZATION = path.join(EVIDENCE_DIR, 'cor-finalization.json');
const OUTPUT = path.join(EVIDENCE_DIR, 'FINAL_COR_BUNDLE.json');

function git(args) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8'
  }).trim();
}

function block(reason) {
  process.stderr.write(`COR BLOCKED: ${reason}\n`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    block(`invalid evidence: ${file}`);
  }
}

if (!process.env.COR_SIGNING_KEY) {
  block('persistent COR_SIGNING_KEY is required');
}

if (!fs.existsSync(LEDGER)) block('fresh qualification ledger missing');
if (!fs.existsSync(FINALIZATION)) block('independent finalization missing');

const ledger = readJson(LEDGER);
const finalization = readJson(FINALIZATION);

if (ledger.result !== 'QUALIFICATION_PASS') {
  block('qualification is not PASS');
}

if (finalization.status !== 'READY_FOR_COR_SIGNATURE') {
  block('final authority did not authorize signature');
}

const commitSHA = git(['rev-parse', 'HEAD']);
const treeSHA = git(['rev-parse', 'HEAD^{tree}']);

if (ledger.candidate.commitSHA !== commitSHA) {
  block('qualification commit differs from HEAD');
}

if (ledger.candidate.treeSHA !== treeSHA) {
  block('qualification tree differs from HEAD');
}

if (finalization.candidateSHA !== commitSHA) {
  block('finalization commit differs from HEAD');
}

if (finalization.treeSHA !== treeSHA) {
  block('finalization tree differs from HEAD');
}

if (!Array.isArray(ledger.streams) || ledger.streams.length !== 40) {
  block('40 stream receipts required');
}

for (const receipt of ledger.streams) {
  if (receipt.status !== 'PASS') block(`${receipt.streamId} is not PASS`);
  if (receipt.commitSHA !== commitSHA) block(`${receipt.streamId} commit mismatch`);
  if (receipt.treeSHA !== treeSHA) block(`${receipt.streamId} tree mismatch`);
}

const payload = {
  schemaVersion: '2.0.0',
  repository: 'Chicitadel/ugondu',
  candidateSHA: commitSHA,
  treeSHA,
  qualificationEvidenceRoot: ledger.evidenceRoot,
  finalizationDigest: finalization.finalizationDigest,
  status: 'COR_CERTIFIED_LAUNCH_APPROVED'
};

const payloadText = JSON.stringify(payload);

const signature = crypto.sign(
  'sha256',
  Buffer.from(payloadText, 'utf8'),
  crypto.createPrivateKey(process.env.COR_SIGNING_KEY)
).toString('base64');

const bundle = {
  ...payload,
  payloadDigest:
    'sha256:' +
    crypto
      .createHash('sha256')
      .update(payloadText, 'utf8')
      .digest('hex'),
  signatureAlgorithm: 'RSA-SHA256',
  signature,
  issuedAt: new Date().toISOString()
};

fs.writeFileSync(
  OUTPUT,
  JSON.stringify(bundle, null, 2) + '\n',
  { encoding: 'utf8', mode: 0o600 }
);

process.stdout.write(
  `COR CERTIFIED — LAUNCH APPROVED: ${commitSHA}\n`
);
