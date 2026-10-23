/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance — Evidence Freshness Binding
 * File           : evidence-freshness.mjs
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
 * Two-stage release protocol. A manifest cannot contain the hash of the commit
 * that stores it, so the manifest binds to the CANDIDATE commit (the exact code
 * under test). The release HEAD is accepted only if it descends from the
 * candidate and every change since the candidate is confined to evidence and
 * documentation paths. Any source, config, script or workflow change after the
 * candidate invalidates the evidence and fails closed.
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import { execFileSync } from 'node:child_process';

export class EvidenceFreshnessError extends Error {
  constructor(message) { super(message); this.name = 'EvidenceFreshnessError'; }
}

// Paths that may change between the candidate commit and the release HEAD.
export const EVIDENCE_ONLY_PREFIXES = [
  'docs/governance/evidence/',
  'docs/security/evidence/',
  'docs/audits/',
  'docs/qualification/',
];

const SHA_RE = /^[0-9a-f]{40}$/;

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

export function isEvidenceOnlyPath(rel) {
  const posix = rel.split('\\').join('/');
  return EVIDENCE_ONLY_PREFIXES.some((p) => posix.startsWith(p));
}

/**
 * Proves HEAD is the candidate or a descendant differing only by evidence paths.
 * Returns { head, candidate, descendant, changedPaths }.
 */
export function assertCandidateBinding(root, candidateSha) {
  if (!SHA_RE.test(candidateSha || '')) {
    throw new EvidenceFreshnessError('candidate SHA must be a full 40-hex git SHA');
  }
  const head = git(root, ['rev-parse', 'HEAD']).trim();
  if (head === candidateSha) return { head, candidate: candidateSha, descendant: false, changedPaths: [] };

  try {
    git(root, ['cat-file', '-e', `${candidateSha}^{commit}`]);
    git(root, ['merge-base', '--is-ancestor', candidateSha, head]);
  } catch {
    throw new EvidenceFreshnessError(`SHA mismatch: candidate ${candidateSha} is not an ancestor of HEAD ${head}`);
  }

  const changedPaths = git(root, ['diff', '--name-only', `${candidateSha}..${head}`])
    .split('\n').map((l) => l.trim()).filter(Boolean);
  const offending = changedPaths.filter((p) => !isEvidenceOnlyPath(p));
  if (offending.length) {
    throw new EvidenceFreshnessError(
      `Stale evidence: ${offending.length} non-evidence path(s) changed since candidate ${candidateSha}: ${offending.slice(0, 5).join(', ')}`
    );
  }
  return { head, candidate: candidateSha, descendant: true, changedPaths };
}
