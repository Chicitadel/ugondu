/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Universal Bootstrap & Cloud Provisioning Types
 * File           : UniversalBootstrapTypes.ts
 * Version        : 1.0.0
 * Author         : Ignatus Chika UJOMOR / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (RCS Paris 943 432 534)
 * Created Date   : 2026-10-26
 * Last Modified  : 2026-10-26
 * Classification : ENTERPRISE
 *
 * Governance     : Corporate Policy Governed (https://policies.airroofers.eu)
 * Standards      : ISO 27001:2022 / SOC 2 Type II / OWASP ASVS 4.0.3 / NIST SP 800-53 Rev. 5
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

export type UniversalBootstrapLifecycleStage =
  | 'DISCOVER' | 'RESOLVE_TARGET' | 'PLAN' | 'VALIDATE' | 'AUTHORIZE'
  | 'APPROVE' | 'APPLY' | 'VERIFY' | 'CERTIFY' | 'FREEZE' | 'HANDOFF';

export type PolicyPackLifecycleStage =
  | 'derive' | 'constrain' | 'render' | 'validate' | 'review'
  | 'install' | 'read_back' | 'execute' | 'verify_and_revoke';

export type LogicalBootstrapRoleId =
  | 'bootstrap_authority' | 'runner_base' | 'execution_role' | 'iac_service_role'
  | 'workload_runtime_role' | 'dns_certificate_role' | 'state_artifact_role' | 'observer_verifier';

export type UniversalEditionTier = 'community' | 'professional' | 'enterprise';

export type DenialRootCauseCategory =
  | 'IDENTITY_POLICY_MISSING' | 'EXPLICIT_DENY_POLICY' | 'SCP_DENY' | 'PERMISSIONS_BOUNDARY_DENY'
  | 'SESSION_POLICY_DENY' | 'TRUST_POLICY_DENY' | 'RESOURCE_POLICY_DENY' | 'KMS_KEY_POLICY_DENY'
  | 'MISSING_PASS_ROLE' | 'MISSING_SERVICE_LINKED_ROLE' | 'WRONG_ACCOUNT_OR_REGION' | 'UNMAPPED_PLAN_OPERATION';

export interface UniversalBootstrapBundleManifest {
  schema_version: string;
  bundle_id: 'ugondu.universal-bootstrap.bundle';
  task_id: 'UG-UPLM-BOOTSTRAP-UNIVERSAL-001';
  status: string;
  entrypoints: Record<string, string>;
  required_package_contents: Array<{ id: string; path: string; required: boolean; purpose: string }>;
  bundle_invariants: {
    fail_closed: true;
    unknown_or_missing_artifact_is_fatal: true;
    runtime_permissions_must_not_exceed_approved_plan: true;
    [key: string]: boolean;
  };
  execution_order: string[];
  required_runtime_outputs: string[];
  non_claims: string[];
}

export interface UniversalRoleCatalogEntry {
  role_id: LogicalBootstrapRoleId;
  required: boolean;
  purpose: string;
  may_mutate_cloud_workloads: boolean;
  credential_mode: string[];
  scope: string;
  constraints: string[];
}

export interface UniversalRoleCatalog {
  schema_version: string;
  catalog_id: 'ugondu.bootstrap.role-catalog';
  status: string;
  role_separation_required: boolean;
  roles: UniversalRoleCatalogEntry[];
  role_binding_rules: string[];
  provider_mapping_status: Record<string, string>;
}

export interface UniversalCapabilitiesManifest {
  schema_version: string;
  registry_id: string;
  task_id: string;
  status: string;
  governance: {
    framework: string;
    product_authority: string;
    canonical_guardrail: string;
    legal_policy_authority: string;
    entitlement_authority: string;
    fail_closed: boolean;
    discover_before_create: boolean;
    no_self_escalation: boolean;
    no_master_mutation: boolean;
  };
  bootstrap_contract: Record<string, unknown>;
  lifecycle: UniversalBootstrapLifecycleStage[];
  entrypoints: Record<string, unknown>;
  providers: Record<string, Record<string, unknown>>;
  editions: {
    community: { goal?: string; includes: string[]; limits?: string[] };
    professional: { includes: string[] };
    enterprise: { includes: string[] };
    all_editions_must_enforce: string[];
  };
  required_evidence: Record<string, boolean>;
  implementation_phases: Array<{ id: string; priority: string; title: string; status: string }>;
}

export interface UniversalPolicyPackContract {
  schema_version: string;
  contract_id: string;
  status: string;
  policy_lifecycle_stages: PolicyPackLifecycleStage[];
  required_metadata_fields: string[];
  target_scope_required_fields: string[];
  policy_safety_invariants: {
    wildcard_action_with_wildcard_resource: false;
    administrator_access_default: false;
    unscoped_iam_pass_role: false;
    runner_direct_workload_mutation: false;
    self_escalation: false;
    silent_fallback_to_broader_role: false;
    success_without_readback: false;
  };
  coverage_model: {
    unit_of_coverage: string;
    unknown_action_behavior: 'fail-closed';
    missing_mapping_behavior: 'AUTHORITY_GAP';
    overbroad_statement_behavior: 'reject';
    readback_failure_behavior: 'UNVERIFIED';
  };
  provider_quotas: {
    aws: {
      managed_policy_max_chars: number;
      default_managed_policies_per_role: number;
      max_managed_policy_versions: number;
      split_pack_when_needed: boolean;
    };
  };
}

export interface LoadedUniversalBootstrapGovernance {
  rootDir: string;
  bundle: UniversalBootstrapBundleManifest;
  capabilities: UniversalCapabilitiesManifest;
  roleCatalog: UniversalRoleCatalog;
  policyPackContract: UniversalPolicyPackContract;
  schemas: {
    bundleSchema: Record<string, unknown>;
    roleCatalogSchema: Record<string, unknown>;
    policyPackSchema: Record<string, unknown>;
  };
}

export interface CloudFormationResourceDescriptor {
  logicalId: string;
  resourceType: string;
  properties: Record<string, unknown>;
}

export interface PlannedCloudOperation {
  operationId: string;
  capabilityId: string;
  resourceFamily: string;
  logicalResourceId: string;
  resourceType: string;
  targetRoleId: LogicalBootstrapRoleId;
  providerActions: string[];
  verificationActions: string[];
  rollbackActions: string[];
  resourceArns: string[];
  conditions?: Record<string, Record<string, string | string[]>>;
  passRoleTargetArn?: string;
  passRoleService?: string;
}

export interface AuthorityGapDiagnosis {
  terminalStatus: 'AUTHORITY_GAP';
  exitCode: 1;
  rootCauseCategory: DenialRootCauseCategory;
  callerPrincipalArn: string;
  targetAccountId: string;
  targetRegion: string;
  deniedActions: string[];
  affectedResourceArns: string[];
  unmappedResourceTypes: string[];
  mutationsAttemptedAfterGap: 0;
  summary: string;
  remediationOptions: {
    optionAAutonomousBootstrap: {
      mode: 'AUTONOMOUS_BOOTSTRAP_VIA_DELEGATED_AUTHORITY';
      targetBootstrapRoleId: 'bootstrap_authority';
      requiredBootstrapActions: string[];
      scopedResourceArns: string[];
      instructions: string;
    };
    optionBOperatorHandoff: {
      mode: 'LEAST_PRIVILEGE_OPERATOR_HANDOFF';
      targetRoleId: LogicalBootstrapRoleId;
      targetRoleArn: string;
      planDigest: string;
      leastPrivilegePolicyDocument: Record<string, unknown>;
      cliVerificationCommands: string[];
      instructions: string;
    };
  };
}

export interface PlanOperationGraphResult {
  status: 'READY' | 'AUTHORITY_GAP';
  exitCode: 0 | 1;
  provider: string;
  accountId: string;
  partition: string;
  region: string;
  environment: string;
  projectSlug: string;
  transactionId: string;
  planDigest: string;
  capabilityIds: string[];
  resourceFamilies: string[];
  operations: PlannedCloudOperation[];
  authorityGap?: AuthorityGapDiagnosis;
}

export interface PlanBoundPolicyPack {
  policy_pack_id: string;
  version: string;
  provider: string;
  capability_ids: string[];
  role_id: LogicalBootstrapRoleId;
  target_scope: {
    tenant_or_account_or_project: string;
    partition_or_cloud: string;
    region_or_location: string;
    environment: string;
    resource_families: string[];
    resource_names_or_tags: string[];
    operation_ids: string[];
    identity_ids: string[];
    network_or_namespace_scope_when_applicable: string | null;
  };
  plan_digest: string;
  generated_at: string;
  expires_at_or_session_limit: number;
  policy_documents: Array<{
    policy_name: string;
    format: 'aws-iam-json-2012-10-17';
    document: { Version: '2012-10-17'; Statement: Array<Record<string, unknown>> };
    digest: string;
    compact_char_length: number;
  }>;
  validation_receipts: Array<{ stage: PolicyPackLifecycleStage; status: 'PASS' | 'FAIL'; checked_at: string; detail: string }>;
  approval_requirements: Array<{ gate_id: string; required: boolean; reason: string }>;
  rollback_strategy: { mode: string; steps: string[] };
  approval_record: { approved: boolean; approved_by?: string; approved_at?: string; plan_digest: string } | null;
}

export interface PolicyPackContractValidationResult {
  valid: boolean;
  status: 'VALIDATED' | 'REJECTED' | 'AUTHORITY_GAP';
  violations: string[];
  totalCompactChars: number;
  policyDocumentCount: number;
}

export const UNIVERSAL_BOOTSTRAP_LIFECYCLE_STAGES: readonly UniversalBootstrapLifecycleStage[] = Object.freeze([
  'DISCOVER', 'RESOLVE_TARGET', 'PLAN', 'VALIDATE', 'AUTHORIZE',
  'APPROVE', 'APPLY', 'VERIFY', 'CERTIFY', 'FREEZE', 'HANDOFF',
]);

export const POLICY_PACK_LIFECYCLE_STAGES: readonly PolicyPackLifecycleStage[] = Object.freeze([
  'derive', 'constrain', 'render', 'validate', 'review',
  'install', 'read_back', 'execute', 'verify_and_revoke',
]);
