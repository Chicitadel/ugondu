/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance — Native Execution Record Capture
 * File           : capture-native-run.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
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
 * Runs the qualification suite on the CURRENT host and writes a record whose
 * platform, architecture, runtime, git SHA and test counts are observed, never
 * assumed. A failed or unparsable run is recorded as failed (exit code 1).
 * Usage: node scripts/governance/capture-native-run.mjs --out <file.json>
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SELF_EXCLUDED = ['native-runner-evidence.test.js'];

export function parseCounts(output) {
  const grab = (k) => {
    const m = output.match(new RegExp(`ℹ\\s+${k}\\s+(\\d+)`));
    return m ? parseInt(m[1], 10) : null;
  };
  return { tests: grab('tests'), pass: grab('pass'), fail: grab('fail') };
}

export function captureNativeRun({ root = ROOT } = {}) {
  const dir = path.join(root, 'tests', 'qualification');
  const files = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.test.js') && !SELF_EXCLUDED.includes(f))
    .sort()
    .map((f) => path.join('tests', 'qualification', f));
  const startedAt = new Date().toISOString();
  const r = spawnSync(process.execPath, ['--test', ...files], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  const counts = parseCounts(`${r.stdout || ''}\n${r.stderr || ''}`);
  const parsed = counts.tests !== null && counts.pass !== null && counts.fail !== null;
  const status = r.status === 0 && parsed && counts.fail === 0 && counts.tests > 0 ? 'PASSED' : 'FAILED';
  return {
    recordType: 'UGONDU_NATIVE_EXECUTION_RECORD',
    gitSha: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    startedAt,
    finishedAt: new Date().toISOString(),
    host: {
      platform: process.platform,
      arch: process.arch,
      osType: os.type(),
      osRelease: os.release(),
      nodeVersion: process.version,
      cpuModel: os.cpus()[0]?.model || null,
      cpuCores: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
    },
    ci: process.env.GITHUB_ACTIONS === 'true' ? {
      runId: process.env.GITHUB_RUN_ID || null,
      runnerName: process.env.RUNNER_NAME || null,
      runnerOs: process.env.RUNNER_OS || null,
      runnerArch: process.env.RUNNER_ARCH || null,
      imageOs: process.env.ImageOS || null,
      imageVersion: process.env.ImageVersion || null,
    } : null,
    suite: { fileCount: files.length, totalTests: counts.tests, passingTests: counts.pass, failingTests: counts.fail, exitCode: r.status, status },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--out');
  if (i < 0 || !process.argv[i + 1]) {
    console.error('[capture-native-run] FAIL: --out <file> is required');
    process.exit(1);
  }
  const record = captureNativeRun();
  fs.mkdirSync(path.dirname(path.resolve(process.argv[i + 1])), { recursive: true });
  fs.writeFileSync(process.argv[i + 1], JSON.stringify(record, null, 2) + '\n');
  console.log(`[capture-native-run] ${record.host.platform}/${record.host.arch} ${record.suite.passingTests}/${record.suite.totalTests} ${record.suite.status}`);
  process.exit(record.suite.status === 'PASSED' ? 0 : 1);
}
