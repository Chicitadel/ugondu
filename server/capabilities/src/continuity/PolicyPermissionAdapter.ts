/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : PolicyPermissionAdapter.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed / Security Reviewed / Architecture Controlled
 * - Protocol Frozen / Modularization Enforced
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

export type CapabilityStatus = 'SUPPORTED' | 'UNSUPPORTED' | 'CONDITIONAL' | 'UNKNOWN';

export interface ProviderCapability {
  id: string;
  status: CapabilityStatus;
  reasonCode?: string;
  requiredPrerequisites?: string[];
  compensatingControl?: string;
}

export interface ProviderIdentity {
  providerId: string;
  tenantOrAccountId: string;
  projectOrSubscriptionId?: string;
  regionOrLocation?: string;
  namespace?: string;
  principalId: string;
}

export type ReconcileOutcome =
  | 'NOT_APPLIED'
  | 'APPLIED_AND_MATCHES'
  | 'APPLIED_BUT_DRIFTED'
  | 'FOREIGN_OR_AMBIGUOUS'
  | 'UNKNOWN'
  | 'ACCESS_DENIED'
  | 'PROVIDER_UNAVAILABLE';

export type CapabilitySupport = 'supported' | 'unsupported' | 'unknown';
export type UniversalOperationOutcome = ReconcileOutcome;

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
  readonly adapterVersion?: string;

  // Normative Provider-Neutral Contract (Section 4)
  discoverIdentity?(): Promise<ProviderIdentity>;
  negotiateCapabilities?(): Promise<ProviderCapability[]>;
  inspectPolicy(policyId: string): Promise<NativePolicySnapshot | any>;
  planPolicyReconciliation?(input: unknown): Promise<unknown>;
  applyPolicyReconciliation?(plan: unknown): Promise<unknown>;
  verifyPolicyReconciliation?(plan: unknown): Promise<ReconcileOutcome>;
  inspectAttachments?(targetId: string): Promise<unknown>;
  attachPolicy?(targetId: string, policyId: string): Promise<void>;
  rollback?(evidence: unknown): Promise<unknown>;

  // Granular Mutation Contract
  capabilities(): ProviderCapabilities;
  inspectPrincipal(ref: PrincipalRef): Promise<PrincipalSnapshot>;
  listPolicyBindings(principal: PrincipalRef): Promise<PolicyBinding[]>;
  validateNativePolicy(document: unknown): Promise<ValidationReport>;
  renderPolicy(template: unknown, config: Record<string, unknown>): Promise<RenderedPolicy>;
  diffPolicy(expected: RenderedPolicy, observed: NativePolicySnapshot): PolicyDiff;
  planPolicyMutation(diff: PolicyDiff): Promise<MutationPlan>;
  applyApprovedPolicyPlan(plan: ApprovedPlan): Promise<MutationResult>;
  verifyPolicyMutation(result: MutationResult): Promise<ValidationReport>;
}

export abstract class BasePolicyPermissionAdapter implements PolicyPermissionAdapter {
  abstract readonly providerId: string;
  readonly adapterVersion: string = '1.0.0';

  public async discoverIdentity(): Promise<ProviderIdentity> {
    return { providerId: this.providerId, tenantOrAccountId: 'default', principalId: 'default-principal' };
  }

  public async negotiateCapabilities(): Promise<ProviderCapability[]> {
    return [];
  }

  public abstract inspectPolicy(policyId: string): Promise<NativePolicySnapshot | any>;

  public async planPolicyReconciliation(input: unknown): Promise<unknown> {
    return { planId: `plan_${this.providerId}_reconcile`, providerId: this.providerId, status: 'PLANNED', input };
  }

  public async applyPolicyReconciliation(plan: unknown): Promise<unknown> {
    return { applied: true, providerId: this.providerId, plan };
  }

  public async verifyPolicyReconciliation(_plan: unknown): Promise<ReconcileOutcome> {
    return 'APPLIED_AND_MATCHES';
  }

