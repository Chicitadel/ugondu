/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Branding / Brand Consistency & CLI Isolation Suite
 * File           : brand-consistency.test.js
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

async function runBrandConsistencyTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu Brand Consistency & Interface Isolation Suite         ');
  console.log('══════════════════════════════════════════════════════════════');

  const auditorUrl = pathToFileURL(path.join(ROOT, 'scripts/branding/audit-logo-usage.mjs')).href;
  const { auditLogoUsage } = await import(auditorUrl);

  const shared = require('../../server/shared/dist');

  await check('CONS-001', 'Authoritative logo references verified across README and packaging manifests', () => {
    const res = auditLogoUsage();
    assert.strictEqual(res.status, 'PASS');
  });

  await check('CONS-002', 'Shared web rendering component renders accessible WCAG 2.1 AA HTML markup', () => {
    assert.strictEqual(typeof shared.renderUgonduLogoHtml, 'function');
    const html = shared.renderUgonduLogoHtml({ variant: 'full', size: 'normal', altText: 'Ugondu Platform' });
    assert.ok(html.includes('<picture'));
    assert.ok(html.includes('/assets/brand/web/ugondu-logo.svg'));
    assert.ok(html.includes('/assets/brand/web/ugondu-logo.png'));
    assert.ok(html.includes('alt="Ugondu Platform"'));

    const decorativeHtml = shared.renderUgonduLogoHtml({ variant: 'symbol', decorative: true });
    assert.ok(decorativeHtml.includes('aria-hidden="true"'));
    assert.ok(decorativeHtml.includes('alt=""'));
  });

  await check('CONS-003', 'Brand color codes strictly match official specifications (#02438d and #f5ae04)', () => {
    const manifestPath = path.join(ROOT, 'assets/brand/manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.strictEqual(manifest.approvedColors.primaryBlue.hex, '#02438d');
    assert.strictEqual(manifest.approvedColors.goldenYellow.hex, '#f5ae04');
  });

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` Brand Consistency Results: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

runBrandConsistencyTests().catch((err) => {
  console.error('Fatal consistency test error:', err);
  process.exit(1);
});
