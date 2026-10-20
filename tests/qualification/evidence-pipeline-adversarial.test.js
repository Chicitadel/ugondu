/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — Evidence Pipeline Adversarial Suite
 * File           : evidence-pipeline-adversarial.test.js
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
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '../..');
let passed = 0;
let failed = 0;

function check(id, title, fn) {
  try {
    fn();
    console.log(`[PASS] ✓ ${id}: ${title}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
    failed++;
  }
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
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
        externalParameters: {
          repository: 'Chicitadel/ugondu',
          commitHash,
          treeHash
        }
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

async function runAdversarialTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu Evidence Pipeline Adversarial Qualification Suite     ');
  console.log('══════════════════════════════════════════════════════════════');

  const verifierUrl = pathToFileURL(path.join(ROOT, 'scripts/release/verify-evidence-bundle.mjs')).href;
  const { generateEvidenceBundle, verifyEvidenceBundle, validateEvidenceRecordSchema } = await import(verifierUrl);

  const keyPair = crypto.generateKeyPairSync('ed25519');
  const privPem = keyPair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const pubPem = keyPair.publicKey.export({ type: 'spki', format: 'pem' }).toString();

  const savedPriv = process.env.UGONDU_EVIDENCE_PRIVATE_KEY;
  const savedPub = process.env.UGONDU_EVIDENCE_PUBLIC_KEY;
  const savedInput = process.env.UGONDU_EVIDENCE_INPUT_DIR;

  try {
    // Baseline positive check
    check('ADV-000', 'Valid qualification input generates and verifies cleanly under external trust anchor', () => {
      const ctx = createTempEvidenceTree(keyPair);
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      generateEvidenceBundle(ctx.outDir);
      const res = verifyEvidenceBundle(ctx.outDir);
      assert.strictEqual(res.verifiedArtifacts, 21);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 1. Corrupted artifact after manifest generation
    check('ADV-001', 'Detects corrupted artifact bytes after manifest generation (SHA-256 mismatch)', () => {
      const ctx = createTempEvidenceTree(keyPair);
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      generateEvidenceBundle(ctx.outDir);
      fs.appendFileSync(path.join(ctx.outDir, 'security/dependency-scan.json'), '\n// tampered\n');
      assert.throws(() => verifyEvidenceBundle(ctx.outDir), /SHA-256 digest mismatch/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 2. Mismatched commit/tree in provenance or deployment-receipt
    check('ADV-002', 'Rejects mismatched candidate commit or tree SHA in provenance and deployment receipt', () => {
      const ctx = createTempEvidenceTree(keyPair);
      const receiptPath = path.join(ctx.rawDir, 'runtime/deployment-receipt.json');
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      receipt.source.commit = '0'.repeat(40);
      fs.writeFileSync(receiptPath, JSON.stringify(receipt), 'utf8');
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      assert.throws(() => generateEvidenceBundle(ctx.outDir), /Stale evidence commit mismatch/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 3. Stale input directory reused as output directory
    check('ADV-003', 'Rejects identical input and output evidence directories to prevent stale reuse', () => {
      const ctx = createTempEvidenceTree(keyPair);
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      assert.throws(() => generateEvidenceBundle(ctx.rawDir), /must be separate/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 4. Altered cryptographic signature
    check('ADV-004', 'Rejects altered Ed25519 signature bytes in evidence-manifest.sig', () => {
      const ctx = createTempEvidenceTree(keyPair);
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      generateEvidenceBundle(ctx.outDir);
      const sigPath = path.join(ctx.outDir, 'signatures/evidence-manifest.sig');
      const sig = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
      const rawSig = Buffer.from(sig.signatureBase64, 'base64');
      rawSig[0] ^= 0xff;
      sig.signatureBase64 = rawSig.toString('base64');
      fs.writeFileSync(sigPath, JSON.stringify(sig, null, 2), 'utf8');
      assert.throws(() => verifyEvidenceBundle(ctx.outDir), /Ed25519 cryptographic signature verification FAILED/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 5. Missing real scanner metadata or non-zero high/critical vulnerabilities
    check('ADV-005', 'Rejects dependency scan missing npm-audit metadata or reporting high/critical vulnerabilities', () => {
      const ctx = createTempEvidenceTree(keyPair);
      const depPath = path.join(ctx.rawDir, 'security/dependency-scan.json');
      fs.writeFileSync(depPath, JSON.stringify({
        status: 'PASS',
        scanner: 'synthesized-zero',
        vulnerabilities: { critical: 0, high: 0 }
      }), 'utf8');
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      assert.throws(() => generateEvidenceBundle(ctx.outDir), /missing real npm-audit scanner metadata/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 6. Test result XML reporting skipped or failed testcases
    check('ADV-006', 'Rejects JUnit XML test artifacts that report skipped or failed tests', () => {
      const ctx = createTempEvidenceTree(keyPair);
      const xmlPath = path.join(ctx.rawDir, 'tests/unit-results.xml');
      fs.writeFileSync(xmlPath, '<testsuites tests="2" failures="0" errors="0" skipped="1"><testsuite tests="2" failures="0" errors="0" skipped="1"><testcase name="t1"/></testsuite></testsuites>', 'utf8');
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      assert.throws(() => generateEvidenceBundle(ctx.outDir), /reports failure\/skips/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 7. Synthesized fallback "executed <script>" testcase
    check('ADV-007', 'Rejects synthesized fallback "executed <script>" JUnit testcase entries', () => {
      const ctx = createTempEvidenceTree(keyPair);
      const xmlPath = path.join(ctx.rawDir, 'tests/security-results.xml');
      fs.writeFileSync(xmlPath, '<testsuites tests="1" failures="0" errors="0" skipped="0"><testsuite tests="1" failures="0" errors="0" skipped="0"><testcase classname="security" name="executed tests/cor-remediation.test.js" time="0.1"/></testsuite></testsuites>', 'utf8');
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      assert.throws(() => generateEvidenceBundle(ctx.outDir), /synthesized fallback testcase/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 8. Multi-platform overclaim in single-host compatibility evidence
    check('ADV-008', 'Rejects compatibility evidence claiming multiple unexecuted OS/architecture targets', () => {
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
      assert.throws(() => generateEvidenceBundle(ctx.outDir), /claims unexecuted platforms/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 9. Untrusted keyId or keySource in signature envelope
    check('ADV-009', 'Rejects untrusted keyId or ephemeral keySource in evidence-manifest.sig', () => {
      const ctx = createTempEvidenceTree(keyPair);
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      generateEvidenceBundle(ctx.outDir);
      const sigPath = path.join(ctx.outDir, 'signatures/evidence-manifest.sig');
      const sig = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
      sig.keyId = 'untrusted-key-v0';
      fs.writeFileSync(sigPath, JSON.stringify(sig, null, 2), 'utf8');
      assert.throws(() => verifyEvidenceBundle(ctx.outDir), /Invalid keyId in evidence signature/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });

    // 10. Missing external UGONDU_EVIDENCE_PUBLIC_KEY trust anchor
    check('ADV-010', 'Fails closed when UGONDU_EVIDENCE_PUBLIC_KEY is absent (no repository-local fallback)', () => {
      const ctx = createTempEvidenceTree(keyPair);
      process.env.UGONDU_EVIDENCE_PRIVATE_KEY = privPem;
      process.env.UGONDU_EVIDENCE_PUBLIC_KEY = pubPem;
      process.env.UGONDU_EVIDENCE_INPUT_DIR = ctx.rawDir;
      generateEvidenceBundle(ctx.outDir);
      delete process.env.UGONDU_EVIDENCE_PUBLIC_KEY;
      assert.throws(() => verifyEvidenceBundle(ctx.outDir), /UGONDU_EVIDENCE_PUBLIC_KEY/);
      fs.rmSync(ctx.tmpDir, { recursive: true, force: true });
    });
  } finally {
    if (savedPriv !== undefined) process.env.UGONDU_EVIDENCE_PRIVATE_KEY = savedPriv;
    else delete process.env.UGONDU_EVIDENCE_PRIVATE_KEY;
    if (savedPub !== undefined) process.env.UGONDU_EVIDENCE_PUBLIC_KEY = savedPub;
    else delete process.env.UGONDU_EVIDENCE_PUBLIC_KEY;
    if (savedInput !== undefined) process.env.UGONDU_EVIDENCE_INPUT_DIR = savedInput;
    else delete process.env.UGONDU_EVIDENCE_INPUT_DIR;
  }

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` Adversarial Evidence Results: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

runAdversarialTests().catch((err) => {
  console.error('Fatal adversarial suite error:', err);
  process.exit(1);
});
