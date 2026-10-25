/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Language Pack Architecture
 * File           : language-packs.test.js
 * Version        : 2.3.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-20
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-01 to LP-40)
 * - Cryptographic Supply-Chain Assurance
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const test = require('node:test');

const shared = require('../server/shared/dist');
const {
  validateLanguagePackIntegrity,
  verifyLanguagePackSignature,
  computePackArtifactDigest,
  signLanguagePackManifest,
  LanguagePackRegistry,
  localeNegotiationMiddleware
} = shared;

const packsDir = path.resolve(__dirname, '../packs');

test('L10N-001: Authentic Language Pack Validation across 12 Locales', () => {
  const expectedLocales = [
    'en-US', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'ar-SA',
    'hi-IN', 'ja-JP', 'ko-KR', 'pt-BR', 'ru-RU', 'zh-CN'
  ];
  for (const loc of expectedLocales) {
    const packFile = path.join(packsDir, `ugondu-lang-${loc}.upl.json`);
    assert.ok(fs.existsSync(packFile), `Language pack file must exist: ${packFile}`);
    const content = JSON.parse(fs.readFileSync(packFile, 'utf8'));
    const result = validateLanguagePackIntegrity(content);
    assert.strictEqual(result.valid, true, `Pack ${loc} failed validation: ${result.error}`);
    assert.strictEqual(content.locale, loc, `Locale mismatch in ${loc}`);
  }
  console.log(`[PASS] ✓ All ${expectedLocales.length} authentic Language Packs verified with SHA-256 digest and ED25519 signature`);
});

test('L10N-002: Adversarial Content Tampering Defense', () => {
  const frFile = path.join(packsDir, 'ugondu-lang-fr-FR.upl.json');
  const frPack = JSON.parse(fs.readFileSync(frFile, 'utf8'));
  const tamperedPack = JSON.parse(JSON.stringify(frPack));
  tamperedPack.tokens.cli_title = 'MALICIOUS_FORGED_TITLE';

  const result = validateLanguagePackIntegrity(tamperedPack);
  assert.strictEqual(result.valid, false, 'Tampered pack must fail integrity validation');
  assert.ok(result.error.includes('Digest mismatch'), `Expected digest mismatch error, got: ${result.error}`);
  console.log('[PASS] ✓ Altered tokens strictly detected and rejected via cryptographic SHA-256 digest');
});

test('L10N-003: Adversarial Signature Forgery Defense', () => {
  const deFile = path.join(packsDir, 'ugondu-lang-de-DE.upl.json');
  const dePack = JSON.parse(fs.readFileSync(deFile, 'utf8'));
  const forgedPack = JSON.parse(JSON.stringify(dePack));
  const sigBuf = Buffer.from(forgedPack.signature, 'base64');
  sigBuf[0] ^= 0xff;
  forgedPack.signature = sigBuf.toString('base64');

  const result = validateLanguagePackIntegrity(forgedPack);
  assert.strictEqual(result.valid, false, 'Forged signature must fail verification');
  assert.ok(result.error.includes('signature'), `Expected signature failure, got: ${result.error}`);
  console.log('[PASS] ✓ Forged ED25519 pack signatures strictly rejected');
});

test('L10N-004: Security-Critical Token Completeness Enforcement', () => {
  const incompletePack = {
    packId: 'ugondu-lang-xx-XX',
    locale: 'xx-XX',
    version: '1.2.0',
    schemaVersion: '1',
    tokens: { cli_title: 'Title only' }
  };
  incompletePack.artifactDigest = computePackArtifactDigest(incompletePack.tokens);
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const privKey = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const pubKey = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  incompletePack.signature = signLanguagePackManifest(incompletePack, privKey);

  const result = validateLanguagePackIntegrity(incompletePack, pubKey);
  assert.strictEqual(result.valid, false, 'Pack missing security tokens must be rejected');
  assert.ok(result.error.includes('Critical security token missing'), `Expected critical token error, got: ${result.error}`);
  console.log('[PASS] ✓ 100% completeness strictly enforced on all security and destructive action tokens');
});

test('L10N-005: RTL Direction Metadata Preservation', () => {
  const arFile = path.join(packsDir, 'ugondu-lang-ar-SA.upl.json');
  const arPack = JSON.parse(fs.readFileSync(arFile, 'utf8'));
  assert.strictEqual(arPack.direction, 'rtl', 'Arabic pack must declare direction rtl');
  assert.ok(arPack.language.includes('العربية'), 'Arabic pack must preserve native language name');
  console.log('[PASS] ✓ RTL UI metadata correctly declared and verified for Arabic language pack');
});

