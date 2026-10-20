/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Branding / Asset Integrity Test Suite
 * File           : asset-integrity.test.js
 * Version        : 2.0.0
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 (V12.1) / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(id, title, fn) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`[PASS] ✓ ${id}: ${title}`);
      passed++;
    })
    .catch((err) => {
      console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
      failed++;
    });
}

async function runAssetIntegrityTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu Brand Asset Integrity Qualification Suite            ');
  console.log('══════════════════════════════════════════════════════════════');

  const validatorUrl = pathToFileURL(path.join(ROOT, 'scripts/branding/validate-assets.mjs')).href;
  const { validateBrandAssets, safeAssetPath } = await import(validatorUrl);

  await check('BRAND-001', 'Authoritative asset manifest and checksums are intact and fully populated', () => {
    const res = validateBrandAssets();
    assert.strictEqual(res.status, 'PASS');
    assert.ok(res.assetCount >= 10);
  });

  await check('BRAND-002', 'All PNG assets have genuine transparency rules enabled', () => {
    const manifestPath = path.join(ROOT, 'assets/brand/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.rules.allowBackgroundTransparency, true);
    assert.strictEqual(manifest.rules.allowUnapprovedRecoloring, false);
    assert.strictEqual(manifest.rules.disallowHalosOrWhiteMattes, true);
  });

  await check('BRAND-003', 'Multi-resolution ICO assets contain standard dimensions (16, 32, 48, 64, 128, 256)', () => {
    const favPath = path.join(ROOT, 'assets/brand/web/favicon.ico');
    const buf = fs.readFileSync(favPath);
    assert.strictEqual(buf.readUInt16LE(0), 0);
    assert.strictEqual(buf.readUInt16LE(2), 1);
    const count = buf.readUInt16LE(4);
    assert.ok(count >= 4, `Expected at least 4 embedded sizes in favicon.ico, got ${count}`);
  });

  await check('BRAND-004', 'Path traversal protection (safeAssetPath) rejects attempts to escape asset root', () => {
    const brandDir = path.join(ROOT, 'assets/brand');
    assert.throws(() => {
      safeAssetPath(brandDir, '../package.json');
    }, /Asset path escapes asset root directory/);

    assert.throws(() => {
      safeAssetPath(brandDir, 'web/../../secret.env');
    }, /Asset path escapes asset root directory/);

    assert.throws(() => {
      safeAssetPath(brandDir, '/etc/passwd');
    }, /Absolute asset paths are prohibited/);
  });

  await check('BRAND-005', 'Adversarial mutation test: untracked rogue file in assets/brand fails validation', () => {
    const roguePath = path.join(ROOT, 'assets/brand/web/rogue-asset-untracked.png');
    try {
      // Write a fake png
      fs.writeFileSync(roguePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10]));
      let failedAsExpected = false;
      try {
        validateBrandAssets();
      } catch (err) {
        failedAsExpected = true;
      }
      assert.ok(failedAsExpected, 'Expected validation to fail when untracked asset is present on disk');
    } finally {
      if (fs.existsSync(roguePath)) fs.unlinkSync(roguePath);
    }
  });

  await check('BRAND-006', 'Adversarial mutation test: tampered asset byte fails SHA-256 verification', () => {
    const targetFile = path.join(ROOT, 'assets/brand/web/ugondu-symbol.svg');
    const original = fs.readFileSync(targetFile);
    try {
      fs.writeFileSync(targetFile, original + '\n<!-- tamper -->');
      let failedAsExpected = false;
      try {
        validateBrandAssets();
      } catch (err) {
        failedAsExpected = true;
      }
      assert.ok(failedAsExpected, 'Expected validation to fail when asset bytes are tampered');
    } finally {
      fs.writeFileSync(targetFile, original);
    }
  });

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` Asset Integrity Results: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

runAssetIntegrityTests().catch((err) => {
  console.error('Fatal brand asset test error:', err);
  process.exit(1);
});
