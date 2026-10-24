/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Qualification — Native Runner Evidence Tests
 * File           : native-runner-evidence.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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

const REAL_ROOT = path.resolve(__dirname, '..', '..');
const GEN = pathToFileURL(path.join(REAL_ROOT, 'scripts', 'governance', 'generate-native-runner-evidence.mjs')).href;
const CAP = pathToFileURL(path.join(REAL_ROOT, 'scripts', 'governance', 'capture-native-run.mjs')).href;
const sh = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nre-'));
  sh(dir, 'init', '-q');
  sh(dir, 'config', 'user.email', 't@example.invalid');
  sh(dir, 'config', 'user.name', 'Test');
  sh(dir, 'config', 'commit.gpgsign', 'false');
  fs.mkdirSync(path.join(dir, 'config/qualification'), { recursive: true });
  fs.copyFileSync(path.join(REAL_ROOT, 'config/qualification/target-matrix.json'), path.join(dir, 'config/qualification/target-matrix.json'));
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', 'candidate');
  return { dir, sha: sh(dir, 'rev-parse', 'HEAD') };
}

const rec = (sha, platform, arch, extra = {}) => ({
  recordType: 'UGONDU_NATIVE_EXECUTION_RECORD', gitSha: sha,
  host: { platform, arch },
  ci: platform === 'linux' ? { runId: '111', runnerOs: 'Linux' } : null,
  suite: { totalTests: 10, passingTests: 10, failingTests: 0, status: 'PASSED' },
  ...extra,
});

const okLookup = (sha) => () => ({ headSha: sha, status: 'completed', conclusion: 'success', jobs: [{ name: 'Build Go Thin-Client (macos-latest — darwin/arm64)', conclusion: 'success' }] });

async function build(over = {}) {
  const { buildNativeRunnerEvidence } = await import(GEN);
  const { dir, sha } = repo();
  return buildNativeRunnerEvidence({
    root: dir, candidateSha: sha,
    windowsRecord: rec(sha, 'win32', 'x64'), linuxRecord: rec(sha, 'linux', 'x64'),
    darwinCiRunId: '222', lookup: okLookup(sha), ...over(sha),
  });
}

test('NATIVE-001: evidence is built only from observed records and carries no universal claim', async () => {
  const e = await build(() => ({}));
  assert.equal(e.universalClaim, false);
  assert.equal(e.tier1NativeRunners.length, 3);
  const d = e.tier1NativeRunners.find((x) => x.target === 'darwin/arm64');
  assert.equal(d.classification, 'NATIVE_EXECUTION_VERIFIED_THIN_CLIENT_ONLY');
  assert.ok(d.limitation);
  assert.ok(e.tier2CrossCompiledTargets.every((x) => x.nativeExecutionVerified === false));

  // AWS is tested with verified physical gate evidence
  const aws = e.hostProviders.find((p) => p.provider === 'aws');
  assert.equal(aws.matrixStatus, 'tested');
  assert.equal(aws.classification, 'PHYSICAL_GATE_VERIFIED');

  // Secondary host providers are partial / receipts_pending
  const secondary = ['directadmin', 'cpanel', 'ssh-vps', 'kubernetes'];
  for (const name of secondary) {
    const prov = e.hostProviders.find((p) => p.provider === name);
    assert.ok(prov, `Missing host provider in evidence: ${name}`);
    assert.equal(prov.matrixStatus, 'partial');
    assert.equal(prov.classification, 'PARTIAL_DISPOSABLE_RECEIPTS_PENDING');
    assert.match(prov.limitation, /receipts are pending/);
  }

  // Unsupported cloud providers fail closed
  const unsupported = ['gcp', 'azure'];
  for (const name of unsupported) {
    const prov = e.hostProviders.find((p) => p.provider === name);
    assert.ok(prov, `Missing host provider in evidence: ${name}`);
    assert.equal(prov.matrixStatus, 'unsupported');
    assert.equal(prov.classification, 'UNSUPPORTED_FAIL_CLOSED_BY_MATRIX');
  }
});

test('NATIVE-002: record bound to another SHA is rejected', async () => {
  await assert.rejects(build(() => ({ windowsRecord: rec('a'.repeat(40), 'win32', 'x64') })), /record SHA/);
});

test('NATIVE-003: record from the wrong platform is rejected', async () => {
  await assert.rejects(build((sha) => ({ linuxRecord: rec(sha, 'win32', 'x64', { ci: { runId: '1', runnerOs: 'Linux' } }) })), /observed win32\/x64, expected linux\/x64/);
});

test('NATIVE-004: failed suite is rejected', async () => {
  await assert.rejects(build((sha) => ({ windowsRecord: rec(sha, 'win32', 'x64', { suite: { totalTests: 10, passingTests: 9, failingTests: 1, status: 'FAILED' } }) })), /did not pass/);
});

test('NATIVE-005: Linux record without a hosted CI runner is rejected', async () => {
  await assert.rejects(build((sha) => ({ linuxRecord: rec(sha, 'linux', 'x64', { ci: null }) })), /hosted Linux CI runner/);
});

test('NATIVE-006: CI run on another SHA or failed darwin job is rejected', async () => {
  await assert.rejects(build(() => ({ lookup: okLookup('b'.repeat(40)) })), /headSha/);
  await assert.rejects(build((sha) => ({ lookup: () => ({ headSha: sha, status: 'completed', conclusion: 'failure', jobs: [{ name: 'darwin/arm64', conclusion: 'failure' }] }) })), /concluded failure/);
});

test('NATIVE-007: capture parser refuses to infer counts from empty output', async () => {
  const { parseCounts } = await import(CAP);
  assert.deepEqual(parseCounts('no summary here'), { tests: null, pass: null, fail: null });
  assert.deepEqual(parseCounts('ℹ tests 5\nℹ pass 4\nℹ fail 1'), { tests: 5, pass: 4, fail: 1 });
});
