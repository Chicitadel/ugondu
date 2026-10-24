/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Provider Adapter Interface
 * File           : IPolicyProviderAdapter.ts
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

import type {
  AuthorizationRule,
  AuthorizationConstraints,
  EffectiveAuthorityResult,
  AuthorityGraph,
  TemporaryAuthorization,
  PolicyRetirementCertificate,
  UsageClassification,
} from '../types/index';

export type ProviderType =
  | 'AWS_IAM'
  | 'AZURE_RBAC'
  | 'GCP_IAM'
  | 'KUBERNETES_RBAC'
  | 'LINUX_ACL'
  | 'WINDOWS_ACL'
  | 'CPANEL'
  | 'CLOUDFLARE';

/**
 * @interface AdapterContext
 * @description Corporate Governed interface implementation for AdapterContext
 * @classification ENTERPRISE
 */
export interface AdapterContext {
  tenantId:       string;
  environmentId:  string;
  provider:       ProviderType;
  region?:        string;
  credentials:    Record<string, string>;
  operationId?:   string;
  executionId?:   string;
}

/**
 * @interface ProviderNativePolicy
 * @description Corporate Governed interface implementation for ProviderNativePolicy
 * @classification ENTERPRISE
 */
export interface ProviderNativePolicy {
  providerId:     string;
  providerType:   ProviderType;
  nativeDocument: unknown;    // AWS IAM JSON, K8s RBAC YAML, etc.
  digest:         string;     // SHA-256
}

/**
 * @interface PolicyValidationResult
 * @description Corporate Governed interface implementation for PolicyValidationResult
 * @classification ENTERPRISE
 */
export interface PolicyValidationResult {
  valid:    boolean;
  errors:   string[];
  warnings: string[];
}

/**
 * @interface AttachResult
 * @description Corporate Governed interface implementation for AttachResult
 * @classification ENTERPRISE
 */
export interface AttachResult {
  success:     boolean;
  providerRef: string;
  attachedAt:  string;
  errors:      string[];
}

/**
 * @interface DetachResult
 * @description Corporate Governed interface implementation for DetachResult
 * @classification ENTERPRISE
 */
export interface DetachResult {
  success:     boolean;
  detachedAt?: string;
  errors:      string[];
}

/**
 * @interface UpdateResult
 * @description Corporate Governed interface implementation for UpdateResult
 * @classification ENTERPRISE
 */
export interface UpdateResult {
  success:  boolean;
  version:  string;
  errors:   string[];
}

/**
 * @interface CloneResult
 * @description Corporate Governed interface implementation for CloneResult
 * @classification ENTERPRISE
 */
export interface CloneResult {
  success:   boolean;
  clonedId:  string;
  errors:    string[];
}

/**
 * @interface ObservationWindow
 * @description Corporate Governed interface implementation for ObservationWindow
 * @classification ENTERPRISE
 */
export interface ObservationWindow {
  startAt: string;   // ISO-8601
  endAt:   string;   // ISO-8601
}

/**
 * @interface UsageObservation
 * @description Corporate Governed interface implementation for UsageObservation
 * @classification ENTERPRISE
 */
export interface UsageObservation {
  policyId:        string;
  observedUsages:  number;
  lastUsedAt?:     string;
  classification:  UsageClassification;
  scheduledJobDetected:  boolean;
  failoverPathDetected:  boolean;
  emergencyPathDetected: boolean;
}

/**
 * @interface DependencyReport
 * @description Corporate Governed interface implementation for DependencyReport
 * @classification ENTERPRISE
 */
export interface DependencyReport {
  policyId:          string;
  dependentRoles:    string[];
  dependentActors:   string[];
  dependentServices: string[];
  blastRadius:       'MINIMAL' | 'LIMITED' | 'SIGNIFICANT' | 'BROAD';
}

/**
 * @interface ConflictReport
 * @description Corporate Governed interface implementation for ConflictReport
 * @classification ENTERPRISE
 */
export interface ConflictReport {
  conflicts: PolicyConflict[];
}

/**
 * @interface PolicyConflict
 * @description Corporate Governed interface implementation for PolicyConflict
 * @classification ENTERPRISE
 */
export interface PolicyConflict {
  ruleA:       string;
  ruleB:       string;
  conflictType: 'ALLOW_DENY_OVERLAP' | 'SCOPE_AMBIGUITY' | 'CONDITION_CONFLICT';
  explanation: string;
  resolution:  'A_WINS' | 'B_WINS' | 'MOST_SPECIFIC_WINS' | 'AMBIGUOUS';
}

