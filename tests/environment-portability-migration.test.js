/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : tests/environment-portability-migration
 * File           : environment-portability-migration.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Ujomor Delivery Authority
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

// Ensure global __t localization helper is available before loading modules
if (typeof globalThis.__t !== 'function') {
  globalThis.__t = (key, params) => {
    if (!params) return String(key);
    return `${key}:${JSON.stringify(params)}`;
  };
}

// Register deterministic TypeScript loader for direct source verification
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === '@ugondu/shared') {
    return '@ugondu/shared';
  }
  if (request.startsWith('.') && parent && parent.filename) {
    const baseDir = path.dirname(parent.filename);
    const candidateTs = path.resolve(baseDir, `${request}.ts`);
    if (fs.existsSync(candidateTs)) {
      return candidateTs;
    }
    const candidateIndexTs = path.resolve(baseDir, request, 'index.ts');
    if (fs.existsSync(candidateIndexTs)) {
      return candidateIndexTs;
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.cache['@ugondu/shared'] = {
  id: '@ugondu/shared',
  filename: '@ugondu/shared',
  loaded: true,
  exports: {
    __t: globalThis.__t,
    Logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  },
};

require.extensions['.ts'] = function (module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      strict: false,
    },
    fileName: filename,
  });
  module._compile(transpiled.outputText, filename);
};

const {
  Target: DirectAdminTarget,
  discoverDirectAdminCapabilities,
  discoverDirectAdminEnvironmentTwin,
} = require('../server/engine-core/src/targets/directadmin.ts');

const {
  DirectAdminContract,
  DirectAdminAdapter,
} = require('../server/engine-core/src/fabric/providers/directadmin.ts');

const {
  TwinBuilder,
} = require('../server/engine-core/src/twin/builder/twin-builder.ts');

const {
  EXTERNALIZED_ENVIRONMENT_BINDINGS,
  PORTABILITY_PIPELINE_STAGES,
  createSignedReleaseArtifact,
  verifyReleaseArtifactForProfile,
  compileDeploymentProfile,
  evaluatePortabilityMigration,
  evaluateMultiHopPortabilityChain,
} = require('../server/engine-core/src/move/portability.ts');

const {
  CompatibilityAnalyzer,
} = require('../server/engine-core/src/move/discovery/compatibility.ts');

const {
  MigrationPlanner,
} = require('../server/engine-core/src/move/planner/planner.ts');

const {
  CertificationAuthority,
} = require('../server/engine-core/src/move/verification/certification.ts');

const {
  ServerAuthoritativeEntitlementGate,
  CapabilityValidator,
} = require('../server/engine-core/src/passport/gatekeeper/capability-validator.ts');

