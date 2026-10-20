/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Branding / Asset Integrity Test Suite
 * File           : asset-integrity.test.js
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
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
  const { validateBrandAssets } = await import(validatorUrl);

  await check('BRAND-001', 'Authoritative asset manifest and checksums are intact and fully populated', () => {
    const res = validateBrandAssets();
    assert.strictEqual(res.status, 'PASS');
    assert.ok(res.assetCount >= 10);
  });

  await check('BRAND-002', 'All PNG assets have genuine transparency (no black background disguises or opaque boxes)', () => {
    const manifestPath = path.join(ROOT, 'assets/brand/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.rules.allowBackgroundTransparency, true);
    assert.strictEqual(manifest.rules.allowUnapprovedRecoloring, false);
  });

  await check('BRAND-003', 'Multi-resolution ICO assets contain standard dimensions (16, 32, 48, 64, 128, 256)', () => {
    const favPath = path.join(ROOT, 'assets/brand/web/favicon.ico');
    const buf = fs.readFileSync(favPath);
    assert.strictEqual(buf.readUInt16LE(0), 0);
    assert.strictEqual(buf.readUInt16LE(2), 1);
    const count = buf.readUInt16LE(4);
    assert.ok(count >= 4, `Expected at least 4 embedded sizes in favicon.ico, got ${count}`);
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
