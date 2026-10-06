/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Roadmap R2 & R3 (UPM, Discovery, DAG, Simulation)
 * File           : roadmap-r2-r3-upm-compiler.test.js
 * Version        : 2.0.0
 * Author         : Universal Delivery Platform Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const { UpmManager } = require('../server/engine-core/dist/upm/model');
const { DiscoveryEngine } = require('../server/engine-core/dist/discovery');
const { globalTechnologyGraph } = require('../server/engine-core/dist/graph/knowledge');
const { PlanCompiler } = require('../server/engine-core/dist/compiler/dag');
const { DeploymentSimulator } = require('../server/engine-core/dist/simulation/simulator');
const { ProgressiveAutonomyEngine } = require('../server/engine-core/dist/autonomy/state_machine');

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
    console.log(' Ugondu Roadmap R2 & R3: UPM, Discovery, DAG & Simulation    ');
    console.log(' Standards: Multi-Graph Model, Tech Graph, Autonomy L0-L6    ');
    console.log('══════════════════════════════════════════════════════════════');

    // Test 1: UPM Model creation and validation
    try {
        const upm = UpmManager.createProjectModel({
            projectId: 'proj_ecommerce_99',
            projectName: 'StoreFront',
            components: [{ id: 'comp_api', name: 'API', type: 'api', runtime: 'nodejs-20' }],
            dependencies: [{ source: 'comp_api', target: 'db_pg', relation: 'requires' }],
            services: ['web', 'database'],
            targetEnvironment: 'docker'
        });

        assert.strictEqual(UpmManager.validateModel(upm), true);
        assert.strictEqual(upm.schemaVersion, '1.0.0');
        assert.strictEqual(upm.components[0].type, 'api');
        reportPass('Universal Project Model (UPM) creates valid multi-graph schema');
    } catch (e) {
        reportFail('UPM Model test', e);
    }

    // Test 2: Deep Discovery Engine
    try {
        const discovered = DiscoveryEngine.inspectFileMap('https://github.com/example/monorepo', 'main', [
            'frontend/package.json',
            'backend/composer.json',
            'Dockerfile',
            '.github/workflows/deploy.yml'
        ]);

        assert.strictEqual(discovered.hasDockerfile, true);
        assert.ok(discovered.detectedLanguages.includes('nodejs'));
        assert.ok(discovered.detectedLanguages.includes('php'));
        assert.ok(discovered.packageManagers.includes('npm'));
        assert.ok(discovered.packageManagers.includes('composer'));
        assert.ok(discovered.existingCI.includes('github-actions'));
        reportPass('Deep Discovery Engine extracts runtimes, packages, container, and CI files');
    } catch (e) {
        reportFail('Discovery Engine test', e);
    }

    // Test 3: Technology Knowledge Graph
    try {
        const requiredActions = globalTechnologyGraph.resolveRequiredActions(['nodejs', 'php']);
        assert.ok(requiredActions.includes('NODE_INSTALL'));
        assert.ok(requiredActions.includes('COMPOSER_INSTALL'));

        const hasConflict = globalTechnologyGraph.detectConflicts('cpanel', 'atomic');
        assert.strictEqual(hasConflict, true, 'cPanel must detect conflict with atomic symlink swap');

        reportPass('Technology Knowledge Graph maps action requirements and detects strategy conflicts');
    } catch (e) {
        reportFail('Technology Knowledge Graph test', e);
    }

    // Test 4: Plan Compiler DAG
    try {
        const actions = [
            { action: 'FETCH_REPOSITORY', payload: { url: 'https://github.com/example/repo', branch: 'main' } },
            { action: 'NODE_INSTALL', payload: { workingDirectory: '.' } },
            { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'atomic' } },
            { action: 'SERVICE_RESTART', payload: { serviceName: 'node-app' } }
        ];

        const dag = PlanCompiler.compileExecutionGraph(actions);
        assert.strictEqual(dag.schemaVersion, '1.0.0');
        assert.strictEqual(dag.nodes.length, 4);
        assert.strictEqual(dag.edges.length, 3);
        assert.strictEqual(dag.nodes[3].action, 'SERVICE_RESTART');
        assert.strictEqual(dag.nodes[3].canRollback, true);
        assert.ok(dag.planHash.length === 64);
        reportPass('Plan Compiler constructs validated Execution Graph DAG with deterministic planHash');
    } catch (e) {
        reportFail('Plan Compiler test', e);
    }

    // Test 5: Simulation & Risk Scoring
    try {
        const actions = [
            { action: 'FETCH_REPOSITORY', payload: { url: 'https://github.com/example/repo', branch: 'main' } },
            { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'quota-sync' } },
            { action: 'SERVICE_RESTART', payload: { serviceName: 'httpd' } }
        ];
        const dag = PlanCompiler.compileExecutionGraph(actions);
        const sim = DeploymentSimulator.simulateExecution(dag, 'cpanel');

        assert.ok(sim.riskScore > 0.3);
        assert.ok(['MEDIUM', 'HIGH', 'CRITICAL'].includes(sim.riskCategory));
        assert.ok(sim.predictedDowntimeMs >= 1500);
        assert.strictEqual(sim.servicesRestarted[0], 'httpd');
        reportPass('Deployment Simulator predicts risk score, downtime, and service restarts');
    } catch (e) {
        reportFail('Deployment Simulator test', e);
    }

    // Test 6: Progressive Autonomy Gating (L0–L6)
    try {
        const lowRiskSim = {
            riskScore: 0.1,
            riskCategory: 'LOW',
            predictedDowntimeMs: 0,
            filesAffectedEstimated: 5,
            servicesRestarted: [],
            rollbackAvailable: true,
            policyViolations: []
        };

        const highRiskSim = {
            riskScore: 0.8,
            riskCategory: 'CRITICAL',
            predictedDowntimeMs: 5000,
            filesAffectedEstimated: 1000,
            servicesRestarted: ['db', 'api'],
            rollbackAvailable: false,
            policyViolations: ['CHANGE_WINDOW_VIOLATION']
        };

        const decL0 = ProgressiveAutonomyEngine.evaluateExecutionApproval('L0', lowRiskSim);
        assert.strictEqual(decL0.requiresManualApproval, true, 'L0 must always require manual approval');

        const decL1 = ProgressiveAutonomyEngine.evaluateExecutionApproval('L1', lowRiskSim);
        assert.strictEqual(decL1.canAutoExecute, true, 'L1 must auto-approve low risk');

        const decL1High = ProgressiveAutonomyEngine.evaluateExecutionApproval('L1', highRiskSim);
        assert.strictEqual(decL1High.requiresManualApproval, true, 'L1 must block high risk');

        const decL5Blocked = ProgressiveAutonomyEngine.evaluateExecutionApproval('L5', highRiskSim);
        assert.strictEqual(decL5Blocked.requiresManualApproval, true, 'L5 must block policy violations');

        // Test hardened L5 context gates (COR-10)
        const decL5DegradedHealth = ProgressiveAutonomyEngine.evaluateExecutionApproval('L5', lowRiskSim, { targetHealth: 'DEGRADED' });
        assert.strictEqual(decL5DegradedHealth.requiresManualApproval, true, 'L5 must block when target health is DEGRADED');

        const decL5NoRollback = ProgressiveAutonomyEngine.evaluateExecutionApproval('L5', lowRiskSim, { rollbackAvailable: false });
        assert.strictEqual(decL5NoRollback.requiresManualApproval, true, 'L5 must block when rollback guarantee is missing');

        const decL5DualAppr = ProgressiveAutonomyEngine.evaluateExecutionApproval('L5', lowRiskSim, { dualApprovalRequired: true });
        assert.strictEqual(decL5DualAppr.requiresManualApproval, true, 'L5 must block when policy mandates dual approval');

        const decL5Approved = ProgressiveAutonomyEngine.evaluateExecutionApproval('L5', lowRiskSim, { targetHealth: 'HEALTHY', rollbackAvailable: true });
        assert.strictEqual(decL5Approved.canAutoExecute, true, 'L5 approves when all health and recovery guarantees hold');

        reportPass('Progressive Autonomy Engine correctly gates execution across L0, L1, and hardened L5');
    } catch (e) {
        reportFail('Progressive Autonomy test', e);
    }

    console.log('══════════════════════════════════════════════════════════════');
    console.log(` Roadmap R2 & R3 Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
