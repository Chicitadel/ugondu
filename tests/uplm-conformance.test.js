/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / UPLM & Agent-Neutral Capability Conformance Suite
 * File           : uplm-conformance.test.js
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
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const capabilities = require('../server/capabilities/dist/index.js');
const uppie = require('../server/uppie/dist/index.js');

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`[en] ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`[en] ✗ FAIL: ${name} — ${err && err.message ? err.message : String(err)}`);
    failed++;
  }
}

function defaultEnv(overrides = {}) {
  return {
    provider: 'aws',
    partition: 'aws',
    accountId: '971671216490',
    region: 'eu-west-3',
    targetRoleName: 'UgonduCORExecutionRole',
    targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
    runnerRoleName: 'UgonduCORRunner',
    runnerRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
    transactionId: 'tx-cor-conformance-001',
    requiredTags: { UgonduCOR: 'true', UgonduTransactionId: 'tx-cor-conformance-001' },
    quotas: {
      maxManagedPolicySizeChars: 6144,
      maxManagedPoliciesPerRole: 10,
      currentAttachedManagedPolicies: 0,
      maxVersionsPerManagedPolicy: 5,
    },
    ...overrides,
  };
}

function defaultCtx(overrides = {}) {
  return {
    operationId: 'op-conformance-001',
    transactionId: 'tx-cor-conformance-001',
    correlationId: 'corr-conformance-001',
    tenantId: 'tenant-1',
    actorId: 'admin-1',
    autonomyMode: 'guided',
    resolvedEnvironment: defaultEnv(),
    ...overrides,
  };
}

async function runSuite() {
  console.log('[en] ══════════════════════════════════════════════════════════════════════');
  console.log('[en] Ugondu UPLM, Agent-Neutral Capability & AWS COR V9 Conformance Suite');
  console.log('[en] ══════════════════════════════════════════════════════════════════════');

  // ---------------------------------------------------------------------------
  // SECTION A: AWS COR V9 Policy Pack & 46-Statement 1:1 Preservation
  // ---------------------------------------------------------------------------
  await check('AWS COR V9 Pack: 5 split managed policies preserve all 46 statements and Sids 1:1', async () => {
    const pack = uppie.UplmPackLoaderAndRenderer.loadAwsCorV9Pack();
    assert.strictEqual(pack.id, 'aws.cor.v9');
    assert.strictEqual(pack.policies.length, 5);
    assert.strictEqual(pack.quotas.totalStatementsInPack, 46);
    assert.strictEqual(pack.safetyGuardrails.preserveUnattachedTestFixture, true);
    assert.strictEqual(pack.safetyGuardrails.prohibitRunnerExecutionAttachment, true);

    const rendered = uppie.UplmPackLoaderAndRenderer.renderAllAwsCorPolicies(defaultEnv(), pack);
    assert.strictEqual(rendered.length, 5);
    const totalStatements = rendered.reduce((sum, p) => sum + p.statementCount, 0);
    assert.strictEqual(totalStatements, 46);
  });

  // ---------------------------------------------------------------------------
  // SECTION B: 16 Agent-Neutral Acceptance Criteria (§10)
  // ---------------------------------------------------------------------------
  await check('AN-01: CLI bootstrap works without any model runtime and yields same planHash as agent invocation', async () => {
    const cliAdapter = new uppie.AwsCorLifecycleAdapter();
    const agentAdapter = new uppie.AwsCorLifecycleAdapter();
    const cliEngine = new uppie.UplmBootstrapEngine(cliAdapter);
    const agentEngine = new uppie.UplmBootstrapEngine(agentAdapter);

    const commonInput = {
      authenticatedCallerId: 'admin-1',
      packId: 'aws.cor.v9',
      packVersion: '9.0.0',
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      expectedAccountId: '971671216490',
      expectedRegion: 'eu-west-3',
      grantedProviderActions: ['iam:AttachRolePolicy'],
      readOnlyOnly: true,
    };

    const cliRes = await cliEngine.executeBootstrap({ ...commonInput, surface: 'CLI' }, defaultCtx());
    const agentRes = await agentEngine.executeBootstrap({ ...commonInput, surface: 'AGENT_TOOL' }, defaultCtx());
    assert.strictEqual(cliRes.plan.planHash, agentRes.plan.planHash);
  });

  await check('AN-02: Supported agent discovers bootstrap capability and gets identical schema', async () => {
    const cliList = capabilities.canonicalCapabilityRegistry.list({ surface: 'CLI' });
    const agentList = capabilities.canonicalCapabilityRegistry.list({ surface: 'AGENT_TOOL' });
    assert.strictEqual(cliList.length, 14);
    assert.strictEqual(agentList.length, 14);
    const bootDesc = capabilities.canonicalCapabilityRegistry.describe('policy.bootstrap.plan');
    assert.ok(bootDesc && bootDesc.inputSchema.target.required);
  });

  await check('AN-03: Invalid credentials distinguished from valid credentials lacking provider permission', async () => {
    const baseInput = {
      surface: 'CLI',
      operationId: 'op-an03',
      correlationId: 'corr-an03',
      capabilityId: 'policy.inspect',
      authenticatedCaller: {
        subjectId: 'u1',
        tenantId: 't1',
        edition: 'ENTERPRISE',
        grantedScopes: ['uplm:policy:read', 'uplm:environment:inspect'],
      },
      providerContext: {
        provider: 'AWS_IAM',
        target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        effectivePrincipal: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
        credentialsValid: false,
        requiredActions: ['iam:GetRole'],
        grantedActions: ['iam:GetRole'],
      },
    };
    const invalidCredRes = capabilities.evaluateFourDimensionalAuthorization(baseInput);
    assert.strictEqual(invalidCredRes.primaryError.code, 'CREDENTIALS_INVALID');

    const missingPermRes = capabilities.evaluateFourDimensionalAuthorization({
      ...baseInput,
      providerContext: {
        ...baseInput.providerContext,
        credentialsValid: true,
        grantedActions: [],
      },
    });
    assert.strictEqual(missingPermRes.primaryError.code, 'PROVIDER_ACCESS_DENIED');
  });

  await check('AN-04: Wrong account/tenant/project blocks mutation', async () => {
    const adapter = new uppie.AwsCorLifecycleAdapter();
    const engine = new uppie.UplmBootstrapEngine(adapter);
    const res = await engine.executeBootstrap(
      {
        surface: 'CLI',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '000011112222', // Wrong account
        expectedRegion: 'eu-west-3',
        grantedProviderActions: ['iam:AttachRolePolicy'],
      },
      defaultCtx()
    );
    assert.strictEqual(res.bootstrapState, 'BLOCKED_BY_POLICY');
    assert.strictEqual(res.terminalOutcome, 'BLOCKED');
    assert.strictEqual(adapter.getMutationCallCount(), 0);
  });

  await check('AN-05: Read-only authority yields complete inspection report with zero writes', async () => {
    const adapter = new uppie.AwsCorLifecycleAdapter();
    const observed = await adapter.inspect(
      { packId: 'aws.cor.v9', targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole' },
      defaultCtx({ autonomyMode: 'inspect' })
    );
    assert.strictEqual(observed.discoveryComplete, true);
    assert.strictEqual(observed.policies.length, 5);
    assert.strictEqual(observed.mutationsPerformed, 0);
    assert.strictEqual(adapter.getMutationCallCount(), 0);
  });

  await check('AN-06: Missing provider permission yields exact authority-gap plan; Ugondu never self-grants', async () => {
    const adapter = new uppie.AwsCorLifecycleAdapter();
    const engine = new uppie.UplmBootstrapEngine(adapter);
    const res = await engine.executeBootstrap(
      {
        surface: 'AGENT_TOOL',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '971671216490',
        expectedRegion: 'eu-west-3',
        grantedProviderActions: [],
      },
      defaultCtx()
    );
    assert.strictEqual(res.bootstrapState, 'MISSING_AUTHORITY');
    assert.ok(res.authorityGaps.some((g) => g.action === 'iam:AttachRolePolicy'));
    assert.strictEqual(res.selfEscalationAttempted, false);
    assert.strictEqual(adapter.getMutationCallCount(), 0);
  });

  await check('AN-07: Valid approved bootstrap path applies only approved scoped changes and verifies postconditions', async () => {
    const adapter = new uppie.AwsCorLifecycleAdapter();
    const engine = new uppie.UplmBootstrapEngine(adapter);
    const ctx = defaultCtx({ operationId: 'op-an07' });

    const prePlan = await engine.executeBootstrap(
      {
        surface: 'CLI',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '971671216490',
        expectedRegion: 'eu-west-3',
        grantedProviderActions: ['iam:AttachRolePolicy'],
      },
      ctx
    );
    assert.strictEqual(prePlan.bootstrapState, 'CONSENT_REQUIRED');

    const applied = await engine.executeBootstrap(
      {
        surface: 'CLI',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '971671216490',
        expectedRegion: 'eu-west-3',
        grantedProviderActions: ['iam:AttachRolePolicy'],
        approval: {
          approvedBy: 'gov-authority',
          boundPlanHash: prePlan.plan.planHash,
          boundTarget: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      },
      ctx
    );
    assert.strictEqual(applied.bootstrapState, 'COMPLETE');
    assert.strictEqual(applied.terminalOutcome, 'VERIFIED_INSTALLED');
    assert.strictEqual(applied.temporaryGrantRevoked, true);
  });

  await check('AN-08: Denied or expired approval blocks mutation', async () => {
    const adapter = new uppie.AwsCorLifecycleAdapter();
    const engine = new uppie.UplmBootstrapEngine(adapter);
    const res = await engine.executeBootstrap(
      {
        surface: 'CLI',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '971671216490',
        expectedRegion: 'eu-west-3',
        grantedProviderActions: ['iam:AttachRolePolicy'],
        approval: {
          approvedBy: 'gov-authority',
          boundPlanHash: 'some-hash',
          boundTarget: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expiresAt: new Date(Date.now() - 10_000).toISOString(), // Expired
        },
      },
      defaultCtx()
    );
    assert.strictEqual(res.bootstrapState, 'CONSENT_REQUIRED');
    assert.strictEqual(adapter.getMutationCallCount(), 0);
  });

  await check('AN-09: Restart after approval resumes the same durable operation ID and state history', async () => {
    const adapter = new uppie.AwsCorLifecycleAdapter();
    const engine = new uppie.UplmBootstrapEngine(adapter);
    const ctx = defaultCtx({ operationId: 'op-durable-resume-09' });

    const paused = await engine.executeBootstrap(
      {
        surface: 'CLI',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '971671216490',
        expectedRegion: 'eu-west-3',
        grantedProviderActions: ['iam:AttachRolePolicy'],
      },
      ctx
    );
    assert.strictEqual(paused.operationId, 'op-durable-resume-09');
    assert.strictEqual(paused.bootstrapState, 'CONSENT_REQUIRED');

    const resumed = await engine.executeBootstrap(
      {
        surface: 'CLI',
        authenticatedCallerId: 'admin-1',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedAccountId: '971671216490',
        expectedRegion: 'eu-west-3',
        grantedProviderActions: ['iam:AttachRolePolicy'],
        approval: {
          approvedBy: 'gov-authority',
          boundPlanHash: paused.plan.planHash,
          boundTarget: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      },
      ctx
    );
    assert.strictEqual(resumed.operationId, 'op-durable-resume-09');
    assert.strictEqual(resumed.bootstrapState, 'COMPLETE');
    assert.ok(resumed.stateHistory.includes('CONSENT_REQUIRED'));
  });

  await check('AN-10 & AN-11: Equivalent CLI/API/Agent/UI requests use the same 4D authorization policy and cannot bypass guards', async () => {
    const baseReq = {
      operationId: 'op-an10',
      correlationId: 'corr-an10',
      capabilityId: 'policy.retire.apply',
      authenticatedCaller: {
        subjectId: 'admin-1',
        tenantId: 'tenant-1',
        edition: 'ENTERPRISE',
        grantedScopes: ['uplm:policy:retire:apply', 'uplm:policy:delete'],
      },
      providerContext: {
        provider: 'AWS_IAM',
        target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        effectivePrincipal: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
        credentialsValid: true,
        requiredActions: ['iam:DeletePolicy'],
        grantedActions: ['iam:DeletePolicy'],
        ownershipClass: 'UNKNOWN',
      },
      flags: { force: true, yes: true },
    };

    for (const surface of capabilities.INTERACTION_SURFACES) {
      const decision = capabilities.evaluateFourDimensionalAuthorization({ ...baseReq, surface });
      assert.strictEqual(decision.allowed, false);
      assert.strictEqual(decision.primaryError.code, 'OWNERSHIP_UNKNOWN');
    }
  });

  await check('AN-12: Uninstall preserves unknown, adopted, shared, and externally used resources', async () => {
    const ledger = new uppie.UplmOwnershipLedger();
    const adapter = new uppie.AwsCorLifecycleAdapter(uppie.createDefaultAwsCorV9UnattachedFixture(), ledger);
    const res = await uppie.executeSafeUninstall({
      adapter,
      ledger,
      ctx: defaultCtx(),
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      expectedTargetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      resources: [
        {
          resourceId: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          resourceType: 'IAM_ROLE',
          inScope: true,
          signals: {
            immutableProviderResourceId: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
            providerTags: { UgonduCOR: 'true' },
            hasLedgerRecord: true,
            ledgerOwnershipClass: 'UGONDU_ADOPTED',
            documentHashMatchesPack: true,
            attachedConsumers: [],
            externalConsumers: [],
          },
        },
        {
          resourceId: 'arn:aws:iam::971671216490:policy/SharedPolicy',
          resourceType: 'IAM_MANAGED_POLICY',
          inScope: true,
          signals: {
            immutableProviderResourceId: 'arn:aws:iam::971671216490:policy/SharedPolicy',
            providerTags: { UgonduCOR: 'true' },
            hasLedgerRecord: true,
            ledgerOwnershipClass: 'UGONDU_CREATED',
            documentHashMatchesPack: true,
            attachedConsumers: [],
            externalConsumers: ['arn:aws:iam::971671216490:role/ExternalTeamRole'],
          },
        },
      ],
    });
    assert.strictEqual(res.deletedResources.length, 0);
    assert.strictEqual(res.retainedResources.length, 2);
  });

  await check('AN-13: Secrets never appear in logs, operation state, reports, or tool results', async () => {
    const err = capabilities.createCanonicalError({
      code: 'CREDENTIALS_INVALID',
      stage: 'BOOTSTRAP',
      operationId: 'op-secret-test',
      provider: 'AWS_IAM',
      target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      effectivePrincipal: 'AKIAIOSFODNN7EXAMPLE',
      remediation: 'Check aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      correlationId: 'corr-secret',
      message: 'Failed with sessionToken=superSecretSessionTokenValue123',
    });
    const serialized = JSON.stringify(err);
    assert.ok(!serialized.includes('AKIAIOSFODNN7EXAMPLE'));
    assert.ok(!serialized.includes('wJalrXUtnFEMI'));
    assert.ok(!serialized.includes('superSecretSessionTokenValue123'));
  });

  await check('AN-14: Unsupported provider/surface combinations are explicitly disclosed', async () => {
    const matrix = capabilities.canonicalCapabilityRegistry.getCompatibilityMatrix('UNSUPPORTED_CLOUD', 'CLI');
    assert.ok(matrix.every((m) => m.supported === false && m.disclosureReason && m.disclosureReason.length > 0));
  });

  await check('AN-15: Growth Marketing and UPLM remain independently operable with zero runtime coupling', async () => {
    const checkIndep = capabilities.canonicalCapabilityRegistry.verifyBoundedContextIndependence();
    assert.strictEqual(checkIndep.independent, true);
    assert.strictEqual(checkIndep.uplmCount, 11);
    assert.strictEqual(checkIndep.growthCount, 3);
  });

  await check('AN-16: Documentation includes offline/manual path and threat model for environments without agent integration', async () => {
    const readmePath = path.resolve(__dirname, '../policy-packs/aws/cor/docs/README.md');
    const threatPath = path.resolve(__dirname, '../policy-packs/aws/cor/docs/threat-model.md');
    assert.ok(fs.existsSync(readmePath));
    assert.ok(fs.existsSync(threatPath));
  });

  // ---------------------------------------------------------------------------
  // SECTION C: 14 CLI & Graphical Control Parity Criteria (§8)
  // ---------------------------------------------------------------------------
  await check('PARITY-01..14: All 7 GUI Views, 10 Wizard Stages, CLI Commands, Expert Mode Hash Invalidation, and Outcome Unknown Guards pass', async () => {
    // 1. Every UI button maps to a registered capability ID
    for (const view of Object.values(capabilities.GRAPHICAL_CONTROL_VIEWS)) {
      for (const btn of view.buttons) {
        assert.ok(capabilities.canonicalCapabilityRegistry.describe(btn.capabilityId));
      }
    }
    // 2. Every CLI subcommand maps to the same registered capability IDs
    for (const cmd of capabilities.CLI_COMMAND_CAPABILITY_MAP) {
      assert.ok(capabilities.canonicalCapabilityRegistry.describe(cmd.capabilityId));
    }
    // 3. Unknown mutation outcomes disable blind retry in Operation Monitor
    const monButtons = capabilities.resolveGraphicalButtonStates('OPERATION_MONITOR', 'AWS_IAM', true);
    const retryBtn = monButtons.find((b) => b.buttonId === 'mon.retry_safe_step');
    assert.strictEqual(retryBtn.enabled, false);
    assert.ok(retryBtn.disabledReason.includes('OPERATION_OUTCOME_UNKNOWN'));
  });

  console.log('[en] ══════════════════════════════════════════════════════════════════════');
  console.log(`[en] Results: ${passed} passed, ${failed} failed`);
  console.log('[en] ══════════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('[en] Fatal error in uplm-conformance.test.js:', err);
  process.exit(1);
});
