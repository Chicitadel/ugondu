/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Governance — Discovery Adversarial & Tamper Resistance
 * File           : discovery-adversarial.test.js
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-27
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
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');

// Mock i18n if not registered
if (typeof global.__t !== 'function') {
  global.__t = (key) => `[en] ${key}`;
}

const ROOT = path.resolve(__dirname, '..');
const { ProductRegistry } = require('../server/shared/dist/registry/product-registry.js');

function runAdversarialTests() {
  console.log('Running Central Product Registry Adversarial & Fail-Closed Tests (Track T07)...');

  const registry = new ProductRegistry(ROOT);

  // 1. Unknown Product Lookup Fail-Closed (Anti-Shadow Assertion)
  assert.throws(
    () => registry.getProduct('NONEXISTENT_PRODUCT_999'),
    /not found in governance product registry|is not registered/i,
    'Unregistered product ID must throw typed error fail-closed'
  );

  // 2. Unknown Microservice Lookup Fail-Closed
  assert.throws(
    () => registry.getServiceConfig('malicious_backdoor_service'),
    /is not registered/i,
    'Unregistered microservice lookup must throw typed error fail-closed'
  );

  // 3. Dynamic Discovery without Parameters
  const autoRegistry = new ProductRegistry();
  assert.strictEqual(autoRegistry.getActiveProductId(), 'ugondu', 'Default constructor must dynamically auto-discover root');
  assert.strictEqual(autoRegistry.getProduct('ugondu').productId, 'UGONDU', 'Active product must be UGONDU');

  // 4. RFC Hostname Normalization under Adversarial Attacks
  // Test 4a: Protocol, credentials, port, path, query, fragment injection
  const dirtyUrl1 = 'https://admin:secretPass123@orchestrator.airroofers.eu:4001/v1/health?token=abc#leak';
  const cleanHost1 = ProductRegistry.normalizeHostname(dirtyUrl1);
  assert.strictEqual(cleanHost1, 'orchestrator.airroofers.eu', 'Must strip credentials, port, paths, query, and fragments');

  // Test 4b: Uppercase, leading www., trailing root dot
  const dirtyUrl2 = 'http://WWW.Ugondu.AirRoofers.EU./admin';
  const cleanHost2 = ProductRegistry.normalizeHostname(dirtyUrl2);
  assert.strictEqual(cleanHost2, 'ugondu.airroofers.eu', 'Must lowercase, strip www. prefix, and strip root dot');

  // Test 4c: Scheme-relative URL
  const dirtyUrl3 = '//deploy.airroofers.eu:8443';
  const cleanHost3 = ProductRegistry.normalizeHostname(dirtyUrl3);
  assert.strictEqual(cleanHost3, 'deploy.airroofers.eu', 'Must strip scheme-relative prefix and port');

  // 5. Cryptographic HMAC-SHA256 Timing-Safe Verification Adversarial Suite
  const secretKey = 'super_secret_corporate_hmac_signing_key_2026';
  const canonicalPayload = JSON.stringify({ product: 'UGONDU', version: '4.0.0', status: 'ACTIVE' });
  const validSignature = crypto.createHmac('sha256', secretKey).update(canonicalPayload).digest('hex');

  // Valid signature check
  assert.strictEqual(
    ProductRegistry.verifyHmacSha256(canonicalPayload, validSignature, secretKey),
    true,
    'Valid HMAC signature must verify successfully'
  );

  // Forged signature check
  const forgedSignature = validSignature.slice(0, -4) + '0000';
  assert.strictEqual(
    ProductRegistry.verifyHmacSha256(canonicalPayload, forgedSignature, secretKey),
    false,
    'Forged signature must be rejected'
  );

  // Truncated signature check
  assert.strictEqual(
    ProductRegistry.verifyHmacSha256(canonicalPayload, 'short_sig', secretKey),
    false,
    'Truncated signature must be rejected'
  );

  // Wrong secret check
  assert.strictEqual(
    ProductRegistry.verifyHmacSha256(canonicalPayload, validSignature, 'wrong_secret_key'),
    false,
    'Incorrect secret must fail HMAC validation'
  );

  // Tampered payload check
  const tamperedPayload = JSON.stringify({ product: 'UGONDU', version: '4.0.0', status: 'COMPROMISED' });
  assert.strictEqual(
    ProductRegistry.verifyHmacSha256(tamperedPayload, validSignature, secretKey),
    false,
    'Tampered payload must fail HMAC validation'
  );

  console.log('✓ All Central Product Registry adversarial and fail-closed tests passed successfully.');
}

runAdversarialTests();
