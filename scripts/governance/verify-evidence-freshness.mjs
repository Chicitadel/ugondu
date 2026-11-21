/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance — Evidence Freshness Verifier
 * File           : verify-evidence-freshness.mjs
 * Version        : 1.1.0
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
 * Fails closed unless the committed evidence manifest, live canary receipt,
 * native runner evidence, and AI model qualification report all bind to one
 * candidate SHA, the release HEAD is that candidate or an evidence-only
 * descendant, every digest matches the committed blob, and no item is listed
 * as unproven. Active AI models require verified live execution receipts.
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
export const AI_REPORT_PATH = 'docs/security/evidence/ai_model_qualification_report.json';
export const DIAGNOSTIC_REPORT_PATH = '.cor_evidence/diagnostic-report.json';

function readJson(root, rel) {
  const abs = path.resolve(root, rel);
  if (!fs.existsSync(abs)) throw new EvidenceFreshnessError(`Missing evidence file: ${rel}`);
  try {
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch {
    throw new EvidenceFreshnessError(`Evidence file is not valid JSON: ${rel}`);
  }
}

export function writeDiagnosticReport(root, candidate, err) {
  const dir = path.resolve(root, '.cor_evidence');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'diagnostic-report.json');
  const payload = {
    timestamp: new Date().toISOString(),
    candidate: candidate || null,
    error: err && err.message ? err.message : String(err),
    stack: err && err.stack ? err.stack : undefined,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return file;
}

export function assertReportLineage(report, candidate) {
  if (!report || typeof report !== 'object') throw new EvidenceFreshnessError('AI qualification report must be an object', 'AI_REPORT_INVALID');
  if (report.gitSha !== candidate) {
    throw new EvidenceFreshnessError(`AI_REPORT_CANDIDATE_SHA_MISMATCH: AI model qualification report SHA ${report.gitSha} != candidate ${candidate}`, 'AI_REPORT_CANDIDATE_SHA_MISMATCH');
  }
  const summary = report.summary || {};
  const activeCount = typeof summary.activeCount === 'number' ? summary.activeCount : 0;
  const qualifiedCount = typeof summary.qualifiedCount === 'number' ? summary.qualifiedCount : 0;
  const totalDiscovered = typeof summary.totalDiscovered === 'number' ? summary.totalDiscovered : 0;
  const mode = report.qualificationMode;

  if (activeCount > 0 && (mode === 'CATALOG_OFFLINE' || mode === 'OFFLINE' || (mode !== 'LIVE' && mode !== 'LIVE_SOVEREIGN'))) {
    throw new EvidenceFreshnessError('Offline catalog reports cannot satisfy live AI qualification: active models require live execution', 'CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION');
  }
  if ((mode === 'CATALOG_OFFLINE' || mode === 'OFFLINE') && (activeCount !== 0 || qualifiedCount !== 0)) {
    throw new EvidenceFreshnessError('CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION: Offline catalog reports cannot satisfy live AI qualification: active models require live execution', 'CATALOG_OFFLINE_PROHIBITED_FROM_ACTIVATION');
  }
  if (summary.qualifiedCount !== undefined || summary.totalDiscovered !== undefined) {
    if (activeCount < 0 || qualifiedCount < 0 || totalDiscovered < 0 || activeCount > qualifiedCount || qualifiedCount > totalDiscovered) {
      throw new EvidenceFreshnessError(`AI_REPORT_COUNT_INVARIANT_FAILED: Summary count invariant violation: activeCount (${activeCount}) <= qualifiedCount (${qualifiedCount}) <= totalDiscovered (${totalDiscovered})`, 'AI_REPORT_COUNT_INVARIANT_FAILED');
    }
  }
  if (activeCount > 0) {
    const receipts = Array.isArray(report.receipts) ? report.receipts : [];
    const activeReceipts = receipts.filter((r) => r.status === 'ACTIVE' || r.status === 'QUALIFIED');
    if (activeReceipts.some((r) => r.liveExecution !== true)) {
      throw new EvidenceFreshnessError('Receipts for all active models must have liveExecution === true', 'LIVE_EXECUTION_REQUIRED');
    }
    for (const r of activeReceipts) {
      if (r.liveInferenceReceipt && r.liveInferenceReceipt.candidateSha && r.liveInferenceReceipt.candidateSha !== candidate) {
        throw new EvidenceFreshnessError(`AI_REPORT_CANDIDATE_SHA_MISMATCH: Live inference receipt candidate SHA ${r.liveInferenceReceipt.candidateSha} != candidate ${candidate}`, 'AI_REPORT_CANDIDATE_SHA_MISMATCH');
      }
    }
    const liveCandidateReceipts = activeReceipts.filter((r) =>
      r.liveExecution === true &&
      (!r.gitSha || r.gitSha === candidate) &&
      (!r.liveInferenceReceipt || (r.liveInferenceReceipt.candidateSha === candidate && r.liveInferenceReceipt.verification === 'AUTHENTIC_LIVE_INFERENCE_QUALIFIED'))
    );
    if (liveCandidateReceipts.length < activeCount) {
      throw new EvidenceFreshnessError('Active model count does not match real live qualification receipts', 'ACTIVE_MODELS_WITHOUT_LIVE_RECEIPTS');
    }
  }
  return true;
}

export function assertCurrentLiveReport(report, candidate) {
  assertReportLineage(report, candidate);
  if (report.qualificationMode !== 'LIVE_SOVEREIGN') {
    throw new EvidenceFreshnessError('LIVE_AI_QUALIFICATION_REQUIRED: Live qualification report required; CATALOG_OFFLINE cannot be accepted', 'LIVE_AI_QUALIFICATION_REQUIRED');
  }
  return true;
}

export function verifyEvidenceFreshness(options = {}) {
  const root = options.root || ROOT;
  const expectedCandidateSha =
    options.expectedCandidateSha !== undefined
      ? options.expectedCandidateSha
      : (process.env.COR_CANDIDATE_SHA ? process.env.COR_CANDIDATE_SHA.trim() : null);
  const writeDiagnosticOnFailure = options.writeDiagnosticOnFailure !== false;

  let candidate = null;
  try {
    const manifest = readJson(root, MANIFEST_PATH);
    candidate = manifest.candidateSha || manifest.gitHeadSha;
    if (manifest.candidateSha && manifest.candidateSha !== manifest.gitHeadSha) {
      throw new EvidenceFreshnessError('Manifest candidateSha and gitHeadSha disagree');
    }

    if (expectedCandidateSha && candidate !== expectedCandidateSha) {
      throw new EvidenceFreshnessError(
        `Candidate SHA mismatch: manifest ${candidate} != expected ${expectedCandidateSha}`
      );
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

    const aiReportEntry = manifest.evidenceFiles.find((f) => f && f.path === AI_REPORT_PATH);
    if (!aiReportEntry) {
      throw new EvidenceFreshnessError(`Manifest missing required evidence file: ${AI_REPORT_PATH}`);
    }
    const aiReportAbs = path.resolve(root, AI_REPORT_PATH);
    if (!fs.existsSync(aiReportAbs)) {
      throw new EvidenceFreshnessError(`Missing evidence file: ${AI_REPORT_PATH}`);
    }
    const aiReportDigest = crypto.createHash('sha256').update(fs.readFileSync(aiReportAbs)).digest('hex');
    if (aiReportDigest !== aiReportEntry.sha256) {
      throw new EvidenceFreshnessError(`Digest mismatch for ${AI_REPORT_PATH}`);
    }

    const report = readJson(root, AI_REPORT_PATH);
    assertReportLineage(report, candidate);

    return { candidate, head: binding.head, descendant: binding.descendant, evidenceChangedPaths: binding.changedPaths };
  } catch (err) {
    if (writeDiagnosticOnFailure) {
      try {
        writeDiagnosticReport(root, candidate || expectedCandidateSha || null, err);
      } catch {
        // Preserve original error if diagnostic report write fails
      }
    }
    throw err;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const r = verifyEvidenceFreshness({ writeDiagnosticOnFailure: true });
    console.log(`[PASS] Evidence fresh: candidate ${r.candidate}; release HEAD ${r.head}; evidence-only delta ${r.evidenceChangedPaths.length} path(s)`);
  } catch (err) {
    try {
      writeDiagnosticReport(ROOT, process.env.COR_CANDIDATE_SHA || null, err);
    } catch {
      // Diagnostic writing failure should not swallow original exit
    }
    console.error(`[evidence-freshness] FAIL: ${err.message}`);
    process.exit(1);
  }
}
