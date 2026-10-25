/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : provider-adapter-contract.spec.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed / Security Reviewed / Architecture Controlled
 * - Protocol Frozen / Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import {
  PolicyPermissionAdapter,
  BasePolicyPermissionAdapter,
  AdapterRegistry,
  assertPolicyVerification,
  ProviderCapabilities,
  ProviderIdentity,
  PrincipalRef,
  PrincipalSnapshot,
  NativePolicySnapshot,
  PolicyBinding,
  ValidationReport,
  RenderedPolicy,
  PolicyDiff,
  MutationPlan,
  ApprovedPlan,
  MutationResult,
} from '../continuity/PolicyPermissionAdapter';

class DockerPermissionAdapter implements PolicyPermissionAdapter {
  readonly providerId = 'docker';
  readonly adapterVersion = '1.0.0';

  capabilities(): ProviderCapabilities {
    return {
      policyRead: 'supported',
      policyWrite: 'supported',
      resourceLevelScope: 'supported',
      conditionalPermissions: 'unsupported',
      explicitDeny: 'unsupported',
      sessionTags: 'unsupported',
      policySimulation: 'unsupported',
      auditEventRead: 'supported',
      immutableEventStore: 'unsupported',
      idempotencyTokens: 'supported',
      resourceTags: 'supported',
      transactionalChanges: 'unsupported',
      fallbacks: {
        sessionTags: 'Use container labels with UgonduTransactionId token.',
        conditionalPermissions: 'Enforce preflight capability gate before container spawn.',
      },
    };
  }

  async inspectPrincipal(ref: PrincipalRef): Promise<PrincipalSnapshot> {
    return {
      ref,
      exists: true,
      arnOrUri: `docker://daemon/${ref.principalId}`,
      tags: { UgonduTransactionId: 'tx-docker-1' },
      probedAt: new Date().toISOString(),
      verified: true,
    };
  }

  async inspectPolicy(policyId: string): Promise<NativePolicySnapshot> {
    return {
      policyId,
      document: { seccomp: 'default', apparmor: 'docker-default' },
      documentSha256: 'sha256:dockerseccomp123',
      probedAt: new Date().toISOString(),
    };
  }

  async listPolicyBindings(principal: PrincipalRef): Promise<PolicyBinding[]> {
    return [{ bindingId: 'bind-docker-1', principalRef: principal, policyId: 'docker-default-seccomp', scope: 'container' }];
  }

  async validateNativePolicy(document: unknown): Promise<ValidationReport> {
    const valid = typeof document === 'object' && document !== null;
    return { valid, violations: valid ? [] : ['Malformed docker security profile'], warnings: [], evaluatedAt: new Date().toISOString() };
  }

  async renderPolicy(template: unknown, config: Record<string, unknown>): Promise<RenderedPolicy> {
    return {
      providerId: this.providerId,
      document: { ...(template as any), containerId: config.containerId },
      documentSha256: 'sha256:rendered_docker_policy_001',
      renderedAt: new Date().toISOString(),
    };
  }

  diffPolicy(expected: RenderedPolicy, observed: NativePolicySnapshot): PolicyDiff {
    const matches = expected.documentSha256 === observed.documentSha256;
    return {
      matches,
      expectedSha256: expected.documentSha256,
      observedSha256: observed.documentSha256,
      mismatchedStatements: matches ? [] : ['Seccomp profile hash divergence'],
    };
  }

  async planPolicyMutation(diff: PolicyDiff): Promise<MutationPlan> {
    return {
      planId: 'plan_docker_mut_1',
      action: diff.matches ? 'NOOP' : 'UPDATE',
      policyId: 'docker-default-seccomp',
      proposedChanges: { updateProfile: true },
      planDigest: 'digest_docker_mutation_1',
    };
  }

  async applyApprovedPolicyPlan(plan: ApprovedPlan): Promise<MutationResult> {
    return { success: true, outcome: 'APPLIED_AND_MATCHES', mutationId: `mut_${plan.plan.planId}`, executedAt: new Date().toISOString() };
  }

  async verifyPolicyMutation(result: MutationResult): Promise<ValidationReport> {
    return {
      valid: result.success,
      violations: result.success ? [] : ['Docker profile update verification failed'],
      warnings: [],
      evaluatedAt: new Date().toISOString(),
    };
  }
}

