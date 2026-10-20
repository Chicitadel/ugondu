#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release Evidence Bundle Generator & Ed25519 Verifier (14.3)
 * File           : verify-evidence-bundle.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
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
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');

const REQUIRED_ARTIFACTS = [
  'source/commit.txt',
  'source/tracked-files.sha256',
  'governance/policy-results.json',
  'governance/exception-register.json',
  'governance/adr-index.json',
  'security/secrets-scan.sarif',
  'security/dependency-scan.json',
  'security/sbom.cdx.json',
  'security/provenance.json',
  'tests/unit-results.xml',
  'tests/contract-results.xml',
  'tests/integration-results.xml',
  'tests/e2e-results.xml',
  'tests/security-results.xml',
  'tests/compatibility-results.json',
  'tests/aws-conformance-results.json',
  'runtime/health-readiness.json',
  'runtime/trace-samples.json',
  'runtime/deployment-receipt.json'
];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha256Text(text) {
  return sha256Buffer(Buffer.from(text, 'utf8'));
}

function writeArtifact(baseDir, relPath, content) {
  const fullPath = path.join(baseDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n';
  fs.writeFileSync(fullPath, text, 'utf8');
}

function resolveEd25519KeyPair() {
  const pubPem = process.env.UGONDU_EVIDENCE_PUBLIC_KEY;
  const privPem = process.env.UGONDU_EVIDENCE_PRIVATE_KEY;
  if (!privPem || !pubPem) {
    throw new Error('Trusted evidence signing keys must be injected from managed CI secret/key custody (UGONDU_EVIDENCE_PRIVATE_KEY and UGONDU_EVIDENCE_PUBLIC_KEY); repository-local key fallback is forbidden');
  }
  const privateKey = crypto.createPrivateKey(privPem);
  const publicKey = crypto.createPublicKey(pubPem);
  const derivedPublicKey = crypto.createPublicKey(privateKey);
  const expectedDer = publicKey.export({ format: 'der', type: 'spki' });
  const derivedDer = derivedPublicKey.export({ format: 'der', type: 'spki' });
  if (!expectedDer.equals(derivedDer)) {
    throw new Error('Evidence private key does not match the independently supplied public trust anchor');
  }
  return { privateKey, publicKey, keyId: 'key_evidence_v2', keySource: 'managed-secret-injected' };
}

export function generateEvidenceBundle(evidenceDir) {
  const inputDirValue = process.env.UGONDU_EVIDENCE_INPUT_DIR;
  if (!inputDirValue) {
    throw new Error('UGONDU_EVIDENCE_INPUT_DIR is required. Evidence generation no longer fabricates test, compatibility, AWS, health, trace, or deployment results; provide real outputs from the qualification pipeline.');
  }
  const inputDir = path.resolve(inputDirValue);
  const outputDir = path.resolve(evidenceDir);
  if (inputDir === outputDir) {
    throw new Error('Evidence input and output directories must be separate to prevent stale outputs being reused as fresh evidence.');
  }

  const imported = new Map();
  for (const rel of REQUIRED_ARTIFACTS) {
    if (rel === 'source/commit.txt' || rel === 'source/tracked-files.sha256') continue;
    const sourcePath = path.join(inputDir, rel);
    if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
      throw new Error(`Missing real qualification artifact in UGONDU_EVIDENCE_INPUT_DIR: ${rel}`);
    }
    imported.set(rel, fs.readFileSync(sourcePath));
  }

  // Validate critical qualification evidence before any bundle is emitted.
  const awsReport = JSON.parse(imported.get('tests/aws-conformance-results.json').toString('utf8'));
  if (awsReport.status !== 'PASS' ||
      awsReport.awsAccountId !== '971671216490' ||
      awsReport.awsRegion !== 'eu-west-3' ||
      awsReport.leastPrivilegeBoundaries?.iamListUsersDenied !== true ||
      awsReport.leastPrivilegeBoundaries?.executionRoleAssumptionFailClosed !== true) {
    throw new Error('Live AWS conformance evidence is absent or failed a required least-privilege assertion; release evidence generation is blocked.');
  }
  const compatibility = JSON.parse(imported.get('tests/compatibility-results.json').toString('utf8'));
  if (compatibility.status !== 'PASS' || !Array.isArray(compatibility.platformsVerified) ||
      !Array.isArray(compatibility.repositoryProvidersVerified)) {
    throw new Error('Compatibility evidence is missing a passing result or explicit platform/provider evidence.');
  }
  for (const rel of ['tests/unit-results.xml', 'tests/contract-results.xml', 'tests/integration-results.xml', 'tests/e2e-results.xml', 'tests/security-results.xml']) {
    const xml = imported.get(rel).toString('utf8');
    if (!/<testsuites\b/.test(xml) || !/<testcase\b/.test(xml) || /failures="[1-9]|errors="[1-9]|skipped="[1-9]/.test(xml)) {
      throw new Error(`Test result artifact is missing actual test cases or reports failure/skips: ${rel}`);
    }
  }

  const commitHash = git(['rev-parse', 'HEAD']);
  const treeHash = git(['rev-parse', 'HEAD^{tree}']);
  const branchName = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const generatedAt = new Date().toISOString();
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const trackedFiles = git(['ls-files']).split(/\r?\n/).filter((f) => Boolean(f) && !f.startsWith('evidence/')).sort();
  const trackedHashes = [];
  const secretFindings = [];
  const privateKeyRegex = new RegExp('-----BEGIN ' + '(?:RSA |EC |OPENSSH )?PRIVATE KEY-----');
  for (const rel of trackedFiles) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue;
    const buf = fs.readFileSync(abs);
    trackedHashes.push(`${sha256Buffer(buf)}  ${rel}`);
    if (privateKeyRegex.test(buf.toString('utf8'))) secretFindings.push(rel);
  }
  if (secretFindings.length) {
    throw new Error(`Private key material found in tracked files: ${secretFindings.join(', ')}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });
  writeArtifact(outputDir, 'source/commit.txt', `commit=${commitHash}\ntree=${treeHash}\nbranch=${branchName}\ngenerated_at=${generatedAt}\n`);
  writeArtifact(outputDir, 'source/tracked-files.sha256', trackedHashes.join('\n') + '\n');
  for (const [rel, buf] of imported) {
    const target = path.join(outputDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
  }

  const artifactEntries = {};
  for (const rel of REQUIRED_ARTIFACTS) {
    const buf = fs.readFileSync(path.join(outputDir, rel));
    artifactEntries[rel] = { sha256: sha256Buffer(buf), bytes: buf.length };
  }
  const manifest = {
    schemaVersion: '1.0.0',
    product: '@airroofers/ugondu-platform',
    version: pkg.version,
    generatedAt,
    git: { commitHash, treeHash, branchName },
    artifacts: artifactEntries
  };
  const manifestText = JSON.stringify(manifest, null, 2) + '\n';
  writeArtifact(outputDir, 'manifest.json', manifestText);

  const { privateKey, publicKey, keyId, keySource } = resolveEd25519KeyPair();
  const manifestBuffer = Buffer.from(manifestText, 'utf8');
  const signatureBuffer = crypto.sign(null, manifestBuffer, privateKey);
  const publicKeyJwk = publicKey.export({ format: 'jwk' });
  const publicKeyDerBase64 = publicKey.export({ format: 'der', type: 'spki' }).toString('base64');
  writeArtifact(outputDir, 'signatures/evidence-manifest.sig', {
    schemaVersion: '1.0.0',
    algorithm: 'Ed25519',
    keyId,
    keySource,
    manifestSha256: sha256Buffer(manifestBuffer),
    publicKeySpkiDerBase64: publicKeyDerBase64,
    publicKeyJwk,
    signatureBase64: signatureBuffer.toString('base64'),
    signedAt: generatedAt
  });
}

export function verifyEvidenceBundle(evidenceDir) {
  const manifestPath = path.join(evidenceDir, 'manifest.json');
  const sigPath = path.join(evidenceDir, 'signatures/evidence-manifest.sig');

  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest.json at ${manifestPath}`);
  }
  if (!fs.existsSync(sigPath)) {
    throw new Error(`Missing signatures/evidence-manifest.sig at ${sigPath}`);
  }

  const manifestBuffer = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBuffer.toString('utf8'));
  const sigEnvelope = JSON.parse(fs.readFileSync(sigPath, 'utf8'));

  if (sigEnvelope.algorithm !== 'Ed25519') {
    throw new Error(`Unsupported signature algorithm: ${sigEnvelope.algorithm}`);
  }

  const actualManifestSha = sha256Buffer(manifestBuffer);
  if (sigEnvelope.manifestSha256 !== actualManifestSha) {
    throw new Error(`Manifest SHA-256 mismatch: expected ${sigEnvelope.manifestSha256}, got ${actualManifestSha}`);
  }

  for (const rel of REQUIRED_ARTIFACTS) {
    const entry = manifest.artifacts?.[rel];
    if (!entry) {
      throw new Error(`Required artifact missing from manifest.json: ${rel}`);
    }
    const fullPath = path.join(evidenceDir, rel);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Required evidence file missing on disk: ${rel}`);
    }
    const buf = fs.readFileSync(fullPath);
    const digest = sha256Buffer(buf);
    if (digest !== entry.sha256) {
      throw new Error(`SHA-256 digest mismatch for ${rel}: expected ${entry.sha256}, got ${digest}`);
    }
  }

  const sarif = JSON.parse(fs.readFileSync(path.join(evidenceDir, 'security/secrets-scan.sarif'), 'utf8'));
  const findingsCount = sarif.runs?.[0]?.results?.length ?? 1;
  if (findingsCount !== 0) {
    throw new Error(`Secrets scan reported ${findingsCount} finding(s)`);
  }

  if (sigEnvelope.keySource !== 'managed-secret-injected') {
    throw new Error('Evidence bundle was not signed using the required managed-secret-injected key source');
  }
  if (sigEnvelope.keyId !== 'key_evidence_v2') {
    throw new Error(`Invalid keyId in evidence signature: expected key_evidence_v2, got ${sigEnvelope.keyId}`);
  }

  const pubPath = path.join(ROOT, 'server/shared/keys/evidence_public.pem');
  const trustedPubPem = process.env.UGONDU_EVIDENCE_PUBLIC_KEY;
  if (!trustedPubPem) {
    throw new Error('Independent evidence public trust anchor must be injected through UGONDU_EVIDENCE_PUBLIC_KEY; repository-local fallback is forbidden');
  }
  const publicKey = crypto.createPublicKey(trustedPubPem);

  const isValid = crypto.verify(
    null,
    manifestBuffer,
    publicKey,
    Buffer.from(sigEnvelope.signatureBase64, 'base64')
  );

  if (!isValid) {
    throw new Error('Ed25519 cryptographic signature verification FAILED for manifest.json against trusted public key anchor');
  }

  return {
    verifiedArtifacts: REQUIRED_ARTIFACTS.length + 2,
    manifestSha256: actualManifestSha,
    commitHash: manifest.git?.commitHash
  };
}

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--output-dir');
  const evidenceDir =
    outIdx !== -1 && args[outIdx + 1]
      ? path.resolve(args[outIdx + 1])
      : process.env.UGONDU_EVIDENCE_DIR
        ? path.resolve(process.env.UGONDU_EVIDENCE_DIR)
        : path.join(ROOT, 'evidence');

  const verifyOnly = args.includes('--verify') && !args.includes('--generate');
  const generateOnly = args.includes('--generate') && !args.includes('--verify');

  try {
    if (!verifyOnly) {
      generateEvidenceBundle(evidenceDir);
      console.log(`[PASS] Generated release evidence bundle in ${evidenceDir}`);
    }
    if (!generateOnly) {
      const res = verifyEvidenceBundle(evidenceDir);
      console.log(
        `[PASS] Verified ${res.verifiedArtifacts} evidence files and Ed25519 signature (manifest sha256:${res.manifestSha256})`
      );
    }
  } catch (err) {
    console.error(`[FAIL] Release evidence bundle verification: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
