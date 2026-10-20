/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — Evidence Pipeline Adversarial Suite
 * File           : evidence-pipeline-adversarial.test.js
 * Version        : 2.1.0
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
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(id, title, fn) {
  test(`${id}: ${title}`, async () => {
    try {
      const res = fn();
      if (res && typeof res.then === 'function') {
        await res;
      }
      console.log(`[PASS] ✓ ${id}: ${title}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
      failed++;
      throw err;
    }
  });
}

function createTempEvidenceTree(keyPair) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-adv-ev-'));
  const rawDir = path.join(tmpDir, 'raw');
  const outDir = path.join(tmpDir, 'bundle');
  const commitHash = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const treeHash = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { cwd: ROOT, encoding: 'utf8' }).trim();
  const now = new Date().toISOString();

  const writeRaw = (rel, data) => {
    const abs = path.join(rawDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n', 'utf8');
  };

  writeRaw('governance/policy-results.json', { status: 'PASS' });
  writeRaw('governance/exception-register.json', { activeExceptions: 0, entries: [] });
  writeRaw('governance/adr-index.json', { count: 1, records: [{ id: 'ADR-0001' }] });
  writeRaw('security/secrets-scan.sarif', { version: '2.1.0', runs: [{ tool: { driver: { name: 'Ugondu' } }, results: [] }] });
  writeRaw('security/dependency-scan.json', {
    status: 'PASS',
    scanner: 'npm-audit',
    scannerVersion: '10.8.0',
    lockfileSha256: 'a'.repeat(64),
    rawReportSha256: 'b'.repeat(64),
    vulnerabilities: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 }
  });
  const components = Array.from({ length: 12 }, (_, idx) => ({
    type: 'library',
    name: `pkg-${idx}`,
    version: '1.0.0',
    purl: `pkg:npm/pkg-${idx}@1.0.0`
  }));
  writeRaw('security/sbom.cdx.json', { bomFormat: 'CycloneDX', specVersion: '1.5', version: 1, components });
  writeRaw('security/provenance.json', {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: 'server/engine-core/dist/index.js', digest: { sha256: 'c'.repeat(64) } }],
    predicate: {
      buildDefinition: {
        externalParameters: { repository: 'Chicitadel/ugondu', commitHash, treeHash }
      }
    }
  });

  const validXml = '<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="suite" tests="2" failures="0" errors="0" skipped="0"><testsuite name="suite" tests="2" failures="0" errors="0" skipped="0"><testcase classname="test.js" name="verifies invariant 1" time="0.01"/><testcase classname="test.js" name="verifies invariant 2" time="0.01"/></testsuite></testsuites>\n';
  for (const rel of ['tests/unit-results.xml', 'tests/contract-results.xml', 'tests/integration-results.xml', 'tests/e2e-results.xml', 'tests/security-results.xml']) {
    writeRaw(rel, validXml);
  }

  writeRaw('tests/compatibility-results.json', {
    status: 'PASS',
    platformsVerified: ['linux/amd64'],
    repositoryProvidersVerified: [{ provider: 'github', status: 'tested' }]
  });
  writeRaw('tests/aws-conformance-results.json', {
    status: 'PASS',
    awsAccountId: '971671216490',
    awsRegion: 'eu-west-3',
    leastPrivilegeBoundaries: {
      iamListUsersDenied: true,
      executionRoleAssumptionFailClosed: true
    }
  });
  writeRaw('runtime/health-readiness.json', { status: 'PASS' });
  writeRaw('runtime/trace-samples.json', { status: 'PASS' });
  writeRaw('runtime/deployment-receipt.json', {
    schemaVersion: '1.0.0',
    evidenceId: 'ev-test-001',
    executionId: 'exec-test-001',
    gateId: 'COR-EVIDENCE_COLLECTION-001',
    status: 'PASS',
    source: { repository: 'Chicitadel/ugondu', commit: commitHash, tree: treeHash, branch: 'main', workflowRunId: 'local-1' },
    target: { id: 'host-linux-amd64', os: 'linux', architecture: 'amd64', runtime: 'node-20', provider: 'local', mode: 'headless-ci' },
    startedAt: now,
    completedAt: now,
    command: ['node', 'collect-qualification-evidence.mjs'],
    exitCode: 0,
    rawLogSha256: 'd'.repeat(64),
    artifacts: [{ path: 'runtime/health-readiness.json', sha256: 'e'.repeat(64), sizeBytes: 20 }],
    assertions: { total: 10, passed: 10, failed: 0, skipped: 0 },
    limitations: ['none']
  });

  return { tmpDir, rawDir, outDir, commitHash, treeHash, keyPair };
}

let verifierModule = null;
let parserModule = null;

async function getModules() {
  if (!verifierModule) {
    const verifierUrl = pathToFileURL(path.join(ROOT, 'scripts/release/verify-evidence-bundle.mjs')).href;
    verifierModule = await import(verifierUrl);
  }
  if (!parserModule) {
    const parserUrl = pathToFileURL(path.join(ROOT, 'scripts/release/junit-parser.mjs')).href;
    parserModule = await import(parserUrl);
  }
  return { ...verifierModule, ...parserModule };
}

const keyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
const privPem = keyPair.privateKey;
const pubPem = keyPair.publicKey;

check('ADV-001', 'Fails closed when evidence-manifest.sig is missing', async () => {
  const { generateEvidenceBundle, verifyEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    generateEvidenceBundle(ctx.outDir);
    fs.unlinkSync(path.join(ctx.outDir, 'signatures/evidence-manifest.sig'));
    assert.throws(() => verifyEvidenceBundle(ctx.outDir), /Missing signatures\/evidence-manifest\.sig/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-002', 'Fails closed when an evidence artifact byte is tampered post-signing', async () => {
  const { generateEvidenceBundle, verifyEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    generateEvidenceBundle(ctx.outDir);
    const target = path.join(ctx.outDir, 'security/sbom.cdx.json');
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8') + ' ');
    assert.throws(() => verifyEvidenceBundle(ctx.outDir), /digest mismatch/i);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-003', 'Fails closed when record violates qualification-evidence.schema.json', async () => {
  const { validateEvidenceRecordSchema } = await getModules();
  const invalidRecord = { schemaVersion: '1.0.0', evidenceId: 'ev-1' };
  assert.throws(() => validateEvidenceRecordSchema(invalidRecord), /missing required schema field/);
});

check('ADV-004', 'Rejects bundle missing any required test suite XML artifact', async () => {
  const { generateEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  fs.unlinkSync(path.join(ctx.rawDir, 'tests/integration-results.xml'));
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    assert.throws(() => generateEvidenceBundle(ctx.outDir), /Missing real qualification artifact/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-005', 'Rejects zero-vulnerability stubs without real lockfile hash in SCA', async () => {
  const { generateEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  const scaPath = path.join(ctx.rawDir, 'security/dependency-scan.json');
  fs.writeFileSync(scaPath, JSON.stringify({ status: 'PASS', scanner: 'stub' }), 'utf8');
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    assert.throws(() => generateEvidenceBundle(ctx.outDir), /Dependency scan evidence is missing real npm-audit/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-006', 'Rejects shallow top-level-only SBOM with fewer than 10 components', async () => {
  const { generateEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  const sbomPath = path.join(ctx.rawDir, 'security/sbom.cdx.json');
  fs.writeFileSync(sbomPath, JSON.stringify({ bomFormat: 'CycloneDX', components: [] }), 'utf8');
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    assert.throws(() => generateEvidenceBundle(ctx.outDir), /SBOM evidence must be a complete resolved lockfile CycloneDX inventory/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-007', 'Rejects synthesized fallback "executed <script>" JUnit testcase entries', async () => {
  const { generateEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  const xmlPath = path.join(ctx.rawDir, 'tests/security-results.xml');
  fs.writeFileSync(xmlPath, '<testsuites tests="1" failures="0" errors="0" skipped="0"><testsuite tests="1" failures="0" errors="0" skipped="0"><testcase classname="security" name="executed tests/cor-remediation.test.js" time="0.1"/></testsuite></testsuites>', 'utf8');
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    assert.throws(() => generateEvidenceBundle(ctx.outDir), /synthesized fallback testcase/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-008', 'Rejects compatibility evidence claiming multiple unexecuted OS/architecture targets', async () => {
  const { generateEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  const compatPath = path.join(ctx.rawDir, 'tests/compatibility-results.json');
  fs.writeFileSync(compatPath, JSON.stringify({
    status: 'PASS',
    platformsVerified: ['linux/amd64', 'darwin/arm64', 'windows/amd64'],
    repositoryProvidersVerified: []
  }), 'utf8');
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    assert.throws(() => generateEvidenceBundle(ctx.outDir), /claims unexecuted platforms/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-009', 'Rejects untrusted keyId or ephemeral keySource in evidence-manifest.sig', async () => {
  const { generateEvidenceBundle, verifyEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    generateEvidenceBundle(ctx.outDir);
    const sigPath = path.join(ctx.outDir, 'signatures/evidence-manifest.sig');
    const sig = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
    sig.keyId = 'untrusted-key-v0';
    fs.writeFileSync(sigPath, JSON.stringify(sig, null, 2), 'utf8');
    assert.throws(() => verifyEvidenceBundle(ctx.outDir), /Invalid keyId in evidence signature/);
  } finally {
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-010', 'Fails closed when UGONDU_EVIDENCE_PUBLIC_KEY is absent', async () => {
  const { generateEvidenceBundle, verifyEvidenceBundle } = await getModules();
  const ctx = createTempEvidenceTree(keyPair);
  process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
  process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
  process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
  try {
    generateEvidenceBundle(ctx.outDir);
    delete process.env.UGONDU_EVIDENCE_PUBLIC_KEY;
    assert.throws(() => verifyEvidenceBundle(ctx.outDir), /UGONDU_EVIDENCE_PUBLIC_KEY/);
  } finally {
    process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
    fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
  }
});

check('ADV-011', 'Native JUnit parser rejects test reports with failures or errors', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const tmpXml = path.join(os.tmpdir(), `failing-test-${Date.now()}.xml`);
  fs.writeFileSync(tmpXml, '<testsuites tests="2" failures="1" errors="0"><testsuite tests="2" failures="1"><testcase name="testA"/><testcase name="testB"><failure message="assertion failed">fail</failure></testcase></testsuite></testsuites>', 'utf8');
  try {
    assert.throws(() => parseAndValidateNativeJUnit({ file: tmpXml }), /failed with 1 failures/);
  } finally {
    if (fs.existsSync(tmpXml)) fs.unlinkSync(tmpXml);
  }
});

check('ADV-012', 'Native JUnit parser rejects empty or missing test report files', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const missingXml = path.join(os.tmpdir(), `missing-test-${Date.now()}.xml`);
  assert.throws(() => parseAndValidateNativeJUnit({ file: missingXml }), /Required native test report missing/);

  const emptyXml = path.join(os.tmpdir(), `empty-test-${Date.now()}.xml`);
  fs.writeFileSync(emptyXml, '', 'utf8');
  try {
    assert.throws(() => parseAndValidateNativeJUnit({ file: emptyXml }), /Native test report is empty/);
  } finally {
    if (fs.existsSync(emptyXml)) fs.unlinkSync(emptyXml);
  }
});

check('ADV-013', 'Native JUnit parser rejects reports from mismatched commit SHAs', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const tmpXml = path.join(os.tmpdir(), `commit-mismatch-${Date.now()}.xml`);
  fs.writeFileSync(tmpXml, '<testsuites commit="0123456789abcdef0123456789abcdef01234567" tests="1" failures="0"><testsuite tests="1"><testcase name="t1"/></testsuite></testsuites>', 'utf8');
  try {
    assert.throws(() => parseAndValidateNativeJUnit({
      file: tmpXml,
      expectedCommit: 'fedcba9876543210fedcba9876543210fedcba98',
      actualCommit: 'fedcba9876543210fedcba9876543210fedcba98'
    }), /Report commit attribute/);
  } finally {
    if (fs.existsSync(tmpXml)) fs.unlinkSync(tmpXml);
  }
});

check('ADV-014', 'Native JUnit parser rejects DOCTYPE and ENTITY injection (anti-XXE)', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const xxeXml = `<?xml version="1.0"?>\n<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>\n<testsuites tests="1"><testcase name="&xxe;"/></testsuites>`;
  assert.throws(() => parseAndValidateNativeJUnit({ xmlString: xxeXml }), /Security violation: XML contains prohibited DOCTYPE\/ENTITY/);
});

check('ADV-015', 'Native JUnit parser rejects declared attribute counts inconsistent with testcase nodes', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const mismatchXml = '<testsuites tests="5" failures="0"><testcase name="t1"/><testcase name="t2"/></testsuites>';
  assert.throws(() => parseAndValidateNativeJUnit({ xmlString: mismatchXml }), /Attribute 'tests' \(5\) does not match actual <testcase> count \(2\)/);
});

check('ADV-016', 'Native JUnit parser rejects duplicate testcase names within a suite', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const dupXml = '<testsuites><testcase classname="pkg" name="duplicateTest"/><testcase classname="pkg" name="duplicateTest"/></testsuites>';
  assert.throws(() => parseAndValidateNativeJUnit({ xmlString: dupXml }), /Duplicate testcase detected: "duplicateTest"/);
});

check('ADV-017', 'Native JUnit parser rejects reports with 0 test cases', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const zeroXml = '<testsuites tests="0" failures="0"></testsuites>';
  assert.throws(() => parseAndValidateNativeJUnit({ xmlString: zeroXml }), /contains 0 test cases/);
});

check('ADV-018', 'Native JUnit parser rejects malformed or unclosed XML tag structures', async () => {
  const { parseAndValidateNativeJUnit } = await getModules();
  const unclosedXml = '<testsuites><testsuite><testcase name="t1"></testsuites>';
  assert.throws(() => parseAndValidateNativeJUnit({ xmlString: unclosedXml }), /Mismatched tag/);
});

check('ADV-019', 'Adversarial runner detects test script failure even if stdout printed PASS-like text', () => {
  const tmpScript = path.join(os.tmpdir(), `adversarial-fake-pass-${Date.now()}.js`);
  fs.writeFileSync(tmpScript, `
    console.log('[PASS] ✓ FAKE-001: Looks passed in stdout');
    throw new Error('Real internal assertion failure after fake log');
  `, 'utf8');
  try {
    const res = spawnSync(process.execPath, [tmpScript], { encoding: 'utf8' });
    assert.notStrictEqual(res.status, 0, 'Process must exit with non-zero status on uncaught exception');
  } finally {
    if (fs.existsSync(tmpScript)) fs.unlinkSync(tmpScript);
  }
});

test.after(() => {
  console.log(`\nAdversarial Evidence Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
});