/**
 * @interface ReconciliationPlan
 * @description Corporate Governed interface implementation for ReconciliationPlan
 * @classification ENTERPRISE
 */
export interface ReconciliationPlan {
  toAdd:    AuthorizationRule[];
  toRemove: string[];   // ruleIds
  toUpdate: Array<{ ruleId: string; newRule: AuthorizationRule }>;
  noChange: string[];   // ruleIds
}

/**
 * @interface RetirementPlan
 * @description Corporate Governed interface implementation for RetirementPlan
 * @classification ENTERPRISE
 */
export interface RetirementPlan {
  policyId:         string;
  shadowPeriodDays: number;
  approvedBy:       string;
  retentionDays:    number;
}

/**
 * @interface RetirementResult
 * @description Corporate Governed interface implementation for RetirementResult
 * @classification ENTERPRISE
 */
export interface RetirementResult {
  success:      boolean;
  certificate?: PolicyRetirementCertificate;
  rollbackReference?:   string;   // provider-native snapshot to embed in the signed certificate
  detachmentEvidence?:  string;   // provider-native confirmation of detachment
  errors:       string[];
}

/**
 * @interface RestoreResult
 * @description Corporate Governed interface implementation for RestoreResult
 * @classification ENTERPRISE
 */
export interface RestoreResult {
  success:     boolean;
  restoredId:  string;
  errors:      string[];
}

/**
 * @interface PolicySimulationResult
 * @description Corporate Governed interface implementation for PolicySimulationResult
 * @classification ENTERPRISE
 */
export interface PolicySimulationResult {
  allowed:    string[];    // capability IDs that would be allowed
  denied:     string[];    // capability IDs that would be denied
  unchanged:  string[];    // capability IDs unaffected by proposed change
  confidence: import('../types/index').SimulationConfidence;
  blastRadius: DependencyReport;
}

/**
 * IPolicyProviderAdapter — the universal interface every UPPIE provider adapter implements.
 * Core UPPIE calls this interface exclusively. No adapter-specific code in core.
 */
export interface IPolicyProviderAdapter {
  readonly providerType: ProviderType;
  readonly capabilities: AdapterCapabilityDeclaration;

  // Discovery
  discoverPolicies(context: AdapterContext): Promise<ProviderNativePolicy[]>;
  discoverAssignments(context: AdapterContext): Promise<Record<string, string[]>>;
  discoverIdentities(context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>>;
  discoverGroups(context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>>;
  discoverRoles(context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>>;
  discoverEffectiveAuthority(actor: string, resource: string, context: AdapterContext): Promise<EffectiveAuthorityResult>;

  // Evaluation
  evaluate(rule: AuthorizationRule, context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'>;
  simulate(proposedRules: AuthorizationRule[], context: AdapterContext): Promise<PolicySimulationResult>;

  // Generation & Compilation
  generate(rules: AuthorizationRule[], context: AdapterContext): Promise<ProviderNativePolicy>;
  validate(nativePolicy: ProviderNativePolicy, context: AdapterContext): Promise<PolicyValidationResult>;

  // Lifecycle
  attach(nativePolicy: ProviderNativePolicy, target: string, context: AdapterContext): Promise<AttachResult>;
  detach(policyId: string, target: string, context: AdapterContext): Promise<DetachResult>;
  update(policyId: string, newRules: AuthorizationRule[], context: AdapterContext): Promise<UpdateResult>;
  clone(policyId: string, newName: string, context: AdapterContext): Promise<CloneResult>;

  // Observation
  observeUsage(policyId: string, window: ObservationWindow, context: AdapterContext): Promise<UsageObservation>;
  detectUnused(context: AdapterContext, thresholdDays: number): Promise<UsageObservation[]>;

  // Analysis
  findDependencies(policyId: string, context: AdapterContext): Promise<DependencyReport>;
  findConflicts(rules: AuthorizationRule[], context: AdapterContext): Promise<ConflictReport>;

  // Constraints
  getConstraints(context: AdapterContext): Promise<AuthorizationConstraints>;

  // Reconciliation
  reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], context: AdapterContext): Promise<ReconciliationPlan>;

  // Retirement
  retire(plan: RetirementPlan, context: AdapterContext): Promise<RetirementResult>;
  restore(certificate: PolicyRetirementCertificate, context: AdapterContext): Promise<RestoreResult>;
}

/** Capability support declaration per adapter method. */
export type AdapterCapabilityDeclaration = {
  [K in keyof Omit<IPolicyProviderAdapter, 'providerType' | 'capabilities'>]:
    'SUPPORTED' | 'SUPPORTED_WITH_LIMITS' | 'UNSUPPORTED' | 'NOT_OBSERVABLE';
};
