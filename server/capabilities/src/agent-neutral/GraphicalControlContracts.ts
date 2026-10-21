/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Graphical Control Panel & CLI Parity Contracts
 * File           : GraphicalControlContracts.ts
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

import { createHash } from 'crypto';
import {
  type CanonicalCapabilityId,
  type UplmRiskClass,
  canonicalCapabilityRegistry,
} from './CanonicalCapabilityContract';

export type GraphicalViewId =
  | 'ENVIRONMENT_OVERVIEW'
  | 'POLICY_INVENTORY_AND_DRIFT'
  | 'BOOTSTRAP_WIZARD'
  | 'FINE_GRAINED_EXPERT_MODE'
  | 'REPAIR_AND_MIGRATION'
  | 'RETIREMENT_AND_UNINSTALL'
  | 'OPERATION_MONITOR';

export interface GraphicalButtonBinding {
  buttonId: string;
  label: string;
  viewId: GraphicalViewId;
  capabilityId: CanonicalCapabilityId;
  readOnly: boolean;
  requiresPlan: boolean;
  requiresApproval: boolean;
  disabledWhenOutcomeUnknown?: boolean;
}

export interface GraphicalViewDefinition {
  viewId: GraphicalViewId;
  title: string;
  sectionRef: string;
  displayedFields: string[];
  buttons: GraphicalButtonBinding[];
}

export interface BootstrapWizardStage {
  stageNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  stageId: string;
  title: string;
  capabilityId: CanonicalCapabilityId;
  readOnly: boolean;
}

/**
 * 10-Stage Bootstrap Wizard per Specification §5.3.
 */
export const BOOTSTRAP_WIZARD_STAGES: readonly BootstrapWizardStage[] = [
  { stageNumber: 1, stageId: 'SELECT_PROVIDER_AND_TARGET', title: 'Select provider and target', capabilityId: 'policy.inspect', readOnly: true },
  { stageNumber: 2, stageId: 'VERIFY_IDENTITY_AND_CREDENTIALS', title: 'Verify identity and credential validity', capabilityId: 'policy.inspect', readOnly: true },
  { stageNumber: 3, stageId: 'INSPECT_EXISTING_STATE', title: 'Inspect existing roles, policies and attachments', capabilityId: 'policy.inspect', readOnly: true },
  { stageNumber: 4, stageId: 'SELECT_PACK_AND_CAPABILITIES', title: 'Select policy pack/version and desired capabilities', capabilityId: 'policy.plan', readOnly: true },
  { stageNumber: 5, stageId: 'REVIEW_PLAN_AND_GAPS', title: 'Review exact plan and permission gaps', capabilityId: 'policy.bootstrap.plan', readOnly: true },
  { stageNumber: 6, stageId: 'CHOOSE_BOOTSTRAP_ROUTE', title: 'Choose an available authorized bootstrap route', capabilityId: 'policy.bootstrap.plan', readOnly: true },
  { stageNumber: 7, stageId: 'OBTAIN_APPROVAL_CONSENT', title: 'Obtain required approval/consent', capabilityId: 'policy.bootstrap.plan', readOnly: true },
  { stageNumber: 8, stageId: 'APPLY_APPROVED_PLAN', title: 'Apply the plan', capabilityId: 'policy.bootstrap.apply', readOnly: false },
  { stageNumber: 9, stageId: 'VERIFY_PROVIDER_STATE', title: 'Verify actual provider state', capabilityId: 'policy.verify', readOnly: true },
  { stageNumber: 10, stageId: 'EXPORT_EVIDENCE_AND_CLOSE', title: 'Export evidence and close the operation', capabilityId: 'policy.evidence.export', readOnly: true },
] as const;

/**
 * All 7 Graphical Control Panel Views and their canonical capability button mappings (§5.1 - §5.7).
 */
