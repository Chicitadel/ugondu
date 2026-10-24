/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Qualification — Evidence Freshness Tests
 * File           : evidence-freshness.test.js
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
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const GOV = path.resolve(__dirname, '..', '..', 'scripts', 'governance');
const GEN = pathToFileURL(path.join(GOV, 'generate-evidence-manifest.mjs')).href;
const VER = pathToFileURL(path.join(GOV, 'verify-evidence-freshness.mjs')).href;
const CMDS = [{ command: 'node tests/x.test.js', exitCode: 0 }];

const sh = (dir, ...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function write(dir, rel, content) {
  const abs = path.join(dir, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n');
}

function commit(dir, msg) {
  sh(dir, 'add', '-A');
  sh(dir, 'commit', '-q', '-m', msg);
  return sh(dir, 'rev-parse', 'HEAD');
}

// Stage 1: candidate commit holding code + target matrix. Stage 2: evidence commit.
function buildRelease({ canarySha, nativeSha, aiSha, aiReport } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'efr-'));
  sh(dir, 'init', '-q');
  sh(dir, 'config', 'user.email', 't@example.invalid');
  sh(dir, 'config', 'user.name', 'Test');
  sh(dir, 'config', 'commit.gpgsign', 'false');
  write(dir, 'src/app.js', 'module.exports = 1;\n');
  write(dir, 'config/qualification/target-matrix.json', { targets: [] });
  write(dir, 'docs/security/evidence/admin_portal_provisioning_receipt.json', { ok: true });
  const candidate = commit(dir, 'candidate');
  write(dir, 'docs/security/evidence/live_ai_canary_receipt.json', {
    gitSha: canarySha || candidate, discoveryStatusCode: 200, executionStatusCode: 200,
  });
  write(dir, 'docs/governance/evidence/native-runner-evidence.json', { gitHeadSha: nativeSha || candidate });
  if (aiReport !== false) {
    const reportData = typeof aiReport === 'function' ? aiReport(candidate) : (aiReport || {});
    write(dir, 'docs/security/evidence/ai_model_qualification_report.json', {
      gitSha: aiSha || candidate,
      qualificationMode: 'LIVE_SOVEREIGN',
      summary: { totalDiscovered: 1, qualifiedCount: 1, activeCount: 1, disabledCount: 0 },
      receipts: [{ modelAlias: 'model-a', status: 'ACTIVE', liveExecution: true }],
      ...reportData,
    });
  }
  commit(dir, 'evidence receipts');
  return { dir, candidate };
}

async function seal(dir, candidate, commands = CMDS) {
  const { generateManifest } = await import(GEN);
  generateManifest({ root: dir, expectedSha: candidate, commands });
  return commit(dir, 'manifest');
}

test('FRESH-001: manifest binds to candidate and release HEAD verifies as evidence-only descendant', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  const head = await seal(dir, candidate);
  assert.notEqual(head, candidate);
  const m = JSON.parse(fs.readFileSync(path.join(dir, 'docs/governance/evidence/evidence-manifest.json'), 'utf8'));
  assert.equal(m.gitHeadSha, candidate);
  assert.equal(m.candidateSha, candidate);
  assert.equal(m.releaseHeadSha, undefined);
  assert.equal(m.bindingProtocol, 'CANDIDATE_PLUS_EVIDENCE_ONLY_DESCENDANT');
  assert.deepEqual(m.unproven, []);
  const r = await verifyEvidenceFreshness({ root: dir });
  assert.equal(r.candidate, candidate);
  assert.equal(r.head, head);
  assert.equal(r.descendant, true);
});

test('FRESH-002: source change after candidate invalidates evidence (stale)', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'src/app.js', 'module.exports = 2;\n');
  commit(dir, 'late code change');
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /Stale evidence/);
});

test('FRESH-003: tampered evidence digest is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'docs/security/evidence/admin_portal_provisioning_receipt.json', { ok: false });
  commit(dir, 'tamper');
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /Digest mismatch/);
});

test('FRESH-004: canary receipt bound to a different SHA is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({ canarySha: 'a'.repeat(40) });
  await seal(dir, candidate);
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /Live canary receipt SHA/);
});