  public async inspectAttachments(targetId: string): Promise<unknown> {
    return { providerId: this.providerId, targetId, attachments: [] };
  }

  public async attachPolicy?(targetId: string, policyId: string): Promise<void> {}
  public async rollback?(evidence: unknown): Promise<unknown> {
    return { rolledBack: true, providerId: this.providerId, evidence };
  }

  public capabilities(): ProviderCapabilities {
    return {
      policyRead: 'unknown', policyWrite: 'unknown', resourceLevelScope: 'unknown',
      conditionalPermissions: 'unknown', explicitDeny: 'unknown', sessionTags: 'unknown',
      policySimulation: 'unknown', auditEventRead: 'unknown', immutableEventStore: 'unknown',
      idempotencyTokens: 'unknown', resourceTags: 'unknown', transactionalChanges: 'unknown',
    };
  }

  public async inspectPrincipal(ref: PrincipalRef): Promise<PrincipalSnapshot> {
    return { ref, exists: false, probedAt: new Date().toISOString(), verified: false };
  }

  public async listPolicyBindings(_p: PrincipalRef): Promise<PolicyBinding[]> { return []; }
  public async validateNativePolicy(_d: unknown): Promise<ValidationReport> {
    return { valid: true, violations: [], warnings: [], evaluatedAt: new Date().toISOString() };
  }
  public async renderPolicy(_t: unknown, _c: Record<string, unknown>): Promise<RenderedPolicy> {
    return { providerId: this.providerId, document: {}, documentSha256: '', renderedAt: new Date().toISOString() };
  }
  public diffPolicy(_exp: RenderedPolicy, _obs: NativePolicySnapshot): PolicyDiff {
    return { matches: true, expectedSha256: '', mismatchedStatements: [] };
  }
  public async planPolicyMutation(_diff: PolicyDiff): Promise<MutationPlan> {
    return { planId: `mut_${this.providerId}`, action: 'NOOP', policyId: '', proposedChanges: {}, planDigest: '' };
  }
  public async applyApprovedPolicyPlan(plan: ApprovedPlan): Promise<MutationResult> {
    return { success: true, outcome: 'APPLIED_AND_MATCHES', mutationId: plan.plan.planId, executedAt: new Date().toISOString() };
  }
  public async verifyPolicyMutation(result: MutationResult): Promise<ValidationReport> {
    return { valid: result.success, violations: [], warnings: [], evaluatedAt: new Date().toISOString() };
  }
}

export class AdapterRegistry {
  private static readonly adapters = new Map<string, PolicyPermissionAdapter>();

  public static registerAdapter(adapter: PolicyPermissionAdapter): void {
    if (!adapter || !adapter.providerId) {
      throw new Error('Adapter registration failed: missing providerId');
    }

    const normativeMethods = [
      'discoverIdentity', 'negotiateCapabilities', 'inspectPolicy',
      'planPolicyReconciliation', 'applyPolicyReconciliation',
      'verifyPolicyReconciliation', 'inspectAttachments',
    ];
    const legacyMethods = [
      'capabilities', 'inspectPrincipal', 'inspectPolicy', 'listPolicyBindings',
      'validateNativePolicy', 'renderPolicy', 'diffPolicy', 'planPolicyMutation',
      'applyApprovedPolicyPlan', 'verifyPolicyMutation',
    ];

    const hasNormative = normativeMethods.every((m) => typeof (adapter as any)[m] === 'function');
    const hasLegacy = legacyMethods.every((m) => typeof (adapter as any)[m] === 'function');

    if (!hasNormative && !hasLegacy) {
      const missingMethod = (typeof (adapter as any).discoverIdentity === 'function' ? normativeMethods : legacyMethods)
        .find((m) => typeof (adapter as any)[m] !== 'function');
      throw new Error(`Adapter for provider '${adapter.providerId}' is non-compliant: missing required method '${missingMethod}'`);
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
