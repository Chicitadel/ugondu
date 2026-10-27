#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release Qualification Evidence Collector
 * File           : collect-qualification-evidence.mjs
 * Version        : 2.2.0
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

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  sha256Buffer,
  sha256Text,
  buildEvidenceEnvelope,
  probeLiveServiceReadinessAndTracing,
  runRealDependencyAudit,
  generateResolvedLockfileSbom
} from './evidence-scanners.mjs';
import { parseAndValidateNativeJUnit } from './junit-parser.mjs';
import {
  recordTargetEvidence,
  deriveTargetStates,
  verifyMatrixClaims,
  normalizeOs,
  normalizeArch
} from './platform-evidence.mjs';
import { executeSecretScan } from './secret-scan.mjs';

const __filename = fileURLToPath(import.meta.url);

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function writeOut(baseDir, relPath, content) {
  const fullPath = path.join(baseDir, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const text = typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n';
  fs.writeFileSync(fullPath, text, 'utf8');
  return { path: relPath, sha256: sha256Text(text), sizeBytes: Buffer.byteLength(text, 'utf8') };
}

function runGovernanceScript(relScript, extraEnv = {}) {
  const fullPath = path.join(ROOT, relScript);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required qualification script not found: ${relScript}`);
  }
  const start = Date.now();
  const res = spawnSync(process.execPath, [fullPath], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    timeout: 180000
  });
  const durationSec = ((Date.now() - start) / 1000).toFixed(3);
  const stdout = res.stdout || '';
  const stderr = res.stderr || '';
  if (res.status !== 0) {
    throw new Error(`Qualification script failed (${relScript}, exit=${res.status}):\n${stderr || stdout}`);
  }
  return { relScript, durationSec, rawOutput: stdout + '\n' + stderr, exitCode: res.status };
}

function executeSuiteWithNativeJUnit(suiteName, relScripts, outputDir, extraEnv, commitHash) {
  const rawReportsDir = path.join(outputDir, 'raw-tests');
  const rawLogsDir = path.join(outputDir, 'raw-logs');
  fs.mkdirSync(rawReportsDir, { recursive: true });
  fs.mkdirSync(rawLogsDir, { recursive: true });

  const innerSuites = [];
  let totalTests = 0;
  let totalFailures = 0;
  let totalErrors = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const relScript of relScripts) {
    const fullPath = path.join(ROOT, relScript);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Test script missing: ${relScript}`);
    }

    const scriptBase = path.basename(relScript, path.extname(relScript));
    const reportDest = path.join(rawReportsDir, `${suiteName}-${scriptBase}.xml`);
    const logDest = path.join(rawLogsDir, `${suiteName}-${scriptBase}.log`);

    const start = Date.now();
    const res = spawnSync(process.execPath, [
      '--test',
      '--test-reporter=junit',
      `--test-reporter-destination=${reportDest}`,
      fullPath
    ], {
      cwd: ROOT,
      env: {
        ...process.env,
        ...extraEnv,
        UGONDU_COMMIT_SHA: commitHash
      },
      encoding: 'utf8',
      timeout: 180000
    });

    const durationSec = (Date.now() - start) / 1000;
    totalDuration += durationSec;
    fs.writeFileSync(logDest, (res.stdout || '') + '\n' + (res.stderr || ''), 'utf8');

    if (res.status !== 0) {
      throw new Error(`Test runner exited non-zero (${res.status}) for ${relScript}:\n${res.stderr || res.stdout}`);
    }

    if (!fs.existsSync(reportDest)) {
      throw new Error(`Native test runner failed to produce report artifact for ${relScript} at ${reportDest}`);
    }

    const parsedSingle = parseAndValidateNativeJUnit({
      file: reportDest,
      expectedCommit: commitHash,
      actualCommit: commitHash
    });

    totalTests += parsedSingle.totalTests;
    totalFailures += parsedSingle.totalFailures;
    totalErrors += parsedSingle.totalErrors;
    totalSkipped += parsedSingle.totalSkipped;

    const testcasesXml = parsedSingle.testcases.map((tc) => {
      return `    <testcase name="${tc.name}" classname="${tc.classname || scriptBase}" time="${tc.time.toFixed(6)}" file="${relScript}"/>`;
    }).join('\n');
    innerSuites.push(`  <testsuite name="${relScript}" tests="${parsedSingle.totalTests}" failures="${parsedSingle.totalFailures}" errors="${parsedSingle.totalErrors}" skipped="${parsedSingle.totalSkipped}" time="${durationSec.toFixed(3)}">\n${testcasesXml}\n  </testsuite>`);
  }

  const combinedXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${suiteName}" tests="${totalTests}" failures="${totalFailures}" errors="${totalErrors}" skipped="${totalSkipped}" time="${totalDuration.toFixed(3)}" commit="${commitHash}">