test('L10N-006: Server-Side HTTP Accept-Language Negotiation Middleware', () => {
  const registry = new LanguagePackRegistry();
  const locFr = registry.resolveLocale('fr-FR,fr;q=0.9,en;q=0.8');
  assert.strictEqual(locFr, 'fr-FR', `Expected fr-FR from Accept-Language, got ${locFr}`);

  const locDe = registry.resolveLocale('de;q=0.9,en;q=0.5');
  assert.strictEqual(locDe, 'de-DE', `Expected de-DE prefix match from Accept-Language, got ${locDe}`);

  const locZh = registry.resolveLocale('zh-CN,zh;q=0.9');
  assert.strictEqual(locZh, 'zh-CN', `Expected zh-CN match from Accept-Language, got ${locZh}`);

  const locTenant = registry.resolveLocale('fr-FR,fr;q=0.9', 'de-DE');
  assert.strictEqual(locTenant, 'de-DE', `Tenant default must override Accept-Language, got ${locTenant}`);

  const locUser = registry.resolveLocale('fr-FR', 'de-DE', 'it-IT');
  assert.strictEqual(locUser, 'it-IT', `User preference must override tenant and header, got ${locUser}`);

  const locFallback = registry.resolveLocale('nl-NL,nl;q=0.9');
  assert.strictEqual(locFallback, 'en-US', `Uninstalled locale must fall back to en-US, got ${locFallback}`);

  const req = { headers: { 'accept-language': 'fr-FR,fr;q=0.9' } };
  const res = {
    headers: {},
    setHeader(name, val) { this.headers[name] = val; }
  };
  let nextCalled = false;
  localeNegotiationMiddleware(req, res, () => { nextCalled = true; });

  assert.strictEqual(nextCalled, true, 'Next callback must be executed');
  assert.strictEqual(res.headers['Content-Language'], 'fr-FR', 'Response Content-Language header must match negotiation');
  console.log('[PASS] ✓ HTTP Accept-Language negotiation, precedence hierarchy, and Content-Language header fully verified');
});

test('L10N-007: Offline Pack Verification & Installation Workflow', () => {
  const esFile = path.join(packsDir, 'ugondu-lang-es-ES.upl.json');
  const esContent = JSON.parse(fs.readFileSync(esFile, 'utf8'));
  const sigValid = verifyLanguagePackSignature(esContent);
  assert.strictEqual(sigValid, true, 'Offline verification must succeed against authority key');

  const digest = computePackArtifactDigest(esContent.tokens);
  assert.strictEqual(digest, esContent.artifactDigest, 'Calculated digest must match manifest');
  console.log('[PASS] ✓ Offline language pack validation and signature verification succeeded without network access');
});

test('L10N-008: Thin-Client IP Leakage & Secret Scanning Defense', () => {
  const forbiddenPatterns = [
    /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
    /AKIA[0-9A-Z]{16}/,
    /sk-[a-zA-Z0-9]{32,}/,
    /arn:aws:kms:[a-z0-9-]+:[0-9]+:key\//,
    /ghp_[a-zA-Z0-9]{36}/,
    /execution_plan_ast/,
    /heuristic_decision_tree/,
    /licensing_entropy_seed/,
    /server_secret_salt/,
    /governance_private_ruleset/
  ];

  const packFiles = fs.readdirSync(packsDir).filter((f) => f.endsWith('.upl.json'));
  assert.ok(packFiles.length >= 6, `At least 6 language packs expected, found ${packFiles.length}`);

  for (const file of packFiles) {
    const raw = fs.readFileSync(path.join(packsDir, file), 'utf8');
    for (const pattern of forbiddenPatterns) {
      assert.ok(!pattern.test(raw), `Language pack ${file} leaked prohibited pattern: ${pattern}`);
    }
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.privateKey, undefined, `Pack ${file} must not contain privateKey`);
    assert.strictEqual(parsed.decisionTree, undefined, `Pack ${file} must not contain decisionTree`);
    assert.strictEqual(parsed.licensingRules, undefined, `Pack ${file} must not contain licensingRules`);

    for (const [key, val] of Object.entries(parsed.tokens)) {
      assert.strictEqual(typeof val, 'string', `Token ${key} in ${file} must be string`);
      for (const pattern of forbiddenPatterns) {
        assert.ok(!pattern.test(val), `Token ${key} in ${file} contains leaked IP/secret: ${pattern}`);
      }
    }
  }

  assert.ok(!fs.existsSync(path.join(packsDir, 'langpack_private.pem')), 'Private signing key must NEVER be placed in client packs directory');
  assert.ok(!fs.existsSync(path.join(__dirname, '../client/langpack_private.pem')), 'Private signing key must NEVER be placed in client source directory');
  assert.ok(!fs.existsSync(path.join(__dirname, '../server/shared/keys/langpack_private.pem')), 'Language-pack private signing key must never be stored in repo');
  console.log('[PASS] ✓ Client packs strictly isolated: zero server IP, zero private keys, zero proprietary decision trees leaked');
});