class CompliantMockAdapter extends BasePolicyPermissionAdapter {
  readonly providerId = 'compliant-mock';

  public override async discoverIdentity(): Promise<ProviderIdentity> {
    return { providerId: this.providerId, tenantOrAccountId: 'tenant-real-123', principalId: 'principal-real-456' };
  }

  public override async inspectPolicy(policyId: string): Promise<NativePolicySnapshot> {
    return { policyId, document: { role: 'admin' }, documentSha256: 'sha256:real_hash_001', probedAt: new Date().toISOString() };
  }

  public override async planPolicyReconciliation(input: any): Promise<any> {
    return { planId: 'plan-real-001', providerId: this.providerId, expectedDigest: 'sha256:digest_abc', input };
  }

  public override async applyPolicyReconciliation(plan: any): Promise<any> {
    return {
      applied: true,
      providerId: this.providerId,
      evidence: { verification: 'VERIFIED', observedDigest: plan.expectedDigest, expectedDigest: plan.expectedDigest },
    };
  }

  public override async inspectAttachments(targetId: string): Promise<any> {
    return { providerId: this.providerId, targetId, attachments: ['policy-real-001'] };
  }

  public override async attachPolicy(targetId: string, policyId: string): Promise<void> {
    if (!targetId || !policyId) throw new Error('Invalid target or policy');
  }

  public override async rollback(evidence: any): Promise<any> {
    assertPolicyVerification(evidence);
    return { rolledBack: true, providerId: this.providerId };
  }
}

describe('assertPolicyVerification', () => {
  it('passes when verification is VERIFIED and digests match', () => {
    expect(() => assertPolicyVerification({ verification: 'VERIFIED', observedDigest: 'sha256:match', expectedDigest: 'sha256:match' })).not.toThrow();
  });

  it('rejects missing or falsy evidence', () => {
    expect(() => assertPolicyVerification(null as any)).toThrow('COR_POLICY_VERIFICATION_UNPROVEN');
    expect(() => assertPolicyVerification(undefined as any)).toThrow('COR_POLICY_VERIFICATION_UNPROVEN');
  });

  it('rejects unverified status', () => {
    expect(() => assertPolicyVerification({ verification: 'UNVERIFIED', observedDigest: 'sha256:match', expectedDigest: 'sha256:match' })).toThrow('COR_POLICY_VERIFICATION_UNPROVEN');
  });

  it('rejects mismatched observed and expected digests', () => {
    expect(() => assertPolicyVerification({ verification: 'VERIFIED', observedDigest: 'sha256:observed', expectedDigest: 'sha256:expected' })).toThrow('COR_POLICY_VERIFICATION_UNPROVEN');
  });

  it('rejects missing observedDigest', () => {
    expect(() => assertPolicyVerification({ verification: 'VERIFIED', expectedDigest: 'sha256:expected' })).toThrow('COR_POLICY_VERIFICATION_UNPROVEN');
  });
});

