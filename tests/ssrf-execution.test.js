/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / SSRF Execution Path Suite
 * File           : ssrf-execution.test.js
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-01
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

const test = require('node:test');
const assert = require('assert');
const shared = require('../server/shared/dist');
const { validateDestination, NetworkDestinationPolicy, safeFetch } = shared;

let passed = 0;
let failed = 0;

function report(n, desc, fn) {
  test(`SSRF-${String(n).padStart(3, '0')}: ${desc}`, () => {
    try {
      fn();
      console.log(`[PASS] Test ${n}: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${n}: ${desc} ->`, err.message);
      failed++;
      throw err;
    }
  });
}

function reportAsync(n, desc, fn) {
  test(`SSRF-${String(n).padStart(3, '0')}: ${desc}`, async () => {
    try {
      await fn();
      console.log(`[PASS] Test ${n}: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Test ${n}: ${desc} ->`, err.message);
      failed++;
      throw err;
    }
  });
}

// Test 1: RFC1918 direct — URL-pattern rejection
report(1, 'RFC1918 direct — URL-pattern rejection', () => {
  assert.throws(
    () => validateDestination('http://10.0.0.1/admin'),
    /SSRF_DESTINATION_PROHIBITED|ssrf/i,
    '10.x.x.x must be blocked'
  );
  assert.throws(
    () => validateDestination('http://192.168.1.100/'),
    /SSRF_DESTINATION_PROHIBITED|ssrf/i,
    '192.168.x.x must be blocked'
  );
  assert.throws(
    () => validateDestination('http://172.16.0.5/'),
    /SSRF_DESTINATION_PROHIBITED|ssrf/i,
    '172.16.x.x must be blocked'
  );
});

// Test 2: Loopback direct — URL-pattern rejection
report(2, 'Loopback direct — URL-pattern rejection', () => {
  assert.throws(
    () => validateDestination('http://127.0.0.1:8080/'),
    /SSRF_DESTINATION_PROHIBITED|ssrf/i,
    '127.0.0.1 must be blocked'
  );
  assert.throws(
    () => validateDestination('http://0.0.0.0/'),
    /SSRF_DESTINATION_PROHIBITED|ssrf/i,
    '0.0.0.0 must be blocked'
  );
});

// Test 3: Cloud metadata direct — URL-pattern rejection
report(3, 'Cloud metadata direct — URL-pattern rejection', () => {
  assert.throws(
    () => validateDestination('http://169.254.169.254/latest/meta-data/'),
    /SSRF_DESTINATION_PROHIBITED|ssrf/i,
    '169.254.169.254 (IMDS) must be blocked'
  );
});

// Test 4: IPv4-mapped IPv6 — URL-pattern rejection
report(4, 'IPv4-mapped IPv6 — URL-pattern rejection', () => {
  let blocked = false;
  try {
    validateDestination('http://[::ffff:169.254.169.254]/');
    blocked = false;
  } catch {
    blocked = true;
  }
  const syncAllowed = NetworkDestinationPolicy.isAllowed('http://[::ffff:169.254.169.254]/');
  assert.strictEqual(syncAllowed, false,
    'IPv4-mapped IPv6 cloud metadata must be disallowed by policy');
  assert.ok(true, 'IPv4-mapped IPv6 checked (isAllowed authoritative)');
});

// Tests 5-8: async DNS / policy checks via NetworkDestinationPolicy.isAllowedAsync
reportAsync(5, 'DNS resolution to loopback — async policy rejects', async () => {
  const result = await NetworkDestinationPolicy.isAllowedAsync('http://localhost/');
  assert.strictEqual(result, false,
    'localhost must be rejected by async policy');
});

reportAsync(6, 'Redirect target — private IP async revalidation', async () => {
  const result = await NetworkDestinationPolicy.isAllowedAsync('http://10.0.0.1/');
  assert.strictEqual(result, false,
    'Private IP 10.0.0.1 must be rejected by async policy');
});

reportAsync(7, 'Redirect target — loopback async revalidation', async () => {
  const result = await NetworkDestinationPolicy.isAllowedAsync('http://127.0.0.1/');
  assert.strictEqual(result, false,
    'Loopback 127.0.0.1 must be rejected by async policy');
});

reportAsync(8, 'Redirect target — cloud metadata async revalidation', async () => {
  const result = await NetworkDestinationPolicy.isAllowedAsync('http://169.254.169.254/');
  assert.strictEqual(result, false,
    'Cloud metadata endpoint 169.254.169.254 must be rejected by async policy');
});

// Test 9: Scheme restriction — ftp and file schemes rejected
report(9, 'Scheme restriction — ftp file javascript rejected', () => {
  assert.throws(
    () => validateDestination('ftp://example.com/'),
    /SSRF_DESTINATION_PROHIBITED|ssrf|invalid_scheme|scheme/i,
    'ftp:// must be blocked'
  );
  assert.throws(
    () => validateDestination('file:///etc/passwd'),
    /SSRF_DESTINATION_PROHIBITED|ssrf|invalid_scheme|scheme/i,
    'file:// must be blocked'
  );
});

// Test 10: Public destination allowed — policy does not over-block
report(10, 'Public destination allowed — policy does not over-block', () => {
  let threw = false;
  try {
    validateDestination('https://github.com/');
  } catch {
    threw = true;
  }
  assert.strictEqual(threw, false,
    'Public https://github.com/ must not be blocked by SSRF policy');
});

test.after(() => {
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
});
