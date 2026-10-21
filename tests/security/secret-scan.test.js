/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Security — Secret Scanning & History Verification Suite
 * File           : secret-scan.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 (V14.3) / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');

let scannerModule = null;

async function getScanner() {
  if (!scannerModule) {
    const scannerUrl = pathToFileURL(path.join(ROOT, 'scripts/release/secret-scan.mjs')).href;
    scannerModule = await import(scannerUrl);
  }
  return scannerModule;
}

test('SEC-SCAN-001: Clean repository passes secret scan with 0 unapproved findings', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpOut = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-sec-out-'));
  try {
    const res = await executeSecretScan({ targetDir: ROOT, outDir: tmpOut });
    assert.strictEqual(res.status, 'PASS');
    assert.strictEqual(res.findingsCount, 0);

    const sarifFile = path.join(tmpOut, 'security/secrets-scan.sarif');
    assert.ok(fs.existsSync(sarifFile));
    const sarif = JSON.parse(fs.readFileSync(sarifFile, 'utf8'));
    assert.strictEqual(sarif.version, '2.1.0');
    assert.strictEqual(sarif.runs[0].results.length, 0);
  } finally {
    fs.rmSync(tmpOut, { recursive: true, force: true });
  }
});

test('SEC-SCAN-002: Seeded unencrypted private key in tree is detected and fails scan', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-git-test-'));
  try {
    execFileSync('git', ['init'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: tmpDir });

    const fakeKeyPath = path.join(tmpDir, 'leak.pem');
    const header = ['-----BEGIN', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
    const footer = ['-----END', 'RSA', 'PRIVATE', 'KEY-----'].join(' ');
    fs.writeFileSync(fakeKeyPath, `${header}\nMIIEowIBAAKCAQEAzfake\n${footer}\n`);
    execFileSync('git', ['add', 'leak.pem'], { cwd: tmpDir });

    const res = await executeSecretScan({ targetDir: tmpDir });
    assert.strictEqual(res.status, 'FAIL');
    assert.ok(res.findingsCount >= 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SEC-SCAN-003: Seeded secret in deleted git commit history is detected and fails scan', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-hist-test-'));
  try {
    execFileSync('git', ['init'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: tmpDir });

    // Commit 1: add secret
    const secretFile = path.join(tmpDir, 'token.txt');
    const token = ['ghp_', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'].join('');
    fs.writeFileSync(secretFile, `${token}\n`);
    execFileSync('git', ['add', 'token.txt'], { cwd: tmpDir });
    execFileSync('git', ['commit', '-m', 'Add token'], { cwd: tmpDir });

    // Commit 2: delete secret file
    fs.unlinkSync(secretFile);
    execFileSync('git', ['add', '-A'], { cwd: tmpDir });
    execFileSync('git', ['commit', '-m', 'Remove token'], { cwd: tmpDir });

    // File is not in working tree, but is in history
    assert.ok(!fs.existsSync(secretFile));
    const res = await executeSecretScan({ targetDir: tmpDir });
    assert.strictEqual(res.status, 'FAIL', 'Secret scanner must detect historical commits');
    assert.ok(res.findingsCount >= 1);
    assert.strictEqual(res.sarif.runs[0].results[0].ruleId, 'github-personal-token');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SEC-SCAN-004: Valid non-expired allowlist entry suppresses intentional test fixture', async () => {
  const allowlistPath = path.join(ROOT, 'config/security/secret-allowlist.json');
  assert.ok(fs.existsSync(allowlistPath));
  const raw = JSON.parse(fs.readFileSync(allowlistPath, 'utf8'));
  assert.ok(Array.isArray(raw.entries));
  assert.ok(raw.entries.length >= 1);

  for (const entry of raw.entries) {
    assert.ok(entry.fingerprint);
    assert.ok(entry.reason);
    assert.ok(entry.reviewer);
    assert.ok(entry.expiryDate);
    assert.ok(Date.parse(entry.expiryDate) > Date.now(), 'Allowlist entries must not be expired');
  }
});

test('SEC-SCAN-005: Expired allowlist entries are strictly ignored and fail scan on violation', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-expiry-test-'));
  try {
    execFileSync('git', ['init'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: tmpDir });

    const leakFile = path.join(tmpDir, 'leak.txt');
    const token = ['ghp_', 'EXPIREDENTRYTESTING0123456789ABCDEFG'].join('');
    fs.writeFileSync(leakFile, `${token}\n`);
    execFileSync('git', ['add', 'leak.txt'], { cwd: tmpDir });

    const res = await executeSecretScan({ targetDir: tmpDir });
    assert.strictEqual(res.status, 'FAIL', 'Un-allowlisted or expired token must fail closed');
    assert.ok(res.findingsCount >= 1);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});


test('SEC-SCAN-006: Git enumeration failure aborts instead of reporting an empty scan', async () => {
  const { executeSecretScan } = await getScanner();
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-sec-invalid-root-'));
  const missingRepo = path.join(parent, 'missing-repository');
  try {
    await assert.rejects(
      executeSecretScan({ targetDir: missingRepo }),
      /Failed to enumerate tracked files for secret scan/
    );
  } finally {
    fs.rmSync(parent, { recursive: true, force: true });
  }
});
