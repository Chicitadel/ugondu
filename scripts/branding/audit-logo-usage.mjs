#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Branding / Usage & Zero-Pollution Audit Script
 * File           : audit-logo-usage.mjs
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

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

function block(msg) {
  console.error(`[FAIL] Logo Usage Audit Error: ${msg}`);
  process.exit(1);
}

export function auditLogoUsage() {
  // 1. Audit README.md references authoritative brand logo
  const readmePath = path.join(ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) block('README.md missing');
  const readme = fs.readFileSync(readmePath, 'utf8');
  if (!readme.includes('assets/brand/web/ugondu-logo.svg') && !readme.includes('assets/brand/documentation/ugondu-logo.svg')) {
    block('README.md does not reference authoritative brand logo');
  }

  // 2. Audit .goreleaser.yml references assets/brand/
  const goreleaserPath = path.join(ROOT, '.goreleaser.yml');
  if (!fs.existsSync(goreleaserPath)) block('.goreleaser.yml missing');
  const goreleaser = fs.readFileSync(goreleaserPath, 'utf8');
  if (!goreleaser.includes('assets/brand')) {
    block('.goreleaser.yml does not package assets/brand/');
  }

  // 3. Verify server/shared/index.ts exports brand logo helper
  const sharedIndexPath = path.join(ROOT, 'server/shared/index.ts');
  const sharedIndex = fs.readFileSync(sharedIndexPath, 'utf8');
  if (!sharedIndex.includes("export * from './brand/logo';")) {
    block("server/shared/index.ts missing export for './brand/logo'");
  }

  console.log('[PASS] Logo usage audit: authoritative references verified across README, packaging, and shared components.');
  return { status: 'PASS' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  auditLogoUsage();
}
