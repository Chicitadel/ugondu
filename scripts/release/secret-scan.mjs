#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release / Secret Detection & History Security Scanner
 * File           : secret-scan.mjs
 * Version        : 2.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-21
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
import readline from 'node:readline';
import { execFileSync, spawn } from 'node:child_process';
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
    regex: /\b(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[0-9A-Z]{16}\b/g
  },
  {
    id: 'github-personal-token',
    description: 'GitHub Personal Access Token',
    regex: /\b(ghp|gho|ghu|ghs|ghr)_[0-9a-zA-Z]{36}\b|\bgithub_pat_[0-9a-zA-Z_]{82}\b/g
  }
];

function sha256File(file) {
  if (typeof file !== 'string' || !file || !fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

export function loadAllowlist(customPath = ALLOWLIST_PATH) {
  const filePath = customPath || ALLOWLIST_PATH;
  if (!filePath || typeof filePath !== 'string' || !fs.existsSync(filePath)) return [];

  let rawContent;
  try {
    rawContent = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read secret allowlist file at ${filePath}: ${err.message}`);
  }

  let raw;
  try {
    raw = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Malformed JSON in secret allowlist at ${filePath}: ${err.message}`);
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`Secret allowlist at ${filePath} must be a JSON object.`);
  }

  if (!Array.isArray(raw.entries)) {
    throw new Error(`Secret allowlist at ${filePath} missing required 'entries' array.`);
  }

  for (let idx = 0; idx < raw.entries.length; idx++) {
    const entry = raw.entries[idx];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Secret allowlist entry at index ${idx} is not an object.`);
    }
    if (!entry.expiryDate || typeof entry.expiryDate !== 'string') {
      throw new Error(`Secret allowlist entry at index ${idx} missing required 'expiryDate' string.`);
    }
    const expiry = Date.parse(entry.expiryDate);
    if (Number.isNaN(expiry)) {
      throw new Error(`Secret allowlist entry at index ${idx} has invalid 'expiryDate': ${entry.expiryDate}`);
    }
  }

  const now = Date.now();
  return raw.entries.filter((e) => {
    const expiry = Date.parse(e.expiryDate);
    return expiry > now;
  });
}

function isAllowlisted(finding, activeAllowlist) {
  for (const item of activeAllowlist) {
    if (item.fingerprint && item.fingerprint === finding.fingerprint) return true;
    if (item.ruleId === finding.ruleId && item.filePath === finding.filePath) {
      if (!item.commit || item.commit === finding.commit || finding.commit === 'WORKING_TREE') {
        return true;
      }
    }
  }
  return false;
}

/**
 * Native Git history secret scanner that streams every commit and tree state.
 */
async function scanGitTreeAndHistory(targetDir, allowlistPath) {
  const findings = [];
  const candidateAllowlist = allowlistPath || path.join(targetDir, 'config/security/secret-allowlist.json');
  const effectiveAllowlistPath = fs.existsSync(candidateAllowlist)
    ? candidateAllowlist
    : (targetDir === ROOT ? ALLOWLIST_PATH : candidateAllowlist);
  const activeAllowlist = loadAllowlist(effectiveAllowlistPath);

  // 1. Scan working tree tracked files
  let trackedFiles = [];
  try {
    const trackedOutput = execFileSync('git', ['ls-files'], { cwd: targetDir, encoding: 'utf8' });
    trackedFiles = trackedOutput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  } catch (err) {
    throw new Error(`Failed to enumerate tracked files via 'git ls-files' in ${targetDir}: ${err.message}`);
  }

  for (const rel of trackedFiles) {
    if (rel.includes('secret-allowlist.json') || rel.includes('gitleaks.toml')) continue;
    const full = path.join(targetDir, rel);
    let content;
    try {
      content = fs.readFileSync(full, 'utf8');
    } catch (err) {
      throw new Error(`Failed to read tracked file '${rel}' in ${targetDir}: ${err.message}`);
    }

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(line)) !== null) {
          const matchVal = match[0];
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

  // 2. Stream full git commit history diffs without buffer exhaustion
  let commitCount = 0;
  await new Promise((resolve, reject) => {
    const proc = spawn('git', ['log', '-p', '--full-history', '--all', '--no-color'], {
      cwd: targetDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let currentCommit = 'unknown';
    let currentFile = 'unknown';
    let lineInFile = 0;

    const rl = readline.createInterface({ input: proc.stdout });

    rl.on('line', (line) => {
      if (line.startsWith('commit ') && /^[0-9a-f]{40}$/.test(line.slice(7).trim())) {
        currentCommit = line.slice(7).trim();
        commitCount++;
        return;
      }
      if (line.startsWith('+++ b/')) {
        currentFile = line.substring(6).trim();
        lineInFile = 0;
        return;
      }
      if (!line.startsWith('+') || line.startsWith('+++')) {
        if (!line.startsWith('-')) lineInFile++;
        return;
      }
      lineInFile++;
      if (currentFile.includes('secret-allowlist.json') || currentFile.includes('gitleaks.toml')) return;

      const addedText = line.substring(1);
      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        let match;
        while ((match = pattern.regex.exec(addedText)) !== null) {
          const matchVal = match[0];
          if (/AKIA[0-9]{16}/.test(matchVal) && matchVal.includes('0000000000000000')) continue;
          const fingerprint = crypto.createHash('sha256').update(`${pattern.id}:${currentCommit}:${currentFile}:${matchVal}`).digest('hex');
          const finding = {
            ruleId: pattern.id,
            description: pattern.description,
            filePath: currentFile,
            lineNumber: lineInFile,
            commit: currentCommit,
            fingerprint
          };
          if (!isAllowlisted(finding, activeAllowlist)) {
            findings.push(finding);
          }
        }
      }
    });

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn git log: ${err.message}`));
    });

    rl.on('error', (err) => {
      reject(new Error(`Error reading git log stream: ${err.message}`));
    });

    proc.stdout.on('error', (err) => {
      reject(new Error(`Error on git log stdout stream: ${err.message}`));
    });

    proc.on('close', (code, signal) => {
      if (signal) {
        reject(new Error(`git log terminated prematurely by signal ${signal}: ${stderr.trim()}`));
        return;
      }
      if (code !== 0) {
        if (stderr.includes('does not have any commits') || stderr.includes('fatal: your current branch')) {
          resolve();
          return;
        }
        reject(new Error(`git log failed with exit code ${code}: ${stderr.trim()}`));
        return;
      }
      resolve();
    });
  });

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
            version: '2.2.0',
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
export async function executeSecretScan({ targetDir = ROOT, allowlistPath, outDir } = {}) {
  const start = Date.now();
  console.log(`[en] Executing Comprehensive Secret Scan across Working Tree and Full Git History...`);

  const { findings, commitCount } = await scanGitTreeAndHistory(targetDir, allowlistPath);
  const sarif = buildSarifDocument(findings);

  const durationSec = ((Date.now() - start) / 1000).toFixed(3);
  const status = findings.length === 0 ? 'PASS' : 'FAIL';

  const metadata = {
    schemaVersion: '1.0.0',
    scanner: 'UgonduSecretScanner',
    scannerVersion: '2.2.0',
    binarySha256: sha256File(__filename),
    configSha256: sha256File(allowlistPath) || sha256File(path.join(targetDir, 'config/security/gitleaks.toml')) || sha256File(CONFIG_PATH),
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
  executeSecretScan()
    .then((result) => {
      if (result.status !== 'PASS') process.exit(1);
    })
    .catch((err) => {
      console.error(`[ERROR] Secret scan execution failed:`, err);
      process.exit(1);
    });
}