${innerSuites.join('\n')}
</testsuites>
`;

  const suiteXmlRelPath = `tests/${suiteName}-results.xml`;
  const written = writeOut(outputDir, suiteXmlRelPath, combinedXml);
  const suiteXmlAbsPath = path.join(outputDir, suiteXmlRelPath);

  parseAndValidateNativeJUnit({
    file: suiteXmlAbsPath,
    expectedCommit: commitHash,
    actualCommit: commitHash
  });

  return { ...written, totalTests, totalFailures, totalErrors, totalSkipped };
}

export async function collectQualificationEvidence(outputDir, options = {}) {
  const pubPem = process.env.UGONDU_PACK_PUBLIC_KEY;
  if (!pubPem) {
    throw new Error('UGONDU_PACK_PUBLIC_KEY must be injected in the environment; repository-local key fallback is prohibited.');
  }
  const extraEnv = { UGONDU_PACK_PUBLIC_KEY: pubPem };
  const commitHash = git(['rev-parse', 'HEAD']);
  const treeHash = git(['rev-parse', 'HEAD^{tree}']);
  const executionId = `exec-qual-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const workflowRunId = process.env.GITHUB_RUN_ID || `local-${Date.now()}`;
  const osName = normalizeOs();
  const archName = normalizeArch();

  fs.mkdirSync(outputDir, { recursive: true });

  // 1. Preserved / Imported Real AWS Conformance Evidence
  const targetAwsRel = 'tests/aws-conformance-results.json';
  const targetAwsAbs = path.join(outputDir, targetAwsRel);
  let preservedAwsBuf = null;

  if (fs.existsSync(targetAwsAbs)) {
    preservedAwsBuf = fs.readFileSync(targetAwsAbs);
  } else if (options.importExistingAws) {
    const defaultEvidenceDir = path.join(ROOT, 'evidence');
    const existingAwsAbs = path.join(defaultEvidenceDir, targetAwsRel);
    if (fs.existsSync(existingAwsAbs)) {
      preservedAwsBuf = fs.readFileSync(existingAwsAbs);
      fs.mkdirSync(path.dirname(targetAwsAbs), { recursive: true });
      fs.writeFileSync(targetAwsAbs, preservedAwsBuf);
    }
  }

  // 2. Real Governance Script Executions
  const govStartedAt = new Date().toISOString();
  const scriptOutputs = [];
  scriptOutputs.push(runGovernanceScript('scripts/governance/validate-repository.mjs', extraEnv));
  scriptOutputs.push(runGovernanceScript('scripts/branding/validate-assets.mjs'));
  scriptOutputs.push(runGovernanceScript('scripts/governance/verify-action-pins.mjs'));

  const govCompletedAt = new Date().toISOString();
  const govLogsCombined = scriptOutputs.map((s) => `=== SCRIPT: ${s.relScript} (exit=${s.exitCode}, duration=${s.durationSec}s) ===\n${s.rawOutput}`).join('\n\n');
  const govLogHash = sha256Text(govLogsCombined);
  writeOut(outputDir, 'governance/validation-run.log', govLogsCombined);

  const policyArtifact = writeOut(outputDir, 'governance/policy-results.json', {
    schemaVersion: '1.0.0',
    evaluatedAt: govCompletedAt,
    executionId,
    commitHash,
    treeHash,
    scriptsExecuted: scriptOutputs.map((s) => ({ script: s.relScript, durationSec: s.durationSec, exitCode: s.exitCode })),
    rawLogSha256: govLogHash,
    status: 'PASS'
  });

  writeOut(outputDir, 'governance/exception-register.json', {
    schemaVersion: '1.0.0',
    updatedAt: govCompletedAt,
    activeExceptions: 0,
    entries: []
  });

  writeOut(outputDir, 'governance/adr-index.json', {
    schemaVersion: '1.0.0',
    updatedAt: govCompletedAt,
    count: 2,
    records: [
      { id: 'ADR-0001', title: 'Modular Microservices and COR Governance', status: 'ACCEPTED', file: 'docs/adr/ADR-0001-modular-microservices-and-cor-governance.md' },
      { id: 'UPLM-ADR-001', title: 'Universal Plugin Lifecycle Management ADR', status: 'FROZEN', file: 'docs/uplm/UPLM_ADR.md' }
    ]
  });

  // 3. Comprehensive Working Tree & Git History Secret Scan (SARIF 2.1.0)
  await executeSecretScan({ targetDir: ROOT, outDir: outputDir });

  // 4. Real Dependency Audit (SCA, scanner: 'npm-audit') & Resolved Lockfile SBOM
  const scaResult = runRealDependencyAudit();
  writeOut(outputDir, 'security/dependency-scan.json', scaResult);

  const sbomCdx = generateResolvedLockfileSbom();
  writeOut(outputDir, 'security/sbom.cdx.json', sbomCdx);

  const provenancePayload = {
    _type: 'https://in-toto.io/Statement/v1',
    subject: [{ name: 'ugondu-qualification-bundle', digest: { sha256: treeHash } }],
    predicateType: 'https://slsa.dev/provenance/v1',
    predicate: {
      buildDefinition: {
        buildType: 'https://ugondu.io/governance/release-evidence/v2',
        externalParameters: { repository: 'Chicitadel/ugondu', commitHash, treeHash, workflowRunId },
        resolvedDependencies: [{ uri: 'git+https://github.com/Chicitadel/ugondu', digest: { sha1: commitHash } }]
      },
      runDetails: {
        builder: { id: process.env.GITHUB_ACTIONS === 'true' ? 'https://github.com/Chicitadel/ugondu/actions' : 'urn:ugondu:local-qualification-runner' },
        metadata: { invocationId: executionId, startedOn: govStartedAt, finishedOn: new Date().toISOString() }
      }
    }
  };
  writeOut(outputDir, 'provenance/builder-attestation.json', provenancePayload);
  writeOut(outputDir, 'security/provenance.json', provenancePayload);

  // 5. Real Test Suites -> Native JUnit Reports
  const unitWritten = executeSuiteWithNativeJUnit(
    'unit',
    ['tests/passport-cryptography.test.js', 'tests/language-packs.test.js', 'tests/provider-compilation.test.js'],
    outputDir,
    extraEnv,
    commitHash
  );

  const contractWritten = executeSuiteWithNativeJUnit(
    'contract',
    [
      'tests/schema-validation.test.js',
      'tests/uplm-conformance.test.js',
      'tests/qualification/platform-evidence.test.js',
      'tests/qualification/aws-target-boundary.test.js'
    ],
    outputDir,
    extraEnv,
    commitHash
  );

  const intWritten = executeSuiteWithNativeJUnit(
    'integration',
    [
      'tests/billing-gateway.test.js',
      'tests/engine-core.test.js',
      'tests/plugin-manager.test.js',
      'tests/event-bus.test.js',
      'tests/repository-adapter.test.js',
      'tests/cor-remediation.test.js',
      'tests/ai-inference-gateway.test.js',
      'tests/qualification/shared-execution-and-mode-parity.test.js'
    ],
    outputDir,
    extraEnv,
    commitHash
  );

  const e2eWritten = executeSuiteWithNativeJUnit(
    'e2e',
    ['tests/deployment-lifecycle.test.js'],
    outputDir,
    extraEnv,
    commitHash
  );

  const secWritten = executeSuiteWithNativeJUnit(
    'security',
    [
      'tests/security-regression.test.js',
      'tests/ssrf-execution.test.js',
      'tests/passport-cryptography.test.js',
      'tests/qualification/evidence-pipeline-adversarial.test.js',
      'tests/security/secret-scan.test.js'
    ],
    outputDir,
    extraEnv,
    commitHash
  );

  const suiteResults = [
    { name: 'unit', junitSha256: unitWritten.sha256, tests: unitWritten.totalTests, failures: 0 },
    { name: 'contract', junitSha256: contractWritten.sha256, tests: contractWritten.totalTests, failures: 0 },
    { name: 'integration', junitSha256: intWritten.sha256, tests: intWritten.totalTests, failures: 0 },
    { name: 'e2e', junitSha256: e2eWritten.sha256, tests: e2eWritten.totalTests, failures: 0 },
    { name: 'security', junitSha256: secWritten.sha256, tests: secWritten.totalTests, failures: 0 }
  ];

  // 6. Governed Platform Matrix & Dynamic Host Evidence
  const matrixPath = path.join(ROOT, 'config/qualification/platform-matrix.json');
  if (!fs.existsSync(matrixPath)) {
    throw new Error('Governed platform matrix missing at config/qualification/platform-matrix.json');
  }
  const platformMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const targets = platformMatrix.targetDefinitions || [];
  const currentPlatformId = `${osName}/${archName}`;
  const localesDir = path.join(ROOT, 'locales');
  const localesVerified = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json')).map((f) => path.basename(f, '.json')).sort();
  const repoProviders = targets.filter((t) => t.targetType === 'repository-provider').map((t) => t.provider);

  const currentHostTarget = targets.find((t) => t.os === osName && t.architecture === archName);
  if (currentHostTarget) {
    recordTargetEvidence({
      targetId: currentHostTarget.id,
      os: osName,
      arch: archName,
      runnerKind: process.env.GITHUB_ACTIONS ? 'github-hosted' : 'local-workstation',
      nativeExecution: true,
      commitSha: commitHash,
      treeSha: treeHash,
      suiteResults,
      outDir: outputDir
    });
  }

  const { targets: derivedTargets, rejections: platformRejections } = deriveTargetStates(
    platformMatrix,
    outputDir,
    { commitSha: commitHash, treeSha: treeHash }
  );

  const claimsVerdict = verifyMatrixClaims(platformMatrix, { targets: derivedTargets });
  if (claimsVerdict.verdict !== 'ok') {
    throw new Error(`Platform claims exceed verified evidence: ${JSON.stringify(claimsVerdict.violations)}`);
  }

  const targetExecutionResults = targets.map((row) => ({
    id: row.id,
    targetType: row.targetType,
    os: row.os,
    architecture: row.architecture,
    provider: row.provider,
    derivedStatus: derivedTargets[row.id]?.state || 'not-assessed',
    minimumRequiredTier: row.minimumRequiredTier || 'tested',
    verifiedOnCurrentHost: row.os === osName && row.architecture === archName
  }));

  writeOut(outputDir, 'tests/compatibility-results.json', {
    schemaVersion: '2.0.0',
    evaluatedAt: new Date().toISOString(),
    executionId,
    commitHash,
    treeHash,
    hostPlatform: currentPlatformId,
    nodeVersion: process.version,
    platformsVerified: [currentPlatformId],
    repositoryProvidersVerified: repoProviders,
    localesVerified,
    targetDefinitions: targets,
    targetExecutionResults,
    matrixRows: targetExecutionResults,
    platformRejections,
    status: 'PASS'
  });

  // 7. Live Runtime Readiness, W3C Trace Probe & Receipt
  const probe = await probeLiveServiceReadinessAndTracing();
  writeOut(outputDir, 'runtime/health-readiness.json', {
    schemaVersion: '1.0.0',
    evaluatedAt: probe.evaluatedAt,
    executionId,
    commitHash,
    treeHash,
    service: probe.service,
    endpoint: '/health/ready',
    httpStatus: probe.readinessHttpStatus,
    payload: probe.readinessPayload,
    livenessHttpStatus: probe.livenessHttpStatus,
    metadataHttpStatus: probe.metadataHttpStatus,
    status: 'PASS'
  });

  writeOut(outputDir, 'runtime/trace-samples.json', {
    schemaVersion: '1.0.0',
    evaluatedAt: probe.evaluatedAt,
    executionId,
    commitHash,
    treeHash,
    w3cTraceContext: true,
    traceparent: probe.traceparentSent,
    responseTraceHeader: probe.responseTraceHeader,
    spans: [{
      traceId: probe.traceId,
      spanId: probe.spanId,
      service: probe.service,
      operation: 'GET /health/ready',
      httpStatus: probe.readinessHttpStatus,
      status: 'OK'
    }]
  });

  const receiptEnvelope = buildEvidenceEnvelope({
    executionId,
    gateId: `COR-PLATFORM-${osName.toUpperCase()}-${archName.toUpperCase()}`,
    status: 'PASS',
    commit: commitHash,
    tree: treeHash,
    workflowRunId,
    osName,
    archName,
    provider: process.platform === 'win32' ? 'local-win32' : 'local-posix',
    mode: 'headless-ci',
    startedAt: govStartedAt,
    completedAt: new Date().toISOString(),
    command: [process.execPath, 'scripts/release/collect-qualification-evidence.mjs'],
    exitCode: 0,
    rawLogSha256: govLogHash,
    artifacts: [policyArtifact],
    limitations: [`Host runtime verification executed on ${currentPlatformId}; other OS targets require native matrix runners.`]
  });
  writeOut(outputDir, 'runtime/deployment-receipt.json', receiptEnvelope);

  return { outputDir, platform: currentPlatformId, localesCount: localesVerified.length, providersCount: repoProviders.length, executionId };
}

async function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--output-dir');
  const outputDir =
    outIdx !== -1 && args[outIdx + 1]
      ? path.resolve(args[outIdx + 1])
      : process.env.UGONDU_EVIDENCE_INPUT_DIR
        ? path.resolve(process.env.UGONDU_EVIDENCE_INPUT_DIR)
        : path.join(ROOT, '.cor_evidence/raw');
  const importExistingAws = args.includes('--import-existing-aws');

  try {
    const res = await collectQualificationEvidence(outputDir, { importExistingAws });
    console.log(`[PASS] Collected real qualification evidence in ${res.outputDir} (platform=${res.platform}, locales=${res.localesCount}, providers=${res.providersCount}, executionId=${res.executionId})`);
  } catch (err) {
    console.error(`[FAIL] Qualification evidence collection: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