export const GRAPHICAL_CONTROL_VIEWS: Record<GraphicalViewId, GraphicalViewDefinition> = {
  ENVIRONMENT_OVERVIEW: {
    viewId: 'ENVIRONMENT_OVERVIEW',
    title: 'Environment Overview',
    sectionRef: '5.1',
    displayedFields: [
      'providerAndTarget',
      'authenticatedPrincipalRedacted',
      'credentialStatusAndExpiry',
      'permissionReadiness',
      'discoveryCompleteness',
      'activeOperationsAndRecentFailures',
    ],
    buttons: [
      { buttonId: 'env.inspect_environment', label: 'Inspect Environment', viewId: 'ENVIRONMENT_OVERVIEW', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'env.verify_identity', label: 'Verify Identity', viewId: 'ENVIRONMENT_OVERVIEW', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'env.run_diagnostics', label: 'Run Diagnostics', viewId: 'ENVIRONMENT_OVERVIEW', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'env.refresh_discovery', label: 'Refresh Discovery', viewId: 'ENVIRONMENT_OVERVIEW', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'env.export_diagnostic_report', label: 'Export Diagnostic Report', viewId: 'ENVIRONMENT_OVERVIEW', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
    ],
  },
  POLICY_INVENTORY_AND_DRIFT: {
    viewId: 'POLICY_INVENTORY_AND_DRIFT',
    title: 'Policy Inventory and Drift',
    sectionRef: '5.2',
    displayedFields: [
      'desiredVsObservedState',
      'packVersionAndHash',
      'ownershipClassification',
      'principalAttachments',
      'trustRelationships',
      'permissionBoundaries',
      'dependenciesAndDrift',
    ],
    buttons: [
      { buttonId: 'inv.inspect_policy', label: 'Inspect Policy', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'inv.compare_with_pack', label: 'Compare With Pack', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'inv.view_diff', label: 'View Diff', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'inv.inspect_attachments', label: 'Inspect Attachments', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'inv.inspect_trust', label: 'Inspect Trust', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'inv.inspect_boundaries', label: 'Inspect Boundaries', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'inv.export_inventory', label: 'Export Inventory', viewId: 'POLICY_INVENTORY_AND_DRIFT', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
    ],
  },
  BOOTSTRAP_WIZARD: {
    viewId: 'BOOTSTRAP_WIZARD',
    title: 'Bootstrap Wizard',
    sectionRef: '5.3',
    displayedFields: [
      'wizardStage',
      'bootstrapState',
      'authorityGaps',
      'selectedBootstrapRoute',
      'planHashAndApprovalStatus',
      'verificationPostconditions',
    ],
    buttons: [
      { buttonId: 'wiz.start_bootstrap', label: 'Start Bootstrap', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.inspect_only', label: 'Inspect Only', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.generate_plan', label: 'Generate Plan', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.refresh_plan', label: 'Refresh Plan', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.validate_plan', label: 'Validate Plan', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'wiz.view_exact_diff', label: 'View Exact Diff', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'wiz.explain_permission_gap', label: 'Explain Permission Gap', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'wiz.choose_bootstrap_route', label: 'Choose Bootstrap Route', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'wiz.request_approval', label: 'Request Approval', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'wiz.apply_approved_plan', label: 'Apply Approved Plan', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.apply', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'wiz.pause', label: 'Pause', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.resume', label: 'Resume', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.bootstrap.apply', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'wiz.cancel_safely', label: 'Cancel Safely', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.verify_installation', label: 'Verify Installation', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.verify', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'wiz.export_evidence', label: 'Export Evidence', viewId: 'BOOTSTRAP_WIZARD', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
    ],
  },
  FINE_GRAINED_EXPERT_MODE: {
    viewId: 'FINE_GRAINED_EXPERT_MODE',
    title: 'Fine-Grained Expert Mode',
    sectionRef: '5.4',
    displayedFields: [
      'actionTypeAndProviderApi',
      'targetResourceAndScope',
      'beforeAndAfterState',
      'requiredProviderPermission',
      'riskLevelAndReversibility',
      'ownershipAndDependencyEvidence',
      'approvalStatus',
      'preconditionsAndVerification',
      'rollbackOrRecoveryBehavior',
    ],
    buttons: [
      { buttonId: 'exp.export_plan', label: 'Export Plan', viewId: 'FINE_GRAINED_EXPERT_MODE', capabilityId: 'policy.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'exp.validate_selected_plan', label: 'Validate Selected Plan', viewId: 'FINE_GRAINED_EXPERT_MODE', capabilityId: 'policy.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'exp.apply_selected_plan', label: 'Apply Selected Plan', viewId: 'FINE_GRAINED_EXPERT_MODE', capabilityId: 'policy.install', readOnly: false, requiresPlan: true, requiresApproval: true },
    ],
  },
  REPAIR_AND_MIGRATION: {
    viewId: 'REPAIR_AND_MIGRATION',
    title: 'Repair and Migration',
    sectionRef: '5.5',
    displayedFields: [
      'currentAndProposedVersions',
      'semanticDiff',
      'dependentPrincipals',
      'expectedDisruption',
      'rollbackOptions',
    ],
    buttons: [
      { buttonId: 'rep.detect_drift', label: 'Detect Drift', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'rep.generate_repair_plan', label: 'Generate Repair Plan', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'rep.repair_selected', label: 'Repair Selected', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.repair', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'rep.replace_version', label: 'Replace Version', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.migrate', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'rep.migrate_pack', label: 'Migrate Pack', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.migrate', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'rep.compare_versions', label: 'Compare Versions', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'rep.verify_after_repair', label: 'Verify After Repair', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.verify', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'rep.rollback_plan', label: 'Rollback Plan', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'rep.export_evidence', label: 'Export Evidence', viewId: 'REPAIR_AND_MIGRATION', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
    ],
  },
  RETIREMENT_AND_UNINSTALL: {
    viewId: 'RETIREMENT_AND_UNINSTALL',
    title: 'Retirement and Uninstall',
    sectionRef: '5.6',
    displayedFields: [
      'ownershipClassificationSummary',
      'dependencyAndConsumerReport',
      'perResourceEligibility',
      'retainedResourcesAndReasons',
      'impactSummary',
    ],
    buttons: [
      { buttonId: 'ret.inspect_dependencies', label: 'Inspect Dependencies', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'ret.check_ownership', label: 'Check Ownership', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'ret.generate_retirement_plan', label: 'Generate Retirement Plan', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.retire.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'ret.detach_selected', label: 'Detach Selected', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.retire.apply', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'ret.quarantine_deactivate', label: 'Quarantine / Deactivate', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.retire.apply', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'ret.validate_removal', label: 'Validate Removal', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.retire.plan', readOnly: true, requiresPlan: true, requiresApproval: false },
      { buttonId: 'ret.remove_selected', label: 'Remove Selected', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.retire.apply', readOnly: false, requiresPlan: true, requiresApproval: true },
      { buttonId: 'ret.verify_no_longer_present', label: 'Verify No Longer Present', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.verify', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'ret.export_retirement_evidence', label: 'Export Retirement Evidence', viewId: 'RETIREMENT_AND_UNINSTALL', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
    ],
  },
  OPERATION_MONITOR: {
    viewId: 'OPERATION_MONITOR',
    title: 'Operation Monitor',
    sectionRef: '5.7',
    displayedFields: [
      'durableTimelineStages',
      'timestampsAndActionOutcomes',
      'retryAttemptsAndBlockers',
      'evidenceLinks',
      'recoveryStatus',
    ],
    buttons: [
      { buttonId: 'mon.view_details', label: 'View Details', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'mon.retry_safe_step', label: 'Retry Safe Step', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.repair', readOnly: false, requiresPlan: true, requiresApproval: true, disabledWhenOutcomeUnknown: true },
      { buttonId: 'mon.resume', label: 'Resume', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.bootstrap.apply', readOnly: false, requiresPlan: true, requiresApproval: true, disabledWhenOutcomeUnknown: true },
      { buttonId: 'mon.cancel', label: 'Cancel', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.inspect', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'mon.generate_recovery_plan', label: 'Generate Recovery Plan', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.plan', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'mon.verify_current_state', label: 'Verify Current State', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.verify', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'mon.export_logs', label: 'Export Logs', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
      { buttonId: 'mon.export_evidence', label: 'Export Evidence', viewId: 'OPERATION_MONITOR', capabilityId: 'policy.evidence.export', readOnly: true, requiresPlan: false, requiresApproval: false },
    ],
  },
};

/**
 * CLI Command Catalogue to Canonical Capability ID mapping (§3.1 - §3.7).
 */
export interface CliCommandBinding {
  commandPattern: string;
  capabilityId: CanonicalCapabilityId;
  legacyCapabilityAlias?: string;
  readOnly: boolean;
  defaultExecutionMode: 'inspect' | 'plan' | 'apply' | 'guided' | 'non-interactive' | 'policy-controlled';
}

export const CLI_COMMAND_CAPABILITY_MAP: readonly CliCommandBinding[] = [
  { commandPattern: 'ugondu deploy', capabilityId: 'policy.bootstrap.apply', legacyCapabilityAlias: 'cap.OrchestrateDeployment', readOnly: false, defaultExecutionMode: 'apply' },
  { commandPattern: 'ugondu capability list', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu capability describe', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu capability matrix', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu environment inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu identity inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu doctor', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy list', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy attachments list', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy trust inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy boundaries inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy ownership inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy drift detect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy plan', capabilityId: 'policy.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu policy bootstrap inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy bootstrap plan', capabilityId: 'policy.bootstrap.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu access diagnose', capabilityId: 'policy.bootstrap.plan', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu access gaps', capabilityId: 'policy.bootstrap.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu policy apply', capabilityId: 'policy.bootstrap.apply', readOnly: false, defaultExecutionMode: 'apply' },
  { commandPattern: 'ugondu policy install', capabilityId: 'policy.install', readOnly: false, defaultExecutionMode: 'apply' },
  { commandPattern: 'ugondu policy repair plan', capabilityId: 'policy.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu policy repair apply', capabilityId: 'policy.repair', readOnly: false, defaultExecutionMode: 'apply' },
  { commandPattern: 'ugondu policy replace plan', capabilityId: 'policy.migrate', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu policy retire inspect', capabilityId: 'policy.inspect', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu policy retire plan', capabilityId: 'policy.retire.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu policy retire apply', capabilityId: 'policy.retire.apply', readOnly: false, defaultExecutionMode: 'apply' },
  { commandPattern: 'ugondu policy uninstall plan', capabilityId: 'policy.retire.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu policy uninstall apply', capabilityId: 'policy.retire.apply', readOnly: false, requiresPlan: true } as unknown as CliCommandBinding,
  { commandPattern: 'ugondu policy verify', capabilityId: 'policy.verify', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu evidence export', capabilityId: 'policy.evidence.export', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu growth campaign plan', capabilityId: 'growth.campaign.plan', readOnly: true, defaultExecutionMode: 'plan' },
  { commandPattern: 'ugondu growth referral verify', capabilityId: 'growth.referral.verify', readOnly: true, defaultExecutionMode: 'inspect' },
  { commandPattern: 'ugondu growth reward audit', capabilityId: 'growth.reward.audit', readOnly: false, defaultExecutionMode: 'apply' },
] as const;

export interface ExpertPlanActionItem {
  actionId: string;
  actionType: 'CREATE_POLICY' | 'ATTACH_POLICY' | 'DETACH_POLICY' | 'UPDATE_POLICY' | 'VERIFY_TRUST' | 'DELETE_POLICY';
  providerApi: string;
  targetResource: string;
  beforeStateHash: string | null;
  afterStateHash: string;
  requiredProviderPermission: string;
  riskLevel: UplmRiskClass;
  reversible: boolean;
  ownershipClass: string;
  mandatorySecurityControl: boolean;
  selected: boolean;
  allowedByPolicy: boolean;
  parameters: Record<string, string | number | boolean>;
}

export interface ExpertPlanState {
  planId: string;
  target: string;
  packId: string;
  packVersion: string;
  executionMode: 'guided' | 'non-interactive';
  timeoutMs: number;
  concurrencyLimit: number;
  maxRetries: number;
  actions: ExpertPlanActionItem[];
  planHash: string;
  approvalStatus: 'UNAPPROVED' | 'APPROVED' | 'INVALIDATED_BY_EDIT';
  approvedPlanHash?: string;
  validationPassed: boolean;
  validationErrors: string[];
}

export interface ExpertPlanEditRequest {
  deselectActionIds?: string[];
  selectActionIds?: string[];
  parameterUpdates?: Record<string, Record<string, string | number | boolean>>;
  packVersion?: string;
  timeoutMs?: number;
  concurrencyLimit?: number;
  maxRetries?: number;
  executionMode?: 'guided' | 'non-interactive';
  attemptOverrideDeniedActionIds?: string[];
}

export function computeExpertPlanHash(plan: Omit<ExpertPlanState, 'planHash' | 'approvalStatus' | 'approvedPlanHash' | 'validationPassed' | 'validationErrors'>): string {
  const canonicalPayload = JSON.stringify({
    planId: plan.planId,
    target: plan.target,
    packId: plan.packId,
    packVersion: plan.packVersion,
    executionMode: plan.executionMode,
    timeoutMs: plan.timeoutMs,
    concurrencyLimit: plan.concurrencyLimit,
    maxRetries: plan.maxRetries,
    actions: plan.actions.map((a) => ({
      actionId: a.actionId,
      actionType: a.actionType,
      targetResource: a.targetResource,
      afterStateHash: a.afterStateHash,
      selected: a.selected,
      parameters: a.parameters,
    })),
  });
  return createHash('sha256').update(canonicalPayload).digest('hex');
}

/**
 * Applies edits in Fine-Grained Expert Mode (§5.4).
 *
 * INVARIANTS:
 * - Recomputes planHash and reruns validation after any edit.
 * - Editing a plan invalidates previous approvals bound to the prior hash.
 * - Users cannot deselect mandatory security controls or turn a denied operation into an allowed one.
 */
export function editExpertPlan(
  currentPlan: ExpertPlanState,
  edit: ExpertPlanEditRequest
): ExpertPlanState {
  const validationErrors: string[] = [];

  if (edit.attemptOverrideDeniedActionIds && edit.attemptOverrideDeniedActionIds.length > 0) {
    throw new Error(
      `Security violation: Cannot turn a denied operation into an allowed one via UI settings: [${edit.attemptOverrideDeniedActionIds.join(', ')}]`
    );
  }

  const updatedActions = currentPlan.actions.map((action) => {
    let selected = action.selected;
    if (edit.deselectActionIds?.includes(action.actionId)) {
      if (action.mandatorySecurityControl) {
        throw new Error(
          `Security violation: Cannot deselect mandatory security control action '${action.actionId}'.`
        );
      }
      selected = false;
    }
    if (edit.selectActionIds?.includes(action.actionId)) {
      if (!action.allowedByPolicy) {
        throw new Error(
          `Security violation: Cannot select policy-denied action '${action.actionId}'.`
        );
      }
      selected = true;
    }
    const updatedParams = edit.parameterUpdates?.[action.actionId]
      ? { ...action.parameters, ...edit.parameterUpdates[action.actionId] }
      : { ...action.parameters };

    return {
      ...action,
      selected,
      parameters: updatedParams,
    };
  });

  const nextTimeoutMs = edit.timeoutMs ?? currentPlan.timeoutMs;
  if (nextTimeoutMs < 1000 || nextTimeoutMs > 300000) {
    validationErrors.push('timeoutMs must be between 1000 and 300000 ms.');
  }

  const nextConcurrency = edit.concurrencyLimit ?? currentPlan.concurrencyLimit;
  if (nextConcurrency < 1 || nextConcurrency > 10) {
    validationErrors.push('concurrencyLimit must be between 1 and 10.');
  }

  const draft = {
    planId: currentPlan.planId,
    target: currentPlan.target,
    packId: currentPlan.packId,
    packVersion: edit.packVersion ?? currentPlan.packVersion,
    executionMode: edit.executionMode ?? currentPlan.executionMode,
    timeoutMs: nextTimeoutMs,
    concurrencyLimit: nextConcurrency,
    maxRetries: edit.maxRetries ?? currentPlan.maxRetries,
    actions: updatedActions,
  };

  const newPlanHash = computeExpertPlanHash(draft);
  const hashChanged = newPlanHash !== currentPlan.planHash;

  const nextApprovalStatus =
    currentPlan.approvalStatus === 'APPROVED' && hashChanged
      ? 'INVALIDATED_BY_EDIT'
      : currentPlan.approvalStatus;

  return {
    ...draft,
    planHash: newPlanHash,
    approvalStatus: nextApprovalStatus,
    approvedPlanHash: nextApprovalStatus === 'APPROVED' ? currentPlan.approvedPlanHash : undefined,
    validationPassed: validationErrors.length === 0,
    validationErrors,
  };
}

/**
 * Evaluates button availability for a view given provider capability support and operation outcome state.
 */
export function resolveGraphicalButtonStates(
  viewId: GraphicalViewId,
  provider: string,
  operationOutcomeUnknown = false
): Array<{
  buttonId: string;
  label: string;
  capabilityId: CanonicalCapabilityId;
  enabled: boolean;
  disabledReason?: string;
}> {
  const view = GRAPHICAL_CONTROL_VIEWS[viewId];
  return view.buttons.map((btn) => {
    const desc = canonicalCapabilityRegistry.describe(btn.capabilityId);
    const providerSupported = desc ? desc.supportedProviders.includes(provider) : false;

    if (!providerSupported) {
      return {
        buttonId: btn.buttonId,
        label: btn.label,
        capabilityId: btn.capabilityId,
        enabled: false,
        disabledReason: `Provider '${provider}' does not support required capability '${btn.capabilityId}'.`,
      };
    }

    if (btn.disabledWhenOutcomeUnknown && operationOutcomeUnknown) {
      return {
        buttonId: btn.buttonId,
        label: btn.label,
        capabilityId: btn.capabilityId,
        enabled: false,
        disabledReason: `Operation outcome is unknown (OPERATION_OUTCOME_UNKNOWN). Re-inspect provider state via 'Verify Current State' before retrying or resuming.`,
      };
    }

    return {
      buttonId: btn.buttonId,
      label: btn.label,
      capabilityId: btn.capabilityId,
      enabled: true,
    };
  });
}
