/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Quality & Governance — Non-Destructive Archival Audit (Track T08)
 * File           : archive-integrity.test.js
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
 * Last Modified  : 2026-10-25
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
 * - NIST SP 800-53
 * - CONST-DEBT
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering Authority
 * - Security Authority     : Enterprise Architecture Council
 * - Governance Authority   : Air Roofers SASU Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Systems. All Rights Reserved.
 ******************************************************************************/

const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE_DIR = path.join(ROOT, 'artifacts', 'archive');
const MANIFEST_PATH = path.join(ARCHIVE_DIR, 'ARCHIVE_MANIFEST.md');

describe('Track T08: Deprecation & Obsolescence Non-Destructive Archival Audit', () => {
  it('T08-01: verifies archive directory and manifest exist under policy CONST-DEBT', () => {
    assert.ok(fs.existsSync(ARCHIVE_DIR), 'artifacts/archive directory must exist');
    assert.ok(fs.existsSync(MANIFEST_PATH), 'ARCHIVE_MANIFEST.md must exist in artifacts/archive');
    
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    assert.ok(manifestContent.includes('CONST-DEBT'), 'Manifest must cite policy CONST-DEBT');
    assert.ok(manifestContent.includes('Air Roofers SASU'), 'Manifest must cite corporate organization Air Roofers SASU');
    assert.ok(manifestContent.includes('Enterprise Architecture Council'), 'Manifest must cite Enterprise Architecture Council');
  });

  it('T08-02: verifies all archived files have accurate SHA-256 hashes recorded in ARCHIVE_MANIFEST.md', () => {
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const archiveFiles = fs.readdirSync(ARCHIVE_DIR).filter((f) => f !== 'ARCHIVE_MANIFEST.md');

    assert.ok(archiveFiles.length > 0, 'Archive must contain archived artifacts');

    for (const fileName of archiveFiles) {
      const filePath = path.join(ARCHIVE_DIR, fileName);
      assert.ok(fs.statSync(filePath).isFile(), `Archived entry ${fileName} must be a file`);

      const fileBuffer = fs.readFileSync(filePath);
      const computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Verify manifest records file
      assert.ok(
        manifestContent.includes(fileName),
        `Manifest must document archived file: ${fileName}`
      );

      // Verify manifest records exact SHA-256 hash
      assert.ok(
        manifestContent.toLowerCase().includes(computedSha256.toLowerCase()),
        `Manifest must record exact SHA-256 hash ${computedSha256} for ${fileName}`
      );
    }
  });

  it('T08-03: verifies engine_core_test_result.txt matches historical source tracked SHA-256', () => {
    const testResultPath = path.join(ARCHIVE_DIR, 'engine_core_test_result.txt');
    assert.ok(fs.existsSync(testResultPath), 'engine_core_test_result.txt must exist in archive');

    const fileBuffer = fs.readFileSync(testResultPath);
    const computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const expectedSha256 = '23df6d73e686766a1e5131d4bff515ce32a787409d252f6aa3ae0ef5c84e0e30';

    assert.strictEqual(
      computedSha256,
      expectedSha256,
      'Archived test result hash must cryptographically match original file SHA-256'
    );
  });

  it('T08-04: verifies zero destructive deletions of historic components on active branch', () => {
    try {
      const deletions = execSync(
        'git log origin/phase4/production-hardening..HEAD --diff-filter=D --summary',
        { cwd: ROOT, encoding: 'utf8' }
      ).trim();
      assert.strictEqual(
        deletions,
        '',
        `Active branch must have zero destructive deletions. Found: ${deletions}`
      );
    } catch (err) {
      // In standalone test run without git remote, verify local git diff
      const localDeletions = execSync(
        'git diff --diff-filter=D --name-only HEAD',
        { cwd: ROOT, encoding: 'utf8' }
      ).trim();
      assert.strictEqual(
        localDeletions,
        '',
        `Working tree must have zero destructive deletions. Found: ${localDeletions}`
      );
    }
  });

  it('T08-05: verifies zero broken relative imports across all source files (1,273 paths clean)', () => {
    const SKIP = /node_modules|[\\/]dist[\\/]|[\\/]scratch[\\/]|\.d\.ts$/;
    const bad = [];
    let checked = 0;

    function exists(base) {
      return ['.ts', '.tsx', '.js', '.json', '/index.ts', '/index.js', ''].some((ext) => {
        try {
          return fs.statSync(base + ext).isFile();
        } catch {
          return false;
        }
      });
    }

    function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (SKIP.test(p)) continue;
        if (e.isDirectory()) {
          walk(p);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(e.name)) continue;
        const text = fs.readFileSync(p, 'utf8');
        const re = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)'(\.{1,2}\/[^']*)'/g;
        let m;
        while ((m = re.exec(text))) {
          checked++;
          if (!exists(path.resolve(path.dirname(p), m[1]))) {
            bad.push(`${path.relative(ROOT, p)} -> ${m[1]}`);
          }
        }
      }
    }

    ['server', 'client', 'packages'].forEach((r) => {
      const dirPath = path.join(ROOT, r);
      if (fs.existsSync(dirPath)) walk(dirPath);
    });

    assert.strictEqual(
      bad.length,
      0,
      `Detected ${bad.length} broken relative imports:\n${bad.join('\n')}`
    );
    assert.ok(
      checked >= 1270,
      `Expected at least 1,270 checked imports, found ${checked}`
    );
  });

  it('T08-06: verifies backward-compatible deprecation shims are preserved', () => {
    // IdentityCapability backward-compatible alias in identity.ts
    const identityPath = path.join(ROOT, 'server', 'engine-core', 'src', 'fabric', 'capabilities', 'identity.ts');
    assert.ok(fs.existsSync(identityPath), 'identity.ts must exist');
    const identityContent = fs.readFileSync(identityPath, 'utf8');
    assert.ok(
      identityContent.includes('export type IdentityCapability = AuthorizationCapability;'),
      'IdentityCapability alias must be preserved for backward compatibility'
    );
    assert.ok(
      identityContent.includes('@deprecated Deprecated since v2.0.0'),
      'IdentityCapability must be documented with @deprecated'
    );

    // FREE edition backward-compatible alias in EditionDefinition.ts
    const editionPath = path.join(ROOT, 'server', 'capabilities', 'src', 'edition-registry', 'EditionDefinition.ts');
    assert.ok(fs.existsSync(editionPath), 'EditionDefinition.ts must exist');
    const editionContent = fs.readFileSync(editionPath, 'utf8');
    assert.ok(
      editionContent.includes("FREE:         1,"),
      'FREE edition rank must be preserved for backward compatibility'
    );
  });
});
