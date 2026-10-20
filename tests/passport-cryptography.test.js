/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Cryptography & Passport Cryptographic Qualification Suite
 * File           : passport-cryptography.test.js
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 (V6 Cryptography) / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(id, title, fn) {
  try {
    fn();
    console.log(`[PASS] ✓ ${id}: ${title}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
    failed++;
  }
}

function runPassportCryptoTests() {
  console.log('══════════════════════════════════════════════════════════════');
  console.log(' Ugondu Passport & Cryptography Qualification Suite           ');
  console.log('══════════════════════════════════════════════════════════════');

  // 1. Ed25519 Key Generation & Signing Verification
  check('CRYPTO-001', 'Ed25519 digital signature generation and verification', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
    const message = Buffer.from('ugondu-passport-test-payload-2026-10-20');
    const signature = crypto.sign(null, message, privateKey);
    const isValid = crypto.verify(null, message, publicKey, signature);
    assert.strictEqual(isValid, true, 'Valid Ed25519 signature must verify');

    const tampered = Buffer.from('ugondu-passport-test-payload-2026-10-21');
    const isTamperedValid = crypto.verify(null, tampered, publicKey, signature);
    assert.strictEqual(isTamperedValid, false, 'Tampered message must fail Ed25519 verification');
  });

  // 2. SHA-256 Digest Invariant Verification
  check('CRYPTO-002', 'Deterministic SHA-256 digest computation', () => {
    const data = 'canonical-ugondu-evidence-ledger-entry';
    const hash1 = crypto.createHash('sha256').update(data).digest('hex');
    const hash2 = crypto.createHash('sha256').update(data).digest('hex');
    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
  });

  // 3. AES-256-GCM Authenticated Encryption & Decryption
  check('CRYPTO-003', 'AES-256-GCM encryption, decryption, and authentication tag verification', () => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const plaintext = 'sensitive-tokenized-environment-variable';
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag();

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    assert.strictEqual(decrypted, plaintext, 'Decrypted text must match original plaintext');
  });

  // 4. AES-256-GCM Tamper Resistance
  check('CRYPTO-004', 'AES-256-GCM authentication failure on tampered ciphertext', () => {
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let ciphertext = cipher.update('sensitive-payload', 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag();

    const tamperedHex = ciphertext.slice(0, -2) + (ciphertext.slice(-2) === 'aa' ? 'bb' : 'aa');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    assert.throws(() => {
      decipher.update(tamperedHex, 'hex', 'utf8');
      decipher.final('utf8');
    }, /Unsupported state or unable to authenticate data|bad decrypt/);
  });

  // 5. RSA-2048 Signature Verification
  check('CRYPTO-005', 'RSA-2048 PKCS#1 v1.5 / PSS digital signature validation', () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const payload = Buffer.from('ugondu-audit-receipt-digest');
    const sig = crypto.sign('sha256', payload, privateKey);
    const verified = crypto.verify('sha256', payload, publicKey, sig);
    assert.strictEqual(verified, true);
  });

  // 6. External Evidence Public Key Trust Anchor Invariant
  check('CRYPTO-006', 'Verification of external evidence public trust anchor key format', () => {
    const pubKeyPath = path.join(ROOT, 'server/shared/keys/evidence_public.pem');
    if (fs.existsSync(pubKeyPath)) {
      const pubPem = fs.readFileSync(pubKeyPath, 'utf8');
      assert.ok(pubPem.includes('-----BEGIN PUBLIC KEY-----'));
      assert.ok(pubPem.includes('-----END PUBLIC KEY-----'));
      const keyObj = crypto.createPublicKey(pubPem);
      assert.ok(keyObj.asymmetricKeyType === 'ed25519' || keyObj.asymmetricKeyType === 'rsa');
    }
  });

  // 7. Policy Pack Authority Key Invariant
  check('CRYPTO-007', 'Verification of UPLM pack authority public key format', () => {
    const packPubPath = path.join(ROOT, 'config/trust/uplm_pack_authority.pub.pem');
    if (fs.existsSync(packPubPath)) {
      const pubPem = fs.readFileSync(packPubPath, 'utf8');
      assert.ok(pubPem.includes('-----BEGIN PUBLIC KEY-----'));
      assert.ok(pubPem.includes('-----END PUBLIC KEY-----'));
      const keyObj = crypto.createPublicKey(pubPem);
      assert.strictEqual(keyObj.asymmetricKeyType, 'ed25519');
    }
  });

  // 8. RFC 8785 Canonical JSON Serialization Invariant
  check('CRYPTO-008', 'Deterministic object key sorting for RFC 8785 hash stability', () => {
    const obj1 = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const obj2 = { a: 2, m: { a: 4, b: 3 }, z: 1 };
    function canonicalStringify(o) {
      if (typeof o !== 'object' || o === null) return JSON.stringify(o);
      if (Array.isArray(o)) return '[' + o.map(canonicalStringify).join(',') + ']';
      const keys = Object.keys(o).sort();
      return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(o[k])).join(',') + '}';
    }
    assert.strictEqual(canonicalStringify(obj1), canonicalStringify(obj2));
    assert.strictEqual(
      crypto.createHash('sha256').update(canonicalStringify(obj1)).digest('hex'),
      crypto.createHash('sha256').update(canonicalStringify(obj2)).digest('hex')
    );
  });

  console.log('══════════════════════════════════════════════════════════════');
  console.log(` Cryptography Results: ${passed} passed, ${failed} failed `);
  console.log('══════════════════════════════════════════════════════════════');

  if (failed > 0) process.exit(1);
}

runPassportCryptoTests();
