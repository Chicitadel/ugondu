/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Language Pack Architecture
 * File           : language-packs.test.js
 * Version        : 2.2.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-01 to LP-40)
 * - Cryptographic Supply-Chain Assurance
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

let passed = 0;
let failed = 0;

function reportPass(name) {
    console.log(`[PASS] ✓ ${name}`);
    passed++;
}

function reportFail(name, err) {
    console.error(`[FAIL] ✗ ${name}:`, err.message || err);
    failed++;
}

async function runLanguagePackTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' Ugondu STREAM AA: Universal Language Pack & Locale Fabric   ');
    console.log(' Standards: ED25519 Signed Packs, Precedence Engine, RTL, SSRF');
    console.log('══════════════════════════════════════════════════════════════\n');

    const shared = require('../server/shared/dist');
    const {
        validateLanguagePackIntegrity,
        verifyLanguagePackSignature,
        computePackArtifactDigest,
        LanguagePackRegistry,
        localeNegotiationMiddleware
    } = shared;

    const packsDir = path.resolve(__dirname, '../packs');

    // Test 1: Validate authentic language packs across all standard languages
    console.log('[Test 1] Authentic Language Pack Validation');
    try {
        const expectedLocales = ['en-US', 'fr-FR', 'de-DE', 'es-ES', 'it-IT', 'ar-SA'];
        for (const loc of expectedLocales) {
            const packFile = path.join(packsDir, `ugondu-lang-${loc}.upl.json`);
            assert.ok(fs.existsSync(packFile), `Language pack file must exist: ${packFile}`);

            const content = JSON.parse(fs.readFileSync(packFile, 'utf8'));
            const result = validateLanguagePackIntegrity(content);
            assert.strictEqual(result.valid, true, `Pack ${loc} failed validation: ${result.error}`);
            assert.strictEqual(content.locale, loc, `Locale mismatch in ${loc}`);
        }
        reportPass(`All ${expectedLocales.length} authentic Language Packs verified with SHA-256 digest and ED25519 signature`);
    } catch (e) {
        reportFail('Authentic Language Pack validation', e);
    }

    // Test 2: Adversarial Tampering — altered token must fail digest verification
    console.log('\n[Test 2] Adversarial Content Tampering Defense');
    try {
        const frFile = path.join(packsDir, 'ugondu-lang-fr-FR.upl.json');
        const frPack = JSON.parse(fs.readFileSync(frFile, 'utf8'));

        // Tamper with a token
        const tamperedPack = JSON.parse(JSON.stringify(frPack));
        tamperedPack.tokens.cli_title = 'MALICIOUS_FORGED_TITLE';

        const result = validateLanguagePackIntegrity(tamperedPack);
        assert.strictEqual(result.valid, false, 'Tampered pack must fail integrity validation');
        assert.ok(result.error.includes('Digest mismatch'), `Expected digest mismatch error, got: ${result.error}`);
        reportPass('Altered tokens strictly detected and rejected via cryptographic SHA-256 digest');
    } catch (e) {
        reportFail('Adversarial content tampering defense', e);
    }

    // Test 3: Adversarial Signature Forgery — altered signature must fail ED25519 verification
    console.log('\n[Test 3] Adversarial Signature Forgery Defense');
    try {
        const deFile = path.join(packsDir, 'ugondu-lang-de-DE.upl.json');
        const dePack = JSON.parse(fs.readFileSync(deFile, 'utf8'));

        const forgedPack = JSON.parse(JSON.stringify(dePack));
        // Corrupt signature
        const sigBuf = Buffer.from(forgedPack.signature, 'base64');
        sigBuf[0] ^= 0xff;
        forgedPack.signature = sigBuf.toString('base64');

        const result = validateLanguagePackIntegrity(forgedPack);
        assert.strictEqual(result.valid, false, 'Forged signature must fail verification');
        assert.ok(result.error.includes('signature'), `Expected signature failure, got: ${result.error}`);
        reportPass('Forged ED25519 pack signatures strictly rejected');
    } catch (e) {
        reportFail('Adversarial signature forgery defense', e);
    }

    // Test 4: Critical Token Completeness Requirement (LP-13, LP-14)
    console.log('\n[Test 4] Security-Critical Token Completeness Enforcement');
    try {
        const incompletePack = {
            packId: 'ugondu-lang-xx-XX',
            locale: 'xx-XX',
            version: '1.2.0',
            schemaVersion: '1',
            tokens: {
                cli_title: 'Title only'
                // Missing auth_missing, prompt_destructive, etc.
            }
        };
        incompletePack.artifactDigest = computePackArtifactDigest(incompletePack.tokens);

        // Sign with authority key so signature check passes, allowing completeness check to execute
        const privKey = fs.readFileSync(path.join(__dirname, '../server/shared/keys/langpack_private.pem'), 'utf8');
        const payload = `${incompletePack.packId}:${incompletePack.locale}:${incompletePack.version}:${incompletePack.artifactDigest}`;
        incompletePack.signature = crypto.sign(null, Buffer.from(payload, 'utf8'), privKey).toString('base64');

        const result = validateLanguagePackIntegrity(incompletePack);
        assert.strictEqual(result.valid, false, 'Pack missing security tokens must be rejected');
        assert.ok(result.error.includes('Critical security token missing'), `Expected critical token error, got: ${result.error}`);
        reportPass('100% completeness strictly enforced on all security and destructive action tokens');
    } catch (e) {
        reportFail('Security token completeness enforcement', e);
    }

    // Test 5: RTL Metadata Preservation (LP-21)
    console.log('\n[Test 5] RTL Direction Metadata Preservation');
    try {
        const arFile = path.join(packsDir, 'ugondu-lang-ar-SA.upl.json');
        const arPack = JSON.parse(fs.readFileSync(arFile, 'utf8'));
        assert.strictEqual(arPack.direction, 'rtl', 'Arabic pack must declare direction rtl');
        assert.ok(arPack.language.includes('العربية'), 'Arabic pack must preserve native language name');
        reportPass('RTL UI metadata correctly declared and verified for Arabic language pack');
    } catch (e) {
        reportFail('RTL metadata preservation', e);
    }

    // Test 6: Server-Side HTTP Locale Negotiation (LP-08)
    console.log('\n[Test 6] Server-Side HTTP Accept-Language Negotiation Middleware');
    try {
        const registry = new LanguagePackRegistry();

        // 1. Accept-Language header negotiation
        const locFr = registry.resolveLocale('fr-FR,fr;q=0.9,en;q=0.8');
        assert.strictEqual(locFr, 'fr-FR', `Expected fr-FR from Accept-Language, got ${locFr}`);

        const locDe = registry.resolveLocale('de;q=0.9,en;q=0.5');
        assert.strictEqual(locDe, 'de-DE', `Expected de-DE prefix match from Accept-Language, got ${locDe}`);

        // 2. Tenant policy precedence over Accept-Language
        const locTenant = registry.resolveLocale('fr-FR,fr;q=0.9', 'de-DE');
        assert.strictEqual(locTenant, 'de-DE', `Tenant default must override Accept-Language, got ${locTenant}`);

        // 3. User preference precedence over Tenant and Accept-Language
        const locUser = registry.resolveLocale('fr-FR', 'de-DE', 'it-IT');
        assert.strictEqual(locUser, 'it-IT', `User preference must override tenant and header, got ${locUser}`);

        // 4. Fallback to en-US for uninstalled locale
        const locFallback = registry.resolveLocale('zh-CN,zh;q=0.9');
        assert.strictEqual(locFallback, 'en-US', `Uninstalled locale must fall back to en-US, got ${locFallback}`);

        // 5. Express Middleware Execution Test
        const req = {
            headers: { 'accept-language': 'fr-FR,fr;q=0.9' }
        };
        const res = {
            headers: {},
            setHeader(name, val) { this.headers[name] = val; }
        };
        let nextCalled = false;
        localeNegotiationMiddleware(req, res, () => { nextCalled = true; });

        assert.strictEqual(nextCalled, true, 'Next callback must be executed');
        assert.strictEqual(res.headers['Content-Language'], 'fr-FR', 'Response Content-Language header must match negotiation');

        reportPass('HTTP Accept-Language negotiation, precedence hierarchy, and Content-Language header fully verified');
    } catch (e) {
        reportFail('Server-side locale negotiation test', e);
    }

    // Test 7: Offline Language Pack Discovery & Verification
    console.log('\n[Test 7] Offline Pack Verification & Installation Workflow');
    try {
        const esFile = path.join(packsDir, 'ugondu-lang-es-ES.upl.json');
        const esContent = JSON.parse(fs.readFileSync(esFile, 'utf8'));

        // Verify pack signature against authority public key directly
        const sigValid = verifyLanguagePackSignature(esContent);
        assert.strictEqual(sigValid, true, 'Offline verification must succeed against authority key');

        // Verify digest recalculation parity
        const digest = computePackArtifactDigest(esContent.tokens);
        assert.strictEqual(digest, esContent.artifactDigest, 'Calculated digest must match manifest');

        reportPass('Offline language pack validation and signature verification succeeded without network access');
    } catch (e) {
        reportFail('Offline pack verification workflow', e);
    }

    // Test 8: Thin-Client IP Leakage & Secret Scanning Defense (AA41-AA54)
    console.log('\n[Test 8] Thin-Client IP Leakage & Secret Scanning Defense (AA41-AA54)');
    try {
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

        // 1. Audit all published client language packs in packs/
        const packFiles = fs.readdirSync(packsDir).filter(f => f.endsWith('.upl.json'));
        assert.ok(packFiles.length >= 6, `At least 6 language packs expected, found ${packFiles.length}`);

        for (const file of packFiles) {
            const raw = fs.readFileSync(path.join(packsDir, file), 'utf8');
            for (const pattern of forbiddenPatterns) {
                assert.ok(
                    !pattern.test(raw),
                    `Language pack ${file} leaked prohibited server secret or IP pattern: ${pattern}`
                );
            }

            const parsed = JSON.parse(raw);
            assert.strictEqual(parsed.privateKey, undefined, `Pack ${file} must not contain privateKey`);
            assert.strictEqual(parsed.decisionTree, undefined, `Pack ${file} must not contain decisionTree`);
            assert.strictEqual(parsed.licensingRules, undefined, `Pack ${file} must not contain licensingRules`);

            // Verify tokens contain strictly presentation text
            for (const [key, val] of Object.entries(parsed.tokens)) {
                assert.strictEqual(typeof val, 'string', `Token ${key} in ${file} must be string`);
                for (const pattern of forbiddenPatterns) {
                    assert.ok(
                        !pattern.test(val),
                        `Token ${key} in ${file} contains leaked IP/secret: ${pattern}`
                    );
                }
            }
        }

        // 2. Verify server private authority key is quarantined and NOT in packs/ or client/
        assert.ok(
            !fs.existsSync(path.join(packsDir, 'langpack_private.pem')),
            'Private signing key must NEVER be placed in client packs directory'
        );
        assert.ok(
            !fs.existsSync(path.join(__dirname, '../client/langpack_private.pem')),
            'Private signing key must NEVER be placed in client source directory'
        );

        // 3. Verify server private key exists strictly in secure server authority vault
        const serverKeyPath = path.join(__dirname, '../server/shared/keys/langpack_private.pem');
        assert.ok(fs.existsSync(serverKeyPath), 'Server authority private key must exist in server/shared/keys/');

        reportPass('Client packs strictly isolated: zero server IP, zero private keys, zero proprietary decision trees leaked');
    } catch (e) {
        reportFail('Thin-client IP leakage and secret scanning defense', e);
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(` Language Pack Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runLanguagePackTests().catch(err => {
    console.error('Fatal Language Pack test error:', err);
    process.exit(1);
});
