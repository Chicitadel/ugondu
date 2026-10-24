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
function buildRelease({ canarySha, nativeSha } = {}) {
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

test('FRESH-010: isEvidenceOnlyPath recognizes docs/governance/, docs/audit/ and docs/audits/ prefixes', async () => {
  const { isEvidenceOnlyPath, EVIDENCE_ONLY_PREFIXES } = await import(pathToFileURL(path.join(GOV, 'evidence-freshness.mjs')).href);
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/governance/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/security/evidence/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/audit/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/audits/'));
  assert.ok(EVIDENCE_ONLY_PREFIXES.includes('docs/qualification/'));
  assert.equal(isEvidenceOnlyPath('docs/governance/GOVERNANCE_CHARTER.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/governance/evidence/evidence-manifest.json'), true);
  assert.equal(isEvidenceOnlyPath('docs\\governance\\audit-summary.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audit/CERTIFICATION_PROGRESS_DASHBOARD.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audit/COR_REMEDIATION_EXECUTION_RUNBOOK.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audit/COR_UAIGOS_REAUDIT_AND_REMEDIATION_PLAN.md'), true);
  assert.equal(isEvidenceOnlyPath('docs\\audit\\windows-path.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/audits/legacy-report.md'), true);
  assert.equal(isEvidenceOnlyPath('docs/qualification/matrix.json'), true);
  assert.equal(isEvidenceOnlyPath('src/governance/tampered.js'), false);
  assert.equal(isEvidenceOnlyPath('src/audit/tampered.js'), false);
});

test('FRESH-011: docs/governance/ changes after candidate are accepted as valid evidence-only changes', async () => {
  const { verifyEvidenceFreshness } = await import(VER);
  const { dir, candidate } = buildRelease();
  await seal(dir, candidate);
  write(dir, 'docs/governance/GOVERNANCE_CHARTER.md', '# Governance Charter\n');
  write(dir, 'docs/governance/SECURITY_CONTROLS.md', '# Security Controls\n');
  const govHead = commit(dir, 'governance documentation updates');
  const r = await verifyEvidenceFreshness({ root: dir });
  assert.equal(r.candidate, candidate);
  assert.equal(r.head, govHead);
  assert.equal(r.descendant, true);
  assert.ok(r.evidenceChangedPaths.includes('docs/governance/GOVERNANCE_CHARTER.md'));
  assert.ok(r.evidenceChangedPaths.includes('docs/governance/SECURITY_CONTROLS.md'));
});
