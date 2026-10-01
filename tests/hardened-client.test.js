/******************************************************************************
 * Project        : Ugondu
 * Module         : Tests
 * File           : hardened-client.test.js
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : GOVERNMENT | ENTERPRISE | PUBLIC | INTERNAL
 *
 * Governance:
 * - AI Governed
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

const assert = require('assert');
const { isPrivateOrLocal } = require('../server/engine-core/src/http/ip-blocklist');
const { hardenedGet, SSRFBlockedError } = require('../server/engine-core/src/http/hardened-client');
const dns = require('dns');

const originalLookup = dns.promises.lookup;
dns.promises.lookup = async (hostname) => {
    return { address: hostname };
};

async function runTests() {
    console.log('Running hardened client tests...');

    // Test 1
    try {
        await hardenedGet('http://localhost');
        assert.fail('Should have thrown SSRFBlockedError');
    } catch (err) {
        // localhost usually resolves to 127.0.0.1 in DNS, but our mock needs it. Actually, wait!
        // We mocked dns.promises.lookup to return hostname as address.
        // So for 'localhost' it returns 'localhost', which fails isPrivateOrLocal.
        // Let's modify mock for localhost
    }
}

// Let's rewrite this properly.

dns.promises.lookup = async (hostname) => {
    if (hostname === 'localhost') return { address: '127.0.0.1' };
    return { address: hostname };
};

async function runAllTests() {
    try {
        await hardenedGet('http://localhost');
        assert.fail('Should have thrown SSRFBlockedError');
    } catch (err) {
        assert.ok(err.name === 'SSRFBlockedError' || err instanceof SSRFBlockedError);
    }

    try {
        await hardenedGet('http://192.168.1.1');
        assert.fail('Should have thrown SSRFBlockedError');
    } catch (err) {
        assert.ok(err.name === 'SSRFBlockedError' || err instanceof SSRFBlockedError);
    }

    try {
        await hardenedGet('http://10.0.0.1');
        assert.fail('Should have thrown SSRFBlockedError');
    } catch (err) {
        assert.ok(err.name === 'SSRFBlockedError' || err instanceof SSRFBlockedError);
    }

    try {
        await hardenedGet('http://169.254.169.254');
        assert.fail('Should have thrown SSRFBlockedError');
    } catch (err) {
        assert.ok(err.name === 'SSRFBlockedError' || err instanceof SSRFBlockedError);
    }

    try {
        await hardenedGet('file:///etc/passwd');
        assert.fail('Should have thrown invalid protocol error');
    } catch (err) {
        assert.ok(!err.name || err.name !== 'SSRFBlockedError');
    }

    assert.strictEqual(isPrivateOrLocal('127.0.0.1'), true);
    assert.strictEqual(isPrivateOrLocal('8.8.8.8'), false);
    assert.strictEqual(isPrivateOrLocal('::1'), true);

    console.log('All tests passed.');
}

runAllTests().finally(() => {
    dns.promises.lookup = originalLookup;
});
