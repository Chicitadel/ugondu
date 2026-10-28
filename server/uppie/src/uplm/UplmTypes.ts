/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — Core Types & State Vocabularies
 * File           : UplmTypes.ts
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

import { __t } from '@ugondu/shared';

/**
 * 13 Canonical Bootstrap States (Agent-Neutral Capability Contract §5.2).
 */
export const UPLM_BOOTSTRAP_STATES = [
  'NOT_INSPECTED',
  'INSPECTING',
  'READY',
  'READY_WITH_WARNINGS',
  'MISSING_AUTHORITY',
  'CONSENT_REQUIRED',
  'BLOCKED_BY_POLICY',
  'UNSUPPORTED',
  'APPLYING',
  'VERIFYING',
  'COMPLETE',
  'FAILED_RECOVERABLE',
  'MANUAL_INTERVENTION_REQUIRED',
] as const;

export type UplmBootstrapState = typeof UPLM_BOOTSTRAP_STATES[number];

/**
 * 10 Normalized Policy States (UPLM Blueprint §3.2).
 * INVARIANT: Never convert CONFLICT, UNVERIFIED, UNSUPPORTED, or UNKNOWN to MISSING or COMPLIANT.
 */
export const UPLM_NORMALIZED_POLICY_STATES = [
  'COMPLIANT',
  'MISSING',
  'DRIFTED',
  'CONFLICT',
  'UNVERIFIED',
  'UNSUPPORTED',
  'IN_USE',
  'ORPHANED_CANDIDATE',
  'RETIRED',
  'UNKNOWN',
] as const;

export type UplmNormalizedPolicyState = typeof UPLM_NORMALIZED_POLICY_STATES[number];

const PROTECTED_AMBIGUOUS_STATES: ReadonlySet<UplmNormalizedPolicyState> = new Set([
  'CONFLICT',
  'UNVERIFIED',
  'UNSUPPORTED',
  'UNKNOWN',
]);

/**
 * Enforces Blueprint §3.2 invariant:
 * Never convert CONFLICT, UNVERIFIED, UNSUPPORTED, or UNKNOWN to MISSING or COMPLIANT.
 */
export function guardPolicyStateConversion(
  fromState: UplmNormalizedPolicyState,
  toState: UplmNormalizedPolicyState
): UplmNormalizedPolicyState {
  if (
    PROTECTED_AMBIGUOUS_STATES.has(fromState) &&
    (toState === 'MISSING' || toState === 'COMPLIANT')
  ) {
    throw new Error(
      __t('uplm.error.invariant_violation', { fromState, toState })
    );
  }
  return toState;
}

/**
 * 6 Canonical Resource Ownership Classes (UPLM Blueprint §6.1).
 * Note: UGONDU_ADOPTED default retirement is PRESERVE.
 */
export const UPLM_OWNERSHIP_CLASSES = [
  'UGONDU_CREATED',
  'UGONDU_ADOPTED',
  'SHARED',
  'USER_OWNED',
  'EXTERNAL',
  'UNKNOWN',
] as const;

export type UplmOwnershipClass = typeof UPLM_OWNERSHIP_CLASSES[number];

/**
 * 9 Allowed Terminal Outcomes (UPLM Blueprint §14).
 */
export const UPLM_TERMINAL_OUTCOMES = [
  'VERIFIED_COMPLIANT',
  'VERIFIED_INSTALLED',
  'VERIFIED_REPAIRED',
  'VERIFIED_MIGRATED',
  'VERIFIED_RETIRED',
  'BLOCKED',
  'FAILED_RECOVERED',
  'FAILED_PARTIAL',
  'MANUAL_REVIEW_REQUIRED',
] as const;

export type UplmTerminalOutcome = typeof UPLM_TERMINAL_OUTCOMES[number];

/**
 * Durable Operation States (UPLM Blueprint §7.2).
 */
export const UPLM_OPERATION_STATES = [
  'PLANNED',
  'PRECHECKED',
  'APPLYING',
  'APPLIED',
  'VERIFYING',
  'VERIFIED',
  'BLOCKED',
  'FAILED',
  'COMPENSATING',
  'COMPENSATED',
  'FAILED_PARTIAL',
  'MANUAL_REVIEW_REQUIRED',
] as const;

export type UplmOperationState = typeof UPLM_OPERATION_STATES[number];

export type UplmRiskClass = 'R0' | 'R1' | 'R2' | 'R3' | 'R4';

export type UplmAutonomyMode = 'inspect' | 'guided' | 'managed' | 'enterprise-policy';

/**
 * 6 Bootstrap Authorization Models (Agent-Neutral Capability Contract §5.5).
 */