test('FRESH-005: native evidence bound to a different SHA is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({ nativeSha: 'b'.repeat(40) });
  await seal(dir, candidate);
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /Native runner evidence SHA/);
});

test('FRESH-006: manifest naming a non-ancestor candidate is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  const p = path.join(dir, 'docs/governance/evidence/evidence-manifest.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  m.gitHeadSha = m.candidateSha = 'c'.repeat(40);
  fs.writeFileSync(p, JSON.stringify(m, null, 2));
  commit(dir, 'forge');
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /not an ancestor/);
});

test('FRESH-007: failing test command or unproven item is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate, [{ command: 'node tests/x.test.js', exitCode: 1 }]);
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /failing test commands/);
});

test('FRESH-008: generator refuses a candidate with non-evidence drift', async () => {
  const { generateManifest } = await import(GEN);
  const { dir, candidate } = buildRelease();
  write(dir, 'src/app.js', 'module.exports = 3;\n');
  commit(dir, 'drift');
  assert.throws(() => generateManifest({ root: dir, expectedSha: candidate, commands: CMDS, write: false }), /Stale evidence/);
});

test('FRESH-009: docs/audit/ changes after candidate are accepted as valid evidence-only changes', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'docs/audit/CERTIFICATION_PROGRESS_DASHBOARD.md', '# Certification Progress\n');
  write(dir, 'docs/audit/COR_REMEDIATION_EXECUTION_RUNBOOK.md', '# Runbook\n');
  write(dir, 'docs/audit/COR_UAIGOS_REAUDIT_AND_REMEDIATION_PLAN.md', '# Audit Plan\n');
  const auditHead = commit(dir, 'audit documentation updates');
  const r = await verifyEvidenceFreshness({ root: dir });
  assert.equal(r.candidate, candidate);
  assert.equal(r.head, auditHead);
  assert.equal(r.descendant, true);
  assert.ok(r.evidenceChangedPaths.includes('docs/audit/CERTIFICATION_PROGRESS_DASHBOARD.md'));
  assert.ok(r.evidenceChangedPaths.includes('docs/audit/COR_REMEDIATION_EXECUTION_RUNBOOK.md'));
  assert.ok(r.evidenceChangedPaths.includes('docs/audit/COR_UAIGOS_REAUDIT_AND_REMEDIATION_PLAN.md'));
});

test('FRESH-010: isEvidenceOnlyPath recognizes docs/governance/evidence/, denies non-evidence governance paths', async () => {
  const { isEvidenceOnlyPath, EVIDENCE_ONLY_PREFIXES } = await import(pathToFileURL(path.join(GOV, 'evidence-freshness.mjs')).href);
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/governance/evidence/'));
  assert.ok(!EVIDENCE_ONLY_PREFIXES.includes('docs/governance/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/security/evidence/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/audit/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/audits/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/qualification/'));
  assert.equal(isEvidenceOnlyPath('docs/governance/evidence/xyz.json'), true);
  assert.equal(isEvidenceOnlyPath('docs/governance/evidence/evidence-manifest.json'), true);
  assert.equal(isEvidenceOnlyPath('docs\\governance\\evidence\\xyz.json'), true);
  assert.equal(isEvidenceOnlyPath('docs/governance/policy.md'), false);
  assert.equal(isEvidenceOnlyPath('docs/governance/GOVERNANCE_CHARTER.md'), false);
  assert.equal(isEvidenceOnlyPath('docs\\governance\\policy.md'), false);
  assert.equal(isEvidenceOnlyPath('docs/governance/policies/security.md'), false);
  assert.equal(isEvidenceOnlyPath('docs/audit/CERTIFICATION_PROGRESS_DASHBOARD.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audit/COR_REMEDIATION_EXECUTION_RUNBOOK.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audit/COR_UAIGOS_REAUDIT_AND_REMEDIATION_PLAN.md'), true);
  assert.equal(isEvidenceOnlyPath('docs\\audit\\windows-path.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audits/legacy-report.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/qualification/matrix.json'), true);
  assert.equal(isEvidenceOnlyPath('src/governance/tampered.js'), false);
  assert.equal(isEvidenceOnlyPath('src/audit/tampered.js'), false);
});

