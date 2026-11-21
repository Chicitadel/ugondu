#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Governance / CI Action Pin Verifier
 * File           : verify-action-pins.mjs
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
 * Purpose:
 * - Every external `uses:` reference must be pinned to a 40-hex commit SHA.
 * - In --online mode, every SHA must exist upstream and, when a version
 *   comment (`# vX.Y.Z`) is present, that tag must resolve to the same SHA.
 *   A syntactically valid but non-existent SHA is the failure that broke CI.
 * - Reviewed exceptions live in config/governance/action-pin-exceptions.json
 *   and require a reason; they never match by wildcard.
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SHA_RE = /^[0-9a-f]{40}$/;
const USES_RE = /^\s*-?\s*uses:\s*([^\s#]+)\s*(?:#\s*(\S+))?/;

export function loadExceptions(file) {
  if (!fs.existsSync(file)) return new Map();
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const map = new Map();
  for (const e of doc.exceptions || []) {
    if (!e.ref || !e.reason || !e.reviewer) {
      throw new Error(`Invalid action-pin exception (ref, reason, reviewer required): ${JSON.stringify(e)}`);
    }
    map.set(e.ref, e);
  }
  return map;
}

export function collectUses(workflowDir) {
  const out = [];
  for (const name of fs.readdirSync(workflowDir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const lines = fs.readFileSync(path.join(workflowDir, name), 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      const m = USES_RE.exec(line);
      if (m) out.push({ file: name, line: i + 1, ref: m[1], comment: m[2] || '' });
    });
  }
  return out;
}

export function splitRef(ref) {
  const at = ref.lastIndexOf('@');
  if (at < 0) return { target: ref, version: '' };
  return { target: ref.slice(0, at), version: ref.slice(at + 1) };
}

export function repoOf(target) {
  const parts = target.split('/');
  return `${parts[0]}/${parts[1]}`;
}

export function staticFindings(uses, exceptions) {
  const findings = [];
  for (const u of uses) {
    if (u.ref.startsWith('./')) continue;
    if (u.ref.startsWith('docker://')) {
      if (!/@sha256:[0-9a-f]{64}$/.test(u.ref) && !exceptions.has(u.ref)) {
        findings.push({ ...u, problem: 'docker reference is not pinned by sha256 digest' });
      }
      continue;
    }
    const { version } = splitRef(u.ref);
    if (exceptions.has(u.ref)) continue;
    if (!SHA_RE.test(version)) {
      findings.push({ ...u, problem: `not pinned to a 40-hex commit SHA (found "${version || 'no version'}")` });
    }
  }
  return findings;
}

async function ghGet(fetchImpl, token, url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'ugondu-action-pin-verifier' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetchImpl(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
  return res.json();
}

async function resolveTag(fetchImpl, token, repo, tag) {
  const ref = await ghGet(fetchImpl, token, `https://api.github.com/repos/${repo}/git/ref/tags/${tag}`);
  if (!ref) return null;
  let obj = ref.object;
  for (let depth = 0; obj && obj.type === 'tag' && depth < 5; depth++) {
    const t = await ghGet(fetchImpl, token, `https://api.github.com/repos/${repo}/git/tags/${obj.sha}`);
    if (!t) return null;
    obj = t.object;
  }
  return obj ? obj.sha : null;
}

export async function onlineFindings(uses, exceptions, { fetchImpl = fetch, token = process.env.GITHUB_TOKEN } = {}) {
  const findings = [];
  const cache = new Map();
  for (const u of uses) {
    if (u.ref.startsWith('./') || u.ref.startsWith('docker://') || exceptions.has(u.ref)) continue;
    const { target, version } = splitRef(u.ref);
    if (!SHA_RE.test(version)) continue;
    const repo = repoOf(target);
    const key = `${repo}@${version}|${u.comment}`;
    if (!cache.has(key)) {
      const commit = await ghGet(fetchImpl, token, `https://api.github.com/repos/${repo}/commits/${version}`);
      let problem = '';
      if (!commit || commit.sha !== version) {
        problem = `commit ${version} does not exist in ${repo}`;
      } else if (/^v?\d/.test(u.comment)) {
        const tagSha = await resolveTag(fetchImpl, token, repo, u.comment);
        if (!tagSha) problem = `tag ${u.comment} not found in ${repo}`;
        else if (tagSha !== version) problem = `tag ${u.comment} resolves to ${tagSha}, not ${version}`;
      } else {
        problem = 'missing "# vX.Y.Z" version comment documenting the pinned release';
      }
      cache.set(key, problem);
    }
    if (cache.get(key)) findings.push({ ...u, problem: cache.get(key) });
  }
  return findings;
}

export async function verifyActionPins({ workflowDir, exceptionsFile, online, fetchImpl, token }) {
  const exceptions = loadExceptions(exceptionsFile);
  const uses = collectUses(workflowDir);
  const findings = staticFindings(uses, exceptions);
  if (online) findings.push(...(await onlineFindings(uses, exceptions, { fetchImpl, token })));
  return { checked: uses.length, findings };
}

async function main() {
  const online = process.argv.includes('--online');
  const { checked, findings } = await verifyActionPins({
    workflowDir: path.join(ROOT, '.github/workflows'),
    exceptionsFile: path.join(ROOT, 'config/governance/action-pin-exceptions.json'),
    online
  });
  if (findings.length) {
    for (const f of findings) console.error(`[FAIL] ${f.file}:${f.line} ${f.ref} — ${f.problem}`);
    console.error(`[FAIL] Action pin verification: ${findings.length} finding(s) across ${checked} references`);
    process.exit(1);
  }
  console.log(`[PASS] Action pin verification (${online ? 'online' : 'static'}): ${checked} references verified`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[FAIL] Action pin verification: ${err.message}`);
    process.exit(1);
  });
}
