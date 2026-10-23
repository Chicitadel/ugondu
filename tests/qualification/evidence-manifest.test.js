/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Qualification — Evidence Manifest Tests
 * File           : evidence-manifest.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-23
 * Classification : ENTERPRISE | INTERNAL
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

function sh(dir, ...args) { return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim(); }

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

test('generates manifest bound to HEAD with hashes', async () => {
  const { generateManifest } = await import(GEN);
  const { dir, sha } = makeRepo();
  const m = generateManifest({ root: dir, expectedSha: sha, evidenceFiles: ['docs/a.md'], commands: CMDS });
  assert.equal(m.gitHeadSha, sha);
  assert.match(m.evidenceFiles[0].sha256, /^[0-9a-f]{64}$/);
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
