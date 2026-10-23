/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance — Evidence Freshness Verifier
 * File           : verify-evidence-freshness.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - NIST
 *
 * Notice:
 * Fails closed unless the committed evidence manifest, live canary receipt and
 * native runner evidence all bind to one candidate SHA, the release HEAD is that
 * candidate or an evidence-only descendant, every digest matches the committed
 * blob, and no item is listed as unproven.
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertCandidateBinding, EvidenceFreshnessError } from './evidence-freshness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MANIFEST_PATH = 'docs/governance/evidence/evidence-manifest.json';
const CANARY_PATH = 'docs/security/evidence/live_ai_canary_receipt.json';
const NATIVE_PATH = 'docs/governance/evidence/native-runner-evidence.json';

function readJson(root, rel) {
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) throw new EvidenceFreshnessError(`Missing evidence file: ${rel}`);
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    throw new EvidenceFreshnessError(`Evidence file is not valid JSON: ${rel}`);
  }
}

export function verifyEvidenceFreshness({ root = ROOT } = {}) {
  const manifest = readJson(root, MANIFEST_PATH);
  const candidate = manifest.candidateSha || manifest.gitHeadSha;
  if (manifest.candidateSha && manifest.candidateSha !== manifest.gitHeadSha) {
    throw new EvidenceFreshnessError('Manifest candidateSha and gitHeadSha disagree');
  }

  const binding = assertCandidateBinding(root, candidate);

  if (Array.isArray(manifest.unproven) && manifest.unproven.length > 0) {
    throw new EvidenceFreshnessError(`Manifest lists ${manifest.unproven.length} unproven item(s)`);
  }
  if (!Array.isArray(manifest.unproven)) throw new EvidenceFreshnessError('Manifest unproven list is missing');
  if (manifest.allTestCommandsPassed !== true) {
    throw new EvidenceFreshnessError('Manifest records failing test commands');
  }
  if (!Array.isArray(manifest.evidenceFiles) || manifest.evidenceFiles.length === 0) {
    throw new EvidenceFreshnessError('Manifest lists no evidence files');
  }

  for (const f of manifest.evidenceFiles) {
    const abs = path.resolve(root, f.path);
    if (f.path.startsWith('..') || !abs.startsWith(root + path.sep) || !fs.existsSync(abs)) {
      throw new EvidenceFreshnessError(`Evidence file missing or outside repository: ${f.path}`);
    }
    const digest = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
    if (digest !== f.sha256) throw new EvidenceFreshnessError(`Digest mismatch for ${f.path}`);
  }

  const canary = readJson(root, CANARY_PATH);
  if (canary.gitSha !== candidate) {
    throw new EvidenceFreshnessError(`Live canary receipt SHA ${canary.gitSha} != candidate ${candidate}`);
  }
  if (canary.discoveryStatusCode !== 200 || canary.executionStatusCode !== 200) {
    throw new EvidenceFreshnessError('Live canary receipt does not record HTTP 200 discovery and execution');
  }
  const native = readJson(root, NATIVE_PATH);
  if (native.gitHeadSha !== candidate) {
    throw new EvidenceFreshnessError(`Native runner evidence SHA ${native.gitHeadSha} != candidate ${candidate}`);
  }

  return { candidate, head: binding.head, descendant: binding.descendant, evidenceChangedPaths: binding.changedPaths };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = verifyEvidenceFreshness();
    console.log(`[PASS] Evidence fresh: candidate ${r.candidate}; release HEAD ${r.head}; evidence-only delta ${r.evidenceChangedPaths.length} path(s)`);
  } catch (err) {
    console.error(`[evidence-freshness] FAIL: ${err.message}`);
    process.exit(1);
  }
}
