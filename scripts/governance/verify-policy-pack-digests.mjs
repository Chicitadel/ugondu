#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Governance / Policy Pack Provenance Gate
 * File           : verify-policy-pack-digests.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 *
 * Usage:
 *   node scripts/governance/verify-policy-pack-digests.mjs [--write] [packDir]
 *   --write  recompute and rewrite declared digests (release engineering only)
 *
 * Pack digest = SHA-256 over the sorted lines "<relative-path>:<sha256>" of every
 * templatePath referenced by pack.yaml (policies and roles), newline-joined.
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const write = args.includes('--write');
const packDir = path.resolve(ROOT, args.find((a) => !a.startsWith('--')) ?? 'policy-packs/aws/cor');
const packFile = path.join(packDir, 'pack.yaml');

const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function verifyPolicyPack(yamlText, baseDir) {
  const problems = [];
  const entries = [];
  const re = /templatePath:\s*(\S+)\s*\r?\n\s*sha256:\s*"?([0-9a-fA-F]*)"?/g;
  let m;
  while ((m = re.exec(yamlText))) {
    const rel = m[1];
    const file = path.join(baseDir, rel);
    if (!fs.existsSync(file)) {
      problems.push(`missing template ${rel}`);
      continue;
    }
    const actual = sha(fs.readFileSync(file));
    entries.push({ rel, declared: m[2], actual });
    if (actual !== m[2]) problems.push(`digest mismatch ${rel}: declared ${m[2]} actual ${actual}`);
  }
  if (entries.length === 0) problems.push('no templatePath entries found');
  const packDigest = sha(
    Buffer.from(
      entries
        .map((e) => `${e.rel}:${e.actual}`)
        .sort()
        .join('\n'),
      'utf8'
    )
  );
  const declaredPack = /packDigestSha256:\s*"?([0-9a-fA-F]+)"?/.exec(yamlText)?.[1];
  if (declaredPack !== packDigest) {
    problems.push(`pack digest mismatch: declared ${declaredPack} actual ${packDigest}`);
  }
  return { entries, packDigest, declaredPack, problems };
}

function main() {
  let text = fs.readFileSync(packFile, 'utf8');
  let result = verifyPolicyPack(text, packDir);
  if (write) {
    for (const e of result.entries) {
      text = text.replace(`sha256: "${e.declared}"`, `sha256: "${e.actual}"`);
    }
    text = text.replace(/packDigestSha256:\s*"?[0-9a-fA-F]+"?/, `packDigestSha256: "${result.packDigest}"`);
    fs.writeFileSync(packFile, text, 'utf8');
    result = verifyPolicyPack(text, packDir);
    console.log(`[WRITE] Rewrote ${result.entries.length} template digests and the pack digest.`);
  }
  if (result.problems.length) {
    for (const p of result.problems) console.error(`[FAIL] ${p}`);
    process.exit(1);
  }
  console.log(`[PASS] Policy pack ${path.relative(ROOT, packDir)}: ${result.entries.length} templates and pack digest ${result.packDigest} recomputed from canonical bytes.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
