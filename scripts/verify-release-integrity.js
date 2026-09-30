/**
 * Production release-integrity gate.
 * Rejects repository-held private keys and tracked generated certification artifacts.
 * When an evidence bundle is present locally, it must attest the exact current HEAD.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error('[FAIL] Release integrity:', message);
  process.exit(1);
}

const tracked = git(['ls-files']).split('\n').filter(Boolean);
const forbiddenTracked = tracked.filter(file =>
  /(^|\/)([^/]+_)?private\.pem$/i.test(file) ||
  file === 'cor-evidence-bundle.json' ||
  file === 'cor-test-results.json' ||
  /(^|\/)\.service_replay_ledger\.json$/.test(file)
);
if (forbiddenTracked.length) {
  fail(`forbidden tracked artifacts: ${forbiddenTracked.join(', ')}`);
}

for (const file of tracked) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content)) {
    fail(`private key material detected in tracked file: ${file}`);
  }
}

const evidencePath = path.join(ROOT, 'cor-evidence-bundle.json');
if (fs.existsSync(evidencePath)) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const head = git(['rev-parse', 'HEAD']);
  const tree = git(['rev-parse', 'HEAD^{tree}']);
  if (evidence.gitCommitHash !== head) fail(`evidence commit ${evidence.gitCommitHash} does not match HEAD ${head}`);
  if (evidence.gitTreeHash !== tree) fail(`evidence tree ${evidence.gitTreeHash} does not match HEAD tree ${tree}`);
}

console.log('[PASS] Release integrity: no tracked private keys or generated certification artifacts; evidence binding is consistent when present.');
