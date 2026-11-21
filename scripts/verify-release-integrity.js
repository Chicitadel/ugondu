/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Release Integrity & Governance Gate
 * File           : verify-release-integrity.js
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd / Ujomor Systems
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
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
 * Copyright (c) 2026 Air Roofers Ltd / Ujomor Systems
 * All Rights Reserved.
 ******************************************************************************/
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PEM_HEADER_RE = new RegExp('-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?' + 'PRIVATE KEY-----');
const STATIC_CI_KEY_RE = new RegExp('ci-test-key-' + 'not-for-production|UGONDU_PRIVATE_KEY=ci-key');
const PLACEHOLDER_LINT_RE = new RegExp('Linting not yet ' + 'configured for all workspaces');
const SKIP_FLAG_RE = new RegExp('--if-' + 'present|--passWith' + 'NoTests');

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error('[FAIL] Release integrity:', message);
  process.exit(1);
}

const tracked = git(['ls-files']).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
const forbiddenTracked = tracked.filter(file =>
  /(^|\/)([^/]+_)?private\.pem$/i.test(file) ||
  file === 'cor-evidence-bundle.json' ||
  file === 'cor-test-results.json' ||
  /(^|\/)\.service_replay_ledger\.json$/.test(file)
);
if (forbiddenTracked.length) {
  fail(`forbidden tracked artifacts: ${forbiddenTracked.join(', ')}`);
}

for (const file of tracked) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
  const content = fs.readFileSync(absolute, 'utf8');
  if (PEM_HEADER_RE.test(content)) {
    fail(`private key material detected in tracked file: ${file}`);
  }
}

const evidencePath = path.join(ROOT, 'cor-evidence-bundle.json');
if (fs.existsSync(evidencePath)) {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
  const head = git(['rev-parse', 'HEAD']);
  const tree = git(['rev-parse', 'HEAD^{tree}']);
  if (evidence.gitCommitHash !== head) fail(`evidence commit ${evidence.gitCommitHash} does not match HEAD ${head}`);
  if (evidence.gitTreeHash !== tree) fail(`evidence tree ${evidence.gitTreeHash} does not match HEAD tree ${tree}`);
}

const policyPath = path.join(ROOT, '.governance', 'policies', 'no-production-stubs.yml');
if (!fs.existsSync(policyPath)) {
  fail('missing policy contract .governance/policies/no-production-stubs.yml');
}
const policyContent = fs.readFileSync(policyPath, 'utf8');
if (!/policyId:\s*UG-COR-NO-STUBS-001\b/.test(policyContent)) {
  fail('policy contract .governance/policies/no-production-stubs.yml must declare UG-COR-NO-STUBS-001');
}

const ciPath = path.join(ROOT, '.github', 'workflows', 'ci.yml');
if (fs.existsSync(ciPath)) {
  const ciContent = fs.readFileSync(ciPath, 'utf8');
  if (STATIC_CI_KEY_RE.test(ciContent)) {
    fail('static private key literal detected in .github/workflows/ci.yml');
  }
  if (SKIP_FLAG_RE.test(ciContent)) {
    fail('prohibited skip flag detected in .github/workflows/ci.yml');
  }
}

const composePath = path.join(ROOT, 'docker-compose.yml');
if (fs.existsSync(composePath)) {
  const composeContent = fs.readFileSync(composePath, 'utf8');
  for (const port of ['4001', '4002', '4003', '4004', '4005']) {
    const hasLocalhost = composeContent.includes(`http://localhost:${port}/health/ready`);
    const hasLoopback = composeContent.includes(`http://127.0.0.1:${port}/health/ready`);
    if (!hasLocalhost && !hasLoopback) {
      fail(`docker-compose.yml missing /health/ready probe for port ${port}`);
    }
  }
}

const makefilePath = path.join(ROOT, 'Makefile');
if (fs.existsSync(makefilePath)) {
  const makefileContent = fs.readFileSync(makefilePath, 'utf8');
  if (PLACEHOLDER_LINT_RE.test(makefileContent)) {
    fail('Makefile still contains placeholder lint target');
  }
}

const rootPkgPath = path.join(ROOT, 'package.json');
if (fs.existsSync(rootPkgPath)) {
  const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  const scripts = rootPkg.scripts || {};
  for (const required of [
    'build',
    'lint',
    'typecheck',
    'test',
    'test:contract',
    'test:integration',
    'test:e2e',
    'test:security',
    'test:compatibility',
    'test:aws',
    'governance:validate'
  ]) {
    if (!scripts[required]) {
      fail(`root package.json missing required script "${required}"`);
    }
    if (SKIP_FLAG_RE.test(scripts[required])) {
      fail(`root package.json script "${required}" contains prohibited skip flag`);
    }
  }
}

console.log('[PASS] Release integrity: no tracked private keys or generated certification artifacts; CI/CD, Compose, Makefile, and UG-COR-NO-STUBS-001 policy gates verified.');
