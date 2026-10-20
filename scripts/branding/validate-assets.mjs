#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Branding / Asset Integrity & Conformance Validator
 * File           : validate-assets.mjs
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
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const BRAND_DIR = path.join(ROOT, 'assets/brand');
const MANIFEST_PATH = path.join(BRAND_DIR, 'manifest.json');
const CHECKSUMS_PATH = path.join(BRAND_DIR, 'checksums.sha256');

function block(msg) {
  console.error(`[FAIL] Brand Asset Validation Error: ${msg}`);
  process.exit(1);
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function validateBrandAssets() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    block(`Missing brand manifest at ${path.relative(ROOT, MANIFEST_PATH)}`);
  }
  if (!fs.existsSync(CHECKSUMS_PATH)) {
    block(`Missing checksums file at ${path.relative(ROOT, CHECKSUMS_PATH)}`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  if (manifest.schemaVersion !== '1.0.0' || manifest.product !== 'Ugondu') {
    block('Invalid manifest schemaVersion or product');
  }

  // 1. Verify all checksum entries
  const checksumLines = fs
    .readFileSync(CHECKSUMS_PATH, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (checksumLines.length < 10) {
    block(`Expected at least 10 checksum entries, found ${checksumLines.length}`);
  }

  for (const line of checksumLines) {
    const parts = line.split(/\s+/);
    if (parts.length !== 2) block(`Malformed checksum line: ${line}`);
    const [expectedSha, relPath] = parts;
    const absPath = path.join(BRAND_DIR, relPath);
    if (!fs.existsSync(absPath)) {
      block(`Declared brand asset missing on disk: ${relPath}`);
    }
    const actualSha = sha256Buffer(fs.readFileSync(absPath));
    if (actualSha !== expectedSha) {
      block(`SHA-256 mismatch for ${relPath}: expected ${expectedSha}, got ${actualSha}`);
    }
  }

  // 2. Validate SVGs are well-formed XML and contain approved brand colors
  const svgFiles = [
    'web/ugondu-logo.svg',
    'web/ugondu-symbol.svg',
    'documentation/ugondu-logo.svg'
  ];
  for (const rel of svgFiles) {
    const full = path.join(BRAND_DIR, rel);
    if (!fs.existsSync(full)) block(`Required SVG missing: ${rel}`);
    const content = fs.readFileSync(full, 'utf8');
    if (!content.startsWith('<svg') && !content.startsWith('<?xml')) {
      block(`SVG does not start with valid markup: ${rel}`);
    }
    if (!content.includes('</svg>')) {
      block(`SVG missing closing tag: ${rel}`);
    }
    if (!content.includes('#02438d') || !content.includes('#f5ae04')) {
      block(`SVG missing approved brand colors (#02438d, #f5ae04): ${rel}`);
    }
    if (/<script\b/i.test(content) || /javascript:/i.test(content)) {
      block(`SVG contains prohibited script element or URI: ${rel}`);
    }
  }

  // 3. Validate ICO files
  const icoFiles = ['web/favicon.ico', 'desktop/app-icon.ico'];
  for (const rel of icoFiles) {
    const full = path.join(BRAND_DIR, rel);
    if (!fs.existsSync(full)) block(`Required ICO missing: ${rel}`);
    const buf = fs.readFileSync(full);
    if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
      block(`Invalid ICO header: ${rel}`);
    }
    const iconCount = buf.readUInt16LE(4);
    if (iconCount < 4) {
      block(`ICO file ${rel} has fewer than 4 resolutions (${iconCount})`);
    }
  }

  console.log(`[PASS] Verified ${checksumLines.length} brand assets against manifest and checksums with zero defects.`);
  return { status: 'PASS', assetCount: checksumLines.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  validateBrandAssets();
}
