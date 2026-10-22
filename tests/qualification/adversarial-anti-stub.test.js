/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — Adversarial Anti-Stub Governance Suite
 * File           : adversarial-anti-stub.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-22
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const PROBE_DIR = path.join(ROOT, 'server', 'capabilities', 'src');

let validatorModule = null;

async function getValidator() {
  if (!validatorModule) {
    const modUrl = pathToFileURL(path.join(ROOT, 'scripts/governance/validate-repository.mjs')).href;
    validatorModule = await import(modUrl);
  }
  return validatorModule;
}

function createTempProbe(basename, content) {
  const fileName = `temp-adversarial-${basename}-${Date.now()}-${Math.random().toString(36).slice(2)}.ts`;
  const absPath = path.join(PROBE_DIR, fileName);
  fs.writeFileSync(absPath, content, 'utf8');
  const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
  return { absPath, relPath };
}

function cleanupProbe(absPath) {
  if (absPath && fs.existsSync(absPath)) {
    try {
      fs.unlinkSync(absPath);
    } catch {}
  }
}

function cleanupAllProbes() {
  if (!fs.existsSync(PROBE_DIR)) return;
  const entries = fs.readdirSync(PROBE_DIR);
  for (const entry of entries) {
    if (entry.startsWith('temp-adversarial-')) {
      try {
        fs.unlinkSync(path.join(PROBE_DIR, entry));
      } catch {}
    }
  }
}

test.beforeEach(cleanupAllProbes);
test.afterEach(cleanupAllProbes);

test('AAS-001: Injects fake-success APPLIED_AND_MATCHES without evidence and proves validator catches it', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas001', [
    '/**',
    ' * Corporate capability handler mutation probe',
    ' */',
    'export function executePlan(): string {',
    '  return "APPLIED_AND_MATCHES";',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected exactly one semantic anti-stub violation');
    assert.match(
      violations[0],
      /Anti-stub violation: unverified hardcoded 'APPLIED_AND_MATCHES' returned without evidence/,
      'Must detect unverified APPLIED_AND_MATCHES return'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-002: Injects fake-success { applied: true } without provider interaction and proves validator catches it', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas002', [
    'export function applySecurityPolicy(): { applied: boolean } {',
    '  return { applied: true };',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected exactly one fake-success violation');
    assert.match(
      violations[0],
      /Anti-stub violation: fake-success returning \{ applied: true \} without provider interaction/,
      'Must detect unverified { applied: true } return'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-003: Injects unverified { valid: true } without inspection and proves validator catches it', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas003', [
    'export function validateSpecification(_spec: any): { valid: boolean } {',
    '  return { valid: true };',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected exactly one unverified valid violation');
    assert.match(
      violations[0],
      /Anti-stub violation: unverified \{ valid: true \} returned without inspection/,
      'Must detect unverified { valid: true } return'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-004: Injects production import of mock fixture and proves validator catches it', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas004', [
    'import { MockAdapter } from "./mocks/mock-adapter";',
    '',
    'export function resolveAdapter(): MockAdapter {',
    '  return new MockAdapter();',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected exactly one mock import violation');
    assert.match(
      violations[0],
      /Production source imports mock\/fixture\/test double/,
      'Must detect mock/fixture import in production directory'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-005: Injects swallowed provider error and proves validator catches it', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas005', [
    'export async function executeWithSwallowedError(provider: any) {',
    '  try {',
    '    await provider.apply();',
    '  } catch (e) {',
    '    return { applied: true };',
    '  }',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected exactly one swallowed error violation');
    assert.match(
      violations[0],
      /Swallowed provider error returning fake-success/,
      'Must detect swallowed provider error returning fake success'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-005B: Injects helper-indirected fake success { success: true } and proves validator catches it', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas005b', [
    'export function checkComplianceOutcome() {',
    '  return { success: true };',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected helper fake-success violation');
    assert.match(
      violations[0],
      /Anti-stub violation: helper-indirected fake-success returning \{ success: true \}/,
      'Must detect helper-indirected { success: true } return'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-006: Injects file exceeding MAX_GOVERNED_LOC (500 lines) and proves validator catches it', async () => {
  const { validateCreatedOrModifiedFileLimits, MAX_GOVERNED_LOC } = await getValidator();
  const oversizedLines = [
    '/**',
    ' * Corporate capability module with excess LOC',
    ' */'
  ];
  for (let i = 0; i < 505; i++) {
    oversizedLines.push(`export const parameterEntry_${i}: number = ${i};`);
  }
  const probe = createTempProbe('aas006', oversizedLines.join('\n'));

  try {
    const violations = [];
    validateCreatedOrModifiedFileLimits(violations);
    const oversizedViolation = violations.find((v) => v.includes(probe.relPath) && v.includes('500 LOC'));
    assert.ok(oversizedViolation, `Validator must flag probe exceeding ${MAX_GOVERNED_LOC} LOC`);
    assert.match(
      oversizedViolation,
      /exceeds 500 LOC limit \(\d+ lines\)/,
      'Must report specific line count and limit in violation message'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});

test('AAS-007: Proves clean production source passes with 0 violations', async () => {
  const { runRepositoryValidation } = await getValidator();
  cleanupAllProbes();

  const result = runRepositoryValidation();
  assert.strictEqual(result.passed, true, `Validation failed unexpectedly: ${result.violations.join('; ')}`);
  assert.strictEqual(result.violations.length, 0, 'Clean repository must produce 0 violations');
  assert.strictEqual(result.policyId, 'UG-COR-NO-STUBS-001', 'Must validate against UG-COR-NO-STUBS-001');
  assert.ok(result.checkedFiles > 4000, `Checked files count should exceed 4000, got ${result.checkedFiles}`);
});

test('AAS-008: Injects no-op mutation method and proves validator catches it as an unproven operational stub', async () => {
  const { validateSemanticAntiStubs } = await getValidator();
  const probe = createTempProbe('aas008', [
    '/**',
    ' * Corporate capability policy reconciler mutation probe',
    ' */',
    'export function applyPolicyReconciliation(): void {',
    '}'
  ].join('\n'));

  try {
    const violations = [];
    validateSemanticAntiStubs([probe.relPath], violations);
    assert.strictEqual(violations.length, 1, 'Expected exactly one unproven operational stub violation');
    assert.match(
      violations[0],
      /Anti-stub violation: unproven operational stub \(no-op mutation method 'applyPolicyReconciliation'\)/,
      'Must detect no-op mutation method as an unproven operational stub'
    );
  } finally {
    cleanupProbe(probe.absPath);
  }
});
