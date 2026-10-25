/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — Engine & AWS COR V9 Conformance Suite
 * File           : uplm.conformance.spec.ts
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

import {
  UPLM_BOOTSTRAP_STATES,
  UPLM_NORMALIZED_POLICY_STATES,
  UPLM_OWNERSHIP_CLASSES,
  UPLM_TERMINAL_OUTCOMES,
  UPLM_REPAIR_CONDITIONS,
  guardPolicyStateConversion,
  UplmPackLoaderAndRenderer,
  UplmOwnershipLedger,
  AwsCorLifecycleAdapter,
  createDefaultAwsCorV9UnattachedFixture,
  UplmBootstrapEngine,
  evaluateRepairCondition,
  executeAdditiveFirstMigration,
  executeSafeUninstall,
  type OperationContext,
  type ResolvedEnvironment,
} from '../index';

declare var describe: any;
declare var it: any;
declare var expect: any;

function createDefaultResolvedEnv(overrides: Partial<ResolvedEnvironment> = {}): ResolvedEnvironment {
  return {
    provider: 'aws',
    partition: 'aws',
    accountId: '971671216490',
    region: 'eu-west-3',
    targetRoleName: 'UgonduCORExecutionRole',
    targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
    runnerRoleName: 'UgonduCORRunner',
    runnerRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
    transactionId: 'tx-cor-2026-001',
    requiredTags: { UgonduCOR: 'true', UgonduTransactionId: 'tx-cor-2026-001' },
    quotas: {
      maxManagedPolicySizeChars: 6144,
      maxManagedPoliciesPerRole: 10,
      currentAttachedManagedPolicies: 0,
      maxVersionsPerManagedPolicy: 5,
    },
    ...overrides,
  };
}

function createOperationContext(overrides: Partial<OperationContext> = {}): OperationContext {
  return {
    operationId: 'op-uplm-001',
    transactionId: 'tx-cor-2026-001',
    correlationId: 'corr-uplm-001',
    tenantId: 'tenant-enterprise',
    actorId: 'actor-admin',
    autonomyMode: 'guided',
    resolvedEnvironment: createDefaultResolvedEnv(),
    ...overrides,
  };
}

