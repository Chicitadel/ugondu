/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Release / Native JUnit Test Reporter Harness
 * File           : native-reporter-harness.cjs
 * Version        : 2.1.0
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

'use strict';

const fs = require('fs');
const path = require('path');

const reportDest = process.env.UGONDU_REPORT_DEST;
if (!reportDest) {
  return;
}

const sourceCommit = process.env.UGONDU_COMMIT_SHA || '';
const startTime = Date.now();
const testCases = [];
let suiteFailures = 0;
let suiteErrors = 0;

const PASS_REGEX = /^(?:\[[a-z]{2}\]\s*)?(?:\[PASS\]\s*✓?\s*|✓\s*PASS:?\s*|✓\s*|PASS\s*:?\s*)/i;
const FAIL_REGEX = /^(?:\[[a-z]{2}\]\s*)?(?:\[FAIL\]\s*✗?\s*|✗\s*FAIL:?\s*|✗\s*|FAIL\s*:?\s*)/i;

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const origLog = console.log;
const origError = console.error;

console.log = function (...args) {
  origLog.apply(console, args);
  const line = args.map((a) => String(a)).join(' ').trim();
  if (PASS_REGEX.test(line)) {
    const name = line.replace(PASS_REGEX, '').trim();
    if (name) {
      testCases.push({ name, status: 'pass', time: '0.010' });
    }
  }
};

console.error = function (...args) {
  origError.apply(console, args);
  const line = args.map((a) => String(a)).join(' ').trim();
  if (FAIL_REGEX.test(line)) {
    const name = line.replace(FAIL_REGEX, '').trim();
    testCases.push({ name: name || 'Assertion failure', status: 'fail', error: line, time: '0.010' });
    suiteFailures++;
  }
};

process.on('uncaughtException', (err) => {
  suiteErrors++;
  testCases.push({
    name: 'uncaughtException',
    status: 'error',
    error: err && err.stack ? err.stack : String(err),
    time: '0.000'
  });
  writeNativeReport();
  origError('Uncaught exception in native test harness:', err);
  process.exit(1);
});

function writeNativeReport() {
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(3);
  const suiteName = process.env.UGONDU_SUITE_NAME || path.basename(process.argv[1] || 'test');
  const total = testCases.length;

  let casesXml = '';
  for (const tc of testCases) {
    casesXml += `    <testcase classname="${escapeXml(suiteName)}" name="${escapeXml(tc.name)}" time="${tc.time}">\n`;
    if (tc.status === 'fail') {
      casesXml += `      <failure message="${escapeXml(tc.error)}">${escapeXml(tc.error)}</failure>\n`;
    } else if (tc.status === 'error') {
      casesXml += `      <error message="${escapeXml(tc.error)}">${escapeXml(tc.error)}</error>\n`;
    }
    casesXml += `    </testcase>\n`;
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="${escapeXml(suiteName)}" tests="${total}" failures="${suiteFailures}" errors="${suiteErrors}" skipped="0" time="${durationSec}" commit="${escapeXml(sourceCommit)}">
  <testsuite name="${escapeXml(suiteName)}" tests="${total}" failures="${suiteFailures}" errors="${suiteErrors}" skipped="0" time="${durationSec}">
${casesXml}  </testsuite>
</testsuites>
`;

  try {
    fs.mkdirSync(path.dirname(reportDest), { recursive: true });
    fs.writeFileSync(reportDest, xml, 'utf8');
  } catch (err) {
    origError('Failed to write native JUnit report:', err);
  }
}

process.on('exit', () => {
  writeNativeReport();
});
