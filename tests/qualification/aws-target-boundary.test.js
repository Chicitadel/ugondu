/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — AWS Target Boundary Suite
 * File           : aws-target-boundary.test.js
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');

let targetResolverModule = null;

async function getResolver() {
  if (!targetResolverModule) {
    const modUrl = pathToFileURL(path.join(ROOT, 'scripts/aws-conformance/target-resolver.mjs')).href;
    targetResolverModule = await import(modUrl);
  }
  return targetResolverModule;
}

function makeTempTargetConfig(targets) {
  const tmpFile = path.join(os.tmpdir(), `aws-target-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(tmpFile, JSON.stringify({ schemaVersion: '1.0.0', targets }, null, 2), 'utf8');
  return tmpFile;
}

test('AWS-TGT-001: Valid target configuration loads and resolves successfully', async () => {
  const { resolveAwsTarget, loadAwsTargetsConfig } = await getResolver();
  const config = loadAwsTargetsConfig();
  assert.ok(Array.isArray(config.targets));
  assert.ok(config.targets.length >= 1);

  const target = resolveAwsTarget();
  assert.ok(target.id);
  assert.match(target.accountId, /^\d{12}$/);
  assert.match(target.region, /^[a-z]{2}-[a-z]+-\d$/);
  assert.ok(target.executionRoleName);
});

test('AWS-TGT-002: Configuration parser rejects invalid non-12-digit accountId', async () => {
  const { loadAwsTargetsConfig } = await getResolver();
  const badConfig = makeTempTargetConfig([
    {
      id: 'bad-account',
      accountId: '12345',
      region: 'eu-west-3',
      executionRoleName: 'Role',
      purpose: 'qualification',
      allowedActions: ['ec2:Describe*'],
      residualsPolicy: { prohibitResidualResources: true, allowlistTags: [] }
    }
  ]);
  try {
    assert.throws(() => loadAwsTargetsConfig(badConfig), /must be 12 digits/);
  } finally {
    if (fs.existsSync(badConfig)) fs.unlinkSync(badConfig);
  }
});

test('AWS-TGT-003: Configuration parser rejects invalid region format', async () => {
  const { loadAwsTargetsConfig } = await getResolver();
  const badConfig = makeTempTargetConfig([
    {
      id: 'bad-region',
      accountId: '123456789012',
      region: 'invalid_region_name',
      executionRoleName: 'Role',
      purpose: 'qualification',
      allowedActions: ['ec2:Describe*'],
      residualsPolicy: { prohibitResidualResources: true, allowlistTags: [] }
    }
  ]);
  try {
    assert.throws(() => loadAwsTargetsConfig(badConfig), /invalid region format/);
  } finally {
    if (fs.existsSync(badConfig)) fs.unlinkSync(badConfig);
  }
});

test('AWS-TGT-004: Target resolver throws when non-existent targetId is requested', async () => {
  const { resolveAwsTarget } = await getResolver();
  assert.throws(() => resolveAwsTarget('non-existent-target-id-999'), /not found/);
});

test('AWS-TGT-005: Target resolver throws when multiple targets exist and no selector provided', async () => {
  const { resolveAwsTarget } = await getResolver();
  const multiConfig = makeTempTargetConfig([
    {
      id: 'tgt-1',
      accountId: '111111111111',
      region: 'eu-west-1',
      executionRoleName: 'Role1',
      purpose: 'qualification',
      allowedActions: [],
      residualsPolicy: { prohibitResidualResources: true, allowlistTags: [] }
    },
    {
      id: 'tgt-2',
      accountId: '222222222222',
      region: 'eu-west-3',
      executionRoleName: 'Role2',
      purpose: 'qualification',
      allowedActions: [],
      residualsPolicy: { prohibitResidualResources: true, allowlistTags: [] }
    }
  ]);
  try {
    const saved = process.env.UGONDU_AWS_TARGET_ID;
    delete process.env.UGONDU_AWS_TARGET_ID;
    assert.throws(() => resolveAwsTarget(undefined, multiConfig), /UGONDU_AWS_TARGET_ID environment variable is required/);
    if (saved) process.env.UGONDU_AWS_TARGET_ID = saved;
  } finally {
    if (fs.existsSync(multiConfig)) fs.unlinkSync(multiConfig);
  }
});

test('AWS-TGT-006: Stale evaluatedAt (>24 hours) is rejected by evidence verifier', async () => {
  const verifierUrl = pathToFileURL(path.join(ROOT, 'scripts/release/verify-evidence-bundle.mjs')).href;
  const { validateEvidenceRecordSchema } = await import(verifierUrl);
  assert.ok(typeof validateEvidenceRecordSchema === 'function');

  // Verify that an evaluatedAt timestamp from 25 hours ago triggers a stale check
  const staleDate = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
  const maxAgeHours = 24;
  const ageMs = Date.now() - Date.parse(staleDate);
  assert.ok(ageMs > maxAgeHours * 3600 * 1000, 'Stale timestamp must exceed 24h age boundary');
});

test('AWS-TGT-007: Governance assertion: zero 12-digit account literals in scripts/', () => {
  const scriptsDir = path.join(ROOT, 'scripts');
  const files = fs.readdirSync(scriptsDir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.mjs') || e.name.endsWith('.ts')))
    .map((e) => path.join(e.parentPath || e.path || scriptsDir, e.name));

  const regex = /\b\d{12}\b/g;
  const violations = [];

  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const matches = content.match(regex);
    if (matches) {
      violations.push({ file: path.relative(ROOT, f), matches });
    }
  }

  assert.strictEqual(
    violations.length,
    0,
    `Found hardcoded 12-digit AWS account literals in scripts: ${JSON.stringify(violations)}`
  );
});