test('FRESH-011: modifying a non-evidence governance doc like docs/governance/policy.md post-candidate causes assertCandidateBinding to fail closed', async () => {
  const { assertCandidateBinding } = await import(pathToFileURL(path.join(GOV, 'evidence-freshness.mjs')).href);
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'docs/governance/policy.md', '# Enterprise Security Policy\n');
  commit(dir, 'governance policy update post-candidate');
  assert.throws(
    () => assertCandidateBinding(dir, candidate),
    /Stale evidence: 1 non-evidence path\(s\) changed.*docs\/governance\/policy\.md/
  );
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Stale evidence: 1 non-evidence path\(s\) changed.*docs\/governance\/policy\.md/
  );
});

test('FRESH-012: modifying docs/governance/evidence/foo.json post-candidate is accepted as an evidence-only descendant', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'docs/governance/evidence/foo.json', { auditNote: 'post-candidate-proof' });
  const evidenceHead = commit(dir, 'evidence documentation updates');
  const r = await verifyEvidenceFreshness({ root: dir });
  assert.equal(r.candidate, candidate);
  assert.equal(r.head, evidenceHead);
  assert.equal(r.descendant, true);
  assert.ok(r.evidenceChangedPaths.includes('docs/governance/evidence/foo.json'));
});

test('FRESH-013: AI qualification report bound to mismatched SHA is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({
    aiReport: {
      gitSha: 'f'.repeat(40),
      qualificationMode: 'CATALOG_OFFLINE',
      summary: { activeCount: 0 },
      receipts: [],
    },
  });
  await seal(dir, candidate);
  assert.throws(() => verifyEvidenceFreshness({ root: dir }), /AI model qualification report SHA/);
});

test('FRESH-014: AI qualification report with active models under offline mode is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({
    aiReport: {
      qualificationMode: 'CATALOG_OFFLINE',
      summary: { activeCount: 2 },
      receipts: [{ status: 'ACTIVE', liveExecution: true }, { status: 'ACTIVE', liveExecution: true }],
    },
  });
  await seal(dir, candidate);
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Offline catalog reports cannot satisfy live AI qualification: active models require live execution/
  );
});

test('FRESH-015: AI qualification report with active models lacking liveExecution === true is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({
    aiReport: {
      qualificationMode: 'LIVE_SOVEREIGN',
      summary: { activeCount: 1 },
      receipts: [{ status: 'ACTIVE', liveExecution: false }],
    },
  });
  await seal(dir, candidate);
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Receipts for all active models must have liveExecution === true/
  );
});

test('FRESH-016: AI qualification report where activeCount does not match live active receipts is rejected', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({
    aiReport: {
      qualificationMode: 'LIVE_SOVEREIGN',
      summary: { activeCount: 2 },
      receipts: [{ status: 'ACTIVE', liveExecution: true }],
    },
  });
  await seal(dir, candidate);
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Active model count does not match real live qualification receipts/
  );
});

test('FRESH-017: AI qualification report with activeCount 0 under offline mode is accepted', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({
    aiReport: {
      qualificationMode: 'CATALOG_OFFLINE',
      summary: { totalDiscovered: 12, qualifiedCount: 0, activeCount: 0, disabledCount: 12 },
      receipts: [{ status: 'DISABLED' }],
    },
  });
  const head = await seal(dir, candidate);
  const r = await verifyEvidenceFreshness({ root: dir });
  assert.equal(r.candidate, candidate);
  assert.equal(r.head, head);
  assert.equal(r.descendant, true);
});

