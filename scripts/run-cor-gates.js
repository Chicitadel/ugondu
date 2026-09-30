/**
 * Authoritative COR gate runner.
 * Produces fresh machine-readable results; no hardcoded pass counts.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const suites = [
  'tests/schema-validation.test.js',
  'tests/adversarial-execution.test.js',
  'tests/evidence-verification.test.js',
  'tests/billing-gateway.test.js',
  'tests/engine-core.test.js',
  'tests/plugin-manager.test.js',
  'tests/repository-adapter.test.js',
  'tests/security-regression.test.js',
  'tests/dora-analytics.test.js',
  'tests/language-packs.test.js',
  'tests/localization-dropin.test.js',
  'tests/roadmap-r1-targets.test.js',
  'tests/roadmap-r2-r3-upm-compiler.test.js',
  'tests/roadmap-r5-r6-operations-trends.test.js',
  'tests/roadmap-r7-r8-ai-migration.test.js',
  'tests/roadmap-r9-r10-r11.test.js'
];

const results = { startedAt: Date.now(), suites: [], passed: 0, failed: 0, skipped: 0, notRun: 0 };

for (const suite of suites) {
  const run = spawnSync(process.execPath, [suite], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 120000
  });
  const status = run.status === 0 ? 'PASS' : 'FAIL';
  results.suites.push({
    suite,
    status,
    exitCode: run.status,
    signal: run.signal || null,
    durationMs: 0
  });
  if (status === 'PASS') results.passed++;
  else results.failed++;
  if (run.error) results.suites.at(-1).error = run.error.message;
}

results.total = suites.length;
results.completedAt = Date.now();
fs.writeFileSync(path.join(ROOT, 'cor-test-results.json'), JSON.stringify(results, null, 2) + '\n', { mode: 0o600 });

if (results.failed || results.skipped || results.notRun) process.exit(1);
