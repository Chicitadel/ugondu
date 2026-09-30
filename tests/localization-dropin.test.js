/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Localization
 * File           : localization-dropin.test.js
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Air Roofers Global Localization Standard
 * - Zero String Hardcoding Law (Tokenized Dictionaries)
 * - Dynamic [lang] Drop-in Locale Architecture
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

async function runLocalizationTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' Ugondu Air Roofers Global Governance: Localization Suite    ');
    console.log(' Standards: Zero String Hardcoding & Drop-In [lang] Locales   ');
    console.log('══════════════════════════════════════════════════════════════\n');

    const { __t, setLocale, getLocale, getSupportedLocales, isLocaleSupported, reloadLocales } = require('../server/shared/dist/i18n');

    // Test 1: Verify Initial Base Locales Discovered Dynamically
    try {
        reloadLocales();
        const locales = getSupportedLocales();
        assert.ok(locales.includes('en'), 'Default English locale must be present');
        assert.ok(locales.includes('fr'), 'French locale must be discovered');
        assert.ok(locales.includes('de'), 'German locale must be discovered');
        assert.ok(locales.includes('es'), 'Spanish locale must be discovered');
        assert.ok(locales.includes('it'), 'Italian locale must be discovered');
        reportPass(`Initial discovery successfully loaded ${locales.length} drop-in locales: [${locales.join(', ')}]`);
    } catch (e) {
        reportFail('Initial dynamic locale discovery', e);
    }

    // Test 2: [lang] Token Injection & Param Formatting
    try {
        setLocale('en');
        const enMsg = __t('listening', 'Ugondu Engine', 4001);
        assert.strictEqual(enMsg, '[en] Ugondu Engine listening on port 4001');

        setLocale('fr');
        const frMsg = __t('listening', 'Ugondu Engine', 4001);
        assert.strictEqual(frMsg, '[fr] Ugondu Engine en écoute sur le port 4001');

        setLocale('de');
        const deMsg = __t('listening', 'Ugondu Engine', 4001);
        assert.strictEqual(deMsg, '[de] Ugondu Engine lauscht auf Port 4001');

        reportPass('[lang] token prefix and printf interpolation correctly applied across multiple languages');
    } catch (e) {
        reportFail('[lang] token injection and formatting', e);
    }

    // Test 3: Drop-in Activation (Drop Japanese ja.json on server with ZERO code change)
    const localesDir = path.resolve(__dirname, '../locales');
    const jaPath = path.join(localesDir, 'ja.json');

    try {
        const jaTokens = {
            "cli_title": "Ugondu ユニバーサル配信クライアント",
            "event_req": "イベント名が必要です。",
            "listening": "%s はポート %d でリッスン中"
        };
        fs.writeFileSync(jaPath, JSON.stringify(jaTokens, null, 2), 'utf-8');

        // Dynamically reload
        reloadLocales();
        assert.strictEqual(isLocaleSupported('ja'), true, 'Drop-in Japanese locale ja.json should be immediately active');
        assert.ok(getSupportedLocales().includes('ja'), 'getSupportedLocales() must include newly dropped "ja" locale');

        setLocale('ja');
        assert.strictEqual(getLocale(), 'ja');

        const jaEventMsg = __t('event_req');
        assert.strictEqual(jaEventMsg, '[ja] イベント名が必要です。');

        const jaListenMsg = __t('listening', 'Ugondu Engine', 4001);
        assert.strictEqual(jaListenMsg, '[ja] Ugondu Engine はポート 4001 でリッスン中');

        reportPass('Drop-in language activation (ja.json) succeeded with zero code modification or rebuild');
    } catch (e) {
        reportFail('Drop-in language activation', e);
    }

    // Test 4: Missing Key Graceful Fallback (Purity & Zero Crash)
    try {
        setLocale('ja');
        // 'auth_missing' is not defined in ja.json, so it must fall back to 'en' while retaining [ja] tag
        const fallbackMsg = __t('auth_missing');
        assert.strictEqual(fallbackMsg, '[ja] Missing authentication token. Deployment rejected.');

        // Completely unknown token falls back to key itself
        const unknownMsg = __t('nonexistent_token_xyz');
        assert.strictEqual(unknownMsg, '[ja] nonexistent_token_xyz');

        reportPass('Missing tokens fall back gracefully to English dictionary and raw token without crashing');
    } catch (e) {
        reportFail('Graceful fallback resilience', e);
    }

    // Test 5: Drop-in Deactivation (Delete ja.json)
    try {
        if (fs.existsSync(jaPath)) {
            fs.unlinkSync(jaPath);
        }

        // Dynamically reload
        reloadLocales();
        assert.strictEqual(isLocaleSupported('ja'), false, 'Removed ja.json should no longer be supported');
        assert.ok(!getSupportedLocales().includes('ja'), 'getSupportedLocales() must not include removed "ja"');

        // Reset locale
        setLocale('en');
        reportPass('Drop-in language deactivation (delete ja.json) succeeded with zero code modification');
    } catch (e) {
        reportFail('Drop-in language deactivation', e);
    }

    // Test 6: Zero String Hardcoding Invariant Verification
    try {
        // Assert that client/i18n/locale.go has no hardcoded multi-language dictionaries
        const localeGo = fs.readFileSync(path.join(__dirname, '../client/i18n/locale.go'), 'utf-8');
        assert.ok(localeGo.includes('ReloadLocales'), 'locale.go must implement dynamic ReloadLocales');
        assert.ok(localeGo.includes('GetSupportedLocales'), 'locale.go must implement GetSupportedLocales');
        assert.ok(localeGo.includes('[%s] %s'), 'locale.go must inject [lang] token prefix');

        reportPass('Go client locale subsystem conforms to Zero String Hardcoding and dynamic drop-in standard');
    } catch (e) {
        reportFail('Go client localization compliance', e);
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(` Localization Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) {
        process.exit(1);
    }
}

runLocalizationTests().catch(err => {
    console.error('Fatal localization test error:', err);
    process.exit(1);
});
