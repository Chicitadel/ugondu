/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance — Native Runner Evidence Generator
 * File           : generate-native-runner-evidence.mjs
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-24
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
 * Notice:
 * Builds docs/governance/evidence/native-runner-evidence.json ONLY from observed
 * execution records and verified CI runs bound to the candidate SHA. Nothing is
 * assumed: each native claim names its scope, and non-native targets, IDEs and
 * providers are derived from config/qualification/target-matrix.json.
 * Usage: node scripts/governance/generate-native-runner-evidence.mjs \
 *          --windows-record f.json --linux-record f.json --darwin-ci-run <id> \
 *          [--candidate-sha <sha>]
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assertCandidateBinding } from './evidence-freshness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const EVIDENCE_RELATIVE_PATH = 'docs/governance/evidence/native-runner-evidence.json';
export const EVIDENCE_SCHEMA_VERSION = '2.0.0';

export class NativeEvidenceError extends Error {
  constructor(message) { super(message); this.name = 'NativeEvidenceError'; }
}

export function canonicalJson(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(v[k])}`).join(',')}}`;
}

export const computeSha256 = (v) => crypto.createHash('sha256')
  .update(typeof v === 'string' ? v : canonicalJson(v)).digest('hex');

const withDigest = (o) => ({ ...o, verificationDigestSha256: computeSha256(o) });

/** Default CI-run lookup through the authenticated GitHub CLI. */
export function ghRunLookup(runId) {
  const out = execFileSync('gh', ['run', 'view', String(runId), '--json', 'headSha,conclusion,status,jobs'], { encoding: 'utf8' });
  return JSON.parse(out);
}

function requireRecord(rec, label, platform, arch, candidate) {
  if (!rec || rec.recordType !== 'UGONDU_NATIVE_EXECUTION_RECORD') throw new NativeEvidenceError(`${label}: not a native execution record`);
  if (rec.gitSha !== candidate) throw new NativeEvidenceError(`${label}: record SHA ${rec.gitSha} != candidate ${candidate}`);
  if (rec.host?.platform !== platform || rec.host?.arch !== arch) {
    throw new NativeEvidenceError(`${label}: observed ${rec.host?.platform}/${rec.host?.arch}, expected ${platform}/${arch}`);
  }
  if (rec.suite?.status !== 'PASSED' || !(rec.suite.totalTests > 0) || rec.suite.failingTests !== 0) {
    throw new NativeEvidenceError(`${label}: qualification suite did not pass`);
  }
}

function requireRun(lookup, runId, candidate, label, jobNeedle) {
  const run = lookup(runId);
  if (run.headSha !== candidate) throw new NativeEvidenceError(`${label}: run ${runId} headSha ${run.headSha} != candidate ${candidate}`);
  if (run.status !== 'completed') throw new NativeEvidenceError(`${label}: run ${runId} not completed`);
  if (jobNeedle) {
    const job = (run.jobs || []).find((j) => j.name.includes(jobNeedle));
    if (!job) throw new NativeEvidenceError(`${label}: no job matching '${jobNeedle}' in run ${runId}`);
    if (job.conclusion !== 'success') throw new NativeEvidenceError(`${label}: job '${job.name}' concluded ${job.conclusion}`);
    return { run, job: job.name };
  }
  if (run.conclusion !== 'success') throw new NativeEvidenceError(`${label}: run ${runId} concluded ${run.conclusion}`);
  return { run, job: null };
}

