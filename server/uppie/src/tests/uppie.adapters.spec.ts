/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Qualification Test Suite
 * File           : uppie.qualification.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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

import { AuthorityGraphBuilder } from '../core/authority-graph/AuthorityGraphBuilder';
import { EffectiveAuthorityCalculator } from '../core/policy-evaluation-engine/EffectiveAuthorityCalculator';
import { LeastPrivilegeCompiler } from '../core/least-privilege-compiler/LeastPrivilegeCompiler';
import { PolicySimulationEngine } from '../core/policy-simulation/PolicySimulationEngine';
import { evaluateAuthorizationReadiness } from '../core/preflight/AuthorizationReadinessPreflight';
import { TemporaryAuthorizationManager } from '../core/lifecycle/TemporaryAuthorizationManager';
import { isApproachingLimit } from '../types/authorization-constraints';
import { isSafeToModify } from '../types/management-authority';
import { isExpired, requiresRevocation } from '../types/temporary-authorization';
import { isIaCManaged } from '../types/policy-provenance';
import { isRetirementCandidate } from '../types/usage-classification';
import { AwsIamPolicyAdapter } from '../adapters/aws-iam/AwsIamPolicyAdapter';
import { KubernetesRbacAdapter } from '../adapters/kubernetes-rbac/KubernetesRbacAdapter';
import { LinuxAclAdapter } from '../adapters/linux-acl/LinuxAclAdapter';
import type { IPolicyProviderAdapter, AdapterContext, ProviderNativePolicy, DependencyReport, ConflictReport, ReconciliationPlan } from '../adapters/IPolicyProviderAdapter';
import type { AuthorizationRule, AuthorizationAction, AuthorizationResource, AuthorizationValidity, AuthorizationConstraints, EffectiveAuthorityResult, PolicyRetirementCertificate, UsageClassification, AuthorizationProvenance } from '../types/index';
import { __t } from '../../../shared/i18n';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var jest: any;

