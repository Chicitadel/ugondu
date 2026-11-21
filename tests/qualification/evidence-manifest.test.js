/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Qualification — Evidence Manifest Tests
 * File           : evidence-manifest.test.js
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-23
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const GEN = pathToFileURL(path.resolve(__dirname, '..', '..', 'scripts', 'governance', 'generate-evidence-manifest.mjs')).href;
const CMDS = [{ command: 'node tests/x.test.js', exitCode: 0 }];

function sh(dir, ...args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'evm-'));
  sh(dir, 'init', '-q');
  sh(dir, 'config', 'user.email', 'gov@example.invalid');
  sh(dir, 'config', 'user.name', 'Governance');
  fs.mkdirSync(path.join(dir, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'docs', 'a.md'), 'evidence\n');
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'init');
  return { dir, sha: sh(dir, 'rev-parse', 'HEAD') };
}

function commitFile(dir, relPath, content, msg = 'update') {
  const abs = path.join(dir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', msg);
  return sh(dir, 'rev-parse', 'HEAD');
}

test('generates manifest bound to HEAD with hashes', async () => {
  const { generateManifest } = await import(GEN);
  const { dir, sha } = makeRepo();
  const m = generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['docs/a.md'], commands: CMDS });
  assert.equal(m.gitHeadSha, sha);
  assert.equal(m.candidateSha, sha);
  assert.equal(m.releaseHeadSha, undefined);
  assert.match(m.evidenceFiles[0].sha256, /^[0-9a-f]{64}$/);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, 'docs/governance/evidence/evidence-manifest.json'), 'utf8'));
  assert.equal(saved.releaseHeadSha, undefined);
  assert.equal(saved.candidateSha, sha);
  assert.equal(saved.gitHeadSha, sha);
  assert.ok(fs.existsSync(path.join(dir, 'docs/governance/evidence/evidence-manifest.json')));
});

test('refuses a dirty tree', async () => {
  const { generateManifest } = await import(GEN);
  const { dir, sha } = makeRepo();
  fs.writeFileSync(path.join(dir, 'docs', 'a.md'), 'tampered\n');
  assert.throws(() => generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['docs/a.md'], commands: CMDS }), /Dirty/);
  fs.writeFileSync(path.join(dir, 'docs', 'a.md'), 'evidence\n');
  fs.writeFileSync(path.join(dir, 'untracked.txt'), 'x');
  assert.throws(() => generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['docs/a.md'], commands: CMDS }), /Dirty/);
});

test('refuses SHA mismatch and malformed SHA', async () => {
  const { generateManifest } = await import(GEN);
  const { dir } = makeRepo();
  assert.throws(() => generateManifest({ root: dir, expectedSha: 'a'.repeat(40), evidenceFiles: ['docs/a.md'], commands: CMDS }), /SHA mismatch/);
  assert.throws(() => generateManifest({ root: dir, expectedSha: 'abc', evidenceFiles: ['docs/a.md'], commands: CMDS }), /40-hex/);
});

test('fails closed on missing evidence, escapes, and bad commands', async () => {
  const { generateManifest } = await import(GEN);
  const { dir, sha } = makeRepo();
  assert.throws(() => generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['docs/nope.md'], commands: CMDS }), /Missing/);
  assert.throws(() => generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['../x'], commands: CMDS }), /escapes/);
  assert.throws(() => generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['docs/a.md'], commands: [{ command: 'x' }] }), /exitCode/);
});

test('never marks absent items proven; failing exit codes not reported as passed', async () => {
  const { generateManifest, UNPROVEN_CANDIDATES } = await import(GEN);
  const { dir, sha } = makeRepo();
  const m = generateManifest({
    root: dir, expectedSha: sha, evidenceFiles: ['docs/a.md'],
    commands: [{ command: 'a', exitCode: 0 }, { command: 'b', exitCode: 1 }], write: false,
  });
  assert.deepEqual(m.unproven.map((u) => u.id).sort(), UNPROVEN_CANDIDATES.map((u) => u.id).sort());
  assert.equal(m.allTestCommandsPassed, false);
  for (const u of m.unproven) assert.ok(!m.evidenceFiles.some((f) => f.path === u.expectedPath));
});

