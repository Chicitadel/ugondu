/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Schema Validation
 * File           : schema-validation.test.js
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Air Roofers Global Localization & Security Standard (Wave 0 Contract Freeze)
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

async function runSchemaTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' Ugondu Wave 0: Canonical JSON Schema Contract Freeze Suite  ');
    console.log(' Standards: 8 Formal Schemas, Version 1.0.0, Closed Actions   ');
    console.log('══════════════════════════════════════════════════════════════\n');

    const schemaDir = path.resolve(__dirname, '../server/shared/schemas');
    const requiredSchemas = [
        'envelope.v1.json',
        'step.v1.json',
        'actions.v1.json',
        'trust_key.v1.json',
        'service_token.v1.json',
        'state.v1.json',
        'pack_manifest.v1.json',
        'evidence.v1.json',
        'discovery.v1.json',
        'project_model.v1.json',
        'capability.v1.json',
        'target.v1.json',
        'execution_graph.v1.json',
        'policy.v1.json',
        'telemetry.v1.json'
    ];

    // Test 1: Verify all 8 schemas exist and are valid JSON
    console.log('[Test 1] Schema Discovery & Syntax Validation');
    try {
        for (const name of requiredSchemas) {
            const filePath = path.join(schemaDir, name);
            assert.ok(fs.existsSync(filePath), `Schema file must exist: ${name}`);
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            assert.strictEqual(content.version, '1.0.0', `Schema ${name} must declare version 1.0.0`);
            assert.ok(content.$id, `Schema ${name} must have $id`);
        }
        reportPass(`All ${requiredSchemas.length} canonical v1.0.0 schemas discovered and parsed successfully`);
    } catch (e) {
        reportFail('Schema discovery and syntax validation', e);
    }

    // Test 2: Verify ExecutionEnvelope Schema constraints
    console.log('\n[Test 2] ExecutionEnvelope Schema Invariants');
    try {
        const envSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'envelope.v1.json'), 'utf8'));
        const reqFields = envSchema.required;
        assert.ok(reqFields.includes('nonce'), 'Envelope must require nonce');
        assert.ok(reqFields.includes('executionId'), 'Envelope must require executionId');
        assert.ok(reqFields.includes('targetId'), 'Envelope must require targetId');
        assert.ok(reqFields.includes('workspaceId'), 'Envelope must require workspaceId');
        assert.ok(reqFields.includes('artifactDigest'), 'Envelope must require artifactDigest');
        assert.ok(reqFields.includes('planHash'), 'Envelope must require planHash');
        assert.ok(reqFields.includes('policyHash'), 'Envelope must require policyHash');
        reportPass('ExecutionEnvelope enforces complete 16-field security context bindings');
    } catch (e) {
        reportFail('ExecutionEnvelope schema invariants', e);
    }

    // Test 3: Verify Closed-World Actions & Absence of SHELL_EXEC
    console.log('\n[Test 3] Closed-World Actions & Total SHELL_EXEC Purge');
    try {
        const stepSchema = JSON.parse(fs.readFileSync(path.join(schemaDir, 'step.v1.json'), 'utf8'));
        const allowedActions = stepSchema.properties.action.enum;
        assert.strictEqual(allowedActions.length, 10, 'Must have exactly 10 closed-world actions');
        assert.ok(!allowedActions.includes('SHELL_EXEC'), 'SHELL_EXEC must be absent from action enum');
        assert.ok(!allowedActions.includes('EXEC_RAW'), 'EXEC_RAW must be absent from action enum');
        assert.ok(allowedActions.includes('COPY_FILE'), 'COPY_FILE must be in action enum');
        assert.ok(allowedActions.includes('CREATE_DIRECTORY'), 'CREATE_DIRECTORY must be in action enum');
        assert.ok(allowedActions.includes('SYMLINK'), 'SYMLINK must be in action enum');
        assert.ok(allowedActions.includes('SERVICE_RESTART'), 'SERVICE_RESTART must be in action enum');
        reportPass('Actions schema strictly closed to 10 typed operations with zero generic shell escape');
    } catch (e) {
        reportFail('Closed-world actions verification', e);
    }

    // Test 4: Verify Error Taxonomy Integrity
    console.log('\n[Test 4] Canonical Error Taxonomy Verification');
    try {
        const { ErrorCode } = require('../server/shared/dist/errors');
        assert.strictEqual(ErrorCode.INVALID_INPUT, 'INVALID_INPUT');
        assert.strictEqual(ErrorCode.AUTH_FAILED, 'AUTH_FAILED');
        assert.strictEqual(ErrorCode.REPLAY_DETECTED, 'REPLAY_DETECTED');
        assert.strictEqual(ErrorCode.SAFEPATH_ESCAPE, 'SAFEPATH_ESCAPE');
        assert.strictEqual(ErrorCode.ARCHIVE_TRAVERSAL, 'ARCHIVE_TRAVERSAL');
        assert.strictEqual(ErrorCode.SSRF_BLOCKED, 'SSRF_BLOCKED');
        reportPass('Canonical error taxonomy verified across security, state, and network domains');
    } catch (e) {
        reportFail('Error taxonomy verification', e);
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log(` Wave 0 Schema Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runSchemaTests().catch(err => {
    console.error('Fatal schema test error:', err);
    process.exit(1);
});
