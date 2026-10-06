/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Roadmap R1 & R4 Target Adapters
 * File           : roadmap-r1-targets.test.js
 * Version        : 2.0.0
 * Author         : Target Fabric Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const {
    CPanelTargetAdapter,
    SshTargetAdapter,
    DockerTargetAdapter,
    KubernetesTargetAdapter,
    TargetFabric
} = require('../server/engine-core/dist/targets');

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

async function runTargetTests() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log(' Ugondu Roadmap R1 & R4: Universal Target Adapters Test Suite  ');
    console.log(' Standards: cPanel Quota-Sync, SSH, Docker, K8s, Target Fabric');
    console.log('══════════════════════════════════════════════════════════════');

    // Test 1: cPanel target adapter with quota-sync
    try {
        const cpanel = new CPanelTargetAdapter({
            targetId: 'cp_01',
            serverHostname: 'cpanel.example.com',
            username: 'u12345',
            publicHtmlPath: '/home/u12345/public_html',
            phpVersion: '8.2',
            useQuotaSync: true
        });

        assert.strictEqual(cpanel.validatePreconditions(), true);
        const plan = cpanel.generateDeploymentPlan('https://github.com/example/repo', 'main', true);
        assert.strictEqual(plan.strategy, 'quota-sync');
        assert.strictEqual(plan.requiresPhpRestart, true);
        assert.ok(plan.steps.some(s => s.action === 'SERVICE_RESTART' && s.payload.serviceName === 'ea-php82-fpm'));
        reportPass('cPanel Target Adapter enforces quota-sync strategy and PHP-FPM restart');
    } catch (e) {
        reportFail('cPanel Target Adapter test', e);
    }

    // Test 2: SSH Target Adapter
    try {
        const ssh = new SshTargetAdapter({
            targetId: 'ssh_01',
            host: '198.51.100.10',
            port: 22,
            username: 'deploy',
            remoteBasePath: '/var/www/app',
            expectedHostKeyFingerprint: 'SHA256:abc123mockfingerprint'
        });

        assert.strictEqual(ssh.verifyHostKey('SHA256:abc123mockfingerprint'), true);
        assert.throws(() => ssh.verifyHostKey('SHA256:tamperedfingerprint'), /error_key_purpose_mismatch/);

        const plan = ssh.generateDeploymentPlan('https://github.com/example/repo', 'main', 'rel_101');
        assert.strictEqual(plan.strategy, 'atomic');
        assert.ok(plan.steps.some(s => s.action === 'SYMLINK'));
        reportPass('SSH Target Adapter enforces host key verification and atomic symlink promotion');
    } catch (e) {
        reportFail('SSH Target Adapter test', e);
    }

    // Test 3: Docker Target Adapter
    try {
        const docker = new DockerTargetAdapter({
            targetId: 'dock_01',
            dockerHost: '127.0.0.1',
            imageName: 'ugondu/sample-app',
            containerName: 'prod-sample-app',
            hostPort: 8080,
            containerPort: 80,
            memoryLimitMb: 512,
            cpuQuota: 1.0,
            readOnlyRoot: true
        });

        const plan = docker.generateDeploymentPlan('https://github.com/example/repo', 'main', 'v1.0.0');
        assert.strictEqual(plan.strategy, 'container-swap');
        assert.strictEqual(plan.imageTag, 'ugondu/sample-app:v1.0.0');

        const flags = docker.getHardenedRunFlags();
        assert.ok(flags.includes('--read-only'));
        assert.ok(flags.includes('--cap-drop=ALL'));
        reportPass('Docker Target Adapter generates container-swap plan with hardened security flags');
    } catch (e) {
        reportFail('Docker Target Adapter test', e);
    }

    // Test 4: Kubernetes Target Adapter
    try {
        const k8s = new KubernetesTargetAdapter({
            targetId: 'k8s_01',
            clusterEndpoint: 'https://k8s.example.com',
            namespace: 'production',
            appName: 'billing-api',
            replicas: 3,
            containerImage: 'registry.example.com/billing:2.0.0',
            containerPort: 4002,
            servicePort: 80,
            enableRollingUpdate: true
        });

        const manifests = k8s.generateManifests();
        assert.strictEqual(manifests.deployment.spec.replicas, 3);
        assert.strictEqual(manifests.deployment.spec.strategy.type, 'RollingUpdate');
        assert.strictEqual(manifests.service.spec.ports[0].port, 80);
        assert.strictEqual(manifests.helmValues.replicaCount, 3);
        reportPass('Kubernetes Target Adapter generates valid Deployment, Service, and Helm values');
    } catch (e) {
        reportFail('Kubernetes Target Adapter test', e);
    }

    // Test 5: Universal Target Fabric
    try {
        const fabric = new TargetFabric();
        fabric.registerTarget({
            targetId: 'target_cp',
            environmentType: 'cpanel',
            endpoint: 'cpanel.example.com',
            status: 'ONLINE',
            capabilities: ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'SERVICE_RESTART']
        });

        const check1 = fabric.computeCapabilityIntersection('target_cp', ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT']);
        assert.strictEqual(check1.satisfied, true);

        const check2 = fabric.computeCapabilityIntersection('target_cp', ['FETCH_REPOSITORY', 'DOCKER_BUILD']);
        assert.strictEqual(check2.satisfied, false);
        assert.deepStrictEqual(check2.missingCapabilities, ['DOCKER_BUILD']);

        reportPass('Target Fabric successfully resolves adapters and computes capability intersections');
    } catch (e) {
        reportFail('Target Fabric test', e);
    }

    console.log('══════════════════════════════════════════════════════════════');
    console.log(` Target Adapter Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTargetTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
