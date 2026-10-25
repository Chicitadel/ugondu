/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Scripts / Governance / Tokenization Verification
 * File           : verify-tokenization-t03.mjs
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
 * - Zero String Hardcoding
 *
 * Standards:
 * - UJP-UIX-007
 * - AR-GOV-REG-002
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Enterprise Architecture Council
 * - Security Authority     : Corporate Governance Authority
 * - Governance Authority   : Air Roofers SASU
 * - Deployment Authority   : Systems Engineering Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hasDictionaryToken, loadRequiredDictionary } from './required-dictionary.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const productionWorkspaces = [
  { id: 'engine-core', name: 'server/engine-core', dir: 'server/engine-core' },
  { id: 'shared', name: 'server/shared', dir: 'server/shared' },
  { id: 'uppie', name: 'server/uppie', dir: 'server/uppie' },
  { id: 'billing-gateway', name: 'server/billing-gateway', dir: 'server/billing-gateway' },
  { id: 'plugin-manager', name: 'server/plugin-manager', dir: 'server/plugin-manager' },
  { id: 'event-bus', name: 'server/event-bus', dir: 'server/event-bus' },
  { id: 'repository-adapter', name: 'server/repository-adapter', dir: 'server/repository-adapter' }
];

const skipDirs = new Set(['node_modules', 'dist', '.git', 'locales', 'keys', 'schemas', 'tests', '__tests__']);

// Load dictionaries
const sharedLocalesDir = path.join(rootDir, 'server/shared/locales');
const rootLocalesDir = path.join(rootDir, 'locales');

function flattenDictionary(source, prefix = '', target = {}) {
  for (const [key, value] of Object.entries(source)) {
    const token = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenDictionary(value, token, target);
    } else {
      target[token] = String(value);
    }
  }
  return target;
}

const dictionaryErrors = [];

function loadDictionary(dirPath, filename) {
  const filePath = path.join(dirPath, filename);
  try {
    return loadRequiredDictionary(filePath, flattenDictionary);
  } catch (err) {
    dictionaryErrors.push(err.message);
    console.error(`[T03] Required dictionary failure: ${err.message}`);
    return {};
  }
}

const sharedEn = loadDictionary(sharedLocalesDir, 'en.json');
const rootEn = loadDictionary(rootLocalesDir, 'en.json');
const mergedEn = { ...rootEn, ...sharedEn };

const auditResults = [];