describe('BOUNDARY-16: Universal Environment Portability, DirectAdmin Twin Discovery & Zero-Code-Change Migration Engine', () => {
  it('1. DirectAdmin Environment Twin discovery reports explicit AVAILABLE, ACCOUNT_SCOPED, UNSUPPORTED, and honest UNKNOWN states without guessing', async () => {
    const capabilities = discoverDirectAdminCapabilities({
      phpVersion: '8.3',
      domains: ['app.client.com'],
      subdomains: ['api.client.com', 'staging.client.com'],
      databases: ['client_prod_db'],
      dnsManagementAvailable: true,
      tlsAvailable: true,
      ftpAvailable: true,
      // Attempt to inject unverified claims — discovery must refuse to guess and report UNKNOWN
      unverifiedClaims: {
        rootAccess: 'AVAILABLE',
        docker: 'AVAILABLE',
        ssh: 'AVAILABLE',
        nodejs: 'AVAILABLE',
        cron: 'AVAILABLE',
        redis: 'AVAILABLE',
        resourceLimits: 'AVAILABLE',
      },
    });

    // Verified DirectAdmin shared hosting capabilities
    assert.equal(capabilities.php, 'AVAILABLE');
    assert.equal(capabilities.phpVersion, '8.3');
    assert.equal(capabilities.domains, 'AVAILABLE');
    assert.equal(capabilities.subdomains, 'AVAILABLE');
    assert.equal(capabilities.database, 'AVAILABLE');
    assert.equal(capabilities.dnsManagement, 'AVAILABLE');
    assert.equal(capabilities.tls, 'AVAILABLE');
    assert.equal(capabilities.ftp, 'AVAILABLE');
    assert.equal(capabilities.filesystem, 'ACCOUNT_SCOPED');
    assert.equal(capabilities.kubernetes, 'UNSUPPORTED');

    // Unprobed capabilities MUST be UNKNOWN (never fabricated as AVAILABLE)
    assert.equal(capabilities.rootAccess, 'UNKNOWN');
    assert.equal(capabilities.docker, 'UNKNOWN');
    assert.equal(capabilities.ssh, 'UNKNOWN');
    assert.equal(capabilities.nodejs, 'UNKNOWN');
    assert.equal(capabilities.cron, 'UNKNOWN');
    assert.equal(capabilities.redis, 'UNKNOWN');
    assert.equal(capabilities.resourceLimits, 'UNKNOWN');
    assert.equal(capabilities.systemd, 'UNKNOWN');
    assert.equal(capabilities.privateNetworking, 'UNKNOWN');

    // When a capability is explicitly probed and denied, it reports UNAVAILABLE
    const probedCaps = discoverDirectAdminCapabilities({
      probedCapabilities: {
        rootAccess: { probed: true, verified: true, value: false },
        docker: { probed: true, verified: true, value: false },
      },
    });
    assert.equal(probedCaps.rootAccess, 'UNAVAILABLE');
    assert.equal(probedCaps.docker, 'UNAVAILABLE');
    assert.equal(probedCaps.ssh, 'UNKNOWN');

    // Verify DirectAdminAdapter.getInstanceStatus checks real verified probe/instance state
    assert.equal(DirectAdminContract.provider, 'directadmin');
    const unverifiedAdapter = new DirectAdminAdapter();
    await assert.rejects(
      () => unverifiedAdapter.getInstanceStatus('da-inst-unprobed'),
      /capability_not_implemented_and/
    );

    const verifiedAdapter = new DirectAdminAdapter({
      createHostedApp: async (name) => ({ id: `app-${name}`, state: 'running' }),
      removeHostedApp: async () => {},
      getInstanceStatus: async (id) => ({
        id,
        state: 'running',
        health: 'healthy',
      }),
      createDatabase: async (name) => ({ id: `db-${name}`, state: 'ready' }),
      removeDatabase: async () => {},
      createAccountFILE: async (name) => ({ id: `file-${name}`, state: 'ready' }),
      createSnapshot: async () => 'snap-da-01',
      removeAccountFILE: async () => {},
    });

    const status = await verifiedAdapter.getInstanceStatus('da-hosted-app-01');
    assert.equal(status.id, 'da-hosted-app-01');
    assert.equal(status.state, 'running');
    assert.equal(status.health, 'healthy');
  });

  it('2. Universal Environment Portability Invariant & DirectAdmin -> Ubuntu VPS -> AWS/Cloud zero-code-change migration analysis', async () => {
    const twinBuilder = new TwinBuilder();
    const directAdminTwin = twinBuilder.buildDirectAdminTwin({
      environmentId: 'env-da-shared-prod',
      phpVersion: '8.3',
      domains: ['app.client.com'],
      subdomains: ['api.client.com', 'staging.client.com'],
      databases: ['client_prod_db'],
      dnsManagementAvailable: true,
      tlsAvailable: true,
      backups: [
        {
          backupId: 'da-backup-env-da-shared-prod',
          status: 'ACTIVE',
          lastBackupAt: Date.now(),
          retentionDays: 14,
        },
      ],
      probedCapabilities: {
        rootAccess: { probed: true, verified: true, value: false },
      },
    });

    const ubuntuVpsTwin = twinBuilder.buildVpsTargetTwin({
      environmentId: 'env-ubuntu-vps-prod',
      os: 'Ubuntu 24.04 LTS',
      cpuCores: 4,
      ramMb: 8192,
      diskMb: 102400,
      rootAccess: true,
      docker: true,
      systemd: true,
      privateNetworking: true,
      redis: true,
      postgresql: true,
      mysql: true,
      phpVersion: '8.3',
    });

    const releaseArtifact = createSignedReleaseArtifact({
      artifactId: 'rel-client-portal-v1.4.0',
      version: '1.4.0',
    });

    const projectModel = {
      projectId: 'proj-client-portal',
      name: 'Client Portal Application',
      language: 'php',
      framework: 'laravel',
      runtimeVersion: '8.3',
      requiredCapabilities: ['php', 'database', 'tls', 'dnsManagement', 'filesystem'],
      optionalCapabilities: ['rootAccess', 'docker', 'systemd', 'privateNetworking', 'redis'],
      externalizedEnvBindings: [...EXTERNALIZED_ENVIRONMENT_BINDINGS],
      hardcodedTargetPaths: [],
      statefulServices: ['database', 'cache', 'storage'],
      releaseArtifact,
    };

    const receipt = evaluatePortabilityMigration(
      directAdminTwin,
      ubuntuVpsTwin,
      projectModel
    );

    // Verify all 9 stages of the Universal Environment Portability Pipeline
    assert.deepEqual(receipt.pipelineStages, PORTABILITY_PIPELINE_STAGES);
    assert.equal(receipt.pipelineStages.length, 9);

    // Verify exact migration receipt invariants
    assert.equal(receipt.applicationCompatibilityPct, 100);
    assert.equal(receipt.configurationMigrationPct, 100);
    assert.equal(receipt.infrastructureMigrationRequired, true);
    assert.equal(receipt.codeChangesRequired, 0);
    assert.equal(receipt.dataMigrationRequired, true);
    assert.equal(receipt.dnsTransitionRequired, true);
    assert.equal(receipt.tlsTransitionRequired, true);
    assert.equal(receipt.secretsMigrationRequired, true);
    assert.equal(receipt.rollbackAvailable, true);
    assert.equal(receipt.recoveryPointStatus, 'CERTIFIED');

    // Verify CompatibilityAnalyzer and MigrationPlanner expose the same deterministic evaluation
    const analyzerReceipt = new CompatibilityAnalyzer().analyzePortability(
      directAdminTwin,
      ubuntuVpsTwin,
      projectModel
    );
    const plannerReceipt = new MigrationPlanner().planPortabilityMigration(
      directAdminTwin,
      ubuntuVpsTwin,
      projectModel
    );
    assert.equal(analyzerReceipt.codeChangesRequired, 0);
    assert.equal(plannerReceipt.applicationCompatibilityPct, 100);

    // Verify multi-hop chain: DirectAdmin Shared Hosting -> Ubuntu VPS -> AWS Cloud
    const awsCloudTwin = {
      ...ubuntuVpsTwin,
      environmentId: 'env-aws-cloud-prod',
      provider: {
        providerId: 'aws-cloud',
        name: 'AWS Cloud Fabric',
        type: 'CLOUD_MANAGED',
        regions: ['eu-west-1'],
      },
      cloud: {
        provider: 'aws',
        accountId: '123456789012',
        region: 'eu-west-1',
        vpcs: ['vpc-prod-01'],
        subnets: ['subnet-private-01', 'subnet-public-01'],
        computeInstances: ['ecs-service-app'],
        databases: ['rds-postgres-prod'],
        storageBuckets: ['s3://client-prod-assets-bucket'],
        iamRoles: ['arn:aws:iam::123456789012:role/app-exec'],
        dnsZones: ['app.client.com'],
        loadBalancers: ['alb-prod-01'],
        certificates: ['acm-cert-01'],
      },
    };

    const chainResult = evaluateMultiHopPortabilityChain(
      [directAdminTwin, ubuntuVpsTwin, awsCloudTwin],
      projectModel
    );
    assert.equal(chainResult.hops.length, 2);
    assert.equal(chainResult.totalCodeChangesRequired, 0);
    assert.equal(chainResult.minApplicationCompatibilityPct, 100);
    assert.equal(chainResult.artifactDigestInvariantPreserved, true);

    // Verify localized error handling in CertificationAuthority
    const certAuth = new CertificationAuthority('dummy-key');
    await assert.rejects(
      () => certAuth.generateCertificate('/nonexistent/evidence/dir/path'),
      /messages\.error\.failed_to_compile_compliance_evidence/
    );
  });

  it('3. Reproducible signed release artifact contract (SHA-256, SBOM, buildProvenance, testEvidence, signature) deploys identically across DirectAdmin and VPS profiles', () => {
    const artifact = createSignedReleaseArtifact({
      artifactId: 'rel-universal-app-v2.0.0',
      version: '2.0.0',
      sourceCommit: '9f8e7d6c5b4a3210fedcba9876543210abcdef12',
      componentsCount: 64,
      testsPassed: 210,
    });

    assert.equal(artifact.sha256.length, 64);
    assert.equal(artifact.sbom.format, 'CycloneDX');
    assert.equal(artifact.sbom.componentsCount, 64);
    assert.equal(artifact.buildProvenance.reproducible, true);
    assert.equal(artifact.testEvidence.passed, 210);
    assert.equal(artifact.testEvidence.failed, 0);
    assert.equal(artifact.signature.length, 64);

    const directAdminTwin = DirectAdminTarget.discoverEnvironmentTwin({
      environmentId: 'env-da-01',
    });
    const vpsTwin = new TwinBuilder().buildVpsTargetTwin({
      environmentId: 'env-vps-01',
    });

    const daProfile = compileDeploymentProfile(directAdminTwin, artifact.sha256);
    const vpsProfile = compileDeploymentProfile(vpsTwin, artifact.sha256);

    // Both deployment profiles bind to the exact same immutable release artifact SHA-256
    assert.equal(daProfile.artifactSha256, artifact.sha256);
    assert.equal(vpsProfile.artifactSha256, artifact.sha256);
    assert.notEqual(daProfile.bindings.RUNTIME_PROFILE, vpsProfile.bindings.RUNTIME_PROFILE);
    assert.notEqual(daProfile.bindings.STORAGE_PROVIDER, vpsProfile.bindings.STORAGE_PROVIDER);

    const daVerification = verifyReleaseArtifactForProfile(artifact, daProfile);
    const vpsVerification = verifyReleaseArtifactForProfile(artifact, vpsProfile);

    assert.equal(daVerification.verified, true);
    assert.equal(daVerification.artifactDigestMatchesProfile, true);
    assert.equal(daVerification.sbomVerified, true);
    assert.equal(daVerification.provenanceVerified, true);
    assert.equal(daVerification.testEvidenceVerified, true);
    assert.equal(daVerification.signatureVerified, true);

    assert.equal(vpsVerification.verified, true);
    assert.equal(vpsVerification.artifactDigestMatchesProfile, true);
  });

  it('4. Server-authoritative commercial upgrade (CAPABILITY_NOT_ENTITLED -> SUBSCRIPTION_ACTIVATED) grants Professional capability immediately without client binary reinstall', async () => {
    const gate = new ServerAuthoritativeEntitlementGate();
    const tenantId = 'tenant-acme-01';
    const immutableClientBinaryDigest =
      'sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4';

    gate.registerTenant(tenantId, 'COMMUNITY', immutableClientBinaryDigest);

    // Community tier allows local build and single-target deploy
    const communityAllowed = gate.authorizeCapability(
      tenantId,
      'DEPLOY.SINGLE_TARGET',
      immutableClientBinaryDigest
    );
    assert.equal(communityAllowed.allowed, true);
    assert.equal(communityAllowed.code, 'ENTITLEMENT_VERIFIED');

    // Community tier denies DELIVERY.PREVIEW with CAPABILITY_NOT_ENTITLED
    const previewDenied = gate.authorizeCapability(
      tenantId,
      'DELIVERY.PREVIEW',
      immutableClientBinaryDigest
    );
    assert.equal(previewDenied.allowed, false);
    assert.equal(previewDenied.code, 'CAPABILITY_NOT_ENTITLED');
    assert.equal(previewDenied.currentTier, 'COMMUNITY');
    assert.equal(previewDenied.requiredTier, 'PROFESSIONAL');
    assert.equal(previewDenied.upgradePath, 'SUBSCRIPTION_UPGRADE');
    assert.equal(previewDenied.clientReinstallRequired, false);
    assert.equal(previewDenied.clientBinaryDigest, immutableClientBinaryDigest);

    // Server processes SUBSCRIPTION_ACTIVATED event for Professional tier
    const upgradeEventResult = gate.processSubscriptionEvent({
      eventId: 'evt-sub-activated-001',
      eventType: 'SUBSCRIPTION_ACTIVATED',
      tenantId,
      newTier: 'PROFESSIONAL',
      timestamp: new Date().toISOString(),
    });

    assert.equal(upgradeEventResult.previousTier, 'COMMUNITY');
    assert.equal(upgradeEventResult.activeTier, 'PROFESSIONAL');
    assert.equal(upgradeEventResult.clientReinstallRequired, false);
    assert.equal(upgradeEventResult.clientBinaryDigest, immutableClientBinaryDigest);
    assert.ok(upgradeEventResult.entitledCapabilities.includes('DELIVERY.PREVIEW'));
    assert.ok(upgradeEventResult.entitledCapabilities.includes('MOVE.MIGRATE'));

    // Immediately re-authorize DELIVERY.PREVIEW with the exact same client binary
    const previewGranted = gate.authorizeCapability(
      tenantId,
      'DELIVERY.PREVIEW',
      immutableClientBinaryDigest
    );
    assert.equal(previewGranted.allowed, true);
    assert.equal(previewGranted.code, 'ENTITLEMENT_VERIFIED');
    assert.equal(previewGranted.currentTier, 'PROFESSIONAL');
    assert.equal(previewGranted.clientReinstallRequired, false);
    assert.equal(previewGranted.clientBinaryDigest, immutableClientBinaryDigest);
    assert.ok(previewGranted.passport);

    // Validate the issued passport through CapabilityValidator
    const capabilityValidator = new CapabilityValidator();
    await capabilityValidator.validate(previewGranted.passport, {
      id: 'ctx-preview-01',
      requiredCapabilities: ['DELIVERY.PREVIEW', 'MOVE.MIGRATE'],
    });
  });
});