describe('BasePolicyPermissionAdapter fail-closed defaults', () => {
  class UnimplementedAdapter extends BasePolicyPermissionAdapter {
    readonly providerId = 'unimplemented';
    async inspectPolicy(_id: string): Promise<any> {
      throw new Error('COR_POLICY_VERIFICATION_UNPROVEN');
    }
  }

  const adapter = new UnimplementedAdapter();

  it('fails closed on discoverIdentity', async () => {
    await expect(adapter.discoverIdentity()).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('returns empty capabilities when unconfigured', async () => {
    const caps = await adapter.negotiateCapabilities();
    expect(caps).toEqual([]);
  });

  it('fails closed on planPolicyReconciliation', async () => {
    await expect(adapter.planPolicyReconciliation({})).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('fails closed on applyPolicyReconciliation', async () => {
    await expect(adapter.applyPolicyReconciliation({})).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('fails closed on verifyPolicyReconciliation when evidence is missing or unverified', async () => {
    await expect(adapter.verifyPolicyReconciliation(null)).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.verifyPolicyReconciliation({})).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.verifyPolicyReconciliation({ verification: 'VERIFIED', observedDigest: 'd1', expectedDigest: 'd2' })).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('succeeds on verifyPolicyReconciliation only when read-after-write evidence is verified', async () => {
    const outcome = await adapter.verifyPolicyReconciliation({
      verification: 'VERIFIED',
      observedDigest: 'digest-ok',
      expectedDigest: 'digest-ok',
    });
    expect(outcome).toBe('APPLIED_AND_MATCHES');
  });

  it('fails closed on inspectAttachments', async () => {
    await expect(adapter.inspectAttachments('t1')).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('fails closed on attachPolicy', async () => {
    await expect(adapter.attachPolicy('t1', 'p1')).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('fails closed on rollback', async () => {
    await expect(adapter.rollback({})).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });

  it('fails closed on granular mutation methods', async () => {
    await expect(adapter.inspectPrincipal({} as any)).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.listPolicyBindings({} as any)).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.validateNativePolicy({})).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.renderPolicy({}, {})).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    expect(() => adapter.diffPolicy({} as any, {} as any)).toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.planPolicyMutation({} as any)).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.applyApprovedPolicyPlan({} as any)).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
    await expect(adapter.verifyPolicyMutation({} as any)).rejects.toThrow(/COR_POLICY_VERIFICATION_UNPROVEN/);
  });
});

describe('ProviderAdapterContract & AdapterRegistry', () => {
  beforeEach(() => {
    AdapterRegistry.clear();
  });

  it('rejects registration of incomplete adapters lacking mandatory methods', () => {
    const incompleteAdapter: any = {
      providerId: 'incomplete',
      adapterVersion: '1.0.0',
      capabilities: () => ({}),
    };
    expect(() => AdapterRegistry.registerAdapter(incompleteAdapter)).toThrow(/is non-compliant: missing required method/);
  });

  it('registers and resolves compliant non-AWS DockerPermissionAdapter', async () => {
    const adapter = new DockerPermissionAdapter();
    AdapterRegistry.registerAdapter(adapter);

    const retrieved = AdapterRegistry.getRequiredAdapter('docker');
    expect(retrieved).toBeDefined();
    expect(retrieved.providerId).toBe('docker');

    const caps = retrieved.capabilities();
    expect(caps.policyRead).toBe('supported');
    expect(caps.conditionalPermissions).toBe('unsupported');
    expect(caps.fallbacks?.sessionTags).toBeDefined();

    const principal = await retrieved.inspectPrincipal({ providerId: 'docker', principalId: 'container_01', principalType: 'workload-identity' });
    expect(principal.exists).toBe(true);
    expect(principal.verified).toBe(true);

    const rendered = await retrieved.renderPolicy({ seccomp: 'default' }, { containerId: 'c1' });
    const snapshot = await retrieved.inspectPolicy('docker-default-seccomp');
    const diff = retrieved.diffPolicy(rendered, snapshot);
    const plan = await retrieved.planPolicyMutation(diff);
    expect(plan.planId).toBeDefined();

    const result = await retrieved.applyApprovedPolicyPlan({
      plan,
      approvalToken: 'app-token-1234567890',
      approvedBy: 'ops-admin',
      approvedAt: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('APPLIED_AND_MATCHES');

    const verification = await retrieved.verifyPolicyMutation(result);
    expect(verification.valid).toBe(true);
  });

  it('registers and validates a concrete compliant normative adapter', async () => {
    const adapter = new CompliantMockAdapter();
    AdapterRegistry.registerAdapter(adapter);

    const retrieved = AdapterRegistry.getRequiredAdapter('compliant-mock');
    expect(retrieved).toBeDefined();

    const identity = await retrieved.discoverIdentity!();
    expect(identity.tenantOrAccountId).toBe('tenant-real-123');

    const plan = await retrieved.planPolicyReconciliation!({ action: 'RECONCILE' });
    const applied = (await retrieved.applyPolicyReconciliation!(plan)) as any;
    expect(applied.applied).toBe(true);

    const outcome = await retrieved.verifyPolicyReconciliation!(applied.evidence);
    expect(outcome).toBe('APPLIED_AND_MATCHES');

    await expect(retrieved.rollback!(applied.evidence)).resolves.toEqual({ rolledBack: true, providerId: 'compliant-mock' });
  });

  it('fails closed when an unregistered adapter is requested', () => {
    expect(() => AdapterRegistry.getRequiredAdapter('unregistered-cloud')).toThrow(/Provider adapter 'unregistered-cloud' is not registered or supported/);
  });
});
