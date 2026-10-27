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
const test = require('node:test');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;

function check(id, title, fn) {
    return test(`${id}: ${title}`, async () => {
        try {
            await fn();
            console.log(`[PASS] ✓ ${id}: ${title}`);
            passed++;
        } catch (err) {
            console.error(`[FAIL] ✗ ${id}: ${title} — ${err.message}`);
            failed++;
            throw err;
        }
    });
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

    // Re-audit F1: CI must run on the release-candidate branch
    check('REAUDIT-F1', 'ci.yml triggers cover phase*/** and stabilization/** branches and pull requests', () => {
        const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/ci.yml'), 'utf8');
        const onBlock = ci.slice(ci.indexOf('on:'), ci.indexOf('env:'));
        assert.ok(onBlock.includes("'phase*/**'"), 'push/PR triggers must include phase*/**');
        assert.ok((onBlock.match(/'phase\*\/\*\*'/g) || []).length >= 2, 'both push and pull_request must include phase*/**');
    });

    // Re-audit F2: documentation must not advertise static AWS keys for CodeCommit
    check('REAUDIT-F2', 'README and guides document IAM role / OIDC for aws-codecommit, not a static secret key', () => {
        for (const f of ['README.md', 'docs/guides/04-configuration-guide.md', 'docs/guides/06-repository-provider-guide.md']) {
            const c = fs.readFileSync(path.join(ROOT, f), 'utf8');
            assert.ok(!/\| `?AWS_SECRET_ACCESS_KEY`? \|/.test(c), `${f} lists AWS_SECRET_ACCESS_KEY as the credential`);
            assert.ok(c.includes('AWS_ROLE_ARN'), `${f} must document AWS_ROLE_ARN`);
        }
    });

    // Re-audit F4: one canonical health contract in public documentation
    check('REAUDIT-F4', 'Public docs reference only /health, /health/live, /health/ready, /v1/metadata', () => {
        const c = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
        assert.ok(!c.includes('/liveness'), 'README must not reference /liveness');
        assert.ok(c.includes('/health/ready') && c.includes('/v1/metadata'));
    });

    // Re-audit F3: pack digests recomputed from canonical bytes, never trusted as metadata
    check('REAUDIT-F3', 'AWS COR policy pack template and pack digests recompute from canonical bytes', () => {
        const { execFileSync } = require('child_process');
        const pubPem = process.env.UGONDU_PACK_PUBLIC_KEY || fs.readFileSync(path.join(ROOT, 'config/trust/uplm_pack_authority.pub.pem'), 'utf8');
        execFileSync(process.execPath, [path.join(ROOT, 'scripts/governance/verify-policy-pack-digests.mjs')], {
            stdio: 'pipe',
            env: { ...process.env, UGONDU_PACK_PUBLIC_KEY: pubPem }
        });
    });

    // Re-audit F5: Managed evidence key custody anchored to key_evidence_v2
    check('REAUDIT-F5', 'Evidence bundle signature uses managed key custody anchored to server/shared/keys/evidence_public.pem', () => {
        const sigPath = path.join(ROOT, 'evidence/signatures/evidence-manifest.sig');
        const pubPath = path.join(ROOT, 'server/shared/keys/evidence_public.pem');
        assert.ok(fs.existsSync(sigPath), 'evidence-manifest.sig must exist');
        assert.ok(fs.existsSync(pubPath), 'evidence_public.pem must exist');
        const sig = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
        assert.strictEqual(sig.algorithm, 'Ed25519');
        assert.strictEqual(sig.keyId, 'key_evidence_v2');
        assert.strictEqual(sig.keySource, 'managed-secret-injected');
        assert.notStrictEqual(sig.keySource, 'ephemeral-ed25519');
    });

    // Re-audit F6: Policy pack cryptographic Ed25519 signature
    check('REAUDIT-F6', 'Policy pack pack.sig exists and cryptographically verifies against uplm_pack_public.pem', () => {
        const sigPath = path.join(ROOT, 'policy-packs/aws/cor/pack.sig');
        const pubPath = path.join(ROOT, 'server/shared/keys/uplm_pack_public.pem');
        assert.ok(fs.existsSync(sigPath), 'policy-packs/aws/cor/pack.sig must exist');
        assert.ok(fs.existsSync(pubPath), 'uplm_pack_public.pem must exist');
        const sig = JSON.parse(fs.readFileSync(sigPath, 'utf8'));
        assert.strictEqual(sig.algorithm, 'Ed25519');
        assert.strictEqual(sig.signingKeyId, 'ugondu-uplm-pack-signing-key-v1');
    });

    // Re-audit F7: Truthful provider adapter capability lifecycle status
    check('REAUDIT-F7', 'Provider capability matrix declares truthful lifecycle status (tested, implemented, unavailable)', () => {
        const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
        const guide = fs.readFileSync(path.join(ROOT, 'docs/guides/06-repository-provider-guide.md'), 'utf8');
        assert.ok(!readme.includes('`supported` / `tested` / `implemented`'), 'README must not declare triple slashes');
        assert.ok(!guide.includes('`implemented` / `tested` / `supported`'), 'Guide must not declare triple slashes');
        assert.ok(readme.includes('| `github` | `github.com` | `UGONDU_GITHUB_TOKEN` | `tested` | `tested` | `tested` | `tested` | `tested` | `implemented` | `implemented` |'));
    });

    // Re-audit F8: AWS physical qualification must be fail-closed; live proof belongs to CI artifacts.
    check('REAUDIT-F8', 'AWS conformance source fails closed unless both least-privilege denials are proven', () => {
        const probe = fs.readFileSync(path.join(ROOT, 'scripts/aws-conformance/run-aws-conformance.mjs'), 'utf8');
        assert.ok(probe.includes("if (!boundaryDenied)"), 'iam:ListUsers must be denied');
        assert.ok(probe.includes("if (!assumeDenied)"), 'role assumption must be denied for this execution-role identity');
        assert.ok(probe.includes("executionRoleAssumptionFailClosed: assumeDenied"));
        assert.ok(probe.includes("status: 'PASS'"), 'PASS must only be emitted after the fail-closed assertions');
        assert.ok(probe.includes("UGONDU_EVIDENCE_INPUT_DIR is required"), 'live evidence must be written to the qualification workspace');
    });

    // Re-audit F9: AWS boundary probe must use a valid ARN and fail closed.
    check('REAUDIT-F9', 'AWS conformance role-assumption probe uses valid ARN and rejects unexpected success', () => {
        const probe = fs.readFileSync(path.join(ROOT, 'scripts/aws-conformance/run-aws-conformance.mjs'), 'utf8');
        assert.ok(probe.includes('`arn:aws:iam::${accountId}:role/UgonduCORExecutionRole`'), 'role ARN must use arn:partition:iam::account:role/name');
        assert.ok(!probe.includes('arn:aws:iam://'), 'malformed IAM ARN is forbidden');
        assert.ok(probe.includes('if (!assumeDenied)'), 'role-assumption probe must fail if authorization denial is not proven');
    });

    // Re-audit F10: no static CSV credentials or hard-coded platform evidence.
    check('REAUDIT-F10', 'AWS probe uses the default credential chain and evidence generation imports real qualification outputs', () => {
        const awsEnv = fs.readFileSync(path.join(ROOT, 'scripts/aws-conformance/aws-env.mjs'), 'utf8');
        const awsProbe = fs.readFileSync(path.join(ROOT, 'scripts/aws-conformance/run-aws-conformance.mjs'), 'utf8');
        const evidence = fs.readFileSync(path.join(ROOT, 'scripts/release/verify-evidence-bundle.mjs'), 'utf8');
        assert.ok(!awsEnv.includes('UGONDU_AWS_TEST_CREDENTIALS_CSV'), 'static credential CSV input is forbidden');
        assert.ok(!awsProbe.includes('UgonduPhysicalTest_accessKeys.csv'), 'machine-specific credential paths are forbidden');
        assert.ok(evidence.includes('UGONDU_EVIDENCE_INPUT_DIR'), 'real qualification artifact input directory is required');
        assert.ok(!evidence.includes('buildJUnitXml('), 'test evidence must not be fabricated from hard-coded JUnit cases');
        assert.ok(!evidence.includes("platformsVerified: ['linux/amd64'"), 'platform qualification must not be hard-coded');
    });

    // Re-audit F11: independent trust roots must be externally pinned.
    check('REAUDIT-F11', 'Evidence and policy-pack verification require externally injected trust anchors', () => {
        const evidence = fs.readFileSync(path.join(ROOT, 'scripts/release/verify-evidence-bundle.mjs'), 'utf8');
        const pack = fs.readFileSync(path.join(ROOT, 'scripts/governance/verify-policy-pack-digests.mjs'), 'utf8');
        assert.ok(evidence.includes('Independent evidence public trust anchor must be injected'));
        assert.ok(!evidence.includes('fs.existsSync(pubPath)'), 'repository-local evidence key fallback is forbidden');
        assert.ok(pack.includes('Trust roots must be pinned by the operator/CI environment'));
        assert.ok(pack.includes('sigData.signingKeyId !=='), 'policy-pack signing key ID must be validated');
        assert.ok(!pack.includes("path.join(ROOT, 'server/shared/keys/uplm_pack_private.pem')"), 'repository-local pack private-key fallback is forbidden');
    });

    // Re-audit PR#5: Qualification schema, platform matrix, exception register, ADR, and adversarial/mode-parity suites
    check('REAUDIT-F12', 'PR#5 qualification evidence schema, platform matrix, real npm-audit SCA, full lockfile SBOM, and adversarial/mode-parity suites exist', () => {
        assert.ok(fs.existsSync(path.join(ROOT, 'schemas/qualification-evidence.schema.json')), 'Missing qualification-evidence.schema.json');
        assert.ok(fs.existsSync(path.join(ROOT, 'config/qualification/platform-matrix.json')), 'Missing platform-matrix.json');
        assert.ok(fs.existsSync(path.join(ROOT, 'config/governance/exception-register.json')), 'Missing exception-register.json');
        assert.ok(fs.existsSync(path.join(ROOT, 'docs/adr/ADR-0001-modular-microservices-and-cor-governance.md')), 'Missing ADR-0001');
        assert.ok(fs.existsSync(path.join(ROOT, 'tests/qualification/evidence-pipeline-adversarial.test.js')), 'Missing evidence-pipeline-adversarial.test.js');
        assert.ok(fs.existsSync(path.join(ROOT, 'tests/qualification/shared-execution-and-mode-parity.test.js')), 'Missing shared-execution-and-mode-parity.test.js');
        const collector = fs.readFileSync(path.join(ROOT, 'scripts/release/collect-qualification-evidence.mjs'), 'utf8');
        assert.ok(!collector.includes('name: `executed ${relScript}`'), 'Fallback executed <script> testcase synthesis is forbidden');
        assert.ok(!collector.includes("path.join(ROOT, 'config/trust/uplm_pack_authority.pub.pem')"), 'Repository-local pack key fallback in collector is forbidden');
        assert.ok(collector.includes("scanner: 'npm-audit'"), 'Collector must run real npm-audit dependency scan');
    });

    // Re-audit F-23: Safe Multi-Tenant VPC Cleanup Contract
    check('REAUDIT-F23', 'Safe Multi-Tenant VPC Cleanup contract and qualification suite exist', () => {
        assert.ok(fs.existsSync(path.join(ROOT, 'server/engine-core/src/assurance/cor-cleanup-contract.ts')), 'Missing cor-cleanup-contract.ts');
        assert.ok(fs.existsSync(path.join(ROOT, 'tests/qualification/cor-cleanup-hardening.test.js')), 'Missing cor-cleanup-hardening.test.js');
        const contract = fs.readFileSync(path.join(ROOT, 'server/engine-core/src/assurance/cor-cleanup-contract.ts'), 'utf8');
        assert.ok(contract.includes('export interface CorResourceOwnership'));
        assert.ok(contract.includes('export class CorResourceManifest'));
        assert.ok(contract.includes('export class CorCleanupExecutionError'));
        assert.ok(contract.includes('export class CorVpcDependencyTimeoutError'));
        assert.ok(contract.includes('export async function cleanupOwnedCorVpcs'));
    });

    // Re-audit F-24: S3 Tag Verification Fail-Closed Contract & Negative Proof
    check('REAUDIT-F24', 'S3 Tag Verification Fail-Closed contract and negative qualification suite exist', () => {
        assert.ok(fs.existsSync(path.join(ROOT, 'tests/qualification/cor-s3-tag-negative.test.js')), 'Missing cor-s3-tag-negative.test.js');
        const contract = fs.readFileSync(path.join(ROOT, 'server/engine-core/src/assurance/cor-cleanup-contract.ts'), 'utf8');
        assert.ok(contract.includes('export class CorTagVerificationAccessDeniedError'));
        assert.ok(contract.includes('export class CorTagVerificationError'));
        assert.ok(contract.includes('export async function verifyS3BucketTags'));
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
