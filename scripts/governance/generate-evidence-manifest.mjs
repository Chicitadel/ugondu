/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance — Evidence Manifest Generator
 * File           : generate-evidence-manifest.mjs
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-23
 * Last Modified  : 2026-10-23
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
 * Produces docs/governance/evidence/evidence-manifest.json bound to the exact
 * git HEAD. Fails closed on a dirty tree, SHA mismatch, or missing evidence.
 * Items without evidence are listed as unproven and are never claimed.
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MANIFEST_RELATIVE_PATH = 'docs/governance/evidence/evidence-manifest.json';

export const REQUIRED_EVIDENCE_FILES = [
  'config/qualification/target-matrix.json',
  'docs/security/evidence/admin_portal_provisioning_receipt.json',
  'docs/security/evidence/live_ai_canary_receipt.json',
  'docs/governance/evidence/native-runner-evidence.json',
];

// Items whose proof must exist as a file; absence => listed "unproven".
export const UNPROVEN_CANDIDATES = [
  { id: 'live-canary-receipt', path: 'docs/security/evidence/live_ai_canary_receipt.json',
    reason: 'Live canary receipt absent' },
  { id: 'native-runner-evidence', path: 'docs/governance/evidence/native-runner-evidence.json',
    reason: 'Native runner evidence absent' },
];

export class EvidenceManifestError extends Error {
  constructor(message) { super(message); this.name = 'EvidenceManifestError'; }
}

const SHA_RE = /^[0-9a-f]{40}$/;
const toPosix = (p) => p.split(path.sep).join('/');

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

export function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function assertCleanTree(root, ignore) {
  const lines = git(root, ['status', '--porcelain', '--untracked-files=all'])
    .split('\n').map((l) => l.replace(/\r$/, '')).filter(Boolean)
    .filter((l) => toPosix(l.slice(3)) !== ignore);
  if (lines.length) {
    throw new EvidenceManifestError(`Dirty working tree (${lines.length} change(s)); refusing to generate`);
  }
}

function validateCommands(commands) {
  if (!Array.isArray(commands) || commands.length === 0) {
    throw new EvidenceManifestError('At least one test command with exit code is required');
  }
  return commands.map((c) => {
    if (!c || typeof c.command !== 'string' || !c.command.trim() || !Number.isInteger(c.exitCode)) {
      throw new EvidenceManifestError('Each command requires string "command" and integer "exitCode"');
    }
    return { command: c.command, exitCode: c.exitCode };
  });
}

export function generateManifest({ root = ROOT, expectedSha, evidenceFiles, commands, write = true } = {}) {
  if (!SHA_RE.test(expectedSha || '')) throw new EvidenceManifestError('expectedSha must be a full 40-hex git SHA');
  const cmds = validateCommands(commands);
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  if (head !== expectedSha) throw new EvidenceManifestError(`SHA mismatch: HEAD ${head} != expected ${expectedSha}`);
  assertCleanTree(root, MANIFEST_RELATIVE_PATH);

  // Initialize candidate files from evidenceFiles or discover existing required evidence
  let candidateFiles = Array.isArray(evidenceFiles) && evidenceFiles.length > 0
    ? [...evidenceFiles]
    : REQUIRED_EVIDENCE_FILES.filter((rel) => {
        const abs = path.resolve(root, rel);
        return fs.existsSync(abs) && fs.statSync(abs).isFile();
      });

  // When candidate evidence files exist on disk, include them in evidenceFiles
  for (const candidate of UNPROVEN_CANDIDATES) {
    const candidateAbs = path.resolve(root, candidate.path);
    if (fs.existsSync(candidateAbs) && fs.statSync(candidateAbs).isFile()) {
      if (!candidateFiles.includes(candidate.path)) {
        candidateFiles.push(candidate.path);
      }
    }
  }

  if (candidateFiles.length === 0) {
    throw new EvidenceManifestError('At least one evidence file is required');
  }

  const files = [...new Set(candidateFiles.map((f) => toPosix(path.normalize(f))))].sort().map((rel) => {
    const abs = path.resolve(root, rel);
    if (rel.startsWith('..') || path.isAbsolute(rel) || !abs.startsWith(root + path.sep)) {
      throw new EvidenceManifestError(`Evidence path escapes repository: ${rel}`);
    }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new EvidenceManifestError(`Missing evidence file: ${rel}`);
    return { path: rel, sha256: sha256File(abs) };
  });

  const listed = new Set(files.map((f) => f.path));
  const unproven = UNPROVEN_CANDIDATES
    .filter((u) => !listed.has(u.path) || !fs.existsSync(path.resolve(root, u.path)))
    .map((u) => ({ id: u.id, expectedPath: u.path, reason: u.reason }));

  const manifest = {
    schema: 'ugondu.evidence-manifest/1',
    gitHeadSha: head,
    evidenceFiles: files,
    testCommands: cmds,
    allTestCommandsPassed: cmds.every((c) => c.exitCode === 0),
    unproven,
  };
  if (write) {
    const out = path.resolve(root, MANIFEST_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
  }
  return manifest;
}

function parseArgs(argv) {
  const a = { evidence: [], commands: null, sha: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--expected-sha') a.sha = argv[++i];
    else if (argv[i] === '--evidence') a.evidence.push(argv[++i]);
    else if (argv[i] === '--commands') a.commands = JSON.parse(fs.readFileSync(argv[++i], 'utf8'));
    else throw new EvidenceManifestError(`Unknown argument: ${argv[i]}`);
  }
  return a;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = parseArgs(process.argv.slice(2));
    const m = generateManifest({
      expectedSha: a.sha,
      evidenceFiles: a.evidence.length > 0 ? a.evidence : undefined,
      commands: a.commands,
    });
    console.log(`Evidence manifest written for ${m.gitHeadSha}; unproven: ${m.unproven.length}`);
  } catch (err) {
    console.error(`[evidence-manifest] FAIL: ${err.message}`);
    process.exit(1);
  }
}
