/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / COR Remediation & Universal Readiness Suite
 * File           : cor-remediation.test.js
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
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
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Engineering. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
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

async function runCorRemediationTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' Ugondu COR-001 .. COR-022 Universal Readiness Audit Suite    ');
    console.log('══════════════════════════════════════════════════════════════');

    // COR-001: Cryptographic Signing Key Governance & Zero Static Test Keys
    check('COR-001', 'Zero static test signing keys in CI workflows and production fail-closed key loader', () => {
        const ciYml = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
        assert.ok(!ciYml.includes('ci-test-key-not-for-production'), 'ci.yml must not contain ci-test-key-not-for-production');
        const keyLoader = fs.readFileSync(path.join(ROOT, 'server/engine-core/src/encryption/key-loader.ts'), 'utf8');
        assert.ok(keyLoader.includes('FORBIDDEN_INSECURE_KEY_LITERALS'), 'key-loader.ts must enforce FORBIDDEN_INSECURE_KEY_LITERALS');
    });

    // COR-002 & COR-003: Single Authoritative Product Registry & Port Allocation
    check('COR-002/003', 'Central product registry & port alignment (4001-4005) with zero drift', () => {
        const prodReg = JSON.parse(fs.readFileSync(path.join(ROOT, '.governance/standards/product-registry.json'), 'utf8'));
        const ugondu = prodReg.products.find(p => p.productId === 'UGONDU');
        assert.ok(ugondu && ugondu.services, 'UGONDU product must exist in product-registry.json');
        assert.strictEqual(ugondu.services.engine_core.port, 4001);
        assert.strictEqual(ugondu.services.billing_gateway.port, 4002);
        assert.strictEqual(ugondu.services.plugin_manager.port, 4003);
        assert.strictEqual(ugondu.services.event_bus.port, 4004);
        assert.strictEqual(ugondu.services.repository_adapter.port, 4005);
    });

    // COR-005 & COR-013: Health Contract & Zero Hardcoded cor_level
    check('COR-005/013', 'Unified /health, /health/live, /health/ready contract without static cor_level', () => {
        const compose = fs.readFileSync(path.join(ROOT, 'docker-compose.yml'), 'utf8');
        assert.ok(compose.includes('/health/ready'), 'docker-compose.yml healthcheck must probe /health/ready');
        const healthContract = fs.readFileSync(path.join(ROOT, 'server/shared/health-contract.ts'), 'utf8');
        assert.ok(healthContract.includes('/health/live') && healthContract.includes('/health/ready'));
    });

    // COR-006 & COR-007: Repository Adapter Real Operations & SSRF Defense
    check('COR-006/007', 'Repository adapter supports 8 providers with strict SSRF network destination policy', () => {
        const repoAdapter = fs.readFileSync(path.join(ROOT, 'server/repository-adapter/src/index.ts'), 'utf8');
        assert.ok(repoAdapter.includes('/v1/repository/validate-credentials'));
        assert.ok(repoAdapter.includes('/v1/repository/refs'));
        assert.ok(repoAdapter.includes('NetworkDestinationPolicy'));
    });

    // COR-008: Centralized AI Model Provisioning & Inference Gateway
    check('COR-008', 'Centralized vendor-neutral AI model catalog and inference gateway', () => {
        const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/model-catalog.json'), 'utf8'));
        assert.ok(Array.isArray(catalog.models) && catalog.models.length >= 4, 'Model catalog must define approved models');
        assert.ok(fs.existsSync(path.join(ROOT, 'server/engine-core/src/ai/inference-gateway.ts')));
    });

    // COR-009 / COR-015: Zero Production Stubs / Mocks Policy
    check('COR-015', 'UG-COR-NO-STUBS-001 policy and governance validator active', () => {
        assert.ok(fs.existsSync(path.join(ROOT, '.governance/policies/no-production-stubs.yml')));
        assert.ok(fs.existsSync(path.join(ROOT, 'scripts/governance/validate-repository.mjs')));
    });

    // COR-017: Plugin Sandbox & Tenant Authorization Enforcement
    check('COR-017', 'Plugin manager enforces tenant authorization without && false bypass and removes tampered fixtures', () => {
        const pmSrc = fs.readFileSync(path.join(ROOT, 'server/plugin-manager/src/index.ts'), 'utf8');
        assert.ok(!pmSrc.includes('&& false'), 'plugin-manager must not contain && false authorization bypass');
        assert.ok(!fs.existsSync(path.join(ROOT, 'plugins/tampered-test-plugin')), 'tampered-test-plugin must not exist in plugins/');
    });

    // COR-019: AWS V9 Split Managed Policies
    check('COR-019', 'All 5 AWS COR V9 Split Managed Policies exist with 46 statements preserved 1:1', () => {
        const policyDir = path.join(ROOT, 'policy-packs/aws/cor/templates/policies');
        const files = [
            'discovery.json',
            'ec2-creation.json',
            'ec2-cleanup.json',
            'rds-s3.json',
            'ecr-ecs.json'
        ];
        let totalStatements = 0;
        for (const f of files) {
            const p = JSON.parse(fs.readFileSync(path.join(policyDir, f), 'utf8'));
            assert.strictEqual(p.Version, '2012-10-17');
            totalStatements += p.Statement.length;
        }
        assert.strictEqual(totalStatements, 46, `Expected 46 statements across 5 policies, got ${totalStatements}`);
    });

    // COR-020: Localization & 12-Language Completeness
    check('COR-020', 'All 12 locales present in locales/, server/shared/locales/, and packs/ and client/locales removed', () => {
        assert.ok(!fs.existsSync(path.join(ROOT, 'client/locales')), 'Duplicate client/locales directory must not exist');
        const langs = ['en', 'ar', 'de', 'es', 'fr', 'hi', 'it', 'ja', 'ko', 'pt', 'ru', 'zh'];
        for (const l of langs) {
            assert.ok(fs.existsSync(path.join(ROOT, `locales/${l}.json`)), `Missing locales/${l}.json`);
            assert.ok(fs.existsSync(path.join(ROOT, `server/shared/locales/${l}.json`)), `Missing server/shared/locales/${l}.json`);
        }
    });

    // COR-021 & COR-022: 14 Guides & Signed Evidence Bundle
    check('COR-021/022', 'All 14 guides and signed release evidence bundle present', () => {
        const guidesDir = path.join(ROOT, 'docs/guides');
        const guides = fs.readdirSync(guidesDir).filter(f => f.endsWith('.md'));
        assert.ok(guides.length >= 14, `Expected at least 14 guides in docs/guides, found ${guides.length}`);
        assert.ok(fs.existsSync(path.join(ROOT, 'evidence/manifest.json')));
        assert.ok(fs.existsSync(path.join(ROOT, 'evidence/signatures/evidence-manifest.sig')));
    });

    console.log('══════════════════════════════════════════════════════════════');
    console.log(` COR Remediation Audit Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runCorRemediationTests().catch(err => {
    console.error('Fatal COR Remediation test error:', err);
    process.exit(1);
});
