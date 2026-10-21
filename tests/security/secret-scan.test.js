/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Security — Secret Scanning & History Verification Suite
 * File           : secret-scan.test.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-21
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

function makeFileUnreadable(filePath) {
  if (process.platform === 'win32') {
    execFileSync('icacls', [filePath, '/deny', 'Everyone:(R)']);
  } else {
    fs.chmodSync(filePath, 0o000);
  }
}

function restoreFileReadable(filePath) {
  try {
    if (process.platform === 'win32') {
      execFileSync('icacls', [filePath, '/remove:d', 'Everyone']);
    } else {
      fs.chmodSync(filePath, 0o644);
    }
  } catch {
    // Ignore cleanup errors during recovery
  }
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

test('SEC-SCAN-005: Expired allowlist entries are ignored and fail scan on violation', async () => {
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

    // 1. Create allowlist with EXPIRED entry -> MUST FAIL scan
    const configDir = path.join(tmpDir, 'config/security');
    fs.mkdirSync(configDir, { recursive: true });
    const allowlistPath = path.join(configDir, 'secret-allowlist.json');

    const expiredConfig = {
      schemaVersion: '1.0.0',
      entries: [
        {
          fingerprint: 'mock-expired-fingerprint',
          ruleId: 'github-personal-token',
          filePath: 'leak.txt',
          reason: 'Expired test exception',
          reviewer: 'Security Authority',
          expiryDate: '2020-01-01T00:00:00Z'
        }
      ]
    };
    fs.writeFileSync(allowlistPath, JSON.stringify(expiredConfig, null, 2));

    const expiredRes = await executeSecretScan({ targetDir: tmpDir });
    assert.strictEqual(expiredRes.status, 'FAIL', 'Expired allowlist entry must be ignored and fail scan');
    assert.strictEqual(expiredRes.findingsCount, 1);

    // 2. Update entry with unexpired active expiryDate -> MUST PASS scan
    const activeConfig = {
      schemaVersion: '1.0.0',
      entries: [
        {
          ruleId: 'github-personal-token',
          filePath: 'leak.txt',
          reason: 'Active test exception',
          reviewer: 'Security Authority',
          expiryDate: '2099-01-01T00:00:00Z'
        }
      ]
    };
    fs.writeFileSync(allowlistPath, JSON.stringify(activeConfig, null, 2));

    const activeRes = await executeSecretScan({ targetDir: tmpDir });
    assert.strictEqual(activeRes.status, 'PASS', 'Valid unexpired allowlist entry must suppress finding');
    assert.strictEqual(activeRes.findingsCount, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SEC-SCAN-006: Malformed secret-allowlist.json causes scan to fail closed (throws)', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-malformed-allowlist-'));
  try {
    execFileSync('git', ['init'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: tmpDir });

    const configDir = path.join(tmpDir, 'config/security');
    fs.mkdirSync(configDir, { recursive: true });
    const allowlistFile = path.join(configDir, 'secret-allowlist.json');

    // Subcase 1: Invalid JSON syntax throws descriptive error
    fs.writeFileSync(allowlistFile, '{\n  "schemaVersion": "1.0.0",\n  "entries": [ broken syntax\n');
    await assert.rejects(
      async () => {
        await executeSecretScan({ targetDir: tmpDir });
      },
      /Malformed JSON in secret allowlist/
    );

    // Subcase 2: Invalid schema: entries is not an array throws descriptive error
    fs.writeFileSync(allowlistFile, JSON.stringify({ schemaVersion: '1.0.0', entries: 'invalid-string' }));
    await assert.rejects(
      async () => {
        await executeSecretScan({ targetDir: tmpDir });
      },
      /missing required 'entries' array/
    );

    // Subcase 3: Invalid schema: entry missing expiryDate throws descriptive error
    fs.writeFileSync(
      allowlistFile,
      JSON.stringify({
        schemaVersion: '1.0.0',
        entries: [{ ruleId: 'aws-access-key-id', filePath: 'test.txt' }]
      })
    );
    await assert.rejects(
      async () => {
        await executeSecretScan({ targetDir: tmpDir });
      },
      /missing required 'expiryDate' string/
    );

    // Subcase 4: Invalid schema: entry has unparseable expiryDate throws descriptive error
    fs.writeFileSync(
      allowlistFile,
      JSON.stringify({
        schemaVersion: '1.0.0',
        entries: [{ ruleId: 'aws-access-key-id', filePath: 'test.txt', expiryDate: 'not-a-date' }]
      })
    );
    await assert.rejects(
      async () => {
        await executeSecretScan({ targetDir: tmpDir });
      },
      /has invalid 'expiryDate'/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SEC-SCAN-007: Unreadable tracked file causes scan to fail closed (throws)', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-unreadable-file-'));
  const lockedFile = path.join(tmpDir, 'locked-secret-audit.txt');
  try {
    execFileSync('git', ['init'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.name', 'Test'], { cwd: tmpDir });
    execFileSync('git', ['config', 'user.email', 'test@test.local'], { cwd: tmpDir });

    fs.writeFileSync(lockedFile, 'safe contents here\n');
    execFileSync('git', ['add', 'locked-secret-audit.txt'], { cwd: tmpDir });
    execFileSync('git', ['commit', '-m', 'Add tracked file'], { cwd: tmpDir });

    makeFileUnreadable(lockedFile);

    await assert.rejects(
      async () => {
        await executeSecretScan({ targetDir: tmpDir });
      },
      /Failed to read tracked file 'locked-secret-audit\.txt'/
    );
  } finally {
    restoreFileReadable(lockedFile);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('SEC-SCAN-008: Git enumeration failure causes scan to fail closed (throws)', async () => {
  const { executeSecretScan } = await getScanner();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-non-git-dir-'));
  try {
    // tmpDir has not been initialized with git
    await assert.rejects(
      async () => {
        await executeSecretScan({ targetDir: tmpDir });
      },
      /Failed to enumerate tracked files via 'git ls-files'/
    );
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
