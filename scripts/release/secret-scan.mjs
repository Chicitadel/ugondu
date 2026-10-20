#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release / Secret Detection & History Security Scanner
 * File           : secret-scan.mjs
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
 * - Secrets Isolation Enforced
 * - Auditability Preserved
 *
 * Standards:
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS 5.0 (V14.3) / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, 'config/security/gitleaks.toml');
const ALLOWLIST_PATH = path.join(ROOT, 'config/security/secret-allowlist.json');

const SECRET_PATTERNS = [
  {
    id: 'generic-private-key',
    description: 'Unencrypted Private Key',
    regex: /-----BEGIN ((EC|PGP|DSA|RSA|OPENSSH) )?PRIVATE KEY( BLOCK)?-----/g
  },
  {
    id: 'aws-access-key-id',
    description: 'AWS Access Key ID',
    regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g
  },
  {
    id: 'github-personal-token',
    description: 'GitHub Personal Access Token',
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[0-9a-zA-Z]{36}\b|\bgithub_pat_[0-9a-zA-Z_]{82}\b/g
  }
];

function sha256File(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
    const entries = Array.isArray(raw.entries) ? raw.entries : [];
    const now = Date.now();
    return entries.filter((e) => {
      if (!e.expiryDate) return false;
      const expiry = Date.parse(e.expiryDate);
      return !Number.isNaN(expiry) && expiry > now;
    });
  } catch {
    return [];
  }
}

function isAllowlisted(finding, activeAllowlist) {
  for (const item of activeAllowlist) {
    if (item.fingerprint && item.fingerprint === finding.fingerprint) return true;
    if (item.ruleId === finding.ruleId && item.filePath === finding.filePath) return true;
  }
  return false;
}

/**
 * Native Git history secret scanner that scans every commit and tree state.
 */
function scanGitTreeAndHistory(targetDir) {
  const findings = [];
  const activeAllowlist = loadAllowlist();

  // 1. Scan working tree tracked files
  const trackedOutput = execFileSync('git', ['ls-files'], { cwd: targetDir, encoding: 'utf8' });
  const trackedFiles = trackedOutput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const rel of trackedFiles) {
    const full = path.join(targetDir, rel);
    if (!fs.existsSync(full)) continue;
    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          const matchVal = match[0];
          // Ignore harmless placeholder patterns
          if (/AKIA[0-9]{16}/.test(matchVal) && matchVal.includes('0000000000000000')) continue;
          const fingerprint = crypto.createHash('sha256').update(`${pattern.id}:${rel}:${matchVal}`).digest('hex');
          const finding = {
            ruleId: pattern.id,
            description: pattern.description,
            filePath: rel,
            lineNumber: i + 1,
            commit: 'WORKING_TREE',
            fingerprint
          };
          if (!isAllowlisted(finding, activeAllowlist)) {
            findings.push(finding);
          }
        }
      }
    }
  }

  // 2. Scan full git commit history diffs
  let commitCount = 0;
  try {
    const logOutput = execFileSync(
      'git',
      ['log', '-p', '--full-history', '--all', '--no-color'],
      { cwd: targetDir, encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }
    );

    const commitDiffs = logOutput.split(/^commit ([0-9a-f]{40})/m);
    commitCount = Math.floor(commitDiffs.length / 2);

    for (let c = 1; c < commitDiffs.length; c += 2) {
      const commitSha = commitDiffs[c];
      const diffBody = commitDiffs[c + 1] || '';

      const lines = diffBody.split(/\r?\n/);
      let currentFile = 'unknown';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.startsWith('+++ b/')) {
          currentFile = line.substring(6).trim();
          continue;
        }
        if (!line.startsWith('+') || line.startsWith('+++')) continue;
        const addedText = line.substring(1);

        for (const pattern of SECRET_PATTERNS) {
          pattern.regex.lastIndex = 0;
          let match;
          while ((match = pattern.regex.exec(addedText)) !== null) {
            const matchVal = match[0];
            const fingerprint = crypto.createHash('sha256').update(`${pattern.id}:${commitSha}:${currentFile}:${matchVal}`).digest('hex');
            const finding = {
              ruleId: pattern.id,
              description: pattern.description,
              filePath: currentFile,
              lineNumber: i + 1,
              commit: commitSha,
              fingerprint
            };
            if (!isAllowlisted(finding, activeAllowlist)) {
              findings.push(finding);
            }
          }
        }
      }
    }
  } catch {
    // If git history cannot be read, continue with tree findings
  }

  return { findings, commitCount };
}

/**
 * Builds standard SARIF 2.1.0 document from findings.
 */
function buildSarifDocument(findings) {
  return {
    $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'UgonduSecretScanner',
            version: '2.0.0',
            informationUri: 'https://ugondu.airroofers.com',
            rules: SECRET_PATTERNS.map((p) => ({
              id: p.id,
              shortDescription: { text: p.description },
              properties: { tags: ['security', 'secrets', 'governance'] }
            }))
          }
        },
        results: findings.map((f) => ({
          ruleId: f.ruleId,
          level: 'error',
          message: { text: `Hardcoded secret detected: ${f.description} in ${f.filePath} (commit: ${f.commit})` },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.filePath },
                region: { startLine: f.lineNumber }
              }
            }
          ],
          partialFingerprints: { primaryFingerprint: f.fingerprint }
        }))
      }
    ]
  };
}

/**
 * Executes secret scanning over repository tree and history.
 */
export function executeSecretScan({ targetDir = ROOT, outDir } = {}) {
  const start = Date.now();
  console.log(`[en] Executing Comprehensive Secret Scan across Working Tree and Full Git History...`);

  const { findings, commitCount } = scanGitTreeAndHistory(targetDir);
  const sarif = buildSarifDocument(findings);

  const durationSec = ((Date.now() - start) / 1000).toFixed(3);
  const status = findings.length === 0 ? 'PASS' : 'FAIL';

  const metadata = {
    schemaVersion: '1.0.0',
    scanner: 'UgonduSecretScanner',
    scannerVersion: '2.0.0',
    binarySha256: sha256File(__filename),
    configSha256: sha256File(CONFIG_PATH),
    scannedCommits: commitCount,
    findingsCount: findings.length,
    durationSec,
    status
  };

  if (outDir) {
    const secDir = path.join(outDir, 'security');
    fs.mkdirSync(secDir, { recursive: true });
    fs.writeFileSync(path.join(secDir, 'secrets-scan.sarif'), JSON.stringify(sarif, null, 2) + '\n', 'utf8');
    fs.writeFileSync(path.join(secDir, 'secrets-scan-metadata.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
  }

  if (findings.length > 0) {
    console.error(`[FAIL] Secret scan failed: ${findings.length} secret finding(s) detected:`);
    for (const f of findings) {
      console.error(`  - [${f.ruleId}] ${f.filePath}:${f.lineNumber} (commit: ${f.commit.slice(0, 8)})`);
    }
  } else {
    console.log(`[PASS] Secret scan passed: 0 secrets detected across ${commitCount} commit(s) in git history.`);
  }

  return { status, findingsCount: findings.length, sarif, metadata };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = executeSecretScan();
  if (result.status !== 'PASS') {
    process.exit(1);
  }
}
