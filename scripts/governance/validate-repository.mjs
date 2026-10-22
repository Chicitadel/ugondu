/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance Validator — Repository Integrity & Anti-Stub Enforcer
 * File           : validate-repository.mjs
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-22
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
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Systems
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const REQUIRED_POLICY_RULES = [
  'productionMocksForbidden',
  'silentFallbacksForbidden',
  'hardcodedOperationalConfigurationForbidden',
  'fakeSuccessResponsesForbidden',
  'mandatoryChecksMayNotBeSkipped',
  'healthMustNotAssertComplianceGrade',
  'noAiAttributionRequired'
];

const FORBIDDEN_HEADER_RE = new RegExp('\\bAI\\s+' + 'Governed\\b', 'i');
const PEM_PRIVATE_KEY_RE = new RegExp('-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?' + 'PRIVATE KEY-----');
const HEALTH_COR_LEVEL_RE = /cor_level\s*:\s*['"]A['"]/;
const AUTH_BYPASS_RE = /&&\s*false\b/;
const FAKE_LOCALE_PREFIX_RE = /\[(?:AR|FR|DE)\]/;
const PROD_MOCK_IMPORT_RE = /(?:import\s+.*\s+from\s+['"][^'"]*(?:mock|fixture|stubs?|__tests__)[^'"]*['"]|require\(['"][^'"]*(?:mock|fixture|stubs?|__tests__)[^'"]*['"]\))/i;
const SWALLOWED_ERROR_RE = /catch\s*(?:\([^)]*\))?\s*\{\s*return\s*(?:\{[^}]*(?:success:\s*true|applied:\s*true|valid:\s*true)|true|['"]APPLIED_AND_MATCHES['"])/i;
export const MAX_GOVERNED_LOC = 500;

function isTestOrFixturePath(normalizedPath) {
  return (
    /\.(?:test|spec)\.[jt]sx?$/i.test(normalizedPath) ||
    /(?:^|\/)(?:tests|__tests__|__mocks__|test-helpers|fixtures|__fixtures__)\//i.test(normalizedPath) ||
    /(?:^|\/)fixture[s]?\//i.test(normalizedPath)
  );
}

function listTrackedFiles() {
  const files = new Set();
  try {
    const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
    out.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).forEach((f) => files.add(f));
  } catch {
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          files.add(path.relative(ROOT, fullPath).replace(/\\/g, '/'));
        }
      }
    };
    walk(ROOT);
  }
  try {
    const statusOut = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
    statusOut.split(/\r?\n/).forEach((l) => {
      const trimmed = l.replace(/^[MADRCU?! ]{1,2}\s+/, '').trim().replace(/\\/g, '/');
      if (trimmed && !trimmed.endsWith('/')) {
        const abs = path.join(ROOT, trimmed);
        if (fs.existsSync(abs) && fs.statSync(abs).isFile()) files.add(trimmed);
      }
    });
  } catch {}
  return Array.from(files);
}

function validatePolicyContract(violations) {
  const policyPath = path.join(ROOT, '.governance', 'policies', 'no-production-stubs.yml');
  if (!fs.existsSync(policyPath)) {
    violations.push('Missing mandatory policy contract: .governance/policies/no-production-stubs.yml');
    return;
  }

  const content = fs.readFileSync(policyPath, 'utf8');
  if (!/policyId:\s*UG-COR-NO-STUBS-001\b/.test(content)) {
    violations.push('Policy .governance/policies/no-production-stubs.yml must declare policyId: UG-COR-NO-STUBS-001');
  }

  for (const ruleKey of REQUIRED_POLICY_RULES) {
    const rulePattern = new RegExp(`^\\s*${ruleKey}:`, 'm');
    if (!rulePattern.test(content)) {
      violations.push(`Policy UG-COR-NO-STUBS-001 missing required rule section: ${ruleKey}`);
    }
  }

  if (!/exceptionRules:|exceptions:/m.test(content)) {
    violations.push('Policy UG-COR-NO-STUBS-001 must define exception expiry governance rules');
  }

  const expiryMatches = [...content.matchAll(/expiresAt:\s*['"]?(\d{4}-\d{2}-\d{2}[^'"\s]*)['"]?/g)];
  const now = Date.now();
  for (const match of expiryMatches) {
    const parsed = Date.parse(match[1]);
    if (Number.isNaN(parsed) || parsed < now) {
      violations.push(`Expired or invalid policy exception date in UG-COR-NO-STUBS-001: ${match[1]}`);
    }
  }
}

function validateTrackedFilesAndKeys(trackedFiles, violations) {
  for (const relPath of trackedFiles) {
    const normalized = relPath.replace(/\\/g, '/');
    if (/(^|\/)([^/]+_)?private\.pem$/i.test(normalized)) {
      violations.push(`Forbidden tracked private key file: ${normalized}`);
    }
    if (normalized === 'cor-evidence-bundle.json' || normalized === 'cor-test-results.json' || /(^|\/)\.service_replay_ledger\.json$/.test(normalized)) {
      violations.push(`Forbidden tracked runtime/certification artifact: ${normalized}`);
    }
    const absPath = path.join(ROOT, normalized);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;
    if (/\.(pem|key|env|yml|yaml|json|ts|js|mjs|cjs|go|sh|md)$/i.test(normalized)) {
      const content = fs.readFileSync(absPath, 'utf8');
      if (PEM_PRIVATE_KEY_RE.test(content)) {
        violations.push(`Tracked file contains embedded PEM private key material: ${normalized}`);
      }
    }
  }
}

function validateSourceIntegrity(trackedFiles, violations) {
  for (const relPath of trackedFiles) {
    const normalized = relPath.replace(/\\/g, '/');
    if (normalized.includes('/node_modules/') || normalized.includes('/dist/')) continue;
    const absPath = path.join(ROOT, normalized);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;

    const isServerRuntime = /^server\/[^/]+\/src\/.+\.(ts|js|mjs|cjs)$/.test(normalized);
    const isClientRuntime = /^client\/.+\.go$/.test(normalized) && !normalized.endsWith('_test.go');
    const isGovernedSource = isServerRuntime || isClientRuntime ||
      /^scripts\/governance\/.+\.(js|mjs|cjs)$/.test(normalized) ||
      normalized === 'scripts/verify-release-integrity.js' ||
      /^\.governance\/.+\.(yml|yaml|json|md)$/.test(normalized);
    if (!isGovernedSource) continue;

    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);
    if (isServerRuntime) {
      if (HEALTH_COR_LEVEL_RE.test(content)) violations.push(`Synthetic compliance grade (cor_level: 'A') detected in ${normalized}`);
      if (AUTH_BYPASS_RE.test(content)) violations.push(`Authentication/validation bypass (&& false) detected in ${normalized}`);
    }
    if (isClientRuntime && AUTH_BYPASS_RE.test(content)) violations.push(`Authentication/validation bypass (&& false) detected in ${normalized}`);

    const headerSlice = lines.slice(0, 40).join('\n');
    if (FORBIDDEN_HEADER_RE.test(headerSlice)) violations.push(`Forbidden non-human governance attribution in header of ${normalized}`);

    const isGovernedScript = /\.(js|mjs|cjs)$/.test(normalized) &&
      (/^scripts\/governance\//.test(normalized) || normalized === 'scripts/verify-release-integrity.js' || /^server\/[^/]+\/src\//.test(normalized));
    if (isGovernedScript && lines.length > MAX_GOVERNED_LOC) {
      violations.push(`Governed script exceeds ${MAX_GOVERNED_LOC} LOC (${lines.length} lines): ${normalized}`);
    }
  }
}

function validateSemanticAntiStubs(trackedFiles, violations) {
  const isTargetProductionSource = (norm) => {
    if (isTestOrFixturePath(norm)) return false;
    if (!/\.[jt]sx?$/.test(norm) || norm.endsWith('.d.ts')) return false;
    return (
      norm.startsWith('server/capabilities/src/') ||
      norm.startsWith('server/engine-core/src/') ||
      norm.startsWith('server/plugins/')
    );
  };

  for (const relPath of trackedFiles) {
    const normalized = relPath.replace(/\\/g, '/');
    if (!isTargetProductionSource(normalized)) continue;

    const absPath = path.join(ROOT, normalized);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;

    const content = fs.readFileSync(absPath, 'utf8');
    const lines = content.split(/\r?\n/);

    lines.forEach((line, idx) => {
      if (
        PROD_MOCK_IMPORT_RE.test(line) ||
        (/\bimport\b/.test(line) && PROD_MOCK_IMPORT_RE.test(lines.slice(idx, idx + 4).join(' ')))
      ) {
        violations.push(`Production source imports mock/fixture/test double: ${normalized}:${idx + 1}`);
      }
      if (/\bcatch\b/.test(line) && SWALLOWED_ERROR_RE.test(lines.slice(idx, idx + 5).join(' '))) {
        violations.push(`Swallowed provider error returning fake-success in ${normalized}:${idx + 1}`);
      }
    });

    if (content.includes('APPLIED_AND_MATCHES')) {
      lines.forEach((line, idx) => {
        if (/return\s+['"]APPLIED_AND_MATCHES['"]/.test(line) || /outcome:\s*['"]APPLIED_AND_MATCHES['"]/.test(line)) {
          const window = lines.slice(Math.max(0, idx - 15), Math.min(lines.length, idx + 5)).join('\n');
          const hasEvidenceCheck = /evidence|observedDigest|verification|assertPolicyVerification/.test(window);
          if (!hasEvidenceCheck) {
            violations.push(
              `Anti-stub violation: unverified hardcoded 'APPLIED_AND_MATCHES' returned without evidence in ${normalized}:${idx + 1}`
            );
          }
        }
      });
    }

    if (/applied:\s*true\b/.test(content)) {
      lines.forEach((line, idx) => {
        const isReturnApplied =
          /return\s*\{[^}]*applied:\s*true\b/.test(line) ||
          /=>\s*\(?\s*\{[^}]*applied:\s*true\b/.test(line) ||
          (/applied:\s*true\b/.test(line) && /return\s*\{/.test(lines.slice(Math.max(0, idx - 3), idx + 1).join(' ')));
        if (isReturnApplied) {
          const window = lines.slice(Math.max(0, idx - 15), Math.min(lines.length, idx + 10)).join('\n');
          const hasProviderInteraction =
            /\b(?:await\s+)?(?:this\.)?(?:provider|client|adapter)\.[a-zA-Z0-9_]+\(/i.test(window) ||
            /\b(?:receiptHash|createHash|canonicalize|execFile|spawn|fetch\(|axios\.)/i.test(window);
          if (!hasProviderInteraction) {
            violations.push(
              `Anti-stub violation: fake-success returning { applied: true } without provider interaction in ${normalized}:${idx + 1}`
            );
          }
        }
      });
    }

    if (/valid:\s*true\b/.test(content)) {
      lines.forEach((line, idx) => {
        if (/return\s*\{[^}]*valid:\s*true\b/.test(line) || /=>\s*\(?\s*\{[^}]*valid:\s*true\b/.test(line)) {
          const window = lines.slice(Math.max(0, idx - 15), idx).join('\n');
          const isInspectionPresent = /if\s*\(|verify|check|assert|crypto|digest|for\s*\(|while\s*\(|switch\s*\(|validate/.test(window);
          const hasIgnoredParam = /\(\s*_[a-zA-Z0-9_]+\s*:\s*[a-zA-Z0-9_<>[\]|&]+\s*\)/.test(window);
          if (hasIgnoredParam || !isInspectionPresent) {
            violations.push(
              `Anti-stub violation: unverified { valid: true } returned without inspection in ${normalized}:${idx + 1}`
            );
          }
        }
      });
    }

    if (/success:\s*true\b/.test(content)) {
      lines.forEach((line, idx) => {
        const isReturnSuccess =
          /return\s*\{[^}]*success:\s*true\b/.test(line) ||
          (/success:\s*true\b/.test(line) && /return\s*\{/.test(lines.slice(Math.max(0, idx - 3), idx + 1).join(' '))) ||
          /=>\s*\(?\s*\{[^}]*success:\s*true\b/.test(line);
        if (isReturnSuccess && !/res\.(?:status\([^)]*\)\.)?json\s*\(/.test(line) && !/return\s+res\./.test(line)) {
          const window = lines.slice(Math.max(0, idx - 15), Math.min(lines.length, idx + 10)).join('\n');
          const hasEvidenceOrProvider =
            /\bawait\s+[a-zA-Z0-9_.]+\(/i.test(window) ||
            /\b(?:this\.|context\.)?(?:provider|client|adapter|aws|service|scheduler|networkManager|processManager|manager)\.[a-zA-Z0-9_]+\(/i.test(window) ||
            /\b(?:receiptHash|createHash|canonicalize|execFile|spawn|fetch\(|axios\.|evidence|inspection|verification|assert)/i.test(window);
          if (!hasEvidenceOrProvider) {
            violations.push(
              `Anti-stub violation: helper-indirected fake-success returning { success: true } without provider interaction or evidence in ${normalized}:${idx + 1}`
            );
          }
        }
      });
    }
  }
}

function validateCreatedOrModifiedFileLimits(violations) {
  const candidates = new Set();
  try {
    const diffOut = execFileSync('git', ['diff', '--name-only', 'origin/phase4/production-hardening'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    diffOut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((f) => candidates.add(f));
  } catch {}
  try {
    const statusOut = execFileSync('git', ['status', '--porcelain'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    statusOut.split(/\r?\n/).forEach((l) => {
      const trimmed = l.replace(/^[MADRCU?! ]{1,2}\s+/, '').trim();
      if (trimmed) candidates.add(trimmed);
    });
  } catch {}

  for (const relPath of candidates) {
    const normalized = relPath.replace(/\\/g, '/');
    if (
      normalized.includes('/node_modules/') ||
      normalized.includes('/dist/') ||
      /\.(json|ya?ml|md|lock)$/i.test(normalized)
    ) {
      continue;
    }
    const absPath = path.join(ROOT, normalized);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;
    const lineCount = fs.readFileSync(absPath, 'utf8').split(/\r?\n/).length;
    if (lineCount > MAX_GOVERNED_LOC) {
      violations.push(
        `Created/modified source file exceeds ${MAX_GOVERNED_LOC} LOC limit (${lineCount} lines): ${normalized}`
      );
    }
  }
}

function validateLocalePacks(violations) {
  const localesDir = path.join(ROOT, 'server', 'shared', 'locales');
  if (!fs.existsSync(localesDir)) {
    violations.push('Missing locales directory: server/shared/locales');
    return;
  }
  const localeFiles = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));
  if (localeFiles.length === 0) {
    violations.push('No locale JSON files found in server/shared/locales');
    return;
  }
  for (const file of localeFiles) {
    const fullPath = path.join(localesDir, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      violations.push(`Invalid JSON in server/shared/locales/${file}: ${err.message}`);
      continue;
    }
    const inspectValues = (obj, keyPath = '') => {
      for (const [k, v] of Object.entries(obj)) {
        const currentKey = keyPath ? `${keyPath}.${k}` : k;
        if (typeof v === 'string') {
          if (FAKE_LOCALE_PREFIX_RE.test(v)) {
            violations.push(`Placeholder translation prefix detected in server/shared/locales/${file} at "${currentKey}": ${v}`);
          }
        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
          inspectValues(v, currentKey);
        }
      }
    };
    inspectValues(parsed);
  }
}

function validateCertificationEvidenceConsistency(violations) {
  const auditsDir = path.join(ROOT, 'docs', 'audits');
  if (!fs.existsSync(auditsDir)) return;
  const auditFiles = fs.readdirSync(auditsDir).filter((f) => f.endsWith('.md'));
  for (const file of auditFiles) {
    const content = fs.readFileSync(path.join(auditsDir, file), 'utf8');
    const commitMatches = content.matchAll(/(?:Commit|commit\/)([a-f0-9]{8,40})/gi);
    for (const match of commitMatches) {
      try {
        execSync(`git rev-parse --verify "${match[1]}"`, { cwd: ROOT, stdio: 'pipe' });
      } catch {
        violations.push(`Certification document docs/audits/${file} references unknown or unverified commit SHA: ${match[1]}`);
      }
    }
  }
}

export function runRepositoryValidation(options = {}) {
  const violations = [];
  const baseFiles = options.trackedFiles || listTrackedFiles();
  const trackedFiles = options.extraFiles
    ? Array.from(new Set([...baseFiles, ...options.extraFiles]))
    : baseFiles;

  if (!options.skipPolicyContract) validatePolicyContract(violations);
  if (!options.skipTrackedKeys) validateTrackedFilesAndKeys(trackedFiles, violations);
  if (!options.skipSourceIntegrity) validateSourceIntegrity(trackedFiles, violations);
  validateSemanticAntiStubs(trackedFiles, violations);
  validateCreatedOrModifiedFileLimits(violations);
  if (!options.skipLocales) validateLocalePacks(violations);
  if (!options.skipCertificationEvidence) validateCertificationEvidenceConsistency(violations);

  return {
    passed: violations.length === 0,
    policyId: 'UG-COR-NO-STUBS-001',
    checkedFiles: trackedFiles.length,
    violations
  };
}

export {
  validateSemanticAntiStubs,
  validateCreatedOrModifiedFileLimits,
  validateSourceIntegrity,
  validateTrackedFilesAndKeys,
  validatePolicyContract
};

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = runRepositoryValidation();
  if (!result.passed) {
    console.error(`[FAIL] Repository governance validation (${result.policyId}) failed with ${result.violations.length} violation(s):`);
    for (const violation of result.violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }
  console.log(
    `[PASS] Repository governance validation (${result.policyId}): ${result.checkedFiles} tracked files verified with 0 violations.`
  );
}