test('unproven contains native-runner-evidence when missing, and is empty when present', async () => {
  const { generateManifest } = await import(GEN);
  const { dir } = makeRepo();

  // Commit canary receipt and ai model qualification report so live-canary and ai-model are proven
  let sha = commitFile(dir, 'docs/security/evidence/live_ai_canary_receipt.json', '{"canary":"pass"}\n');
  sha = commitFile(dir, 'docs/security/evidence/ai_model_qualification_report.json', '{"report":"pass"}\n');

  // native-runner-evidence.json is missing from directory
  const mMissing = generateManifest({
    root: dir,
    expectedSha: sha,
    evidenceFiles: ['docs/a.md'],
    commands: CMDS,
    write: false,
  });
  assert.ok(mMissing.unproven.some((u) => u.id === 'native-runner-evidence'));
  assert.equal(mMissing.evidenceFiles.some((f) => f.path === 'docs/governance/evidence/native-runner-evidence.json'), false);

  // Commit native-runner-evidence.json into directory
  sha = commitFile(dir, 'docs/governance/evidence/native-runner-evidence.json', '{"runner":"native-pass"}\n');

  // native-runner-evidence.json is now present
  const mPresent = generateManifest({
    root: dir,
    expectedSha: sha,
    evidenceFiles: ['docs/a.md'],
    commands: CMDS,
    write: false,
  });
  assert.deepEqual(mPresent.unproven, []);
  assert.equal(mPresent.unproven.length, 0);
  assert.ok(mPresent.evidenceFiles.some((f) => f.path === 'docs/governance/evidence/native-runner-evidence.json'));
});

test('unproven contains ai-model-qualification-report when missing, and includes digest in evidenceFiles when present', async () => {
  const { generateManifest, REQUIRED_EVIDENCE_FILES, UNPROVEN_CANDIDATES } = await import(GEN);
  const { dir } = makeRepo();

  assert.ok(REQUIRED_EVIDENCE_FILES.includes('docs/security/evidence/ai_model_qualification_report.json'));
  assert.ok(UNPROVEN_CANDIDATES.some((c) => c.path === 'docs/security/evidence/ai_model_qualification_report.json'));

  let sha = commitFile(dir, 'docs/security/evidence/live_ai_canary_receipt.json', '{"canary":"pass"}\n');
  sha = commitFile(dir, 'docs/governance/evidence/native-runner-evidence.json', '{"runner":"native-pass"}\n');

  // ai_model_qualification_report.json is missing from directory
  const mMissing = generateManifest({
    root: dir,
    expectedSha: sha,
    evidenceFiles: ['docs/a.md'],
    commands: CMDS,
    write: false,
  });
  assert.ok(mMissing.unproven.some((u) => u.id === 'ai-model-qualification-report'));
  assert.equal(mMissing.evidenceFiles.some((f) => f.path === 'docs/security/evidence/ai_model_qualification_report.json'), false);

  // Commit ai_model_qualification_report.json into directory
  sha = commitFile(dir, 'docs/security/evidence/ai_model_qualification_report.json', '{"qualificationMode":"LIVE_SOVEREIGN","summary":{"activeCount":0}}\n');

  const mPresent = generateManifest({
    root: dir,
    expectedSha: sha,
    evidenceFiles: ['docs/a.md'],
    commands: CMDS,
    write: false,
  });
  assert.deepEqual(mPresent.unproven, []);
  assert.equal(mPresent.unproven.length, 0);
  const entry = mPresent.evidenceFiles.find((f) => f.path === 'docs/security/evidence/ai_model_qualification_report.json');
  assert.ok(entry, 'Expected ai_model_qualification_report.json in evidenceFiles');
  assert.match(entry.sha256, /^[0-9a-f]{64}$/);
});

test('unproven is empty and evidenceFiles contains all required files when present', async () => {
  const { generateManifest, REQUIRED_EVIDENCE_FILES } = await import(GEN);
  const { dir } = makeRepo();

  commitFile(dir, 'docs/security/evidence/live_ai_canary_receipt.json', '{"canary":"ok"}\n');
  commitFile(dir, 'docs/governance/evidence/native-runner-evidence.json', '{"runner":"ok"}\n');
  commitFile(dir, 'docs/security/evidence/admin_portal_provisioning_receipt.json', '{"admin":"ok"}\n');
  commitFile(dir, 'docs/security/evidence/ai_model_qualification_report.json', '{"ai":"ok"}\n');
  const sha = commitFile(dir, 'config/qualification/target-matrix.json', '{"targets":[]}\n');

  const m = generateManifest({
    root: dir,
    expectedSha: sha,
    commands: CMDS,
    write: false,
  });

  assert.deepEqual(m.unproven, []);
  assert.equal(m.unproven.length, 0);
  for (const reqPath of REQUIRED_EVIDENCE_FILES) {
    assert.ok(m.evidenceFiles.some((f) => f.path === reqPath), `Expected ${reqPath} in evidenceFiles`);
  }
});
