/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : PolicyPermissionAdapter.ts
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export type CapabilitySupport = 'supported' | 'unsupported' | 'unknown';

export type UniversalOperationOutcome =
  | 'NOT_APPLIED'
  | 'APPLIED_AND_MATCHES'
  | 'APPLIED_BUT_DRIFTED'
  | 'FOREIGN_OR_AMBIGUOUS'
  | 'UNKNOWN'
  | 'ACCESS_DENIED'
  | 'PROVIDER_UNAVAILABLE';

export interface ProviderCapabilities {
  policyRead: CapabilitySupport;
  policyWrite: CapabilitySupport;
  resourceLevelScope: CapabilitySupport;
  conditionalPermissions: CapabilitySupport;
  explicitDeny: CapabilitySupport;
  sessionTags: CapabilitySupport;
  policySimulation: CapabilitySupport;
  auditEventRead: CapabilitySupport;
  immutableEventStore: CapabilitySupport;
  idempotencyTokens: CapabilitySupport;
  resourceTags: CapabilitySupport;
  transactionalChanges: CapabilitySupport;
  fallbacks?: Record<string, string>;
}

export interface UniversalPolicyDescriptor {
  schemaVersion: '1.0';
  policyIdentity: {
    policyPackId: string;
    policyPackVersion: string;
    policyId: string;
    displayName: string;
  };
  target: {
    providerId: string;
    platformId: string;
    tenantOrAccountId: string;
    regionOrLocation?: string;
    environmentId: string;
  };
  nativePolicy: {
    format: string;
    sourcePath?: string;
    sourceSha256: string;
    renderedSha256: string;
    nativePolicyId?: string;
    nativeVersionId?: string;
  };
  authorizationSemantics: {
    principalIdentity: string;
    permissionsModel: string;
    resourceScopes: string[];
    conditions: Array<Record<string, unknown>>;
    explicitDeniesSupported: CapabilitySupport;
    delegationSupported: CapabilitySupport;
    sessionContextSupported: CapabilitySupport;
    simulationSupported: CapabilitySupport;
  };
  lifecycle: {
    status: 'candidate' | 'active' | 'deprecated' | 'quarantined';
    installationState: 'not-inspected' | 'installed' | 'missing' | 'drifted';
    attachmentOrBindingState: 'not-inspected' | 'bound' | 'unbound' | 'partial';
    lastVerifiedAt?: string;
    evidenceRefs: string[];
  };
}

export interface PrincipalRef {
  providerId: string;
  principalId: string;
  principalType: 'role' | 'service-account' | 'user' | 'group' | 'workload-identity';
}

export interface PrincipalSnapshot {
  ref: PrincipalRef;
  exists: boolean;
  arnOrUri?: string;
  tags?: Record<string, string>;
  probedAt: string;
  verified: boolean;
}

export interface NativePolicySnapshot {
  policyId: string;
  nativeVersionId?: string;
  document: unknown;
  documentSha256: string;
  probedAt: string;
}

export interface PolicyBinding {
  bindingId: string;
  principalRef: PrincipalRef;
  policyId: string;
  scope?: string;
}

export interface ValidationReport {
  valid: boolean;
  violations: string[];
  warnings: string[];
  evaluatedAt: string;
}

export interface RenderedPolicy {
  providerId: string;
  document: unknown;
  documentSha256: string;
  renderedAt: string;
}

export interface PolicyDiff {
  matches: boolean;
  expectedSha256: string;
  observedSha256?: string;
  mismatchedStatements: string[];
}

export interface MutationPlan {
  planId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ATTACH' | 'DETACH' | 'NOOP';
  policyId: string;
  principalRef?: PrincipalRef;
  proposedChanges: unknown;
  planDigest: string;
}

export interface ApprovedPlan {
  plan: MutationPlan;
  approvalToken: string;
  approvedBy: string;
  approvedAt: string;
}

export interface MutationResult {
  success: boolean;
  outcome: UniversalOperationOutcome;
  mutationId: string;
  executedAt: string;
  error?: string;
}

export interface PolicyPermissionAdapter {
  readonly providerId: string;
  readonly adapterVersion: string;
  capabilities(): ProviderCapabilities;
  inspectPrincipal(ref: PrincipalRef): Promise<PrincipalSnapshot>;
  inspectPolicy(policyId: string): Promise<NativePolicySnapshot>;
  listPolicyBindings(principal: PrincipalRef): Promise<PolicyBinding[]>;
  validateNativePolicy(document: unknown): Promise<ValidationReport>;
  renderPolicy(template: unknown, config: Record<string, unknown>): Promise<RenderedPolicy>;
  diffPolicy(expected: RenderedPolicy, observed: NativePolicySnapshot): PolicyDiff;
  planPolicyMutation(diff: PolicyDiff): Promise<MutationPlan>;
  applyApprovedPolicyPlan(plan: ApprovedPlan): Promise<MutationResult>;
  verifyPolicyMutation(result: MutationResult): Promise<ValidationReport>;
}

export class AdapterRegistry {
  private static readonly adapters = new Map<string, PolicyPermissionAdapter>();

  public static registerAdapter(adapter: PolicyPermissionAdapter): void {
    const requiredMethods: (keyof PolicyPermissionAdapter)[] = [
      'capabilities',
      'inspectPrincipal',
      'inspectPolicy',
      'listPolicyBindings',
      'validateNativePolicy',
      'renderPolicy',
      'diffPolicy',
      'planPolicyMutation',
      'applyApprovedPolicyPlan',
      'verifyPolicyMutation',
    ];

    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        throw new Error(
          `Adapter for provider '${adapter.providerId}' is non-compliant: missing required method '${method}'`
        );
      }
    }

    this.adapters.set(adapter.providerId, adapter);
  }

  public static getAdapter(providerId: string): PolicyPermissionAdapter | undefined {
    return this.adapters.get(providerId);
  }

  public static getRequiredAdapter(providerId: string): PolicyPermissionAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(`Provider adapter '${providerId}' is not registered or supported.`);
    }
    return adapter;
  }

  public static listAdapters(): PolicyPermissionAdapter[] {
    return Array.from(this.adapters.values());
  }

  public static clear(): void {
    this.adapters.clear();
  }
}
