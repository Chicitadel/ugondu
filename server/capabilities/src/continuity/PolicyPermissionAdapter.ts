/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : PolicyPermissionAdapter.ts
 * Version        : 1.2.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-23
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
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

  // Normative Provider-Neutral Contract
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

export function assertPolicyVerification(evidence: {
  verification: string;
  observedDigest?: string;
  expectedDigest?: string;
}): void {
  if (
    !evidence ||
    evidence.verification !== 'VERIFIED' ||
    !evidence.observedDigest ||
    evidence.observedDigest !== evidence.expectedDigest
  ) {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN');
  }
}

export abstract class BasePolicyPermissionAdapter implements PolicyPermissionAdapter {
  abstract readonly providerId: string;
  readonly adapterVersion: string = '1.0.0';

  public async discoverIdentity(): Promise<ProviderIdentity> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: discoverIdentity must be implemented by provider adapter');
  }

  public async negotiateCapabilities(): Promise<ProviderCapability[]> {
    return [];
  }

  public abstract inspectPolicy(policyId: string): Promise<NativePolicySnapshot | any>;

  public async planPolicyReconciliation(_input: unknown): Promise<unknown> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: planPolicyReconciliation requires provider implementation');
  }

  public async applyPolicyReconciliation(_plan: unknown): Promise<unknown> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: applyPolicyReconciliation requires provider implementation');
  }

  public async verifyPolicyReconciliation(evidence: any): Promise<ReconcileOutcome> {
    if (!evidence || evidence.verification !== 'VERIFIED' || !evidence.observedDigest || evidence.observedDigest !== evidence.expectedDigest) {
      throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: read-after-write verification failed');
    }
    return 'APPLIED_AND_MATCHES';
  }

  public async inspectAttachments(_targetId: string): Promise<unknown> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: inspectAttachments requires provider implementation');
  }

  public async attachPolicy(_targetId: string, _policyId: string): Promise<void> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: attachPolicy requires provider implementation');
  }

  public async rollback(_evidence: unknown): Promise<unknown> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: rollback requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public capabilities(): ProviderCapabilities {
    return {
      policyRead: 'unknown', policyWrite: 'unknown', resourceLevelScope: 'unknown',
      conditionalPermissions: 'unknown', explicitDeny: 'unknown', sessionTags: 'unknown',
      policySimulation: 'unknown', auditEventRead: 'unknown', immutableEventStore: 'unknown',
      idempotencyTokens: 'unknown', resourceTags: 'unknown', transactionalChanges: 'unknown',
    };
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async inspectPrincipal(_ref: PrincipalRef): Promise<PrincipalSnapshot> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: inspectPrincipal requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async listPolicyBindings(_p: PrincipalRef): Promise<PolicyBinding[]> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: listPolicyBindings requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async validateNativePolicy(_d: unknown): Promise<ValidationReport> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: validateNativePolicy requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async renderPolicy(_t: unknown, _c: Record<string, unknown>): Promise<RenderedPolicy> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: renderPolicy requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public diffPolicy(_exp: RenderedPolicy, _obs: NativePolicySnapshot): PolicyDiff {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: diffPolicy requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async planPolicyMutation(_diff: PolicyDiff): Promise<MutationPlan> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: planPolicyMutation requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async applyApprovedPolicyPlan(_plan: ApprovedPlan): Promise<MutationResult> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: applyApprovedPolicyPlan requires provider implementation');
  }

  /**
   * @deprecated Deprecated since v1.2.0. Legacy mutation contract.
   */
  public async verifyPolicyMutation(_result: MutationResult): Promise<ValidationReport> {
    throw new Error('COR_POLICY_VERIFICATION_UNPROVEN: verifyPolicyMutation requires provider implementation');
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

    if (hasLegacy && !hasNormative) {
      process.emitWarning(
        `[UGONDU_DEPRECATION] Provider adapter '${adapter.providerId}' implements deprecated granular mutation contract. Migrate to normative reconciliation contract.`,
        'DeprecationWarning'
      );
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
