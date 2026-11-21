/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance Validator — Workspace Test & Gate Coverage
 * File           : validate-test-coverage.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd / Ujomor Systems
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
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
 * Copyright (c) 2026 Air Roofers Ltd / Ujomor Systems
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const REQUIRED_WORKSPACE_SCRIPTS = ['build', 'lint', 'typecheck', 'test'];
const PROHIBITED_FLAGS = ['--if-present', '--passWithNoTests'];

/** Reject workspace declarations that escape the repository root. */
export function isWorkspacePathWithinRoot(root, workspacePath) {
  if (typeof workspacePath !== 'string' || !workspacePath.trim() || path.isAbsolute(workspacePath)) {
    return false;
  }
  const resolvedRoot = path.resolve(root);
  const resolvedWorkspace = path.resolve(resolvedRoot, workspacePath);
  const relative = path.relative(resolvedRoot, resolvedWorkspace);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function runTestCoverageValidation() {
  const violations = [];
  const rootPkgPath = path.join(ROOT, 'package.json');

  if (!fs.existsSync(rootPkgPath)) {
    return {
      passed: false,
      workspacesChecked: 0,
      violations: ['Missing root package.json']
    };
  }

  let rootPkg;
  try {
    rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
  } catch (err) {
    return {
      passed: false,
      workspacesChecked: 0,
      violations: [`Invalid JSON in root package.json: ${err.message}`]
    };
  }

  const rootScripts = rootPkg.scripts || {};
  for (const reqScript of REQUIRED_WORKSPACE_SCRIPTS) {
    if (!rootScripts[reqScript] || typeof rootScripts[reqScript] !== 'string') {
      violations.push(`Root package.json missing mandatory "${reqScript}" script`);
    }
  }

  for (const [scriptName, cmd] of Object.entries(rootScripts)) {
    if (typeof cmd !== 'string') continue;
    for (const flag of PROHIBITED_FLAGS) {
      if (cmd.includes(flag)) {
        violations.push(`Root package.json script "${scriptName}" contains prohibited flag "${flag}": ${cmd}`);
      }
    }
  }

  const workspaces = Array.isArray(rootPkg.workspaces) ? rootPkg.workspaces : [];
  if (workspaces.length === 0) {
    violations.push('Root package.json defines no workspaces');
  }

  for (const wsRel of workspaces) {
    if (!isWorkspacePathWithinRoot(ROOT, wsRel)) {
      violations.push(`Workspace path must be a non-empty repository-relative path contained within the repository root: ${String(wsRel)}`);
      continue;
    }
    const wsPkgPath = path.join(ROOT, wsRel, 'package.json');
    if (!fs.existsSync(wsPkgPath)) {
      violations.push(`Workspace "${wsRel}" is missing package.json at ${wsRel}/package.json`);
      continue;
    }

    let wsPkg;
    try {
      wsPkg = JSON.parse(fs.readFileSync(wsPkgPath, 'utf8'));
    } catch (err) {
      violations.push(`Workspace "${wsRel}" has invalid package.json: ${err.message}`);
      continue;
    }

    const wsScripts = wsPkg.scripts || {};
    for (const reqScript of REQUIRED_WORKSPACE_SCRIPTS) {
      const cmd = wsScripts[reqScript];
      if (!cmd || typeof cmd !== 'string' || !cmd.trim()) {
        violations.push(`Workspace "${wsRel}" is missing mandatory "${reqScript}" script`);
        continue;
      }
      for (const flag of PROHIBITED_FLAGS) {
        if (cmd.includes(flag)) {
          violations.push(
            `Workspace "${wsRel}" script "${reqScript}" contains prohibited flag "${flag}": ${cmd}`
          );
        }
      }
    }
  }

  return {
    passed: violations.length === 0,
    workspacesChecked: workspaces.length,
    violations
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = runTestCoverageValidation();
  if (!result.passed) {
    console.error(
      `[FAIL] Workspace test & gate coverage validation failed with ${result.violations.length} violation(s):`
    );
    for (const violation of result.violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }
  console.log(
    `[PASS] Workspace test & gate coverage validation: ${result.workspacesChecked} workspaces verified with mandatory build, lint, typecheck, and test gates.`
  );
}
