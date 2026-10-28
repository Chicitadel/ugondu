/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Release Qualification / Platform Evidence
 * File           : platform-evidence.mjs
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE
 *
 * Purpose:
 * - Record per-target platform evidence (runner identity is read from the
 *   executing process, never from the caller).
 * - Derive per-target state ONLY from verified evidence. Declarations in the
 *   platform matrix are claims, not evidence.
 * - Verify that every declared supportClaim is covered by derived state.
 * - Enforce fail-closed verification of universal platform support claims.
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const EVIDENCE_SCHEMA_VERSION = '1.0.0';
export const STATE_ORDER = ['not-assessed', 'built', 'implemented', 'tested', 'qualified'];
export const SUPPORT_CLAIMS = ['supported', 'experimental', 'unsupported'];
export const AWAITING_ATTESTATION = 'awaiting independent attestation';

const HEX64 = /^[0-9a-f]{64}$/;
const HEX_SHA = /^[0-9a-f]{7,64}$/;
const TARGET_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/;

export function normalizeOs(platform = process.platform) {
  return platform === 'win32' ? 'windows' : platform;
}

export function normalizeArch(arch = process.arch) {
  if (arch === 'x64') return 'amd64';
  return arch;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort()
      .filter((k) => value[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function computeEvidenceDigest(record) {
  const { evidenceSha256: _omitted, ...body } = record;
  return crypto.createHash('sha256').update(canonicalJson(body)).digest('hex');
}

export function stateRank(state) {
  return STATE_ORDER.indexOf(state);
}

export function currentRunner(runnerKind) {
  const runner = { os: normalizeOs(), arch: normalizeArch(), kind: String(runnerKind || 'unspecified') };
  if (process.env.GITHUB_ACTIONS) runner.githubActions = process.env.GITHUB_ACTIONS;
  if (process.env.RUNNER_OS) runner.runnerOs = process.env.RUNNER_OS;
  if (process.env.RUNNER_ARCH) runner.runnerArch = process.env.RUNNER_ARCH;
  return runner;
}

function normalizeSuite(s) {
  if (!s || typeof s.name !== 'string' || !s.name) throw new Error('suite requires a name');
  if (!Number.isInteger(s.tests) || s.tests < 0) throw new Error(`suite ${s.name}: invalid tests`);
  if (!Number.isInteger(s.failures) || s.failures < 0) throw new Error(`suite ${s.name}: invalid failures`);
  if (s.junitSha256 !== undefined && !HEX64.test(s.junitSha256)) {
    throw new Error(`suite ${s.name}: junitSha256 must be 64 lowercase hex chars`);
  }
  return { name: s.name, junitSha256: s.junitSha256 || null, tests: s.tests, failures: s.failures };
}

/**
 * Write <outDir>/platforms/<targetId>.json. `os`/`arch` describe the TARGET;
 * the runner identity is captured from this process. A native-execution claim
 * made from a different os/arch is refused at write time.
 */
export function recordTargetEvidence({
  targetId, os, arch, runnerKind, nativeExecution, commitSha, treeSha, suiteResults, outDir
}) {
  if (typeof targetId !== 'string' || !TARGET_ID.test(targetId)) throw new Error('invalid targetId');
  if (!os || !arch) throw new Error('target os and arch are required');
  if (typeof nativeExecution !== 'boolean') throw new Error('nativeExecution must be boolean');
  if (!HEX_SHA.test(String(commitSha))) throw new Error('commitSha must be a hex git sha');
  if (!HEX_SHA.test(String(treeSha))) throw new Error('treeSha must be a hex git sha');
  if (!outDir) throw new Error('outDir is required');
  const runner = currentRunner(runnerKind);
  if (nativeExecution && (runner.os !== os || runner.arch !== arch)) {
    throw new Error(`refusing native-execution claim: runner ${runner.os}/${runner.arch} is not target ${os}/${arch}`);
  }
  const record = {
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    targetId,
    target: { os, arch },
    runner,
    nativeExecution,
    commit: String(commitSha),
    tree: String(treeSha),
    suites: (suiteResults || []).map(normalizeSuite)
  };
  record.evidenceSha256 = computeEvidenceDigest(record);
  const dir = path.join(outDir, 'platforms');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${targetId}.json`);
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  return { file, record };
}

function loadEvidenceFiles(evidenceDir) {
  const dir = path.join(evidenceDir, 'platforms');
  const loaded = [];
  const rejections = [];
  if (!fs.existsSync(dir)) return { loaded, rejections };
  for (const name of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      loaded.push({ file: name, record: JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8')) });
    } catch {
      rejections.push({ file: name, targetId: null, reason: 'unparseable evidence file' });
    }
  }
  return { loaded, rejections };
}

function judgeEvidence(target, record, ctx, attestationVerifier) {
  const rejectWith = (reason) => ({ reject: reason });
  if (record.schemaVersion !== EVIDENCE_SCHEMA_VERSION) return rejectWith('unsupported schemaVersion');
  if (typeof record.evidenceSha256 !== 'string' || record.evidenceSha256 !== computeEvidenceDigest(record)) {
    return rejectWith('tampered evidenceSha256');
  }
  if (record.target?.os !== target.os || record.target?.arch !== target.architecture) {
    return rejectWith('evidence target os/arch differs from matrix target');
  }
  if (record.commit !== ctx.commitSha || record.tree !== ctx.treeSha) {
    return rejectWith('stale commit/tree');
  }
  if (typeof record.nativeExecution !== 'boolean') return rejectWith('nativeExecution missing');
  const runnerMatches = record.runner?.os === target.os && record.runner?.arch === target.architecture;
  if (record.nativeExecution && !runnerMatches) {
    return rejectWith(`cross-run: runner ${record.runner?.os}/${record.runner?.arch} is not target ${target.os}/${target.architecture}`);
  }
  if (!record.nativeExecution) {
    return { state: 'built', reasons: ['cross-compiled or non-native evidence; execution not proven'] };
  }
  const suites = Array.isArray(record.suites) ? record.suites : [];
  if (suites.length === 0) return { state: 'built', reasons: ['native run without suite results'] };
  const reasons = [];
  for (const s of suites) {
    if (!HEX64.test(String(s.junitSha256))) reasons.push(`suite ${s.name}: JUnit digest missing`);
    if (!Number.isInteger(s.tests) || s.tests <= 0) reasons.push(`suite ${s.name}: no tests executed`);
    if (!Number.isInteger(s.failures) || s.failures !== 0) reasons.push(`suite ${s.name}: failures present`);
  }
  if (reasons.length) return { state: 'built', reasons };
  if (record.attestation !== undefined && typeof attestationVerifier === 'function'
    && attestationVerifier(record) === true) {
    return { state: 'qualified', reasons: ['independent attestation verified'] };
  }
  return { state: 'tested', reasons: [AWAITING_ATTESTATION] };
}

/**
 * Derive per-target states from evidence only.
 * Returns { targets: { [id]: { state, reasons[] } }, rejections: [{file, targetId, reason}] }.
 * A target whose evidence is rejected resolves to not-assessed.
 */
export function deriveTargetStates(matrix, evidenceDir, { commitSha, treeSha, attestationVerifier } = {}) {
  const defs = matrix?.targetDefinitions || [];
  const byId = new Map(defs.map((t) => [t.id, t]));
  const { loaded, rejections } = loadEvidenceFiles(evidenceDir);
  const ctx = { commitSha, treeSha };
  const counts = new Map();
  for (const { record } of loaded) counts.set(record?.targetId, (counts.get(record?.targetId) || 0) + 1);
  const targets = {};
  for (const t of defs) targets[t.id] = { state: 'not-assessed', reasons: ['no platform evidence'] };

  for (const { file, record } of loaded) {
    const id = record?.targetId;
    const reject = (reason) => {
      rejections.push({ file, targetId: id ?? null, reason });
      if (id && targets[id]) targets[id] = { state: 'not-assessed', reasons: [`evidence rejected: ${reason}`] };
    };
    if (!byId.has(id)) { reject('unknown targetId'); continue; }
    if (counts.get(id) > 1) { reject('duplicate target evidence'); continue; }
    if (file !== `${id}.json`) { reject('evidence filename does not match targetId'); continue; }
    const verdict = judgeEvidence(byId.get(id), record, ctx, attestationVerifier);
    if (verdict.reject) { reject(verdict.reject); continue; }
    targets[id] = { state: verdict.state, reasons: verdict.reasons };
  }
  return { targets, rejections };
}

/**
 * A 'supported' claim requires derived state >= minimumRequiredTier.
 * With options.requireUniversal === true, every declared target must be supported
 * and verified; unassessed, experimental, or unsupported targets fail closed.
 *
 * Verdicts: 'ok' | 'claim-exceeds-evidence' | 'invalid-matrix'.
 */
export function verifyMatrixClaims(matrix, derived, options = {}) {
  const violations = [];
  const targets = derived?.targets || derived || {};
  const defs = matrix?.targetDefinitions;
  if (!matrix || !Array.isArray(defs) || defs.length === 0) {
    return {
      verdict: 'invalid-matrix',
      violations: [{ id: 'matrix', kind: 'invalid-matrix', detail: 'targetDefinitions must be a non-empty array' }]
    };
  }
  const requireUniversal = Boolean(options.requireUniversal);
  for (const t of defs) {
    if (!t || typeof t.id !== 'string' || !TARGET_ID.test(t.id)) {
      violations.push({ id: t?.id || 'unknown', kind: 'invalid-claim', detail: 'target definition missing valid id' });
      continue;
    }
    if (!SUPPORT_CLAIMS.includes(t.supportClaim)) {
      violations.push({ id: t.id, kind: 'invalid-claim', detail: `supportClaim must be one of ${SUPPORT_CLAIMS.join('|')}` });
      continue;
    }
    const required = t.minimumRequiredTier || 'tested';
    const state = targets[t.id]?.state || 'not-assessed';
    if (requireUniversal) {
      if (t.supportClaim !== 'supported' || stateRank(state) < stateRank(required)) {
        violations.push({
          id: t.id,
          kind: 'claim-exceeds-evidence',
          detail: `universal support claimed; target ${t.id} has claim '${t.supportClaim}' and derived state '${state}' (requires '${required}')`
        });
      }
    } else if (t.supportClaim === 'supported') {
      if (stateRank(required) < 0 || stateRank(state) < stateRank(required)) {
        violations.push({ id: t.id, kind: 'claim-exceeds-evidence', detail: `claims supported; requires ${required}, derived ${state}` });
      }
    }
  }
  const verdict = violations.some((v) => v.kind === 'invalid-claim' || v.kind === 'invalid-matrix') ? 'invalid-matrix'
    : violations.length ? 'claim-exceeds-evidence' : 'ok';
  return { verdict, violations };
}

/**
 * Verify universal platform support across all declared matrix targets.
 * Universal support requires that every target definition in the matrix is
 * explicitly claimed as 'supported' and has a derived state meeting or exceeding
 * its minimumRequiredTier (at least 'tested').
 * Fails closed if any target is unassessed, built-only, experimental, or unsupported.
 *
 * Verdicts: 'ok' | 'claim-exceeds-evidence' | 'invalid-matrix'.
 */
export function verifyUniversalSupport(matrix, derived) {
  return verifyMatrixClaims(matrix, derived, { requireUniversal: true });
}
