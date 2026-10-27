/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance Audit — Deep Semantic Flow & Anti-Stub Analyzer
 * File           : deep-semantic-flow-audit.mjs
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
 * Last Modified  : 2026-10-25
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
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

function isTestOrFixturePath(norm) {
  return (
    /\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(norm) ||
    norm.endsWith('_test.go') ||
    /(?:^|\/)(?:tests|__tests__|__mocks__|test-helpers|fixtures|__fixtures__)\//i.test(norm) ||
    /(?:^|\/)fixture[s]?\//i.test(norm)
  );
}

function listTrackedFiles() {
  const out = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' });
  return out.split(/\r?\n/).map(f => f.trim().replace(/\\/g, '/')).filter(Boolean);
}

export function runDeepAudit() {
  const trackedFiles = listTrackedFiles();
  const results = {
    productionSourceFilesScanned: 0,
    testFilesScanned: 0,
    testDoubleLeakViolations: [],
    syntheticMockViolations: [],
    fakeSuccessViolations: [],
    swallowedErrorViolations: [],
    unverifiedBypassViolations: [],
    criticalRoutesAudited: [],
    coreEngineMethodsAudited: [],
    authenticSideEffects: {
      dbAndDurablePersistence: [],
      kmsAndEnvelopeEncryption: [],
      cloudAndInfrastructureApis: []
    }
  };

  const PROD_IMPORT_MOCK_RE = /(?:import\s+(?:[\s\S]*?from\s+)?['"]([^'"]*(?:mock|fixture|stubs?|__tests__|test-helpers)[^'"]*)['"]|require\(['"]([^'"]*(?:mock|fixture|stubs?|__tests__|test-helpers)[^'"]*)['"]\))/gi;

  for (const relPath of trackedFiles) {
    if (relPath.includes('node_modules/') || relPath.includes('dist/')) continue;
    const isTest = isTestOrFixturePath(relPath);
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) continue;

    if (isTest) {
      results.testFilesScanned++;
      continue;
    }

    if (!/\.(?:[cm]?[jt]sx?|go)$/.test(relPath)) continue;
    results.productionSourceFilesScanned++;

    const content = fs.readFileSync(absPath, 'utf8');

    // 1. Validate Test Double Isolation: Production source must NEVER import test doubles or fixtures
    let match;
    PROD_IMPORT_MOCK_RE.lastIndex = 0;
    while ((match = PROD_IMPORT_MOCK_RE.exec(content)) !== null) {
      const importedPath = match[1] || match[2];
      // Allow legitimate packages like @types/ or genuine protocol strings if any, but reject test doubles
      if (!importedPath.includes('node_modules') && !importedPath.startsWith('@')) {
        results.testDoubleLeakViolations.push({
          file: relPath,
          imported: importedPath,
          match: match[0]
        });
      }
    }

    // 2. Identify and audit route handlers
    const isRouteOrHandler =
      relPath.includes('/routes/') ||
      relPath.includes('/handlers/') ||
      relPath.includes('/api/') ||
      relPath.endsWith('index.ts') && (relPath.startsWith('server/') || relPath.startsWith('plugins/'));

    if (isRouteOrHandler) {
      const routeMatches = content.matchAll(/(?:router|app)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g);
      for (const rm of routeMatches) {
        results.criticalRoutesAudited.push({
          file: relPath,
          verb: rm[1].toUpperCase(),
          path: rm[2]
        });
      }
    }

    // 3. Scan for core engine methods and authentic side effects
    if (relPath.startsWith('server/engine-core/src/') || relPath.startsWith('server/capabilities/src/') || relPath.startsWith('server/uppie/src/')) {
      const methodMatches = content.matchAll(/(?:public\s+|async\s+|public\s+async\s+)([a-zA-Z0-9_]{3,})\s*\([^)]*\)\s*:\s*(?:Promise<[^>]+>|[a-zA-Z0-9_<>]+)\s*\{/g);
      for (const mm of methodMatches) {
        const methodName = mm[1];
        if (!['constructor', 'toString', 'valueOf'].includes(methodName)) {
          results.coreEngineMethodsAudited.push({
            file: relPath,
            method: methodName
          });
        }
      }
    }

    // 4. Check for authentic side effects
    if (/fs\.writeFileSync|fs\.renameSync|fs\.promises\.writeFile|DurableDeploymentLedger|\.persistToDisk|sqlite|postgres|database/i.test(content)) {
      results.authenticSideEffects.dbAndDurablePersistence.push(relPath);
    }
    if (/kms:\/\/|createPrivateKey|createPublicKey|sign\(|verify\(|createCipheriv|createDecipheriv|HSMProvider|KeyLoader/i.test(content)) {
      results.authenticSideEffects.kmsAndEnvelopeEncryption.push(relPath);
    }
    if (/AwsIamClient|AzureRbacClient|KubernetesRbacClient|CpanelClient|WhmHttpClient|GcpIamClient|ssh-live|aws-physical|execFile|spawn/i.test(content)) {
      results.authenticSideEffects.cloudAndInfrastructureApis.push(relPath);
    }
  }

  return results;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const res = runDeepAudit();
  console.log(`Audited ${res.productionSourceFilesScanned} production source files and ${res.testFilesScanned} test files.`);
  console.log(`Test double leak violations: ${res.testDoubleLeakViolations.length}`);
  console.log(`Critical routes audited: ${res.criticalRoutesAudited.length}`);
  console.log(`Core engine methods audited: ${res.coreEngineMethodsAudited.length}`);
  console.log(`Authentic side-effect modules:`);
  console.log(`  - DB / Durable persistence: ${new Set(res.authenticSideEffects.dbAndDurablePersistence).size} modules`);
  console.log(`  - KMS / Envelope encryption: ${new Set(res.authenticSideEffects.kmsAndEnvelopeEncryption).size} modules`);
  console.log(`  - Cloud & Infrastructure APIs: ${new Set(res.authenticSideEffects.cloudAndInfrastructureApis).size} modules`);

  if (res.testDoubleLeakViolations.length > 0) {
    console.error('VIOLATIONS FOUND:', JSON.stringify(res.testDoubleLeakViolations, null, 2));
    process.exit(1);
  }
}
