/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release / Native JUnit Report Parser & Schema Validator
 * File           : junit-parser.mjs
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
import crypto from 'node:crypto';

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Validates and parses a native JUnit XML report document according
 * to COR-RE-001 requirements. Fails closed on missing, empty, malformed,
 * commit-mismatched, or failing reports.
 */
export function parseAndValidateNativeJUnit({ file, expectedCommit, actualCommit }) {
  if (expectedCommit && actualCommit && expectedCommit !== actualCommit) {
    throw new Error(`Evidence commit mismatch: expected ${expectedCommit}, actual checked out is ${actualCommit}`);
  }

  if (!fs.existsSync(file)) {
    throw new Error(`Required native test report missing: ${file}`);
  }

  const bytes = fs.readFileSync(file);
  if (bytes.length === 0) {
    throw new Error(`Native test report is empty: ${file}`);
  }

  const reportSha256 = sha256Buffer(bytes);
  const xml = bytes.toString('utf8');

  if (!xml.includes('<testsuite') && !xml.includes('<testsuites')) {
    throw new Error(`Report is not a valid native JUnit document (missing <testsuite> root): ${file}`);
  }

  // Check commit attribute if present in XML
  const commitMatch = xml.match(/commit="([^"]+)"/);
  if (commitMatch && expectedCommit && commitMatch[1] !== expectedCommit) {
    throw new Error(`Report commit attribute (${commitMatch[1]}) does not match expected source commit (${expectedCommit})`);
  }

  // Extract counts from attributes and child tags
  const testcaseMatches = xml.match(/<testcase\b/g) || [];
  const failureMatches = xml.match(/<failure\b/g) || [];
  const errorMatches = xml.match(/<error\b/g) || [];
  const skippedMatches = xml.match(/<skipped\b/g) || [];

  const totalTests = testcaseMatches.length;
  const totalFailures = failureMatches.length;
  const totalErrors = errorMatches.length;
  const totalSkipped = skippedMatches.length;

  if (totalTests === 0) {
    throw new Error(`Native test report contains 0 test cases: ${file}`);
  }

  if (totalFailures > 0 || totalErrors > 0) {
    throw new Error(`Native test suite failed with ${totalFailures} failures and ${totalErrors} errors in ${file}`);
  }

  return {
    file,
    reportSha256,
    byteLength: bytes.length,
    totalTests,
    totalFailures,
    totalErrors,
    totalSkipped,
    status: 'PASS',
    xml
  };
}