export const BOOTSTRAP_AUTHORIZATION_MODELS = [
  'PRE_AUTHORIZED_BOOTSTRAP_ROLE',
  'SHORT_LIVED_DELEGATED_IDENTITY',
  'INTERACTIVE_PROVIDER_CONSENT',
  'USER_SUPPLIED_SCOPED_CREDENTIALS',
  'ONE_TIME_PRIVILEGED_HANDOFF',
  'READ_ONLY_MODE',
] as const;

export type BootstrapAuthorizationModel = typeof BOOTSTRAP_AUTHORIZATION_MODELS[number];

/**
 * 9 Repair Matrix Conditions (UPLM Blueprint §9.1).
 */
export const UPLM_REPAIR_CONDITIONS = [
  'REQUIRED_OBJECT_PROVABLY_MISSING',
  'POLICY_EXISTS_NOT_ATTACHED',
  'OWNED_POLICY_DOCUMENT_DRIFTED',
  'TRUST_CONTAINS_UNEXPECTED_PRINCIPAL',
  'POLICY_DOCUMENT_MALFORMED_OR_UNKNOWN',
  'PERMISSION_DENIED',
  'DISCOVERY_INCOMPLETE',
  'OBJECT_USED_BY_ANOTHER_CONSUMER',
  'LEDGER_ABSENT_OR_CONFLICTING',
] as const;

export type UplmRepairCondition = typeof UPLM_REPAIR_CONDITIONS[number];

/**
 * Typed ResolvedEnvironment for dynamic environment resolution (UPLM Blueprint §4.4).
 */
export interface ResolvedEnvironment {
  provider: 'aws' | 'azure' | 'gcp' | 'kubernetes' | 'linux' | 'cpanel';
  partition: string;
  accountId: string;
  region: string;
  workspace?: string;
  targetRoleName: string;
  targetRoleArn: string;
  runnerRoleName?: string;
  runnerRoleArn?: string;
  transactionId: string;
  requiredTags: Record<string, string>;
  quotas: {
    maxManagedPolicySizeChars: number;
    maxManagedPoliciesPerRole: number;
    currentAttachedManagedPolicies: number;
    maxVersionsPerManagedPolicy: number;
  };
}

export interface OperationContext {
  operationId: string;
  transactionId: string;
  correlationId: string;
  tenantId: string;
  actorId: string;
  autonomyMode: UplmAutonomyMode;
  resolvedEnvironment: ResolvedEnvironment;
  preserveInitialFixture?: boolean;
}

export interface DiscoverTargetInput {
  targetRoleArn: string;
  expectedAccountId: string;
  expectedRegion: string;
}

export interface ObservedTarget {
  discoveredAt: string;
  effectivePrincipalArn: string;
  accountId: string;
  partition: string;
  region: string;
  credentialsValid: boolean;
  credentialsExpired: boolean;
  targetMatchesExpected: boolean;
  providerRequestId: string;
}

export interface InspectRequest {
  packId: string;
  targetRoleArn: string;
  simulateIncompletePagination?: boolean;
  simulatePermissionDenied?: boolean;
}

export interface ObservedPolicyItem {
  logicalId: string;
  physicalName: string;
  arn: string;
  exists: boolean;
  attachedToTargetRole: boolean;
  attachedToRunnerRole: boolean;
  defaultVersionId?: string;
  documentHash?: string;
  expectedDocumentHash: string;
  normalizedState: UplmNormalizedPolicyState;
  ownershipClass: UplmOwnershipClass;
  statementCount: number;
  externalConsumers: string[];
}

export interface ObservedPolicyState {
  inspectedAt: string;
  targetRoleArn: string;
  targetRoleExists: boolean;
  trustPolicyHash?: string;
  expectedTrustPrincipalArn: string;
  observedTrustPrincipalArn?: string;
  trustPrincipalMatches: boolean;
  inlinePolicyNames: string[];
  permissionsBoundaryArn?: string;
  roleTags: Record<string, string>;
  policies: ObservedPolicyItem[];
  discoveryComplete: boolean;
  overallState: UplmNormalizedPolicyState;
  effectivePermissionVerified: boolean;
  mutationsPerformed: 0;
  providerRequestIds: string[];
}

export interface ValidateDocumentRequest {
  logicalId: string;
  physicalName: string;
  document: Record<string, unknown>;
  expectedSha256?: string;
}

export interface ValidationReport {
  valid: boolean;
  sha256: string;
  compactCharLength: number;
  statementCount: number;
  sids: string[];
  errors: string[];
  warnings: string[];
}

export interface PlanRequest {
  packId: string;
  packVersion: string;
  observedState: ObservedPolicyState;
  operationKind: 'BOOTSTRAP' | 'INSTALL' | 'REPAIR' | 'MIGRATE' | 'RETIRE';
}

