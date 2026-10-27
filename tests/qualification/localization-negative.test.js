/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — Localization Negative Test Suite
 * File           : localization-negative.test.js
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const SCRIPT_PATH = path.resolve(__dirname, '../../scripts/validate-locales.js');
const REAL_LOCALES_DIR = path.resolve(__dirname, '../../server/shared/locales');

function createFixtureDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-loc-neg-'));
  fs.cpSync(REAL_LOCALES_DIR, tempDir, { recursive: true });
  return tempDir;
}

function runValidator(localesDir) {
  return spawnSync(process.execPath, [SCRIPT_PATH, localesDir], {
    encoding: 'utf8',
    env: { ...process.env, UGONDU_LOCALES_DIR: localesDir }
  });
}

test('LOC-NEG-001: Missing key in target locale causes validator failure (exit code 1)', () => {
  const fixtureDir = createFixtureDir();
  try {
    const frPath = path.join(fixtureDir, 'fr.json');
    const data = JSON.parse(fs.readFileSync(frPath, 'utf8'));

    // Remove key from target locale
    delete data.ai.error.endpoint_required;
    fs.writeFileSync(frPath, JSON.stringify(data, null, 2), 'utf8');

    const result = runValidator(fixtureDir);
    assert.strictEqual(result.status, 1, 'Validator must exit with code 1 when key is missing');
    const output = (result.stderr || '') + (result.stdout || '');
    assert.match(output, /COR BLOCKED: Missing keys in fr\.json:.*ai\.error\.endpoint_required/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('LOC-NEG-002: Placeholder mismatch (e.g. {url} missing in French) causes validator failure', () => {
  const fixtureDir = createFixtureDir();
  try {
    const frPath = path.join(fixtureDir, 'fr.json');
    const data = JSON.parse(fs.readFileSync(frPath, 'utf8'));

    // Strip placeholder {url} in target locale
    data.ai.error.endpoint_malformed = "L'URL du point de terminaison IA Air Roofers est invalide sans paramètre.";
    fs.writeFileSync(frPath, JSON.stringify(data, null, 2), 'utf8');

    const result = runValidator(fixtureDir);
    assert.strictEqual(result.status, 1, 'Validator must exit with code 1 on placeholder mismatch');
    const output = (result.stderr || '') + (result.stdout || '');
    assert.match(output, /COR BLOCKED: Placeholder mismatch for key ai\.error\.endpoint_malformed in fr\.json/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('LOC-NEG-003: Fake prefix (e.g. [FR] Bonjour) causes validator failure', () => {
  const fixtureDir = createFixtureDir();
  try {
    const frPath = path.join(fixtureDir, 'fr.json');
    const data = JSON.parse(fs.readFileSync(frPath, 'utf8'));

    // Inject fake locale prefix [FR]
    data.ai.error.endpoint_required = '[FR] Bonjour ' + data.ai.error.endpoint_required;
    fs.writeFileSync(frPath, JSON.stringify(data, null, 2), 'utf8');

    const result = runValidator(fixtureDir);
    assert.strictEqual(result.status, 1, 'Validator must exit with code 1 on fake prefix');
    const output = (result.stderr || '') + (result.stdout || '');
    assert.match(output, /COR BLOCKED: Fake locale prefix not allowed for key ai\.error\.endpoint_required in fr\.json/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('LOC-NEG-004: Untranslated English string causes validator failure', () => {
  const fixtureDir = createFixtureDir();
  try {
    const frPath = path.join(fixtureDir, 'fr.json');
    const data = JSON.parse(fs.readFileSync(frPath, 'utf8'));

    // Untranslated English string identical to source
    data.ai.error.credentials_missing = 'Required AI provider credentials are missing.';
    fs.writeFileSync(frPath, JSON.stringify(data, null, 2), 'utf8');

    const result = runValidator(fixtureDir);
    assert.strictEqual(result.status, 1, 'Validator must exit with code 1 on untranslated English string');
    const output = (result.stderr || '') + (result.stdout || '');
    assert.match(output, /COR BLOCKED: Unchanged English string for key ai\.error\.credentials_missing in fr\.json/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('LOC-NEG-005: Empty string causes validator failure', () => {
  const fixtureDir = createFixtureDir();
  try {
    const frPath = path.join(fixtureDir, 'fr.json');
    const data = JSON.parse(fs.readFileSync(frPath, 'utf8'));

    // Set empty string for a localized value
    data.ai.error.credentials_missing = '';
    fs.writeFileSync(frPath, JSON.stringify(data, null, 2), 'utf8');

    const result = runValidator(fixtureDir);
    assert.strictEqual(result.status, 1, 'Validator must exit with code 1 on empty string');
    const output = (result.stderr || '') + (result.stdout || '');
    assert.match(output, /COR BLOCKED: Empty string not allowed for key ai\.error\.credentials_missing in fr\.json/);
  } finally {
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('LOC-NEG-006: Clean repository passes with 0 violations', () => {
  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    encoding: 'utf8'
  });
  assert.strictEqual(result.status, 0, 'Clean repository validator run must exit with code 0');
  const output = (result.stdout || '') + (result.stderr || '');
  assert.match(output, /Localization validation PASS/);
});
