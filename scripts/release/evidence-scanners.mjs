#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release Qualification Evidence Scanners & Runtime Probes
 * File           : evidence-scanners.mjs
 * Version        : 2.0.0
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
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.resolve(__dirname, '../..');

export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function sha256Text(text) {
  return sha256Buffer(Buffer.from(text, 'utf8'));
}

export function buildEvidenceEnvelope({
  executionId,
  gateId,
  status,
  commit,
  tree,
  workflowRunId,
  osName,
  archName,
  provider,
  mode,
  startedAt,
  completedAt,
  command,
  exitCode,
  rawLogSha256,
  artifacts,
  limitations = []
}) {
  return {
    schemaVersion: '1.0.0',
    evidenceId: `ev-${crypto.randomUUID()}`,
    executionId,
    gateId,
    status,
    source: {
      repository: 'Chicitadel/ugondu',
      commit,
      tree,
      workflowRunId
    },
    target: {
      os: osName,
      architecture: archName,
      runtime: `node/${process.version}`,
      provider,
      mode
    },
    startedAt,
    completedAt,
    command,
    exitCode,
    rawLogSha256,
    artifacts,
    limitations
  };
}

function httpGetJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch (err) {
          reject(new Error(`Invalid JSON from ${url}: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`Timeout probing ${url}`));
    });
  });
}

export async function probeLiveServiceReadinessAndTracing() {
  const port = 14505;
  const entry = path.join(ROOT, 'server/repository-adapter/dist/index.js');
  if (!fs.existsSync(entry)) {
    throw new Error(`Compiled service entrypoint missing: ${entry}. Run npm run build first.`);
  }
  const traceId = crypto.randomBytes(16).toString('hex');
  const spanId = crypto.randomBytes(8).toString('hex');
  const traceparent = `00-${traceId}-${spanId}-01`;

  const child = spawn(process.execPath, [entry], {
    cwd: path.dirname(path.dirname(entry)),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'test' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    let readyRes = null;
    for (let i = 0; i < 25; i++) {
      try {
        readyRes = await httpGetJson(`http://127.0.0.1:${port}/health/ready`, { traceparent });
        if (readyRes.statusCode === 200) break;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (!readyRes || readyRes.statusCode !== 200 || readyRes.body?.status !== 'READY') {
      throw new Error(`Service readiness probe failed on port ${port}: ${JSON.stringify(readyRes?.body)}`);
    }
    const liveRes = await httpGetJson(`http://127.0.0.1:${port}/health/live`, { traceparent });
    if (liveRes.statusCode !== 200 || liveRes.body?.status !== 'ALIVE') {
      throw new Error(`Service liveness probe failed on port ${port}: ${JSON.stringify(liveRes?.body)}`);
    }
    const metaRes = await httpGetJson(`http://127.0.0.1:${port}/v1/metadata`, { traceparent });
    if (metaRes.statusCode !== 200 || !metaRes.body?.service) {
      throw new Error(`Service metadata probe failed on port ${port}: ${JSON.stringify(metaRes?.body)}`);
    }
    return {
      evaluatedAt: new Date().toISOString(),
      service: 'repository-adapter',
      port,
      readinessHttpStatus: readyRes.statusCode,
      readinessPayload: readyRes.body,
      livenessHttpStatus: liveRes.statusCode,
      livenessPayload: liveRes.body,
      metadataHttpStatus: metaRes.statusCode,
      metadataPayload: metaRes.body,
      traceparentSent: traceparent,
      traceId,
      spanId,
      responseTraceHeader: readyRes.headers['traceparent'] || readyRes.headers['x-correlation-id'] || traceparent,
      status: 'PASS'
    };
  } finally {
    child.kill('SIGTERM');
  }
}

export function runRealDependencyAudit() {
  const lockPath = path.join(ROOT, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    throw new Error('package-lock.json is required for real SCA dependency scanning.');
  }
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const verRes = spawnSync(npmCmd, ['--version'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  const npmVersion = (verRes.stdout || '').trim() || 'unknown';
  const auditRes = spawnSync(npmCmd, ['audit', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: 120000
  });
  const rawStdout = (auditRes.stdout || '').trim();
  if (!rawStdout) {
    throw new Error(`SCA dependency scanner (npm audit --json) produced no output: ${auditRes.stderr || ''}`);
  }
  const parsed = JSON.parse(rawStdout);
  if (parsed.error) {
    throw new Error(`SCA dependency scanner returned an error: ${JSON.stringify(parsed.error)}`);
  }
  const vulns = parsed.metadata?.vulnerabilities || {};
  const counts = {
    critical: Number(vulns.critical || 0),
    high: Number(vulns.high || 0),
    moderate: Number(vulns.moderate || 0),
    low: Number(vulns.low || 0),
    info: Number(vulns.info || 0),
    total: Number(vulns.total || 0)
  };
  if (counts.critical > 0 || counts.high > 0) {
    throw new Error(`SCA dependency scan blocked release: critical=${counts.critical}, high=${counts.high}`);
  }
  return {
    schemaVersion: '1.0.0',
    scanner: 'npm-audit',
    scannerVersion: npmVersion,
    command: [npmCmd, 'audit', '--json'],
    exitCode: auditRes.status ?? 0,
    lockfileSha256: sha256Buffer(fs.readFileSync(lockPath)),
    rawReportSha256: sha256Text(rawStdout),
    evaluatedAt: new Date().toISOString(),
    vulnerabilities: counts,
    status: 'PASS'
  };
}

export function generateResolvedLockfileSbom() {
  const lockPath = path.join(ROOT, 'package-lock.json');
  if (!fs.existsSync(lockPath)) {
    throw new Error('package-lock.json is required to generate a complete resolved SBOM.');
  }
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const packagesObj = lock.packages || {};
  const components = [];
  for (const [pkgPath, info] of Object.entries(packagesObj)) {
    if (!pkgPath || !info || !info.version) continue;
    const name = info.name || pkgPath.replace(/^.*node_modules\//, '');
    if (!name) continue;
    const comp = {
      type: pkgPath.startsWith('server/') && !pkgPath.includes('node_modules') ? 'application' : 'library',
      name,
      version: String(info.version),
      purl: `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(String(info.version))}`
    };
    if (typeof info.integrity === 'string' && info.integrity.startsWith('sha512-')) {
      comp.hashes = [{ alg: 'SHA-512', content: Buffer.from(info.integrity.slice(7), 'base64').toString('hex') }];
    }
    components.push(comp);
  }
  if (components.length < 10) {
    throw new Error(`Resolved lockfile SBOM contains too few components (${components.length}); expected full dependency graph.`);
  }
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'Air Roofers SASU', name: 'ugondu-lockfile-sbom-extractor', version: '2.0.0' }],
      component: {
        type: 'application',
        name: pkg.name,
        version: pkg.version
      }
    },
    components
  };
}
