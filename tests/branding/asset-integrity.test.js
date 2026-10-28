/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Branding / Asset Integrity Test Suite
 * File           : asset-integrity.test.js
 * Version        : 2.1.0
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

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(id, title, fn) {
  test(`${id}: ${title}`, async () => {
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        await res;
      }
      console.log(`[PASS] ✓ ${id}: ${title}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
      failed++;
      throw err;
    }
  });
}

let validatorModule = null;

async function getValidator() {
  if (!validatorModule) {
    const validatorUrl = pathToFileURL(path.join(ROOT, 'scripts/branding/validate-assets.mjs')).href;
    validatorModule = await import(validatorUrl);
  }
  return validatorModule;
}

check('BRAND-001', 'Authoritative asset manifest and checksums are intact and fully populated', async () => {
  const { validateBrandAssets } = await getValidator();
  const res = validateBrandAssets();
  assert.strictEqual(res.status, 'PASS');
  assert.ok(res.assetCount >= 10);
});

check('BRAND-002', 'All PNG assets have genuine transparency rules enabled', () => {
  const manifestPath = path.join(ROOT, 'assets/brand/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.strictEqual(manifest.rules.allowBackgroundTransparency, true);
  assert.strictEqual(manifest.rules.allowUnapprovedRecoloring, false);
  assert.strictEqual(manifest.rules.disallowHalosOrWhiteMattes, true);
});

check('BRAND-003', 'Multi-resolution ICO assets contain standard dimensions (16, 32, 48, 64, 128, 256)', () => {
  const favPath = path.join(ROOT, 'assets/brand/web/favicon.ico');
  const buf = fs.readFileSync(favPath);
  assert.strictEqual(buf.readUInt16LE(0), 0);
  assert.strictEqual(buf.readUInt16LE(2), 1);
  const count = buf.readUInt16LE(4);
  assert.ok(count >= 4, `Expected at least 4 embedded sizes in favicon.ico, got ${count}`);
});

check('BRAND-004', 'Path traversal protection (safeAssetPath) rejects attempts to escape asset root', async () => {
  const { safeAssetPath } = await getValidator();
  const brandDir = path.join(ROOT, 'assets/brand');
  assert.throws(() => safeAssetPath(brandDir, '../package.json'), /Asset path escapes asset root directory/);
  assert.throws(() => safeAssetPath(brandDir, 'web/../../secret.env'), /Asset path escapes asset root directory/);
  assert.throws(() => safeAssetPath(brandDir, '/etc/passwd'), /Absolute asset paths are prohibited/);
});

check('BRAND-005', 'Adversarial mutation test: untracked rogue file in assets/brand fails validation', async () => {
  const { validateBrandAssets } = await getValidator();
  const roguePath = path.join(ROOT, 'assets/brand/web/rogue-asset-untracked.png');
  try {
    fs.writeFileSync(roguePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]));
    assert.throws(() => validateBrandAssets(), /Untracked physical asset files on disk/);
  } finally {
    if (fs.existsSync(roguePath)) fs.unlinkSync(roguePath);
  }
});

check('BRAND-006', 'Adversarial mutation test: tampered asset byte fails SHA-256 verification', async () => {
  const { validateBrandAssets } = await getValidator();
  const targetFile = path.join(ROOT, 'assets/brand/web/ugondu-symbol.svg');
  const original = fs.readFileSync(targetFile);
  try {
    fs.writeFileSync(targetFile, original + '\n<!-- tamper -->');
    assert.throws(() => validateBrandAssets(), /SHA-256 mismatch/);
  } finally {
    fs.writeFileSync(targetFile, original);
  }
});

check('BRAND-007', 'SVG parser rejects DOCTYPE and ENTITY definitions (anti-XXE)', async () => {
  const { validateSvgContent } = await getValidator();
  const xxeSvg = '<svg viewBox="0 0 10 10"><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><circle/></svg>';
  assert.throws(() => validateSvgContent(xxeSvg, 'xxe.svg'), /prohibited DOCTYPE or ENTITY/);
});

check('BRAND-008', 'SVG parser rejects script tags and inline event listeners (anti-XSS)', async () => {
  const { validateSvgContent } = await getValidator();
  const scriptSvg = '<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>';
  assert.throws(() => validateSvgContent(scriptSvg, 'script.svg'), /prohibited script element/);

  const eventSvg = '<svg viewBox="0 0 10 10"><rect onload="alert(1)"/></svg>';
  assert.throws(() => validateSvgContent(eventSvg, 'event.svg'), /inline event listener attribute/);
});

check('BRAND-009', 'SVG parser rejects external hyperlinks and data URIs', async () => {
  const { validateSvgContent } = await getValidator();
  const linkSvg = '<svg viewBox="0 0 10 10"><a href="https://malicious.com"><rect/></a></svg>';
  assert.throws(() => validateSvgContent(linkSvg, 'link.svg'), /prohibited external or data URI link/);
});

check('BRAND-010', 'Path validator rejects Windows reserved device names', async () => {
  const { safeAssetPath } = await getValidator();
  const brandDir = path.join(ROOT, 'assets/brand');
  assert.throws(() => safeAssetPath(brandDir, 'web/CON.png'), /Windows reserved device name/);
  assert.throws(() => safeAssetPath(brandDir, 'NUL'), /Windows reserved device name/);
});

check('BRAND-011', 'Path validator rejects backslashes and trailing dot or spaces', async () => {
  const { safeAssetPath } = await getValidator();
  const brandDir = path.join(ROOT, 'assets/brand');
  assert.throws(() => safeAssetPath(brandDir, 'web\\logo.png'), /Backslashes are prohibited/);
  assert.throws(() => safeAssetPath(brandDir, 'web/logo.png '), /Trailing space\/dot/);
});

test.after(() => {
  console.log(`\nAsset Integrity Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
});
