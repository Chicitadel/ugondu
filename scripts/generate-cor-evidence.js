/**
 * COR evidence generator.
 * Evidence is valid only when the repository gate runner produced fresh results
 * and a dedicated evidence signing key is available through the CI secret store.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MAX_LINES = 500;

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'coverage', '.system_generated'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else if (/\.(ts|js|go)$/.test(entry.name)) results.push(full);
  }
  return results;
}

function auditCode() {
  const files = walk(ROOT);
  let maxLines = 0;
  const violations = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n').length;
    maxLines = Math.max(maxLines, lines);
    if (lines > MAX_LINES) violations.push({ file: path.relative(ROOT, file), lines });
  }
  if (violations.length) throw new Error(`500-line governance failure: ${JSON.stringify(violations)}`);
  return { maxLinesPerFileCompliant: true, maxObservedLines: maxLines };
}

function runGates() {
  execFileSync(process.execPath, [path.join(__dirname, 'run-cor-gates.js')], {
    cwd: ROOT, stdio: 'inherit'
  });
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'cor-test-results.json'), 'utf8'));
}

function loadEvidenceKey() {
  const pem = process.env.UGONDU_EVIDENCE_PRIVATE_KEY;
  if (!pem) throw new Error('UGONDU_EVIDENCE_PRIVATE_KEY is required; unsigned evidence is forbidden');
  return crypto.createPrivateKey(pem);
}

function generate() {
  const codeGovernance = auditCode();
  const testResults = runGates();
  if (testResults.failed !== 0 || testResults.skipped !== 0 || testResults.notRun !== 0) {
    throw new Error('Mandatory certification gates did not all PASS');
  }

  const bundle = {
    schemaVersion: '1.0.0',
    generatorVersion: '2.0.0',
    timestamp: Math.floor(Date.now() / 1000),
    gitTreeHash: git(['rev-parse', 'HEAD^{tree}']),
    gitCommitHash: git(['rev-parse', 'HEAD']),
    protocolVersion: '1.0.0',
    trustRegistryVersion: 'v1',
    testResults,
    codeGovernance,
    artifactDigests: {}
  };

  const unsigned = JSON.stringify(bundle);
  bundle.evidenceBundleHash = 'sha256:' + crypto.createHash('sha256').update(unsigned).digest('hex');

  const privateKey = loadEvidenceKey();
  bundle.signature = crypto.sign(
    null,
    Buffer.from(bundle.evidenceBundleHash, 'utf8'),
    privateKey
  ).toString('base64');

  fs.writeFileSync(path.join(ROOT, 'cor-evidence-bundle.json'), JSON.stringify(bundle, null, 2) + '\n', {
    mode: 0o600
  });
  console.log('[PASS] Fresh COR evidence bundle generated and cryptographically signed');
}

try {
  generate();
} catch (err) {
  console.error('[FAIL] COR evidence generation:', err.message);
  process.exit(1);
}