test('FRESH-018: AI qualification report with verified live execution receipts under LIVE_SOVEREIGN is accepted', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease({
    aiReport: {
      qualificationMode: 'LIVE_SOVEREIGN',
      summary: { totalDiscovered: 2, qualifiedCount: 2, activeCount: 2, disabledCount: 0 },
      receipts: [
        { modelAlias: 'model-a', status: 'ACTIVE', liveExecution: true },
        { modelAlias: 'model-b', status: 'ACTIVE', liveExecution: true },
      ],
    },
  });
  const head = await seal(dir, candidate);
  const r = await verifyEvidenceFreshness({ root: dir });
  assert.equal(r.candidate, candidate);
  assert.equal(r.head, head);
  assert.equal(r.descendant, true);
});

test('FRESH-019: manifest omitting ai_model_qualification_report.json from evidenceFiles fails closed', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  const p = path.join(dir, 'docs/governance/evidence/evidence-manifest.json');
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  m.evidenceFiles = m.evidenceFiles.filter((f) => f.path !== 'docs/security/evidence/ai_model_qualification_report.json');
  fs.writeFileSync(p, JSON.stringify(m, null, 2));
  commit(dir, 'omit ai model report from manifest');
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Manifest missing required evidence file: docs\/security\/evidence\/ai_model_qualification_report\.json/
  );
});

test('FRESH-020: tampered ai_model_qualification_report.json digest causes verification to fail closed', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'docs/security/evidence/ai_model_qualification_report.json', { tampered: true });
  commit(dir, 'tamper ai model report on disk');
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Digest mismatch for docs\/security\/evidence\/ai_model_qualification_report\.json/
  );
});

test('FRESH-021: missing ai_model_qualification_report.json file causes verification to fail closed', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  fs.unlinkSync(path.join(dir, 'docs/security/evidence/ai_model_qualification_report.json'));
  commit(dir, 'delete ai model report file');
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir }),
    /Evidence file missing or outside repository: docs\/security\/evidence\/ai_model_qualification_report\.json/
  );
});

test('FRESH-022: mismatched expected candidate SHA fails closed', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);

  const mismatchedSha = '1'.repeat(40);
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir, expectedCandidateSha: mismatchedSha }),
    new RegExp(`Candidate SHA mismatch: manifest ${candidate} != expected ${mismatchedSha}`)
  );

  const prevEnv = process.env.COR_CANDIDATE_SHA;
  try {
    process.env.COR_CANDIDATE_SHA = mismatchedSha;
    assert.throws(
      () => verifyEvidenceFreshness({ root: dir }),
      new RegExp(`Candidate SHA mismatch: manifest ${candidate} != expected ${mismatchedSha}`)
    );

    process.env.COR_CANDIDATE_SHA = candidate;
    const r = verifyEvidenceFreshness({ root: dir });
    assert.equal(r.candidate, candidate);
  } finally {
    if (prevEnv === undefined) {
      delete process.env.COR_CANDIDATE_SHA;
    } else {
      process.env.COR_CANDIDATE_SHA = prevEnv;
    }
  }
});

test('FRESH-023: verification failure generates diagnostic report artifact in .cor_evidence', async () => {
  const { verifyEvidenceFreshness, writeDiagnosticReport } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);

  const mismatchedSha = '2'.repeat(40);
  assert.throws(
    () => verifyEvidenceFreshness({ root: dir, expectedCandidateSha: mismatchedSha, writeDiagnosticOnFailure: true }),
    /Candidate SHA mismatch/
  );

  const diagPath = path.join(dir, '.cor_evidence', 'diagnostic-report.json');
  assert.ok(fs.existsSync(diagPath), 'Diagnostic report must exist in .cor_evidence upon failure');
  const report = JSON.parse(fs.readFileSync(diagPath, 'utf8'));
  assert.ok(report.timestamp, 'Diagnostic report must contain timestamp');
  assert.equal(report.candidate, candidate);
  assert.match(report.error, /Candidate SHA mismatch/);
  assert.ok(report.stack, 'Diagnostic report must contain stack trace');

  const customPath = writeDiagnosticReport(dir, '3'.repeat(40), new Error('Simulated failure'));
  assert.ok(fs.existsSync(customPath));
  const customReport = JSON.parse(fs.readFileSync(customPath, 'utf8'));
  assert.equal(customReport.candidate, '3'.repeat(40));
  assert.equal(customReport.error, 'Simulated failure');
});
