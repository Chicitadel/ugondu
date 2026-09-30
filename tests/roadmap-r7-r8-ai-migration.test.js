/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Roadmap R7 & R8 (AI Guardrails & Migration Engine)
 * File           : roadmap-r7-r8-ai-migration.test.js
 * Version        : 2.0.0
 * Author         : Delivery Safety & Migration Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const { AiDeliveryGuardrail } = require('../server/engine-core/dist/ai/guardrail');
const { ModelCascadeCostEngine } = require('../server/engine-core/dist/ai/cost');
const { MigrationEngine } = require('../server/engine-core/dist/migration/parsers');

let passed = 0;
let failed = 0;

function reportPass(msg) {
    console.log(`[PASS] ✓ ${msg}`);
    passed++;
}

function reportFail(msg, err) {
    console.error(`[FAIL] ✗ ${msg}:`, err.message || err);
    failed++;
}

async function runTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' Ugondu Roadmap R7 & R8: Safety Guardrails & Migration Engine ');
    console.log(' Standards: Closed-World Actions, Model Cascade, CI Converters');
    console.log('══════════════════════════════════════════════════════════════');

    // Test 1: Delivery Safety Guardrail rejects SHELL_EXEC, EXEC_RAW, and arbitrary bash
    try {
        const maliciousPlan = {
            proposedByModel: 'gpt-4o',
            targetEnvironment: 'production',
            actions: [
                { action: 'FETCH_REPOSITORY', payload: { branch: 'main' } },
                { action: 'SHELL_EXEC', payload: { cmd: 'rm -rf /' } },
                { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'atomic' } }
            ],
            reasoning: 'Automated deployment with cleanup'
        };

        const result = AiDeliveryGuardrail.validateAiPlan(maliciousPlan, [
            'FETCH_REPOSITORY',
            'SYNC_ENVIRONMENT',
            'SHELL_EXEC'
        ]);

        assert.strictEqual(result.passed, false, 'Plan with SHELL_EXEC must be rejected');
        assert.ok(result.violations.some(v => v.includes('VIOLATION_FORBIDDEN_SHELL_ACTION')), 'Must flag forbidden shell action');
        reportPass('Safety Guardrail strictly rejects forbidden SHELL_EXEC');
    } catch (e) {
        reportFail('Guardrail SHELL_EXEC test', e);
    }

    // Test 2: Delivery Safety Guardrail enforces capability intersection
    try {
        const ungrantedPlan = {
            proposedByModel: 'claude-3-5-sonnet',
            targetEnvironment: 'cpanel',
            actions: [
                { action: 'FETCH_REPOSITORY', payload: { branch: 'main' } },
                { action: 'COMPOSER_INSTALL', payload: {} },
                { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'quota-sync' } }
            ],
            reasoning: 'PHP deployment to shared hosting'
        };

        // Target only grants FETCH_REPOSITORY and SYNC_ENVIRONMENT (no COMPOSER_INSTALL)
        const result = AiDeliveryGuardrail.validateAiPlan(ungrantedPlan, [
            'FETCH_REPOSITORY',
            'SYNC_ENVIRONMENT'
        ]);

        assert.strictEqual(result.passed, false, 'Plan with ungranted capability must be rejected');
        assert.ok(result.violations.some(v => v.includes('VIOLATION_CAPABILITY_NOT_GRANTED')), 'Must flag capability deficiency');
        reportPass('Safety Guardrail strictly enforces capability intersection');
    } catch (e) {
        reportFail('Guardrail Capability test', e);
    }

    // Test 3: Delivery Safety Guardrail passes compliant plan
    try {
        const validPlan = {
            proposedByModel: 'local-fast',
            targetEnvironment: 'linux-vps',
            actions: [
                { action: 'FETCH_REPOSITORY', payload: { branch: 'main' } },
                { action: 'NODE_INSTALL', payload: {} },
                { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'atomic' } },
                { action: 'PRUNE_RELEASES', payload: { retention: 3 } }
            ],
            reasoning: 'Standard Node deployment'
        };

        const result = AiDeliveryGuardrail.validateAiPlan(validPlan, [
            'FETCH_REPOSITORY',
            'NODE_INSTALL',
            'SYNC_ENVIRONMENT',
            'PRUNE_RELEASES'
        ]);

        assert.strictEqual(result.passed, true, 'Valid plan must pass guardrails');
        assert.strictEqual(result.violations.length, 0);
        assert.ok(result.sanitizedPlan !== undefined);
        reportPass('Safety Guardrail admits fully compliant closed-world plans');
    } catch (e) {
        reportFail('Guardrail Compliant Plan test', e);
    }

    // Test 4: Model Cascade Cost Engine Routing
    try {
        const simpleRoute = ModelCascadeCostEngine.selectOptimalModel('SIMPLE');
        assert.strictEqual(simpleRoute.selectedModel, 'local-fast');
        assert.ok(simpleRoute.estimatedCostUsd < 0.001);

        const complexRoute = ModelCascadeCostEngine.selectOptimalModel('COMPLEX');
        assert.strictEqual(complexRoute.selectedModel, 'cloud-reasoning');
        assert.ok(complexRoute.estimatedCostUsd > simpleRoute.estimatedCostUsd);

        const costComparison = ModelCascadeCostEngine.compareInfrastructureCost(1000, 300);
        assert.strictEqual(costComparison.monthlySavingsUsd, 700);
        assert.strictEqual(costComparison.percentageSavings, 70.0);
        reportPass('Model Cascade Cost Engine selects optimal tier and computes infrastructure savings');
    } catch (e) {
        reportFail('Model Cascade Cost test', e);
    }

    // Test 5: Migration Engine CI/CD Parsers
    try {
        // Jenkinsfile
        const jenkinsSample = `
            pipeline {
                agent any
                stages {
                    stage('Build') {
                        steps {
                            sh 'npm install'
                            sh 'npm test'
                        }
                    }
                }
            }
        `;
        const jenkinsPlan = MigrationEngine.parseJenkinsfile(jenkinsSample);
        assert.strictEqual(jenkinsPlan.sourceType, 'jenkins');
        assert.strictEqual(jenkinsPlan.suggestedStrategy, 'atomic');
        assert.ok(jenkinsPlan.extractedActions.some(a => a.action === 'NODE_INSTALL'));
        assert.ok(jenkinsPlan.extractedActions.some(a => a.action === 'SYNC_ENVIRONMENT'));

        // GitHub Actions
        const ghaSample = `
            name: Deploy
            on: [push]
            jobs:
                build:
                    runs-on: ubuntu-latest
                    steps:
                        - uses: actions/checkout@v3
                        - uses: actions/setup-node@v3
                        - run: npm ci
        `;
        const ghaPlan = MigrationEngine.parseGitHubActions(ghaSample);
        assert.strictEqual(ghaPlan.sourceType, 'github-actions');
        assert.ok(ghaPlan.extractedActions.some(a => a.action === 'NODE_INSTALL'));

        // GitLab CI
        const gitlabSample = `
            deploy:
                script:
                    - composer install --no-dev
                    - npm install
        `;
        const gitlabPlan = MigrationEngine.parseGitLabCI(gitlabSample);
        assert.strictEqual(gitlabPlan.sourceType, 'gitlab-ci');
        assert.ok(gitlabPlan.extractedActions.some(a => a.action === 'COMPOSER_INSTALL'));
        assert.ok(gitlabPlan.extractedActions.some(a => a.action === 'NODE_INSTALL'));

        // Docker Compose
        const composeSample = `
            version: '3.8'
            services:
                web:
                    image: nginx:alpine
                    ports:
                        - "80:80"
        `;
        const composePlan = MigrationEngine.parseDockerCompose(composeSample);
        assert.strictEqual(composePlan.sourceType, 'docker-compose');
        assert.strictEqual(composePlan.suggestedStrategy, 'container-swap');

        reportPass('Migration Engine converts Jenkins, GitHub Actions, GitLab CI, and Docker Compose to Ugondu plans');
    } catch (e) {
        reportFail('Migration Engine Parsers test', e);
    }

    console.log('══════════════════════════════════════════════════════════════');
    console.log(` Roadmap R7 & R8 Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
