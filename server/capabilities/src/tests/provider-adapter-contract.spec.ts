/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : provider-adapter-contract.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import {
  PolicyPermissionAdapter,
  AdapterRegistry,
  ProviderCapabilities,
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

/**
 * Reference non-AWS Provider Adapter for Docker container deployment environments.
 * Demonstrates provider-neutral contract compliance (Addendum A).
 */
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
    const doc = { seccomp: 'default', apparmor: 'docker-default' };
    return {
      policyId,
      document: doc,
      documentSha256: 'sha256:dockerseccomp123',
      probedAt: new Date().toISOString(),
    };
  }

  async listPolicyBindings(principal: PrincipalRef): Promise<PolicyBinding[]> {
    return [
      {
        bindingId: 'bind-docker-1',
        principalRef: principal,
        policyId: 'docker-default-seccomp',
        scope: 'container',
      },
    ];
  }

  async validateNativePolicy(document: unknown): Promise<ValidationReport> {
    const valid = typeof document === 'object' && document !== null;
    return {
      valid,
      violations: valid ? [] : ['Malformed docker security profile'],
      warnings: [],
      evaluatedAt: new Date().toISOString(),
    };
  }

  async renderPolicy(
    template: unknown,
    config: Record<string, unknown>
  ): Promise<RenderedPolicy> {
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
    return {
      success: true,
      outcome: 'APPLIED_AND_MATCHES',
      mutationId: `mut_${plan.plan.planId}`,
      executedAt: new Date().toISOString(),
    };
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

describe('ProviderAdapterContract & AdapterRegistry', () => {
  beforeEach(() => {
    AdapterRegistry.clear();
  });

  it('rejects registration of incomplete adapters lacking mandatory methods', () => {
    const incompleteAdapter: any = {
      providerId: 'incomplete',
      adapterVersion: '1.0.0',
      capabilities: () => ({}),
      // Missing inspectPrincipal, renderPolicy, etc.
    };

    expect(() => {
      AdapterRegistry.registerAdapter(incompleteAdapter);
    }).toThrow(/is non-compliant: missing required method/);
  });

  it('registers and resolves compliant non-AWS DockerPermissionAdapter', async () => {
    const adapter = new DockerPermissionAdapter();
    AdapterRegistry.registerAdapter(adapter);

    const retrieved = AdapterRegistry.getRequiredAdapter('docker');
    expect(retrieved).toBeDefined();
    expect(retrieved.providerId).toBe('docker');

    // Verify capability negotiation
    const caps = retrieved.capabilities();
    expect(caps.policyRead).toBe('supported');
    expect(caps.conditionalPermissions).toBe('unsupported');
    expect(caps.fallbacks?.sessionTags).toBeDefined();

    // Verify principal inspection
    const principal = await retrieved.inspectPrincipal({
      providerId: 'docker',
      principalId: 'container_01',
      principalType: 'workload-identity',
    });
    expect(principal.exists).toBe(true);
    expect(principal.verified).toBe(true);

    // Verify policy diff and plan lifecycle
    const rendered = await retrieved.renderPolicy(
      { seccomp: 'default' },
      { containerId: 'c1' }
    );
    const snapshot = await retrieved.inspectPolicy('docker-default-seccomp');
    const diff = retrieved.diffPolicy(rendered, snapshot);
    const plan = await retrieved.planPolicyMutation(diff);

    expect(plan.planId).toBeDefined();

    // Apply approved plan
    const result = await retrieved.applyApprovedPolicyPlan({
      plan,
      approvalToken: 'app-token-1234567890',
      approvedBy: 'ops-admin',
      approvedAt: new Date().toISOString(),
    });

    expect(result.success).toBe(true);
    expect(result.outcome).toBe('APPLIED_AND_MATCHES');

    // Verify read-back mutation
    const verification = await retrieved.verifyPolicyMutation(result);
    expect(verification.valid).toBe(true);
  });

  it('fails closed when an unregistered adapter is requested', () => {
    expect(() => {
      AdapterRegistry.getRequiredAdapter('unregistered-cloud');
    }).toThrow(/Provider adapter 'unregistered-cloud' is not registered or supported/);
  });
});
