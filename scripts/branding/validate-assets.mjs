#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Branding / Hardened Asset Integrity & Conformance Validator
 * File           : validate-assets.mjs
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

const METADATA_FILES = new Set(['manifest.json', 'checksums.sha256', 'README.md']);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\..*)?$/i;

function block(msg) {
  throw new Error(`[FAIL] Brand Asset Validation Error: ${msg}`);
}

function normalizePosix(p) {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * Validates that an asset path does not escape the root, contains no illegal
 * characters, and is not a symlink/junction.
 */
export function safeAssetPath(root, relPath) {
  if (!relPath || typeof relPath !== 'string' || relPath.includes('\0')) {
    block(`Invalid asset path: ${relPath}`);
  }
  if (path.isAbsolute(relPath)) {
    block(`Absolute asset paths are prohibited: ${relPath}`);
  }
  if (relPath.includes('\\')) {
    block(`Backslashes are prohibited in asset path: ${relPath}`);
  }

  const segments = relPath.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      block(`Asset path escapes asset root directory: ${relPath}`);
    }
    if (seg.endsWith(' ') || seg.endsWith('.')) {
      block(`Trailing space/dot in filename prohibited: "${seg}" in ${relPath}`);
    }
    if (WINDOWS_RESERVED.test(seg)) {
      block(`Windows reserved device name prohibited: "${seg}" in ${relPath}`);
    }
  }

  const normalized = normalizePosix(path.normalize(relPath));
  const resolved = path.resolve(root, normalized);
  const rel = path.relative(root, resolved);

  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    block(`Asset path escapes asset root directory: ${relPath}`);
  }

  // Symlink and junction rejection via lstat
  if (fs.existsSync(resolved)) {
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink()) {
      block(`Symbolic links and junctions are prohibited: ${relPath}`);
    }
    if (!stat.isFile()) {
      block(`Asset path must refer to a regular file: ${relPath}`);
    }
    const real = fs.realpathSync(resolved);
    const realRel = path.relative(fs.realpathSync(root), real);
    if (realRel.startsWith('..') || path.isAbsolute(realRel)) {
      block(`Symlink canonical target escapes root: ${relPath} -> ${real}`);
    }
  }

  return resolved;
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function extractLeafPaths(obj) {
  const result = new Set();
  function walk(curr) {
    if (typeof curr === 'string') {
      result.add(normalizePosix(curr));
    } else if (curr && typeof curr === 'object') {
      for (const val of Object.values(curr)) {
        walk(val);
      }
    }
  }
  walk(obj);
  return result;
}

function walkRegularFiles(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const stat = fs.lstatSync(full);
    if (stat.isSymbolicLink()) {
      block(`Symlink detected in brand directory: ${path.relative(baseDir, full)}`);
    }
    if (ent.isDirectory()) {
      files.push(...walkRegularFiles(full, baseDir));
    } else if (ent.isFile()) {
      const rel = normalizePosix(path.relative(baseDir, full));
      if (!METADATA_FILES.has(rel) && !ent.name.startsWith('.')) {
        files.push(rel);
      }
    }
  }
  return files;
}

