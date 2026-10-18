/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Agent-Neutral Capability & CLI/GUI Conformance Suite
 * File           : agent-neutral.conformance.spec.ts
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
  CANONICAL_UGONDU_EDITIONS,
  UGONDU_EDITIONS,
  EDITION_RANK,
  meetsEditionRequirement,
  normalizeEdition,
  parseEdition,
  UPLM_CAPABILITY_IDS,
  GROWTH_MARKETING_CAPABILITY_IDS,
  UPLM_ERROR_CODES,
  CLI_EXIT_CODES,
  INTERACTION_SURFACES,
  canonicalCapabilityRegistry,
  evaluateFourDimensionalAuthorization,
  redactSensitiveText,
  redactSensitiveObject,
  GRAPHICAL_CONTROL_VIEWS,
  BOOTSTRAP_WIZARD_STAGES,
  CLI_COMMAND_CAPABILITY_MAP,
  computeExpertPlanHash,
  editExpertPlan,
  resolveGraphicalButtonStates,
  type ExpertPlanState,
  type UniversalAuthorizationInput,
} from '../index';

declare var describe: any;
declare var it: any;
declare var expect: any;

describe('Agent-Neutral Capability Contract, 4D Authorization & CLI/GUI Parity Suite', () => {
  describe('1. Canonical 5-Tier Edition Alignment & Backward Compatibility', () => {
    it('aligns CANONICAL_UGONDU_EDITIONS with COMMUNITY, PROFESSIONAL, BUSINESS, ENTERPRISE, SOVEREIGN and preserves FREE alias', () => {
      expect(CANONICAL_UGONDU_EDITIONS).toEqual([
        'COMMUNITY',
        'PROFESSIONAL',
        'BUSINESS',
        'ENTERPRISE',
        'SOVEREIGN',
      ]);
      expect(UGONDU_EDITIONS).toContain('FREE');
      expect(UGONDU_EDITIONS).toContain('COMMUNITY');
      expect(UGONDU_EDITIONS).toContain('ENTERPRISE');
      expect(EDITION_RANK.FREE).toBe(EDITION_RANK.COMMUNITY);
      expect(EDITION_RANK.ENTERPRISE).toBe(4);
      expect(EDITION_RANK.SOVEREIGN).toBe(5);
      expect(normalizeEdition('free')).toBe('COMMUNITY');
      expect(parseEdition('enterprise')).toBe('ENTERPRISE');
      expect(meetsEditionRequirement('ENTERPRISE', 'BUSINESS')).toBe(true);
    });
  });

  describe('2. 11 Canonical UPLM Capabilities & 3 Independent Growth Marketing Capabilities', () => {
    it('registers all 11 canonical UPLM capabilities and 3 Growth Marketing capabilities with complete descriptors', () => {
      expect(UPLM_CAPABILITY_IDS.length).toBe(11);
      expect(GROWTH_MARKETING_CAPABILITY_IDS.length).toBe(3);

      for (const capId of [...UPLM_CAPABILITY_IDS, ...GROWTH_MARKETING_CAPABILITY_IDS]) {
        const desc = canonicalCapabilityRegistry.describe(capId);
        expect(desc).toBeDefined();
        expect(desc!.id).toBe(capId);
        expect(desc!.version).toBe('1.0.0');
        expect(desc!.authZScopes.length).toBeGreaterThan(0);
        expect(['R0', 'R1', 'R2', 'R3', 'R4']).toContain(desc!.riskClass);
        expect(['READ', 'WRITE', 'DESTRUCTIVE']).toContain(desc!.operationClassification);
        expect(desc!.auditRequirements.auditRequired).toBe(true);
        expect(desc!.auditRequirements.evidenceRequired).toBe(true);
        expect(desc!.auditRequirements.redactSecrets).toBe(true);
      }
    });

    it('proves strict bounded-context independence between UPLM and Growth Marketing (Criterion 15)', () => {
      const independence = canonicalCapabilityRegistry.verifyBoundedContextIndependence();
      expect(independence.independent).toBe(true);
      expect(independence.uplmCount).toBe(11);
      expect(independence.growthCount).toBe(3);
      expect(independence.sharedProviderOverlap).toEqual([]);
      expect(independence.sharedScopeOverlap).toEqual([]);

      const rewardDesc = canonicalCapabilityRegistry.describe('growth.reward.audit')!;
      expect(rewardDesc.approvalRequirements.financialControlsRequired).toBe(true);
      expect(rewardDesc.approvalRequirements.fraudControlsRequired).toBe(true);
    });
  });

  describe('3. 4-Dimensional Authorization Model & 17 Canonical Error Codes', () => {
    const baseAuthInput: UniversalAuthorizationInput = {
      surface: 'CLI',
      operationId: 'op-test-01',
      correlationId: 'corr-test-01',
      capabilityId: 'policy.bootstrap.apply',
      authenticatedCaller: {
        subjectId: 'user-admin',
        tenantId: 'tenant-1',
        edition: 'ENTERPRISE',
        grantedScopes: ['uplm:bootstrap:apply', 'uplm:policy:write'],
      },
      providerContext: {
        provider: 'AWS_IAM',
        target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expectedTarget: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        effectivePrincipal: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
        credentialsValid: true,
        requiredActions: ['iam:AttachRolePolicy'],
        grantedActions: ['iam:AttachRolePolicy'],
      },
      planContext: {
        planId: 'plan-01',
        planHash: 'hash-abc-123',
      },
      approvalRecord: {
        approvedBy: 'sec-authority',
        boundPlanHash: 'hash-abc-123',
        boundTarget: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    };

    it('exposes all 17 canonical error codes and maps them to deterministic CLI exit codes', () => {
      expect(UPLM_ERROR_CODES.length).toBe(17);
      expect(UPLM_ERROR_CODES).toEqual([
        'CREDENTIALS_INVALID',
        'CREDENTIALS_EXPIRED',
        'IDENTITY_MISMATCH',
        'PROVIDER_ACCESS_DENIED',
        'PLATFORM_ACCESS_DENIED',
        'EXPLICIT_DENY',
        'PERMISSION_BOUNDARY_BLOCK',
        'ORGANIZATION_POLICY_BLOCK',
        'CAPABILITY_UNSUPPORTED',
        'DISCOVERY_INCOMPLETE',
        'PLAN_STALE',
        'APPROVAL_REQUIRED',
        'PACK_UNTRUSTED',
        'OWNERSHIP_UNKNOWN',
        'QUOTA_EXCEEDED',
        'OPERATION_OUTCOME_UNKNOWN',
        'VERIFICATION_FAILED',
      ]);
      expect(CLI_EXIT_CODES.COMPLETED_AND_VERIFIED).toBe(0);
      expect(CLI_EXIT_CODES.OUTCOME_UNKNOWN_REINSPECT).toBe(9);
    });

    it('produces identical authorization decisions and decisionHash across AGENT_TOOL, CLI, API_SDK, DESKTOP_UI, and MANUAL_WORKFLOW (Criteria 10 & 14)', () => {
      const hashes = new Set<string>();
      for (const surface of INTERACTION_SURFACES) {
        const res = evaluateFourDimensionalAuthorization({ ...baseAuthInput, surface });
        expect(res.allowed).toBe(true);
        expect(res.platformAuthZ.allowed).toBe(true);
        expect(res.providerAuthZ.allowed).toBe(true);
        expect(res.approvalPolicy.satisfied).toBe(true);
        expect(res.providerConstraints.allowed).toBe(true);
        hashes.add(res.decisionHash);
      }
      expect(hashes.size).toBe(1);
    });

    it('distinguishes CREDENTIALS_INVALID, CREDENTIALS_EXPIRED, and PROVIDER_ACCESS_DENIED (Criterion 3)', () => {
      const invalidCreds = evaluateFourDimensionalAuthorization({
        ...baseAuthInput,
        providerContext: { ...baseAuthInput.providerContext, credentialsValid: false },
      });
      expect(invalidCreds.allowed).toBe(false);
      expect(invalidCreds.primaryError?.code).toBe('CREDENTIALS_INVALID');

      const expiredCreds = evaluateFourDimensionalAuthorization({
        ...baseAuthInput,
        providerContext: { ...baseAuthInput.providerContext, credentialsExpired: true },
      });
      expect(expiredCreds.allowed).toBe(false);
      expect(expiredCreds.primaryError?.code).toBe('CREDENTIALS_EXPIRED');

      const missingPerm = evaluateFourDimensionalAuthorization({
        ...baseAuthInput,
        providerContext: { ...baseAuthInput.providerContext, grantedActions: [] },
      });
      expect(missingPerm.allowed).toBe(false);
      expect(missingPerm.primaryError?.code).toBe('PROVIDER_ACCESS_DENIED');
    });

    it('never allows --yes or --non-interactive to bypass required privileged approval (CLI/GUI Parity Criteria 4 & 5)', () => {
      const noApprovalWithYes = evaluateFourDimensionalAuthorization({
        ...baseAuthInput,
        approvalRecord: undefined,
        flags: { yes: true, nonInteractive: true },
      });
      expect(noApprovalWithYes.allowed).toBe(false);
      expect(noApprovalWithYes.primaryError?.code).toBe('APPROVAL_REQUIRED');
      expect(noApprovalWithYes.primaryError?.exitCode).toBe(CLI_EXIT_CODES.APPROVAL_REQUIRED);
    });

    it('redacts AWS access keys, session tokens, and private keys from strings and objects (Criterion 13)', () => {
      const raw = 'Error with AKIAIOSFODNN7EXAMPLE and aws_secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
      const scrubbed = redactSensitiveText(raw);
      expect(scrubbed).not.toContain('AKIAIOSFODNN7EXAMPLE');
      expect(scrubbed).not.toContain('wJalrXUtnFEMI');

      const obj = redactSensitiveObject({
        target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        sessionToken: 'super-secret-token',
      });
      expect(obj.sessionToken).toBe('[REDACTED]');
    });
  });

  describe('4. 7 Graphical Control Panel Views, 10-Stage Bootstrap Wizard & Expert Mode', () => {
    it('maps every button in all 7 views and every CLI command to a registered capability ID (CLI/GUI Parity Criteria 1 & 2)', () => {
      const viewKeys = Object.keys(GRAPHICAL_CONTROL_VIEWS);
      expect(viewKeys.length).toBe(7);

      for (const view of Object.values(GRAPHICAL_CONTROL_VIEWS)) {
        for (const btn of view.buttons) {
          expect(canonicalCapabilityRegistry.describe(btn.capabilityId)).toBeDefined();
        }
      }

      expect(BOOTSTRAP_WIZARD_STAGES.length).toBe(10);
      for (const cmd of CLI_COMMAND_CAPABILITY_MAP) {
        expect(canonicalCapabilityRegistry.describe(cmd.capabilityId)).toBeDefined();
      }
    });

    it('recomputes planHash, invalidates prior approval on Expert Mode edits, and blocks deselecting mandatory security controls (CLI/GUI Parity Criterion 6)', () => {
      const baseDraft: Omit<
        ExpertPlanState,
        'planHash' | 'approvalStatus' | 'approvedPlanHash' | 'validationPassed' | 'validationErrors'
      > = {
        planId: 'plan-exp-01',
        target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
        packId: 'aws.cor.v9',
        packVersion: '9.0.0',
        executionMode: 'guided' as const,
        timeoutMs: 30000,
        concurrencyLimit: 2,
        maxRetries: 2,
        actions: [
          {
            actionId: 'act-mandatory-trust-verify',
            actionType: 'VERIFY_TRUST' as const,
            providerApi: 'iam:GetRole',
            targetResource: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
            beforeStateHash: 'h1',
            afterStateHash: 'h1',
            requiredProviderPermission: 'iam:GetRole',
            riskLevel: 'R0' as const,
            reversible: true,
            ownershipClass: 'UGONDU_ADOPTED',
            mandatorySecurityControl: true,
            selected: true,
            allowedByPolicy: true,
            parameters: {},
          },
          {
            actionId: 'act-attach-discovery',
            actionType: 'ATTACH_POLICY' as const,
            providerApi: 'iam:AttachRolePolicy',
            targetResource: 'arn:aws:iam::971671216490:policy/UgonduCOR-V9-Discovery',
            beforeStateHash: null,
            afterStateHash: 'h2',
            requiredProviderPermission: 'iam:AttachRolePolicy',
            riskLevel: 'R2' as const,
            reversible: true,
            ownershipClass: 'UGONDU_ADOPTED',
            mandatorySecurityControl: false,
            selected: true,
            allowedByPolicy: true,
            parameters: { retryDelayMs: 500 },
          },
        ],
      };

      const initialHash = computeExpertPlanHash(baseDraft);
      const initialPlan: ExpertPlanState = {
        ...baseDraft,
        planHash: initialHash,
        approvalStatus: 'APPROVED',
        approvedPlanHash: initialHash,
        validationPassed: true,
        validationErrors: [],
      };

      const edited = editExpertPlan(initialPlan, {
        parameterUpdates: { 'act-attach-discovery': { retryDelayMs: 1000 } },
      });
      expect(edited.planHash).not.toBe(initialHash);
      expect(edited.approvalStatus).toBe('INVALIDATED_BY_EDIT');
      expect(edited.approvedPlanHash).toBeUndefined();

      expect(() =>
        editExpertPlan(initialPlan, { deselectActionIds: ['act-mandatory-trust-verify'] })
      ).toThrow(/Mandatory security control/i);

      expect(() =>
        editExpertPlan(initialPlan, { attemptOverrideDeniedActionIds: ['act-attach-discovery'] })
      ).toThrow(/Cannot turn a denied operation into an allowed one/i);
    });

    it('disables Retry/Resume buttons in Operation Monitor when outcome is unknown (CLI/GUI Parity Criterion 10)', () => {
      const buttons = resolveGraphicalButtonStates('OPERATION_MONITOR', 'AWS_IAM', true);
      const retryBtn = buttons.find((b) => b.buttonId === 'mon.retry_safe_step')!;
      const resumeBtn = buttons.find((b) => b.buttonId === 'mon.resume')!;
      expect(retryBtn.enabled).toBe(false);
      expect(retryBtn.disabledReason).toContain('OPERATION_OUTCOME_UNKNOWN');
      expect(resumeBtn.enabled).toBe(false);
    });
  });
});