export interface ChangePlanEntry {
  entryId: string;
  sequence: number;
  logicalResourceId: string;
  providerResourceId: string;
  operation:
    | 'CREATE_MANAGED_POLICY'
    | 'ATTACH_MANAGED_POLICY'
    | 'UPDATE_MANAGED_POLICY_VERSION'
    | 'DETACH_MANAGED_POLICY'
    | 'DELETE_MANAGED_POLICY'
    | 'VERIFY_TRUST_RELATIONSHIP'
    | 'NO_OP';
  desiredHash: string;
  observedHash?: string;
  ownershipClass: UplmOwnershipClass;
  riskClass: UplmRiskClass;
  requiredCapability: string;
  requiredProviderActions: string[];
  requiresApproval: boolean;
  idempotencyKey: string;
  preconditions: string[];
  postconditions: string[];
  compensationStrategy: string;
}

export interface ChangePlan {
  planId: string;
  planHash: string;
  packId: string;
  packVersion: string;
  targetRoleArn: string;
  createdAt: string;
  expiresAt: string;
  operationKind: 'BOOTSTRAP' | 'INSTALL' | 'REPAIR' | 'MIGRATE' | 'RETIRE';
  blocked: boolean;
  blockReasons: string[];
  entries: ChangePlanEntry[];
  readOnlyGenerated: true;
}

export interface ApplyResult {
  operationId: string;
  planId: string;
  planHash: string;
  appliedAt: string;
  operationState: UplmOperationState;
  terminalOutcome: UplmTerminalOutcome;
  appliedEntryIds: string[];
  failedEntryIds: string[];
  errors: string[];
  providerRequestIds: string[];
}

export interface VerifyRequest {
  operationId: string;
  packId: string;
  targetRoleArn: string;
  expectedPlanHash?: string;
  runNegativeIsolationTests?: boolean;
}

export interface VerificationCheckResult {
  checkId: string;
  status: 'PASS' | 'FAIL' | 'UNVERIFIED' | 'NOT_APPLICABLE';
  rationale: string;
}

export interface VerificationReport {
  verifiedAt: string;
  operationId: string;
  allRequiredPassed: boolean;
  terminalOutcome: UplmTerminalOutcome;
  checks: VerificationCheckResult[];
}

export interface DependencyRequest {
  targetRoleArn: string;
  policyArns: string[];
}

export interface UplmDependencyReport {
  targetRoleArn: string;
  policyDependencies: Array<{
    policyArn: string;
    attachedRoles: string[];
    externalConsumers: string[];
    inUseByExternal: boolean;
  }>;
  activeTransactions: string[];
}

export interface CompensationRequest {
  operationId: string;
  plan: ChangePlan;
  appliedEntryIds: string[];
}

export interface CompensationResult {
  operationId: string;
  compensated: boolean;
  operationState: 'COMPENSATED' | 'MANUAL_REVIEW_REQUIRED';
  terminalOutcome: 'FAILED_RECOVERED' | 'MANUAL_REVIEW_REQUIRED';
  restoredResources: string[];
  unresolvedResources: string[];
}

export type UplmCapabilitySupportLevel = 'supported' | 'partial' | 'unsupported';

export interface UplmAdapterCapabilities {
  discoverIdentity: UplmCapabilitySupportLevel;
  inspectPolicyDocument: UplmCapabilitySupportLevel;
  inspectAttachments: UplmCapabilitySupportLevel;
  inspectTrustRelationship: UplmCapabilitySupportLevel;
  validatePolicy: UplmCapabilitySupportLevel;
  createPolicy: UplmCapabilitySupportLevel;
  updateOwnedPolicy: UplmCapabilitySupportLevel;
  attachPolicy: UplmCapabilitySupportLevel;
  detachPolicy: UplmCapabilitySupportLevel;
  inspectEffectivePermissions: UplmCapabilitySupportLevel;
  detectExternalConsumers: UplmCapabilitySupportLevel;
  atomicRollback: UplmCapabilitySupportLevel;
}

/**
 * PolicyLifecycleProviderAdapter — Universal provider adapter contract (UPLM Blueprint §5).
 */
export interface PolicyLifecycleProviderAdapter {
  readonly providerId: string;
  readonly adapterVersion: string;
  readonly capabilities: UplmAdapterCapabilities;
  readonly supportedBootstrapModels: readonly BootstrapAuthorizationModel[];

  discoverTarget(input: DiscoverTargetInput, ctx: OperationContext): Promise<ObservedTarget>;
  inspect(input: InspectRequest, ctx: OperationContext): Promise<ObservedPolicyState>;
  validateDocument(input: ValidateDocumentRequest, ctx: OperationContext): Promise<ValidationReport>;
  plan(input: PlanRequest, ctx: OperationContext): Promise<ChangePlan>;
  apply(plan: ChangePlan, ctx: OperationContext): Promise<ApplyResult>;
  verify(input: VerifyRequest, ctx: OperationContext): Promise<VerificationReport>;
  inspectDependencies(input: DependencyRequest, ctx: OperationContext): Promise<UplmDependencyReport>;
  compensate(input: CompensationRequest, ctx: OperationContext): Promise<CompensationResult>;
}
