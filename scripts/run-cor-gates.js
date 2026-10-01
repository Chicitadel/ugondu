/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Scripts
 * File           : run-cor-gates.js
 * Version        : 2.1.0
 * Author         : Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

/**
 * Authoritative COR gate runner.
 * Produces fresh machine-readable results; no hardcoded pass counts.
 *
 * Pre-run step: compiles engine-core TypeScript to dist/ so test files
 * that load compiled modules work correctly.
 * Skip with UGONDU_SKIP_BUILD=true (e.g. when build is a prior CI pipeline step).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

const suites = [
  // Core infrastructure
  'tests/schema-validation.test.js',
  'tests/adversarial-execution.test.js',
  ...(process.env.UGONDU_SKIP_EVIDENCE_GATE === 'true' ? [] : ['tests/evidence-verification.test.js']),
  'tests/billing-gateway.test.js',
  'tests/engine-core.test.js',
  'tests/plugin-manager.test.js',
  'tests/repository-adapter.test.js',
  'tests/security-regression.test.js',
  'tests/dora-analytics.test.js',
  'tests/language-packs.test.js',
  'tests/localization-dropin.test.js',
  // Roadmap phases
  'tests/roadmap-r1-targets.test.js',
  'tests/roadmap-r2-r3-upm-compiler.test.js',
  'tests/roadmap-r5-r6-operations-trends.test.js',
  'tests/roadmap-r7-r8-ai-migration.test.js',
  'tests/roadmap-r9-r10-r11.test.js',
  // Execution security
  'tests/replay-authority.test.js',
  'tests/ssrf-execution.test.js',
  'tests/deployment-lifecycle.test.js',
  'tests/autonomy-authorization.test.js',
  'tests/analytics-evidence-kinds.test.js',
  // URRE
  'tests/urre-failure.test.js',
  'tests/urre-restart.test.js',
  'tests/urre-distributed.test.js',
  // Discovery
  'tests/discovery-contract.test.js',
  'tests/discovery-integration.test.js',
  'tests/discovery-adversarial.test.js',
  // Architecture & intent
  'tests/intent-validation.test.js',
  'tests/architecture-properties.test.js',
  'tests/provider-compilation.test.js',
  // Fabric
  'tests/fabric-interfaces.test.js',
  'tests/fabric-adapters.test.js',
  'tests/provisioning-engine.test.js',
  'tests/fabric-04.test.js',
  'tests/fabric-05.test.js',
  // Autopilot
  'tests/autopilot-admission.test.js',
  'tests/autopilot-safety.test.js',
  'tests/autopilot-security.test.js',
  // Doctor / Assurance
  'tests/doctor-evidence.test.js',
  'tests/doctor-remediation.test.js',
  'tests/doctor-safety.test.js',
  'tests/doctor-security.test.js',
  'tests/assurance-resilience.test.js',
  'tests/assurance-synthetic.test.js',
  'tests/assurance-backup.test.js',
  'tests/assurance-rpo-rto.test.js',
  'tests/assurance-certification.test.js',
  // Phase 13: Delivery Passport — 60 gates
  'tests/passport-cryptography.test.js',
  'tests/passport-integrity.test.js',
  'tests/passport-authority.test.js',
  'tests/passport-freshness-replay.test.js',
  'tests/passport-toctou-reality.test.js',
  'tests/passport-security-lifecycle.test.js',
  // Phase 14: Multi-Tenancy — 60 gates
  'tests/tenant-isolation.test.js',
  'tests/tenant-scope.test.js',
  'tests/tenant-policy.test.js',
  'tests/tenant-identity.test.js',
  'tests/tenant-execution.test.js',
  'tests/tenant-passport.test.js',
  // Sprint 1 COR: Security integration gates
  'tests/passport-admission-gate.test.js',
  'tests/tenant-urre-isolation.test.js',
  // Sprint 2 COR: Stub elimination gates
  'tests/architecture-engine.test.js',
  'tests/intent-engine.test.js',
  'tests/twin-state-machine.test.js',
  'tests/urre-30class-failure.test.js',
];

// ── Pre-run: compile engine-core TypeScript ──────────────────────────────────
// Test files load modules from dist/. Build here unless already built by CI.
if (process.env.UGONDU_SKIP_BUILD !== 'true') {
  const engineCoreDir = path.join(ROOT, 'server', 'engine-core');
  if (fs.existsSync(path.join(engineCoreDir, 'tsconfig.json'))) {
    process.stdout.write('[COR-RUNNER] Compiling engine-core TypeScript...\n');
    const build = spawnSync('npx', ['tsc', '--project', 'tsconfig.json'], {
      cwd: engineCoreDir,
      encoding: 'utf8',
      timeout: 120000,
      shell: true,
    });
    if (build.status !== 0) {
      process.stderr.write('[COR-RUNNER] TypeScript compilation errors — some gates may report [SKIP].\n');
      if (build.stderr) process.stderr.write(build.stderr.slice(0, 3000) + '\n');
    } else {
      process.stdout.write('[COR-RUNNER] Compilation complete.\n');
    }
  }
}

// ── Gate execution ────────────────────────────────────────────────────────────
const results = {
  startedAt: Date.now(),
  suites: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  notRun: 0,
};

for (const suite of suites) {
  const suitePath = path.join(ROOT, suite);
  if (!fs.existsSync(suitePath)) {
    results.suites.push({ suite, status: 'NOT_RUN', exitCode: null, signal: null, durationMs: 0 });
    results.notRun++;
    continue;
  }

  const start = Date.now();
  const run = spawnSync(process.execPath, [suite], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000,
  });
  const durationMs = Date.now() - start;
  const status = run.status === 0 ? 'PASS' : 'FAIL';

  results.suites.push({
    suite,
    status,
    exitCode: run.status,
    signal: run.signal || null,
    durationMs,
    ...(run.error ? { error: run.error.message } : {}),
  });

  process.stdout.write(`  ${status === 'PASS' ? '✓' : '✗'} ${suite} (${durationMs}ms)\n`);
  if (status === 'PASS') results.passed++;
  else {
    results.failed++;
    if (run.stdout) process.stdout.write(run.stdout.slice(-1000));
    if (run.stderr) process.stderr.write(run.stderr.slice(-500));
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
results.total = suites.length;
results.completedAt = Date.now();

process.stdout.write(`\n[COR-RUNNER] Results: ${results.passed} passed / ${results.failed} failed / ${results.notRun} not run\n`);

fs.writeFileSync(
  path.join(ROOT, 'cor-test-results.json'),
  JSON.stringify(results, null, 2) + '\n',
  { mode: 0o600 }
);

if (results.failed > 0 || results.notRun > 0) process.exit(1);
