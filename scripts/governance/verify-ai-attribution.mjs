/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Corporate Attribution Policy & Authorship Verification Gate
 * File           : verify-ai-attribution.mjs
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
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const BANNED_PATTERNS = [
  /\bAI\s+Governed\b/i,
  /\bAI\s+generated\b/i,
  /\bAI\s+implemented\b/i,
  /\bAI\s+assisted\b/i,
  /\bAI\s+authored\b/i
];

const EXCLUDED_PATHS = new Set([
  'scripts/governance/verify-ai-attribution.mjs'
]);

export function verifyAttribution() {
  const tracked = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const violations = [];

  for (const rel of tracked) {
    if (EXCLUDED_PATHS.has(rel)) continue;
    // Skip binary extensions or archive directories if needed
    if (/\.(png|jpg|jpeg|gif|ico|pdf|zip|tar|gz|exe|dll|so|dylib)$/i.test(rel)) continue;

    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;

    try {
      const content = fs.readFileSync(abs, 'utf8');
      for (const pattern of BANNED_PATTERNS) {
        if (pattern.test(content)) {
          violations.push({ file: rel, pattern: pattern.toString() });
        }
      }
    } catch {
      // Ignore unreadable binary files
    }
  }

  return { totalFiles: tracked.length, violations };
}

function main() {
  const { totalFiles, violations } = verifyAttribution();

  if (violations.length > 0) {
    console.error(`[FAIL] Prohibited AI attribution patterns detected in ${violations.length} files:`);
    for (const v of violations) {
      console.error(`  - ${v.file}: matches ${v.pattern}`);
    }
    process.exit(1);
  }

  console.log(`[PASS] Corporate attribution governance verified: 0 prohibited AI phrases across ${totalFiles} tracked files.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
