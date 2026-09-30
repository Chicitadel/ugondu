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

function runGates(skipEvidence = false) {
  execFileSync(process.execPath, [path.join(__dirname, 'run-cor-gates.js')], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...(skipEvidence ? { UGONDU_SKIP_EVIDENCE_GATE: 'true' } : {}) }
  });
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'cor-test-results.json'), 'utf8'));
}

function loadEvidenceKey() {
  const pem = process.env.UGONDU_EVIDENCE_PRIVATE_KEY || null;
  if (!pem) throw new Error('UGONDU_EVIDENCE_PRIVATE_KEY is required; repository signing keys are forbidden');
  return crypto.createPrivateKey(pem);
}

function generate() {
  const codeGovernance = auditCode();
  
  // Phase 1: Run gates skipping evidence-verification to establish initial passing state
  let testResults = runGates(true);
  if (testResults.failed !== 0 || testResults.skipped !== 0 || testResults.notRun !== 0) {
    throw new Error('Mandatory certification gates did not all PASS during pre-bundle evaluation');
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

  const privateKey = loadEvidenceKey();

  const writeAndSignBundle = (b) => {
    delete b.evidenceBundleHash;
    delete b.signature;
    const unsigned = JSON.stringify(b);
    b.evidenceBundleHash = 'sha256:' + crypto.createHash('sha256').update(unsigned).digest('hex');
    b.signature = crypto.sign(
      null,
      Buffer.from(b.evidenceBundleHash, 'utf8'),
      privateKey
    ).toString('base64');
    fs.writeFileSync(path.join(ROOT, 'cor-evidence-bundle.json'), JSON.stringify(b, null, 2) + '\n', {
      mode: 0o600
    });
  };

  writeAndSignBundle(bundle);

  // Phase 2: Run full gates including evidence-verification now that valid bundle is written
  testResults = runGates(false);
  if (testResults.failed !== 0 || testResults.skipped !== 0 || testResults.notRun !== 0) {
    throw new Error('Mandatory certification gates did not all PASS in full verification');
  }

  bundle.testResults = testResults;
  writeAndSignBundle(bundle);

  // Final confirmation: run evidence-verification directly
  execFileSync(process.execPath, [path.join(ROOT, 'tests/evidence-verification.test.js')], {
    cwd: ROOT,
    stdio: 'inherit'
  });

  console.log('[PASS] Fresh COR evidence bundle generated and cryptographically signed across all 16 suites');
}

try {
  generate();
} catch (err) {
  console.error('[FAIL] COR evidence generation:', err.message);
  process.exit(1);
}