for (const ws of productionWorkspaces) {
  const wsDir = path.join(rootDir, ws.dir);
  let fileCount = 0;
  let lineCount = 0;
  let tokenCallCount = 0;
  let parameterizedCount = 0;
  const uniqueTokens = new Set();
  const namespaceTally = new Map();
  const rawStringViolations = [];
  const concatenationViolations = [];
  const paramMismatchViolations = [];
  const missingTokenViolations = [];

  function walk(currentDir) {
    if (!fs.existsSync(currentDir)) return;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(fullPath);
        }
      } else if (
        /\.(ts|js)$/.test(entry.name) &&
        !entry.name.endsWith('.d.ts') &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('.spec.')
      ) {
        fileCount++;
        auditSingleFile(fullPath);
      }
    }
  }

  function auditSingleFile(filePath) {
    const rel = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    lineCount += lines.length;

    // Check whole-file multiline tokens and param interpolation
    const tokenRegex = /\b(?:__t|t)\(\s*(['"`])([^'"`]+)\1\s*(?:,\s*(\{[\s\S]*?\}))?\s*\)/g;
    let m;
    while ((m = tokenRegex.exec(content)) !== null) {
      tokenCallCount++;
      const tokenKey = m[2];
      const paramBlock = m[3];
      uniqueTokens.add(tokenKey);
      if (!hasDictionaryToken(mergedEn, tokenKey)) {
        const line = content.slice(0, m.index).split('\\n').length;
        missingTokenViolations.push({ file: rel, line, token: tokenKey });
      }

      // Namespace segmentation
      const parts = tokenKey.split('.');
      const ns = parts[0] || 'root';
      namespaceTally.set(ns, (namespaceTally.get(ns) || 0) + 1);

      // Check parameter interpolation vs template placeholders
      if (paramBlock) {
        parameterizedCount++;
        const template = mergedEn[tokenKey];
        if (template) {
          const expectedPlaceholders = [...template.matchAll(/\{(\w+)\}/g)].map(x => x[1]);
          if (expectedPlaceholders.length > 0) {
            const body = paramBlock.replace(/^\{|\}$/g, '');
            const passedKeys = body
              .split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .map(s => (s.match(/^['"]?([A-Za-z0-9_]+)['"]?\s*(?::|$)/) || [])[1])
              .filter(Boolean);

            const missing = expectedPlaceholders.filter(p => !passedKeys.includes(p));
            if (missing.length > 0) {
              const line = content.slice(0, m.index).split('\n').length;
              paramMismatchViolations.push({
                file: rel,
                line,
                token: tokenKey,
                needed: missing,
                passed: passedKeys
              });
            }
          }
        }
      }
    }

    // Line-by-line checks for raw strings and string concats
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const lineNum = i + 1;

      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

      // Check for raw strings in throw new Error('...')
      const throwMatch = line.match(/throw\s+new\s+(?:[A-Za-z0-9_]*Error)\s*\(\s*(['"`])([^'"`]+)\1\s*\)/);
      if (throwMatch) {
        const raw = throwMatch[2];
        if (
          raw.includes(' ') &&
          /[A-Za-z]{3,}/.test(raw) &&
          !raw.startsWith('SELECT') &&
          !raw.startsWith('INSERT') &&
          !raw.startsWith('UPDATE') &&
          !raw.startsWith('DELETE') &&
          !raw.startsWith('http://') &&
          !raw.startsWith('https://')
        ) {
          rawStringViolations.push({ file: rel, line: lineNum, text: raw });
        }
      }

      // Check for raw strings in Logger.(info|warn|error)('...')
      const loggerMatch = line.match(/Logger\.(?:info|error|warn|debug)\s*\(\s*(['"`])([^'"`]+)\1/);
      if (loggerMatch) {
        const raw = loggerMatch[2];
        if (raw.includes(' ') && /[A-Za-z]{3,}/.test(raw) && !raw.startsWith('http')) {
          rawStringViolations.push({ file: rel, line: lineNum, text: raw });
        }
      }

      // Check for string concatenation with __t
      if (/\b(?:__t|t)\(/.test(line)) {
        if (/\b(?:__t|t)\s*\([^)]+\)\s*\+|\+\s*(?:__t|t)\s*\(/.test(line)) {
          concatenationViolations.push({ file: rel, line: lineNum, lineContent: trimmed });
        }
      }
    }
  }

  walk(wsDir);

  auditResults.push({
    module: ws.name,
    files: fileCount,
    lines: lineCount,
    tokenCalls: tokenCallCount,
    uniqueTokens: uniqueTokens.size,
    parameterizedCalls: parameterizedCount,
    namespaces: Array.from(namespaceTally.entries()).sort((a,b)=>b[1]-a[1]),
    rawStringViolations,
    concatenationViolations,
    paramMismatchViolations,
    missingTokenViolations,
    status: (rawStringViolations.length === 0 && concatenationViolations.length === 0 && paramMismatchViolations.length === 0 && missingTokenViolations.length === 0) ? 'PASS' : 'FAIL'
  });
}

console.log('================================================================================');
console.log('       AIR ROOFERS SASU / UJOMOR SYSTEMS GOVERNANCE VERIFICATION REPORT');
console.log('       TRACK T03: TOKENIZATION & ZERO STRING HARDCODING AUDIT');
console.log('       Standards: UJP-UIX-007 | AR-GOV-REG-002 | ADR-0042 | UAIGOS 3.0.0');
console.log('================================================================================\n');

let grandTotalFiles = 0;
let grandTotalLines = 0;
let grandTotalTokenCalls = 0;
let grandTotalRawViolations = 0;
let grandTotalConcatViolations = 0;
let grandTotalParamMismatches = 0;
let grandTotalMissingTokens = 0;

for (const res of auditResults) {
  grandTotalFiles += res.files;
  grandTotalLines += res.lines;
  grandTotalTokenCalls += res.tokenCalls;
  grandTotalRawViolations += res.rawStringViolations.length;
  grandTotalConcatViolations += res.concatenationViolations.length;
  grandTotalParamMismatches += res.paramMismatchViolations.length;
  grandTotalMissingTokens += res.missingTokenViolations.length;

  console.log(`[WORKSPACE] ${res.module}`);
  console.log(`  Status                  : [${res.status}]`);
  console.log(`  Source Files Scanned    : ${res.files}`);
  console.log(`  Lines of Code           : ${res.lines}`);
  console.log(`  Token Call Sites        : ${res.tokenCalls}`);
  console.log(`  Unique Tokens Used      : ${res.uniqueTokens}`);
  console.log(`  Parameterized Calls     : ${res.parameterizedCalls}`);
  console.log(`  Top Namespaces          : ${res.namespaces.slice(0, 4).map(([ns, c]) => `${ns} (${c})`).join(', ') || 'N/A'}`);
  console.log(`  Raw String Violations   : ${res.rawStringViolations.length}`);
  if (res.rawStringViolations.length > 0) {
    res.rawStringViolations.forEach(v => console.log(`    - [${v.file}:${v.line}]: ${v.text}`));
  }
  console.log(`  String Concatenations   : ${res.concatenationViolations.length}`);
  if (res.concatenationViolations.length > 0) {
    res.concatenationViolations.forEach(v => console.log(`    - [${v.file}:${v.line}]: ${v.lineContent}`));
  }
  console.log(`  Parameter Mismatches    : ${res.paramMismatchViolations.length}`);
  if (res.paramMismatchViolations.length > 0) {
    res.paramMismatchViolations.forEach(v => console.log(`    - Line ${v.line}: ${v.token} missing ${v.needed}`));
  }
  console.log(`  Missing Dictionary Tokens: ${res.missingTokenViolations.length}`);
  if (res.missingTokenViolations.length > 0) {
    res.missingTokenViolations.forEach(v => console.log(`    - [${v.file}:${v.line}]: ${v.token}`));
  }
  console.log('');
}

console.log('--------------------------------------------------------------------------------');
console.log('AUDIT SUMMARY TOTALS:');
console.log(`  Total Modules Audited   : ${auditResults.length}`);
console.log(`  Total Files Scanned     : ${grandTotalFiles}`);
console.log(`  Total Code Lines        : ${grandTotalLines}`);
console.log(`  Total Token Call Sites  : ${grandTotalTokenCalls}`);
console.log(`  Raw String Violations   : ${grandTotalRawViolations}`);
console.log(`  String Concat Violations: ${grandTotalConcatViolations}`);
console.log(`  Parameter Mismatches    : ${grandTotalParamMismatches}`);
console.log(`  Missing Dictionary Tokens: ${grandTotalMissingTokens}`);
console.log(`  Required Dictionary Errors: ${dictionaryErrors.length}`);
if (dictionaryErrors.length > 0) dictionaryErrors.forEach((error) => console.error(`  - ${error}`));
console.log(`  Overall Track T03 Status: ${dictionaryErrors.length === 0 && grandTotalRawViolations === 0 && grandTotalConcatViolations === 0 && grandTotalParamMismatches === 0 && grandTotalMissingTokens === 0 ? 'COMPLIANT (PASS)' : 'NON-COMPLIANT (FAIL)'}`);
if (dictionaryErrors.length > 0 || grandTotalRawViolations > 0 || grandTotalConcatViolations > 0 || grandTotalParamMismatches > 0 || grandTotalMissingTokens > 0) process.exitCode = 1;
console.log('================================================================================');