function validatePng(absPath, relPath) {
  const buf = fs.readFileSync(absPath);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_MAGIC)) {
    block(`Invalid PNG header/magic bytes: ${relPath}`);
  }
  if (buf.toString('ascii', 12, 16) !== 'IHDR') {
    block(`PNG missing initial IHDR chunk: ${relPath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width === 0 || height === 0) {
    block(`PNG invalid dimensions (${width}x${height}): ${relPath}`);
  }
  const bitDepth = buf.readUInt8(24);
  const colorType = buf.readUInt8(25);
  if (![0, 2, 3, 4, 6].includes(colorType)) {
    block(`PNG invalid color type (${colorType}): ${relPath}`);
  }
  if (![1, 2, 4, 8, 16].includes(bitDepth)) {
    block(`PNG invalid bit depth (${bitDepth}): ${relPath}`);
  }

  // Verify chunk sequence has IDAT and terminates with IEND
  let offset = 8;
  let hasIdat = false;
  let hasIend = false;
  while (offset + 12 <= buf.length) {
    const chunkLen = buf.readUInt32BE(offset);
    const chunkType = buf.toString('ascii', offset + 4, offset + 8);
    if (chunkType === 'IDAT') hasIdat = true;
    if (chunkType === 'IEND') {
      hasIend = true;
      break;
    }
    offset += 12 + chunkLen;
  }
  if (!hasIdat) block(`PNG missing IDAT image data chunk: ${relPath}`);
  if (!hasIend) block(`PNG missing terminal IEND chunk: ${relPath}`);
}

export function validateSvgContent(content, relPath, approvedColors = []) {
  if (!content.startsWith('<svg') && !content.startsWith('<?xml')) {
    block(`SVG does not start with valid markup: ${relPath}`);
  }
  if (!content.includes('</svg>')) {
    block(`SVG missing closing tag: ${relPath}`);
  }

  // Anti-XXE
  if (/<!DOCTYPE/i.test(content) || /<!ENTITY/i.test(content)) {
    block(`SVG contains prohibited DOCTYPE or ENTITY definition: ${relPath}`);
  }

  // Anti-XSS / Injection
  if (/<script\b/i.test(content) || /javascript:/i.test(content)) {
    block(`SVG contains prohibited script element or URI: ${relPath}`);
  }
  if (/\son[a-zA-Z]+\s*=/i.test(content)) {
    block(`SVG contains inline event listener attribute: ${relPath}`);
  }
  if (/<foreignObject\b/i.test(content)) {
    block(`SVG contains prohibited foreignObject element: ${relPath}`);
  }
  if (/(?:href|xlink:href)\s*=\s*(?:"|')(?:https?:|\/\/|data:)/i.test(content)) {
    block(`SVG contains prohibited external or data URI link: ${relPath}`);
  }

  // Root SVG element inspection
  const rootMatch = content.match(/<svg\b([^>]*)>/i);
  if (!rootMatch) {
    block(`SVG missing root <svg> tag: ${relPath}`);
  }
  const rootAttrs = rootMatch[1];
  const hasViewBox = /viewBox\s*=/i.test(rootAttrs);
  const hasWidth = /width\s*=/i.test(rootAttrs);
  const hasHeight = /height\s*=/i.test(rootAttrs);
  if (!hasViewBox && !(hasWidth && hasHeight)) {
    block(`SVG root element must declare viewBox or width/height attributes: ${relPath}`);
  }

  // Color compliance
  for (const color of approvedColors) {
    if (!content.toLowerCase().includes(color.toLowerCase())) {
      block(`SVG missing required brand color (${color}): ${relPath}`);
    }
  }
}

function validateIco(absPath, relPath) {
  const buf = fs.readFileSync(absPath);
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) {
    block(`Invalid ICO header: ${relPath}`);
  }
  const count = buf.readUInt16LE(4);
  if (count < 4) {
    block(`ICO file ${relPath} has fewer than 4 resolutions (${count})`);
  }

  for (let i = 0; i < count; i++) {
    const entryOffset = 6 + i * 16;
    if (entryOffset + 16 > buf.length) {
      block(`ICO entry directory out of bounds: ${relPath}`);
    }
    const byteSize = buf.readUInt32LE(entryOffset + 8);
    const dataOffset = buf.readUInt32LE(entryOffset + 12);
    if (dataOffset + byteSize > buf.length) {
      block(`ICO image data out of bounds: ${relPath}`);
    }
  }
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

  const approvedHex = manifest.approvedColors
    ? Object.values(manifest.approvedColors).map((c) => c.hex)
    : ['#02438d', '#f5ae04'];

  // 1. Extract manifest asset paths
  const manifestPaths = extractLeafPaths(manifest.assets);

  // Check for case-colliding duplicates
  const lowerMap = new Map();
  for (const p of manifestPaths) {
    const low = p.toLowerCase();
    if (lowerMap.has(low)) {
      block(`Case-colliding duplicate path in manifest: "${p}" and "${lowerMap.get(low)}"`);
    }
    lowerMap.set(low, p);
  }

  // 2. Parse checksum file lines
  const checksumLines = fs
    .readFileSync(CHECKSUMS_PATH, 'utf8')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const checksumMap = new Map();
  for (const line of checksumLines) {
    const parts = line.split(/\s+/);
    if (parts.length !== 2) block(`Malformed checksum line: ${line}`);
    const [expectedSha, rawPath] = parts;
    const rel = normalizePosix(rawPath);
    if (checksumMap.has(rel)) {
      block(`Duplicate checksum entry for path: ${rel}`);
    }
    checksumMap.set(rel, expectedSha);
  }
  const checksumPaths = new Set(checksumMap.keys());

  // 3. Scan physical disk files
  const diskFilesList = walkRegularFiles(BRAND_DIR);
  const diskPaths = new Set(diskFilesList);

  // 4. Exact 3-Way Set Equality Verification
  const manifestDiffChecksum = [...manifestPaths].filter((p) => !checksumPaths.has(p));
  const checksumDiffManifest = [...checksumPaths].filter((p) => !manifestPaths.has(p));
  const diskDiffManifest = [...diskPaths].filter((p) => !manifestPaths.has(p));
  const manifestDiffDisk = [...manifestPaths].filter((p) => !diskPaths.has(p));

  if (manifestDiffChecksum.length > 0) {
    block(`Assets declared in manifest but missing from checksums: ${manifestDiffChecksum.join(', ')}`);
  }
  if (checksumDiffManifest.length > 0) {
    block(`Assets declared in checksums but missing from manifest: ${checksumDiffManifest.join(', ')}`);
  }
  if (diskDiffManifest.length > 0) {
    block(`Untracked physical asset files on disk not in manifest: ${diskDiffManifest.join(', ')}`);
  }
  if (manifestDiffDisk.length > 0) {
    block(`Manifest asset files missing on disk: ${manifestDiffDisk.join(', ')}`);
  }

  // 5. Verify cryptographic hashes and deep format decoding
  for (const [relPath, expectedSha] of checksumMap.entries()) {
    const absPath = safeAssetPath(BRAND_DIR, relPath);
    if (!fs.existsSync(absPath)) {
      block(`Declared brand asset missing on disk: ${relPath}`);
    }
    const buf = fs.readFileSync(absPath);
    const actualSha = sha256Buffer(buf);
    if (actualSha !== expectedSha) {
      block(`SHA-256 mismatch for ${relPath}: expected ${expectedSha}, got ${actualSha}`);
    }

    const ext = path.extname(relPath).toLowerCase();
    if (ext === '.png') {
      validatePng(absPath, relPath);
    } else if (ext === '.svg') {
      validateSvgContent(buf.toString('utf8'), relPath, approvedHex);
    } else if (ext === '.ico') {
      validateIco(absPath, relPath);
    }
  }

  console.log(`[PASS] Exact 3-way set equality confirmed: Manifest(${manifestPaths.size}) == Checksums(${checksumPaths.size}) == Disk(${diskPaths.size}). All hashes and formats verified.`);
  return { status: 'PASS', assetCount: checksumPaths.size };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  try {
    validateBrandAssets();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