export function buildNativeRunnerEvidence({ root = ROOT, candidateSha, windowsRecord, linuxRecord, darwinCiRunId, lookup = ghRunLookup, timestamp } = {}) {
  const binding = assertCandidateBinding(root, candidateSha);
  const candidate = binding.candidate;
  requireRecord(windowsRecord, 'windows/amd64', 'win32', 'x64', candidate);
  requireRecord(linuxRecord, 'linux/amd64', 'linux', 'x64', candidate);
  if (linuxRecord.ci?.runnerOs !== 'Linux' || !linuxRecord.ci?.runId) {
    throw new NativeEvidenceError('linux/amd64: record was not produced on a hosted Linux CI runner');
  }
  requireRun(lookup, linuxRecord.ci.runId, candidate, 'linux/amd64', null);
  const darwin = requireRun(lookup, darwinCiRunId, candidate, 'darwin/arm64', 'darwin/arm64');

  const matrix = JSON.parse(fs.readFileSync(path.join(root, 'config/qualification/target-matrix.json'), 'utf8'));
  const t = matrix.targets;
  const suiteScope = 'node-qualification-suite (tests/qualification/*.test.js)';

  const native = [
    withDigest({ target: 'windows/amd64', scope: suiteScope, classification: 'NATIVE_EXECUTION_VERIFIED', record: windowsRecord }),
    withDigest({ target: 'linux/amd64', scope: suiteScope, classification: 'NATIVE_EXECUTION_VERIFIED', ciRunId: linuxRecord.ci.runId, record: linuxRecord }),
    withDigest({
      target: 'darwin/arm64', scope: 'go-thin-client (go vet, go test, binary --help/version on macOS arm64 runner)',
      classification: 'NATIVE_EXECUTION_VERIFIED_THIN_CLIENT_ONLY', ciRunId: String(darwinCiRunId), ciJob: darwin.job,
      limitation: 'The Node qualification suite was not executed on darwin/arm64; only the Go thin-client was.',
    }),
  ];
  const crossCompiled = t.osArchitectures.filter((o) => !o.nativeExecutionVerified).map((o) => withDigest({
    target: o.target, classification: 'CROSS_COMPILED_NOT_NATIVELY_QUALIFIED', nativeExecutionVerified: false,
    rationale: 'Binary is built for this target but never executed on native hardware.',
  }));
  const ides = t.ideIntegrations.map((i) => withDigest({
    ide: i.ide, status: i.status, classification: i.status === 'unsupported' ? 'UNSUPPORTED_FAIL_CLOSED_BY_MATRIX' : 'EXPERIMENTAL_NOT_QUALIFIED',
    failClosedBehavior: i.unsupportedBehavior,
  }));
  const providers = t.hostProviders.map((p) => withDigest({
    provider: p.provider, matrixStatus: p.qualificationStatus,
    classification: p.qualificationStatus === 'unsupported' ? 'UNSUPPORTED_FAIL_CLOSED_BY_MATRIX' : 'MATRIX_DECLARED_TESTED_OPERATION_RECEIPTS_NOT_ATTACHED',
    limitation: p.qualificationStatus === 'unsupported' ? undefined : 'Per-operation disposable-infrastructure receipts are not part of this evidence file.',
  }));

  const body = {
    $schema: 'https://specs.airroofers.eu/governance/native-runner-evidence-2.0.0.json',
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    evidenceType: 'UGONDU_NATIVE_RUNNER_QUALIFICATION_EVIDENCE',
    authority: 'Ujomor Systems Engineering & Governance Authority',
    organization: 'Air Roofers SASU',
    generatedAt: timestamp || new Date().toISOString(),
    gitHeadSha: candidate,
    verdict: 'NATIVE_EXECUTION_VERIFIED_FOR_RECORDED_TARGETS_ONLY',
    universalClaim: false,
    tier1NativeRunners: native,
    tier2CrossCompiledTargets: crossCompiled,
    ideIntegrations: ides,
    hostProviders: providers,
  };
  return { ...body, evidenceDigestSha256: computeSha256(body) };
}

export function writeNativeRunnerEvidence(options = {}) {
  const root = options.root || ROOT;
  const evidence = buildNativeRunnerEvidence(options);
  const target = path.resolve(root, EVIDENCE_RELATIVE_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(evidence, null, 2) + '\n', 'utf8');
  return { path: target, relativePath: EVIDENCE_RELATIVE_PATH, evidence };
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const result = writeNativeRunnerEvidence({
      candidateSha: arg('--candidate-sha') || head,
      windowsRecord: rd(arg('--windows-record')),
      linuxRecord: rd(arg('--linux-record')),
      darwinCiRunId: arg('--darwin-ci-run'),
    });
    console.log(`[native-runner-evidence] Written ${result.relativePath} (${result.evidence.verdict}) digest ${result.evidence.evidenceDigestSha256}`);
  } catch (err) {
    console.error(`[native-runner-evidence] FAIL: ${err.message}`);
    process.exit(1);
  }
}
