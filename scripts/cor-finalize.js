'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const EVIDENCE_DIR = process.env.COR_EVIDENCE_DIR || path.join(ROOT, '.cor_evidence');
const LEDGER = path.join(EVIDENCE_DIR, 'evidence-ledger.json');
const OUTPUT = path.join(EVIDENCE_DIR, 'cor-finalization.json');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function block(reason) {
  process.stderr.write(`COR BLOCKED: ${reason}\n`);
  process.exit(1);
}

if (!fs.existsSync(LEDGER)) {
  block('evidence ledger missing');
}

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
if (ledger.result !== 'QUALIFICATION_PASS') {
  block('qualification is not PASS');
}

const commitSHA = git(['rev-parse', 'HEAD']);
const treeSHA = git(['rev-parse', 'HEAD^{tree}']);

if (ledger.candidate.commitSHA !== commitSHA || ledger.candidate.treeSHA !== treeSHA) {
  block('candidate mismatch during finalization');
}

const finalization = {
  schemaVersion: '1.0.0',
  candidateSHA: commitSHA,
  treeSHA: treeSHA,
  qualificationEvidenceRoot: ledger.evidenceRoot,
  status: 'READY_FOR_COR_SIGNATURE',
  finalizedAt: new Date().toISOString()
};

finalization.finalizationDigest = crypto.createHash('sha256').update(JSON.stringify(finalization)).digest('hex');

fs.writeFileSync(OUTPUT, JSON.stringify(finalization, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
console.log('Finalization complete');