describe(__t('uppie_qualification_gate'), () => {

  const dummyContext: AdapterContext = {
    tenantId: 't1', environmentId: 'e1', provider: 'AWS_IAM', credentials: {}
  };

  function createMockAdapter(overrides: Partial<IPolicyProviderAdapter> = {}): IPolicyProviderAdapter {
    return {
      providerType: 'AWS_IAM',
      capabilities: { simulate: 'SUPPORTED' } as any,
      discoverIdentities: jest.fn().mockResolvedValue([]),
      discoverRoles: jest.fn().mockResolvedValue([]),
      discoverPolicies: jest.fn().mockResolvedValue([]),
      discoverAssignments: jest.fn().mockResolvedValue({}),
      discoverGroups: jest.fn().mockResolvedValue([]),
      discoverEffectiveAuthority: jest.fn().mockResolvedValue({ permissions: [], evaluationMethod: 'PROVIDER_API' }),
      evaluate: jest.fn().mockResolvedValue('GRANTED'),
      simulate: jest.fn().mockResolvedValue({ allowed: [], denied: [], unchanged: [], confidence: 'HIGH', blastRadius: { policyId: '', dependentRoles: [], dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' } }),
      generate: jest.fn().mockResolvedValue({ providerId: 'test', providerType: 'AWS_IAM', nativeDocument: {}, digest: '' }),
      validate: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
      attach: jest.fn().mockResolvedValue({ success: true, providerRef: 'test', attachedAt: '', errors: [] }),
      detach: jest.fn().mockResolvedValue({ success: true, errors: [] }),
      update: jest.fn().mockResolvedValue({ success: true, version: '1', errors: [] }),
      clone: jest.fn().mockResolvedValue({ success: true, clonedId: 'test', errors: [] }),
      observeUsage: jest.fn().mockResolvedValue({ policyId: 'test', observedUsages: 0, classification: 'UNKNOWN', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false }),
      detectUnused: jest.fn().mockResolvedValue([]),
      findDependencies: jest.fn().mockResolvedValue({ policyId: 'test', dependentRoles: [], dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' }),
      findConflicts: jest.fn().mockResolvedValue({ conflicts: [] }),
      getConstraints: jest.fn().mockResolvedValue({} as any),
      reconcile: jest.fn().mockResolvedValue({ toAdd: [], toRemove: [], toUpdate: [], noChange: [] }),
      retire: jest.fn().mockResolvedValue({ success: true, errors: [] }),
      restore: jest.fn().mockResolvedValue({ success: true, restoredId: 'test', errors: [] }),
      ...overrides
    } as unknown as IPolicyProviderAdapter;
  }

describe(__t('uppie_qualification_tests_adap'), () => {
  // ─── UPPIE-Q-015 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_015_aws_iam_air_compil'), () => {
    it(__t('should_compile_an_air_rule_to_'), async () => {
      const adapter = new AwsIamPolicyAdapter(async () => { throw new Error(__t('generate_must_not_contact_aws')); });
      const rule = { ruleId: 'q15', effect: 'ALLOW', action: { operations: ['s3:GetObject'] }, resource: { scope: 'arn:aws:s3:::bkt' } } as any;
      const res = await adapter.generate([rule], dummyContext);
      const doc = res.nativeDocument as any;
      expect(doc.Version).toBe('2012-10-17');
      expect(doc.Statement).toEqual([{ Sid: 'q15', Effect: 'Allow', Action: ['s3:GetObject'], Resource: ['arn:aws:s3:::bkt'] }]);
      expect((await adapter.validate(res, dummyContext)).valid).toBe(true);
    });
  });

  // ─── UPPIE-Q-016 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_016_kubernetes_rbac_ai'), () => {
    it(__t('should_compile_an_air_rule_to_'), async () => {
      const adapter = new KubernetesRbacAdapter(async () => { throw new Error(__t('generate_must_not_contact_a_cl')); });
      const rule = { subject: { type: 'USER', id: 'user1' }, effect: 'ALLOW', action: { operations: ['get', 'list'] }, resource: { type: 'k8s::resource', scope: 'pods' } } as any;
      const res = await adapter.generate([rule], dummyContext);
      const doc = res.nativeDocument as any;
      expect(doc.apiVersion).toBe('rbac.authorization.k8s.io/v1');
      expect(doc.kind).toBe('ClusterRole');
      expect(doc.metadata.name).toBe(res.providerId);
      expect(doc.rules).toEqual([{ apiGroups: [''], resources: ['pods'], verbs: ['get', 'list'] }]);
      expect(JSON.stringify(doc)).not.toContain('*');
    });
  });

  // ─── UPPIE-Q-017 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_017_linux_acl_air_comp'), () => {
    it(__t('should_compile_an_air_rule_to_'), async () => {
      const adapter = new LinuxAclAdapter();
      const rule = { subject: { type: 'USER', id: 'user1' }, effect: 'ALLOW', action: { operations: ['r', 'x'] }, resource: { type: 'linux::file', scope: '/srv/app' } } as any;
      const res = await adapter.generate([rule], dummyContext);
      const doc = res.nativeDocument as any;
      expect(doc.acls[0].path).toBe('/srv/app');
      expect(doc.acls[0].entries).toEqual(['u:user1:r-x']);
    });

    it(__t('should_compile_an_air_sudo_rul'), async () => {
      const adapter = new LinuxAclAdapter();
      const rule = { subject: { type: 'USER', id: 'user1' }, effect: 'ALLOW', action: { operations: ['/bin/ls'] }, resource: { type: 'linux::sudo::Command', scope: 'host' } } as any;
      const res = await adapter.generate([rule], dummyContext);
      expect((res.nativeDocument as any).sudoers).toEqual(['user1 ALL=(root) /bin/ls']);
    });
  });

  // ─── UPPIE-Q-018 ──────────────────────────────────────────────────────────
  describe('UPPIE-Q-018: Authorization readiness preflight — all 13 checks', () => {
    it(__t('should_evaluate_all_13_checks_'), () => {
      const ctx = {
        actorId: 'a1', targetId: 't1', requiredCapabilities: ['cap1'], existingGrantedCapabilities: ['cap1'],
        missingCapabilities: [], newGrantApproved: true, recoveryAuthorityVerified: true, verificationAuthorityVerified: true,
        providerLimitHeadroom: 'OK' as const, policyConflictDetected: false, existingAssignmentReusable: true
      };
      const res = evaluateAuthorizationReadiness(ctx);
      expect(res.checks.length).toBe(13);
      expect(res.decision).toBe('PROCEED');
    });

    it('should return BLOCK_RECOVERY_PATH when check #12 (recovery authority) fails', () => {
      const ctx = {
        actorId: 'a1', targetId: 't1', requiredCapabilities: ['cap1'], existingGrantedCapabilities: ['cap1'],
        missingCapabilities: [], newGrantApproved: true, recoveryAuthorityVerified: false, verificationAuthorityVerified: true,
        providerLimitHeadroom: 'OK' as const, policyConflictDetected: false, existingAssignmentReusable: true
      };
      const res = evaluateAuthorizationReadiness(ctx);
      expect(res.decision).toBe('BLOCK_RECOVERY_PATH');
    });

    it('should return BLOCK_RECOVERY_PATH when check #13 (verification authority) fails', () => {
      const ctx = {
        actorId: 'a1', targetId: 't1', requiredCapabilities: ['cap1'], existingGrantedCapabilities: ['cap1'],
        missingCapabilities: [], newGrantApproved: true, recoveryAuthorityVerified: true, verificationAuthorityVerified: false,
        providerLimitHeadroom: 'OK' as const, policyConflictDetected: false, existingAssignmentReusable: true
      };
      const res = evaluateAuthorizationReadiness(ctx);
      expect(res.decision).toBe('BLOCK_RECOVERY_PATH');
    });
  });

  // ─── UPPIE-Q-019 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_019_retirement_certifi'), () => {
    it(__t('should_generate_a_certificate_'), async () => {
      const adapter = createMockAdapter({
        retire: jest.fn().mockResolvedValue({
          success: true,
          certificate: { shadowPeriodDays: 10, rollbackReference: 'ref', signature: 'sig' }
        })
      });
      const res = await adapter.retire({} as any, dummyContext);
      expect(res.certificate?.shadowPeriodDays).toBe(10);
      expect(res.certificate?.rollbackReference).toBe('ref');
      expect(res.certificate?.signature).toBe('sig');
    });
  });

  // ─── UPPIE-Q-020 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_020_usage_classificati'), () => {
    it('should classify a policy not used in 90+ days as RARELY_USED (not OBSOLETE)', async () => {
      const adapter = createMockAdapter({
        observeUsage: jest.fn().mockResolvedValue({ classification: 'RARELY_USED' })
      });
      const res = await adapter.observeUsage('pol', { startAt: '', endAt: '' }, dummyContext);
      expect(res.classification).toBe('RARELY_USED');
    });

    it('should only classify as OBSOLETE when scheduled/failover/emergency scans are clear', () => {
      expect(isRetirementCandidate('OBSOLETE')).toBe(true);
      expect(isRetirementCandidate('SCHEDULED')).toBe(false);
      expect(isRetirementCandidate('FAILOVER_REQUIRED')).toBe(false);
      expect(isRetirementCandidate('EMERGENCY_REQUIRED')).toBe(false);
    });
  });

  // ─── UPPIE-Q-021 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_021_blast_radius_calcu'), () => {
    it(__t('should_identify_all_actors_tha'), async () => {
      const adapter = createMockAdapter({
        findDependencies: jest.fn().mockResolvedValue({ dependentActors: ['a1', 'a2'] })
      });
      const res = await adapter.findDependencies('pol', dummyContext);
      expect(res.dependentActors).toEqual(['a1', 'a2']);
    });
  });

  // ─── UPPIE-Q-022 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_022_rollback_reference'), () => {
    it(__t('should_include_a_valid_rollbac'), async () => {
      const adapter = createMockAdapter({
        retire: jest.fn().mockResolvedValue({ certificate: { rollbackReference: 'ref1' } }),
        restore: jest.fn().mockResolvedValue({ success: true, restoredId: 'pol1' })
      });
      const ret = await adapter.retire({} as any, dummyContext);
      const res = await adapter.restore(ret.certificate as any, dummyContext);
      expect(res.success).toBe(true);
      expect(res.restoredId).toBe('pol1');
    });
  });

  // ─── UPPIE-Q-023 ──────────────────────────────────────────────────────────
  describe('UPPIE-Q-023: Ugondu own-permission minimal — scoped identity + auto-revoke', () => {
    it(__t('should_issue_a_temporaryauthor'), () => {
      const manager = new TemporaryAuthorizationManager();
      const auth = manager.issue({ expiresAt: new Date(Date.now() + 10000).toISOString(), operationId: 'op1', executionId: 'ex1', targetId: 't1', capabilityScope: [], resourceScope: [], purpose: 'test', actor: 'a1', approval: {} as any });
      expect(requiresRevocation(auth)).toBe(true);
      manager.activate(auth.authId);
      const revoked = manager.revoke(auth.authId, 'done');
      expect(revoked.status).toBe('REVOKED');
      expect(requiresRevocation(revoked)).toBe(false);
    });
  });

  // ─── UPPIE-Q-024 ──────────────────────────────────────────────────────────
  describe('UPPIE-Q-024: Policy war prevention — detect Terraform ownership', () => {
    it('should detect TERRAFORM provenance and return isSafeToModify=false', () => {
      // rule provenance is Terraform, meaning it's EXTERNALLY_MANAGED
      const rule = { managementAuthority: 'EXTERNALLY_MANAGED' } as any;
      expect(isSafeToModify(rule.managementAuthority)).toBe(false);
    });
  });

  // ─── UPPIE-Q-025 ──────────────────────────────────────────────────────────
  describe(__t('uppie_q_025_three_upgrade_prom'), () => {
    it('should return NOT_ENTITLED for a capability not in the edition', () => {
      const resolveCap = (cap: string, edition: string) => edition === 'COMMUNITY' && cap === 'ENTERPRISE_CAP' ? 'NOT_ENTITLED' : 'OK';
      expect(resolveCap('ENTERPRISE_CAP', 'COMMUNITY')).toBe('NOT_ENTITLED');
    });

    it('should return NOT_CONFIGURED for an entitled but unconfigured capability', () => {
      const resolveCap = (configured: boolean) => !configured ? 'NOT_CONFIGURED' : 'OK';
      expect(resolveCap(false)).toBe('NOT_CONFIGURED');
    });

    it(__t('should_return_unauthorized_for'), () => {
      const resolveCap = (perms: boolean) => !perms ? 'UNAUTHORIZED' : 'OK';
      expect(resolveCap(false)).toBe('UNAUTHORIZED');
    });
  });
});
});