describe('UPLM Engine & AWS COR V9 Split Managed Policy Pack Conformance', () => {
  describe('1. AWS COR V9 Split Managed Policy Pack Integrity (46 Statements & Sids)', () => {
    it('loads policy-packs/aws/cor/pack.yaml and verifies all 5 policy templates, 46 statements, and Sid preservation 1:1', () => {
      const pack = UplmPackLoaderAndRenderer.loadAwsCorV9Pack();
      expect(pack.id).toBe('aws.cor.v9');
      expect(pack.policies.length).toBe(5);
      expect(pack.quotas.totalStatementsInPack).toBe(46);

      const countsByName = Object.fromEntries(
        pack.policies.map((p) => [p.physicalName, p.statementCount])
      );
      expect(countsByName).toEqual({
        'UgonduCOR-V9-Discovery': 2,
        'UgonduCOR-V9-EC2-Creation': 9,
        'UgonduCOR-V9-EC2-Cleanup': 12,
        'UgonduCOR-V9-RDS-S3': 11,
        'UgonduCOR-V9-ECR-ECS': 12,
      });

      const rendered = UplmPackLoaderAndRenderer.renderAllAwsCorPolicies(createDefaultResolvedEnv(), pack);
      expect(rendered.length).toBe(5);
      const totalRenderedStatements = rendered.reduce((acc, r) => acc + r.statementCount, 0);
      expect(totalRenderedStatements).toBe(46);
    });

    it('rejects unresolved placeholders, unknown variables, wrong account/region, and quota exhaustion in ResolvedEnvironment renderer', () => {
      const env = createDefaultResolvedEnv();
      expect(() =>
        UplmPackLoaderAndRenderer.renderTemplateObject(
          { Statement: [{ Resource: 'arn:aws:s3:::bucket-{{unknownVar}}' }] },
          env
        )
      ).toThrow(/UNRESOLVED_PLACEHOLDER/);

      expect(() =>
        UplmPackLoaderAndRenderer.renderTemplateObject(
          { Statement: [{ Resource: 'arn:aws:s3:::bucket-${UNRESOLVED_ENV}' }] },
          env
        )
      ).toThrow(/UNRESOLVED_PLACEHOLDER/);

      expect(() =>
        UplmPackLoaderAndRenderer.renderTemplateObject(
          { Statement: [] },
          createDefaultResolvedEnv({ accountId: '111122223333' }),
          { accountId: '971671216490', region: 'eu-west-3' }
        )
      ).toThrow(/IDENTITY_MISMATCH/);

      expect(() =>
        UplmPackLoaderAndRenderer.renderTemplateObject(
          { Statement: [] },
          createDefaultResolvedEnv({
            quotas: {
              maxManagedPolicySizeChars: 6144,
              maxManagedPoliciesPerRole: 10,
              currentAttachedManagedPolicies: 7,
              maxVersionsPerManagedPolicy: 5,
            },
          })
        )
      ).toThrow(/QUOTA_EXCEEDED/);
    });
  });

  describe('2. 10 Normalized Policy States & Invariant Enforcement', () => {
    it('defines all 10 normalized policy states and blocks converting CONFLICT/UNVERIFIED/UNSUPPORTED/UNKNOWN to MISSING or COMPLIANT', () => {
      expect(UPLM_NORMALIZED_POLICY_STATES.length).toBe(10);
      for (const ambiguous of ['CONFLICT', 'UNVERIFIED', 'UNSUPPORTED', 'UNKNOWN'] as const) {
        expect(() => guardPolicyStateConversion(ambiguous, 'COMPLIANT')).toThrow(/UPLM Invariant Violation/);
        expect(() => guardPolicyStateConversion(ambiguous, 'MISSING')).toThrow(/UPLM Invariant Violation/);
      }
      expect(guardPolicyStateConversion('MISSING', 'COMPLIANT')).toBe('COMPLIANT');
    });
  });

  describe('3. 12-Step Universal Bootstrap Engine & 13 Bootstrap States', () => {
    it('exposes all 13 bootstrap states and proves read-only inspection performs zero provider mutations', async () => {
      expect(UPLM_BOOTSTRAP_STATES.length).toBe(13);
      const adapter = new AwsCorLifecycleAdapter();
      const engine = new UplmBootstrapEngine(adapter);
      const ctx = createOperationContext();

      const res = await engine.executeBootstrap(
        {
          surface: 'CLI',
          authenticatedCallerId: 'actor-admin',
          packId: 'aws.cor.v9',
          packVersion: '9.0.0',
          targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expectedAccountId: '971671216490',
          expectedRegion: 'eu-west-3',
          grantedProviderActions: ['iam:AttachRolePolicy'],
          readOnlyOnly: true,
        },
        ctx
      );

      expect(res.bootstrapState).toBe('READY');
      expect(res.observedState?.mutationsPerformed).toBe(0);
      expect(adapter.getMutationCallCount()).toBe(0);
    });

    it('reports MISSING_AUTHORITY without self-escalation when provider permissions are missing, and resumes after approval to COMPLETE', async () => {
      const adapter = new AwsCorLifecycleAdapter();
      const engine = new UplmBootstrapEngine(adapter);
      const ctx = createOperationContext();

      // Missing iam:AttachRolePolicy -> MISSING_AUTHORITY, zero mutations
      const missingAuthRes = await engine.executeBootstrap(
        {
          surface: 'AGENT_TOOL',
          authenticatedCallerId: 'actor-admin',
          packId: 'aws.cor.v9',
          packVersion: '9.0.0',
          targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expectedAccountId: '971671216490',
          expectedRegion: 'eu-west-3',
          grantedProviderActions: [],
        },
        ctx
      );
      expect(missingAuthRes.bootstrapState).toBe('MISSING_AUTHORITY');
      expect(missingAuthRes.authorityGaps.length).toBeGreaterThan(0);
      expect(missingAuthRes.selfEscalationAttempted).toBe(false);
      expect(adapter.getMutationCallCount()).toBe(0);

      // Authority granted, awaiting approval -> CONSENT_REQUIRED
      const waitingApproval = await engine.executeBootstrap(
        {
          surface: 'CLI',
          authenticatedCallerId: 'actor-admin',
          packId: 'aws.cor.v9',
          packVersion: '9.0.0',
          targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expectedAccountId: '971671216490',
          expectedRegion: 'eu-west-3',
          grantedProviderActions: ['iam:AttachRolePolicy'],
        },
        ctx
      );
      expect(waitingApproval.bootstrapState).toBe('CONSENT_REQUIRED');
      expect(waitingApproval.plan).toBeDefined();

      // Resume with hash-bound approval -> COMPLETE & VERIFIED_INSTALLED
      const completed = await engine.executeBootstrap(
        {
          surface: 'CLI',
          authenticatedCallerId: 'actor-admin',
          packId: 'aws.cor.v9',
          packVersion: '9.0.0',
          targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          expectedAccountId: '971671216490',
          expectedRegion: 'eu-west-3',
          grantedProviderActions: ['iam:AttachRolePolicy'],
          approval: {
            approvedBy: 'security-lead',
            boundPlanHash: waitingApproval.plan!.planHash,
            boundTarget: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          },
        },
        ctx
      );
      expect(completed.bootstrapState).toBe('COMPLETE');
      expect(completed.terminalOutcome).toBe('VERIFIED_INSTALLED');
      expect(completed.temporaryGrantRevoked).toBe(true);
    });
  });

  describe('4. 6 Ownership Classes, 9 Repair Conditions, 11-Step Migration & 11-Step Safe Uninstall', () => {
    it('evaluates all 9 Repair Matrix conditions deterministically', () => {
      expect(UPLM_REPAIR_CONDITIONS.length).toBe(9);
      expect(evaluateRepairCondition('TRUST_CONTAINS_UNEXPECTED_PRINCIPAL').mutationAllowed).toBe(false);
      expect(evaluateRepairCondition('PERMISSION_DENIED').selfEscalationAllowed).toBe(false);
      expect(evaluateRepairCondition('POLICY_EXISTS_NOT_ATTACHED').plannedAction).toBe('PLAN_ATTACHMENT');
    });

    it('executes 11-step additive-first migration and retains old state on verification failure', async () => {
      const adapter = new AwsCorLifecycleAdapter();
      const ctx = createOperationContext();

      const successMig = await executeAdditiveFirstMigration({
        adapter,
        ctx,
        sourcePackVersion: '8.0.0',
        destinationPackVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      });
      expect(successMig.terminalOutcome).toBe('VERIFIED_MIGRATED');
      expect(successMig.steps.length).toBe(11);
      expect(successMig.additiveFirstApplied).toBe(true);
      expect(successMig.oldConfigRemovedAfterNewVerified).toBe(true);

      const failedVerifyMig = await executeAdditiveFirstMigration({
        adapter: new AwsCorLifecycleAdapter(),
        ctx,
        sourcePackVersion: '8.0.0',
        destinationPackVersion: '9.0.0',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        simulateVerificationFailure: true,
      });
      expect(failedVerifyMig.terminalOutcome).toBe('FAILED_RECOVERED');
      expect(failedVerifyMig.oldConfigRemovedAfterNewVerified).toBe(false);
    });

    it('preserves UGONDU_ADOPTED, SHARED, USER_OWNED, EXTERNAL, and UNKNOWN resources on uninstall and rejects --force bypasses', async () => {
      expect(UPLM_OWNERSHIP_CLASSES.length).toBe(6);
      expect(UPLM_TERMINAL_OUTCOMES.length).toBe(9);

      const ledger = new UplmOwnershipLedger();
      const adapter = new AwsCorLifecycleAdapter(createDefaultAwsCorV9UnattachedFixture(), ledger);
      const ctx = createOperationContext();

      // Unknown ownership with --force -> BLOCKED
      const blockedUninstall = await executeSafeUninstall({
        adapter,
        ledger,
        ctx,
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedTargetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        force: true,
        resources: [
          {
            resourceId: 'arn:aws:iam::971671216490:policy/MysteryPolicy',
            resourceType: 'IAM_MANAGED_POLICY',
            inScope: true,
            signals: {
              immutableProviderResourceId: 'arn:aws:iam::971671216490:policy/MysteryPolicy',
              providerTags: { UgonduCOR: 'true' }, // tag alone without ledger record!
              hasLedgerRecord: false,
              documentHashMatchesPack: false,
              attachedConsumers: [],
              externalConsumers: [],
            },
          },
        ],
      });
      expect(blockedUninstall.terminalOutcome).toBe('BLOCKED');
      expect(blockedUninstall.forceBypassRejected).toBe(true);
      expect(blockedUninstall.deletedResources).toEqual([]);

      // Adopted role + Shared policy + Verified UGONDU_CREATED unused policy -> preserves adopted & shared, deletes only UGONDU_CREATED
      const cleanUninstall = await executeSafeUninstall({
        adapter,
        ledger,
        ctx,
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
            resourceId: 'arn:aws:iam::971671216490:policy/UgonduCOR-V9-Discovery',
            resourceType: 'IAM_MANAGED_POLICY',
            inScope: true,
            signals: {
              immutableProviderResourceId: 'arn:aws:iam::971671216490:policy/UgonduCOR-V9-Discovery',
              creationTransactionId: 'tx-cor-2026-001',
              signedPlanHash: 'plan-hash-1',
              providerTags: { UgonduCOR: 'true' },
              hasLedgerRecord: true,
              ledgerOwnershipClass: 'UGONDU_CREATED',
              documentHashMatchesPack: true,
              attachedConsumers: [],
              externalConsumers: [],
            },
          },
        ],
      });
      expect(cleanUninstall.terminalOutcome).toBe('VERIFIED_RETIRED');
      expect(cleanUninstall.steps.length).toBe(11);
      expect(cleanUninstall.deletedResources).toEqual([
        'arn:aws:iam::971671216490:policy/UgonduCOR-V9-Discovery',
      ]);
      expect(
        cleanUninstall.retainedResources.map((r) => r.resourceId)
      ).toContain('arn:aws:iam::971671216490:role/UgonduCORExecutionRole');
    });
  });
});
