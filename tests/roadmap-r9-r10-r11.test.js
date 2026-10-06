/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Roadmap R9, R10 & R11 (Marketplace, Enterprise, Sovereign)
 * File           : roadmap-r9-r10-r11.test.js
 * Version        : 2.0.0
 * Author         : Enterprise & Sovereign Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const canonicalize = (mod => mod && mod.default ? mod.default : mod)(require('canonicalize'));

const {
    GovernedMarketplaceRegistry,
    OpenAgentProtocol,
    ProviderCertificationHarness,
    EnterpriseAccessControl,
    EnterprisePolicyEngine,
    SovereignLeaseValidator,
    HsmTrustRootAdapter,
    DataResidencyScrubber
} = require('../server/shared/dist');

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
    console.log(' Ugondu Roadmap R9, R10 & R11: Marketplace, Enterprise & Gov  ');
    console.log(' Standards: Provenance, OAP, RBAC 4-Eyes, Sovereign Lease, HSM');
    console.log('══════════════════════════════════════════════════════════════');

    // Test 1: R9.1 Governed Marketplace Registry with Publisher Provenance & Revocation
    try {
        const registry = new GovernedMarketplaceRegistry();
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

        registry.registerPublisher({
            publisherId: 'pub_airroofers_01',
            organization: 'Air Roofers Ecosystem',
            publicKeyPem: pubPem,
            status: 'ACTIVE'
        });

        // Create valid package manifest
        const packagePayload = {
            packageId: 'pkg_nginx_atomic_v1',
            name: 'nginx-atomic-sync',
            version: '1.0.0',
            publisherId: 'pub_airroofers_01',
            bundleDigest: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            requiredCapabilities: ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT'],
            createdAt: Date.now()
        };

        const canonicalPayload = canonicalize(packagePayload);
        const sig = crypto.sign(null, Buffer.from(canonicalPayload), privateKey).toString('base64');

        const regResult = registry.registerPackage({ ...packagePayload, signature: sig });
        assert.strictEqual(regResult.valid, true);
        assert.strictEqual(regResult.status, 'VERIFIED');

        // Verify capability admission
        assert.strictEqual(registry.verifyAdmission('pkg_nginx_atomic_v1', ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'NODE_INSTALL']), true);
        assert.strictEqual(registry.verifyAdmission('pkg_nginx_atomic_v1', ['FETCH_REPOSITORY']), false);

        // Zero-trust: Reject package demanding SHELL_EXEC
        const maliciousPkgPayload = {
            packageId: 'pkg_backdoor_v1',
            name: 'backdoor-utility',
            version: '1.0.0',
            publisherId: 'pub_airroofers_01',
            bundleDigest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
            requiredCapabilities: ['SHELL_EXEC'],
            createdAt: Date.now()
        };
        const malSig = crypto.sign(null, Buffer.from(canonicalize(maliciousPkgPayload)), privateKey).toString('base64');
        const malResult = registry.registerPackage({ ...maliciousPkgPayload, signature: malSig });
        assert.strictEqual(malResult.valid, false);
        assert.strictEqual(malResult.reason, 'FORBIDDEN_CAPABILITY_REQUESTED');

        // Revoke publisher -> cascades to packages
        registry.revokePublisher('pub_airroofers_01');
        const pkgEntry = registry.getPackage('pkg_nginx_atomic_v1');
        assert.strictEqual(pkgEntry.status, 'REVOKED');

        reportPass('Governed Marketplace Registry validates Ed25519 provenance, zero-trust shell rejection, and revocation cascade');
    } catch (e) {
        reportFail('Marketplace Registry test', e);
    }

    // Test 2: R9.2 Open Agent Protocol (OAP/OPP) Envelope & Negotiation
    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

        const msg = OpenAgentProtocol.createMessage(
            'agent_local_worker_01',
            'control_plane_gateway',
            'ACTION_REQUEST',
            { action: 'FETCH_REPOSITORY', branch: 'main' },
            privateKey
        );

        assert.ok(msg.messageId.startsWith('oap_'));
        assert.strictEqual(OpenAgentProtocol.verifyMessage(msg, pubPem), true);

        // Tamper with payload
        const tamperedMsg = { ...msg, payload: { action: 'FETCH_REPOSITORY', branch: 'malicious' } };
        assert.strictEqual(OpenAgentProtocol.verifyMessage(tamperedMsg, pubPem), false);

        // Handshake negotiation
        const handshakeResp = OpenAgentProtocol.negotiateHandshake({
            supportedProtocols: ['1.0'],
            capabilities: ['FETCH_REPOSITORY', 'NODE_INSTALL', 'DOCKER_RUN'],
            agentVersion: '2.0.0',
            publicKeyPem: pubPem
        }, ['FETCH_REPOSITORY', 'NODE_INSTALL']);

        assert.strictEqual(handshakeResp.accepted, true);
        assert.strictEqual(handshakeResp.negotiatedVersion, '1.0');
        assert.deepStrictEqual(handshakeResp.grantedCapabilities, ['FETCH_REPOSITORY', 'NODE_INSTALL']);

        reportPass('Open Agent Protocol creates signed envelopes, verifies tamper-evidence, and negotiates capability handshake');
    } catch (e) {
        reportFail('OAP test', e);
    }

    // Test 3: R9.3 Provider Certification Test Harness
    try {
        const enterpriseProbe = {
            providerName: 'AirRoofers-Cloud',
            targetType: 'bare-metal',
            supportsAtomicSwap: true,
            supportsTelemetryStream: true,
            rejectsRawShell: true,
            supportsHealthChecks: true,
            sandboxIsolationLevel: 'CONTAINER_HARDENED'
        };
        const entReport = ProviderCertificationHarness.certifyProvider(enterpriseProbe);
        assert.strictEqual(entReport.certificationStatus, 'CERTIFIED_L2');
        assert.ok(entReport.score >= 85);

        const insecureProbe = {
            providerName: 'LegacyHost',
            targetType: 'shared-vps',
            supportsAtomicSwap: false,
            supportsTelemetryStream: false,
            rejectsRawShell: false, // Insecure
            supportsHealthChecks: false,
            sandboxIsolationLevel: 'NONE'
        };
        const insecReport = ProviderCertificationHarness.certifyProvider(insecureProbe);
        assert.strictEqual(insecReport.certificationStatus, 'REJECTED');
        assert.ok(insecReport.deficiencies.includes('CRITICAL_ALLOWS_RAW_SHELL_INJECTION'));

        reportPass('Provider Certification Harness certifies L2 enterprise providers and rejects insecure raw shell providers');
    } catch (e) {
        reportFail('Provider Certification test', e);
    }

    // Test 4: R10.1 Enterprise RBAC/ABAC & SCIM Sync
    try {
        const devPrincipal = {
            id: 'usr_dev_01',
            email: 'dev@airroofers.eu',
            tenantId: 'tenant_enterprise',
            workspaceId: 'ws_alpha',
            roles: ['DEVELOPER'],
            mfaVerified: true,
            ipAddress: '192.168.1.50'
        };

        // Developer can deploy to staging
        assert.strictEqual(EnterpriseAccessControl.evaluateAccess(devPrincipal, {
            environmentId: 'staging',
            action: 'DEPLOY',
            requiresMfa: false
        }), true);

        // Developer CANNOT deploy to production
        assert.strictEqual(EnterpriseAccessControl.evaluateAccess(devPrincipal, {
            environmentId: 'production',
            action: 'DEPLOY',
            requiresMfa: true
        }), false);

        // Admin without MFA cannot deploy to production
        const unverifiedAdmin = {
            ...devPrincipal,
            roles: ['ADMIN'],
            mfaVerified: false
        };
        assert.strictEqual(EnterpriseAccessControl.evaluateAccess(unverifiedAdmin, {
            environmentId: 'production',
            action: 'DEPLOY',
            requiresMfa: true
        }), false);

        // SCIM sync test
        const scimResult = EnterpriseAccessControl.processScimSync({
            id: 'usr_scim_99',
            userName: 'john.doe',
            active: false,
            emails: [{ value: 'john@example.com', primary: true }],
            roles: ['DEVELOPER']
        });
        assert.strictEqual(scimResult.action, 'DEACTIVATED');

        reportPass('Enterprise RBAC/ABAC enforces role boundaries, production MFA constraints, and SCIM deactivation');
    } catch (e) {
        reportFail('Enterprise RBAC test', e);
    }

    // Test 5: R10.2 Policy-as-Code Dual Approval & Fleet Rolling Batches
    try {
        const req = EnterprisePolicyEngine.createApprovalRequest(
            'usr_creator_01',
            'production',
            0.85,
            'd9e8f7a6...'
        );

        // 4-Eyes Principle: Requester cannot approve their own deployment
        assert.strictEqual(EnterprisePolicyEngine.evaluateDualApproval(req, 'usr_creator_01', 'ADMIN'), false);
        assert.strictEqual(req.status, 'PENDING');

        // Peer Admin approves
        assert.strictEqual(EnterprisePolicyEngine.evaluateDualApproval(req, 'usr_peer_admin_02', 'ADMIN'), true);
        assert.strictEqual(req.status, 'APPROVED');

        // Fleet Rolling Batches calculation
        const fleetPlan = EnterprisePolicyEngine.calculateFleetRollingBatches({
            fleetId: 'fleet_prod_cluster',
            totalTargets: 25,
            maxSurge: 5,
            maxUnavailable: 5,
            strategy: 'ROLLING'
        });
        assert.strictEqual(fleetPlan.batches.length, 5); // 25 / 5 = 5 batches
        assert.strictEqual(fleetPlan.batches[0].targetCount, 5);

        reportPass('Policy-as-Code enforces 4-Eyes dual approval and calculates rolling fleet batches');
    } catch (e) {
        reportFail('Enterprise Policy test', e);
    }

    // Test 6: R11.1 Sovereign Offline Cryptographic Lease & Air-gap Bundle
    try {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

        const leasePayload = {
            leaseId: 'lease_gov_defense_01',
            customerOrg: 'Ministry of Defense Infrastructure',
            tier: 'SOVEREIGN_GOVERNMENT',
            issuedAt: Date.now() - 1000,
            expiresAt: Date.now() + 3600000, // 1 hour validity
            maxNodes: 500,
            allowedFeatures: ['ALL', 'AIRGAP_UNLIMITED']
        };

        const canonicalLease = canonicalize(leasePayload);
        const leaseSig = crypto.sign(null, Buffer.from(canonicalLease), privateKey).toString('base64');
        const validLease = { ...leasePayload, signature: leaseSig };

        const verifyResult = SovereignLeaseValidator.verifyOfflineLease(validLease, pubPem);
        assert.strictEqual(verifyResult.valid, true);

        // Test Expired Lease
        const expiredLease = { ...validLease, expiresAt: Date.now() - 5000 };
        const expResult = SovereignLeaseValidator.verifyOfflineLease(expiredLease, pubPem);
        assert.strictEqual(expResult.valid, false);
        assert.strictEqual(expResult.reason, 'LEASE_EXPIRED');

        // Test Air-gap update bundle detached signature
        const tarDigest = 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
        const bundleSig = crypto.sign(null, Buffer.from(tarDigest), privateKey).toString('base64');

        const bundleManifest = {
            bundleId: 'bundle_airgap_v2_1_0',
            version: '2.1.0',
            releaseDate: Date.now(),
            tarSha256: tarDigest,
            detachedSignature: bundleSig
        };

        assert.strictEqual(SovereignLeaseValidator.verifyUpdateBundle(bundleManifest, tarDigest, pubPem), true);
        assert.strictEqual(SovereignLeaseValidator.verifyUpdateBundle(bundleManifest, 'sha256:tampered_digest', pubPem), false);

        reportPass('Sovereign Lease Validator verifies offline cryptographic leases and air-gap bundle digests');
    } catch (e) {
        reportFail('Sovereign Lease test', e);
    }

    // Test 7: R11.2 HSM Trust Root & Sovereign Data Residency Scrubber
    try {
        const hsm = new HsmTrustRootAdapter('hsm_slot_0_key_root');
        const rawPayload = Buffer.from('CRITICAL_SOVEREIGN_ENVELOPE');
        const hsmSig = hsm.signEnvelope(rawPayload);
        assert.strictEqual(hsm.verifyEnvelope(rawPayload, hsmSig), true);

        // Data Residency Scrubber
        const dirtyTelemetry = {
            tenantId: 'tenant_defense_01',
            environment: 'sovereign-core',
            region: 'eu-west-3',
            metrics: { cpu: 42, memoryMb: 1024 },
            rawLogs: [
                'Connecting to postgres://admin:superSecretPass123@10.0.4.12:5432/core_db',
                'Worker IP 192.168.1.15 reported healthy with Bearer eyJhbGciOiJIUzI1Ni...',
                'Application started on host server-alpha-internal with pwd=masterPass999'
            ],
            metadata: {
                clusterHost: '10.0.0.1',
                internalEndpoint: 'https://internal.vault:8200?token=s.987654321'
            }
        };

        const scrubbed = DataResidencyScrubber.scrubTelemetry(dirtyTelemetry, 'EU_ONLY');

        assert.strictEqual(scrubbed.metadata['SOVEREIGN_FENCE'], 'EU_ONLY');
        assert.ok(scrubbed.rawLogs.every(log => !log.includes('10.0.4.12')));
        assert.ok(scrubbed.rawLogs.every(log => !log.includes('192.168.1.15')));
        assert.ok(scrubbed.rawLogs.every(log => !log.includes('superSecretPass123')));
        assert.ok(scrubbed.rawLogs.every(log => !log.includes('masterPass999')));
        assert.ok(scrubbed.rawLogs.every(log => !log.includes('Bearer eyJhbGciOiJIUzI1Ni')));
        assert.ok(!scrubbed.metadata.clusterHost.includes('10.0.0.1'));
        assert.ok(!scrubbed.metadata.internalEndpoint.includes('s.987654321'));

        reportPass('HSM Trust Root adapter and Sovereign Data Residency Scrubber sanitize RFC1918 IPs and secrets');
    } catch (e) {
        reportFail('HSM and Data Residency Scrubber test', e);
    }

    console.log('══════════════════════════════════════════════════════════════');
    console.log(` Roadmap R9, R10 & R11 Test Results: ${passed} passed, ${failed} failed `);
    console.log('══════════════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
