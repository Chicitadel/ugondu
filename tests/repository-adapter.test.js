/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration
 * File           : repository-adapter.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Classification : COMMERCIAL | INTERNAL
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');

function post(port, path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost', port, path, method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
        };
        const req = http.request(options, (res) => {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(responseBody) }); }
                catch { resolve({ status: res.statusCode, body: responseBody }); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function get(port, path) {
    return new Promise((resolve, reject) => {
        const req = http.get({ hostname: 'localhost', port, path }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
                catch { resolve({ status: res.statusCode, body }); }
            });
        });
        req.on('error', reject);
    });
}

const ADAPTER_PORT = parseInt(process.env.ADAPTER_PORT || '4005');
let passed = 0;
let failed = 0;

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Integration Test Suite — Repository Adapter');
    console.log('[en] ══════════════════════════════════════════════════════');

    const testCases = [
        { url: 'https://github.com/example/repo', expected: 'github', tokenEnv: 'UGONDU_GITHUB_TOKEN' },
        { url: 'https://gitlab.com/example/repo', expected: 'gitlab', tokenEnv: 'UGONDU_GITLAB_TOKEN' },
        { url: 'https://bitbucket.org/example/repo', expected: 'bitbucket', tokenEnv: 'UGONDU_BITBUCKET_TOKEN' },
        { url: 'git@github.com:example/repo.git', expected: 'github', tokenEnv: 'UGONDU_GITHUB_TOKEN' },
        { url: 'git@gitlab.com:example/repo.git', expected: 'gitlab', tokenEnv: 'UGONDU_GITLAB_TOKEN' },
        { url: 'https://dev.azure.com/org/project/_git/repo', expected: 'azure-devops', tokenEnv: 'UGONDU_AZURE_DEVOPS_TOKEN' },
        { url: 'https://mygitea.example.com/user/repo', expected: 'gitea', tokenEnv: 'UGONDU_GITEA_TOKEN' },
        { url: 'https://example.com/repo.git', expected: 'generic-https', tokenEnv: 'UGONDU_GIT_TOKEN' },
    ];

    for (const tc of testCases) {
        try {
            const r = await post(ADAPTER_PORT, '/v1/repository/resolve', { repositoryUrl: tc.url });
            assert.strictEqual(r.status, 200, `[en] Expected 200, got ${r.status}`);
            assert.strictEqual(r.body.metadata.provider, tc.expected,
                `[en] URL '${tc.url}' expected provider '${tc.expected}', got '${r.body.metadata.provider}'`);
            assert.strictEqual(r.body.metadata.credentialEnvKey, tc.tokenEnv,
                `[en] Expected credentialEnvKey '${tc.tokenEnv}', got '${r.body.metadata.credentialEnvKey}'`);
            console.log(`[en] ✓ PASS: ${tc.url} → ${tc.expected}`);
            passed++;
        } catch (e) {
            console.error(`[en] ✗ FAIL: ${tc.url} —`, e.message);
            failed++;
        }
    }

    // [en] Test: SSH URL normalization to HTTPS
    try {
        const r = await post(ADAPTER_PORT, '/v1/repository/resolve', {
            repositoryUrl: 'git@github.com:example/repo.git'
        });
        assert.strictEqual(r.status, 200);
        assert.ok(r.body.metadata.cloneUrl.startsWith('https://'),
            `[en] Expected cloneUrl to be normalized to HTTPS, got: ${r.body.metadata.cloneUrl}`);
        console.log(`[en] ✓ PASS: SSH URL normalized to HTTPS: ${r.body.metadata.cloneUrl}`);
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: SSH URL normalization —', e.message);
        failed++;
    }

    // [en] Test: Missing URL returns 400
    try {
        const r = await post(ADAPTER_PORT, '/v1/repository/resolve', {});
        assert.strictEqual(r.status, 400, `[en] Expected 400 for missing URL, got ${r.status}`);
        console.log('[en] ✓ PASS: Missing URL returns 400');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Missing URL 400 test —', e.message);
        failed++;
    }

    // [en] Test: GET /providers returns list
    try {
        const r = await get(ADAPTER_PORT, '/v1/repository/providers');
        assert.strictEqual(r.status, 200);
        assert.ok(Array.isArray(r.body.providers));
        assert.ok(r.body.providers.length >= 7, '[en] Expected at least 7 providers');
        console.log(`[en] ✓ PASS: Provider list returns ${r.body.providers.length} providers`);
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Provider listing —', e.message);
        failed++;
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    process.exit(1);
});
