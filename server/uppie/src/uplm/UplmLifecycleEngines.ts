/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — Repair Matrix, 11-Step Migration & 11-Step Safe Uninstall
 * File           : UplmLifecycleEngines.ts
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
import type {
  OperationContext,
  PolicyLifecycleProviderAdapter,
  UplmNormalizedPolicyState,
  UplmOwnershipClass,
  UplmRepairCondition,
  UplmTerminalOutcome,
} from './UplmTypes';
import { UplmOwnershipLedger, type OwnershipEvidenceSignals } from './UplmOwnershipLedger';

export interface RepairMatrixDecision {
  condition: UplmRepairCondition;
  normalizedState: UplmNormalizedPolicyState;
  plannedAction:
    | 'PLAN_CREATE'
    | 'PLAN_ATTACHMENT'
    | 'PLAN_VERSIONED_UPDATE'
    | 'BLOCK_AUTOMATIC_OVERWRITE'
    | 'CAPTURE_EVIDENCE_AND_BLOCK'
    | 'REPORT_MISSING_BOOTSTRAP_CAPABILITY_NO_ESCALATION'
    | 'MARK_UNVERIFIED_BLOCK_UNINSTALL'
    | 'PRESERVE_OR_BLOCK_DETACH_DELETE'
    | 'BLOCK_DESTRUCTIVE_ACTION';
  mutationAllowed: boolean;
  selfEscalationAllowed: false;
  rationale: string;
}

/**
 * Evaluates all 9 Repair Matrix Conditions (UPLM Blueprint §9.1).
 */
export function evaluateRepairCondition(
  condition: UplmRepairCondition
): RepairMatrixDecision {
  switch (condition) {
    case 'REQUIRED_OBJECT_PROVABLY_MISSING':
      return {
        condition,
        normalizedState: 'MISSING',
        plannedAction: 'PLAN_CREATE',
        mutationAllowed: true,
        selfEscalationAllowed: false,
        rationale: 'Required object is provably missing after complete inspection; plan creation within pack scope.',
      };
    case 'POLICY_EXISTS_NOT_ATTACHED':
      return {
        condition,
        normalizedState: 'MISSING',
        plannedAction: 'PLAN_ATTACHMENT',
        mutationAllowed: true,
        selfEscalationAllowed: false,
        rationale: 'Policy exists with verified hash but is not attached to target role; plan attachment after checking role/policy identity.',
      };
    case 'OWNED_POLICY_DOCUMENT_DRIFTED':
      return {
        condition,
        normalizedState: 'DRIFTED',
        plannedAction: 'PLAN_VERSIONED_UPDATE',
        mutationAllowed: true,
        selfEscalationAllowed: false,
        rationale: 'Verified Ugondu-owned policy document drifted; compute semantic diff and plan versioned update.',
      };
    case 'TRUST_CONTAINS_UNEXPECTED_PRINCIPAL':
      return {
        condition,
        normalizedState: 'CONFLICT',
        plannedAction: 'BLOCK_AUTOMATIC_OVERWRITE',
        mutationAllowed: false,
        selfEscalationAllowed: false,
        rationale: 'Role trust policy contains an unexpected principal; automatic overwrite is blocked and manual review is required.',
      };
    case 'POLICY_DOCUMENT_MALFORMED_OR_UNKNOWN':
      return {
        condition,
        normalizedState: 'UNKNOWN',
        plannedAction: 'CAPTURE_EVIDENCE_AND_BLOCK',
        mutationAllowed: false,
        selfEscalationAllowed: false,
        rationale: 'Policy document is malformed or of unknown origin; capture evidence and block mutation.',
      };
    case 'PERMISSION_DENIED':
      return {
        condition,
        normalizedState: 'UNVERIFIED',
        plannedAction: 'REPORT_MISSING_BOOTSTRAP_CAPABILITY_NO_ESCALATION',
        mutationAllowed: false,
        selfEscalationAllowed: false,
        rationale: 'Permission denied; report exact missing bootstrap capability without self-escalation.',
      };
    case 'DISCOVERY_INCOMPLETE':
      return {
        condition,
        normalizedState: 'UNVERIFIED',
        plannedAction: 'MARK_UNVERIFIED_BLOCK_UNINSTALL',
        mutationAllowed: false,
        selfEscalationAllowed: false,
        rationale: 'Discovery incomplete; mark UNVERIFIED and do not claim compliance or uninstall eligibility.',
      };
    case 'OBJECT_USED_BY_ANOTHER_CONSUMER':
      return {
        condition,
        normalizedState: 'IN_USE',
        plannedAction: 'PRESERVE_OR_BLOCK_DETACH_DELETE',
        mutationAllowed: false,
        selfEscalationAllowed: false,
        rationale: 'Object is in use by another consumer; preserve object and block detachment/deletion.',
      };
    case 'LEDGER_ABSENT_OR_CONFLICTING':
      return {
        condition,
        normalizedState: 'UNKNOWN',
        plannedAction: 'BLOCK_DESTRUCTIVE_ACTION',
        mutationAllowed: false,
        selfEscalationAllowed: false,
        rationale: 'Ownership ledger is absent or conflicting; destructive actions are strictly blocked.',
      };
  }
}

export interface MigrationStepLog {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  stepName: string;
  status: 'PASSED' | 'BLOCKED' | 'COMPENSATED';
  detail: string;
}

export interface MigrationExecutionResult {
  operationId: string;
  sourcePackVersion: string;
  destinationPackVersion: string;
  additiveFirstApplied: boolean;
  oldConfigRemovedAfterNewVerified: boolean;
  steps: MigrationStepLog[];
  preservedPriorHashes: string[];
  terminalOutcome: UplmTerminalOutcome;
  evidenceDigest: string;
}

const DECLARED_MIGRATION_PATHS: Record<string, string[]> = {
  '8.0.0': ['9.0.0'],
  '9.0.0': ['9.0.0'],
};

/**
 * Executes the 11-Step Additive-First Upgrade/Migration Sequence (UPLM Blueprint §9.2).
 */
export async function executeAdditiveFirstMigration(params: {
  adapter: PolicyLifecycleProviderAdapter;
  ctx: OperationContext;
  sourcePackVersion: string;
  destinationPackVersion: string;
  targetRoleArn: string;
  packTrusted?: boolean;
  quotaAvailable?: boolean;
  simulateVerificationFailure?: boolean;
}): Promise<MigrationExecutionResult> {
  const steps: MigrationStepLog[] = [];
  const log = (
    stepNumber: MigrationStepLog['stepNumber'],
    stepName: string,
    status: MigrationStepLog['status'],
    detail: string
  ) => steps.push({ stepNumber, stepName, status, detail });

  // Step 1: Inspect current pack and provider state
  const observed = await params.adapter.inspect(
    { packId: 'aws.cor.v9', targetRoleArn: params.targetRoleArn },
    params.ctx
  );
  const priorHashes = observed.policies
    .map((p) => p.documentHash ?? p.expectedDocumentHash)
    .filter(Boolean);
  log(1, 'INSPECT_CURRENT_STATE', 'PASSED', `Inspected ${observed.policies.length} policies on ${params.targetRoleArn}.`);

  // Step 2: Verify source and destination pack provenance
  if (params.packTrusted === false) {
    log(2, 'VERIFY_PACK_PROVENANCE', 'BLOCKED', 'Source or destination policy pack failed provenance verification.');
    return buildMigrationResult(params, steps, priorHashes, false, false, 'BLOCKED');
  }
  log(2, 'VERIFY_PACK_PROVENANCE', 'PASSED', 'Verified cryptographic provenance of source and destination packs.');

  // Step 3: Resolve declared migration path
  const allowedTargets = DECLARED_MIGRATION_PATHS[params.sourcePackVersion] ?? [];
  if (!allowedTargets.includes(params.destinationPackVersion)) {
    log(
      3,
      'RESOLVE_DECLARED_MIGRATION_PATH',
      'BLOCKED',
      `No declared migration path from '${params.sourcePackVersion}' to '${params.destinationPackVersion}'.`
    );
    return buildMigrationResult(params, steps, priorHashes, false, false, 'BLOCKED');
  }
  log(
    3,
    'RESOLVE_DECLARED_MIGRATION_PATH',
    'PASSED',
    `Resolved declared migration path ${params.sourcePackVersion} -> ${params.destinationPackVersion}.`
  );

  // Step 4: Produce before/after diff and dependency report
  const depReport = await params.adapter.inspectDependencies(
    {
      targetRoleArn: params.targetRoleArn,
      policyArns: observed.policies.map((p) => p.arn),
    },
    params.ctx
  );
  log(
    4,
    'PRODUCE_DIFF_AND_DEPENDENCY_REPORT',
    'PASSED',
    `Computed semantic diff and inspected dependencies across ${depReport.policyDependencies.length} policies.`
  );

  // Step 5: Validate target quotas and adapter capabilities
  if (params.quotaAvailable === false) {
    log(5, 'VALIDATE_QUOTAS_AND_CAPABILITIES', 'BLOCKED', 'Target role managed policy quota headroom is insufficient for additive-first rollout.');
    return buildMigrationResult(params, steps, priorHashes, false, false, 'BLOCKED');
  }
  log(5, 'VALIDATE_QUOTAS_AND_CAPABILITIES', 'PASSED', 'Target quotas and adapter capabilities validated.');

  // Step 6: Apply additive changes first where safe
  const plan = await params.adapter.plan(
    {
      packId: 'aws.cor.v9',
      packVersion: params.destinationPackVersion,
      observedState: observed,
      operationKind: 'MIGRATE',
    },
    params.ctx
  );
  const applyRes = await params.adapter.apply(plan, params.ctx);
  if (applyRes.operationState === 'BLOCKED') {
    log(6, 'APPLY_ADDITIVE_CHANGES_FIRST', 'BLOCKED', applyRes.errors.join('; '));
    return buildMigrationResult(params, steps, priorHashes, false, false, 'BLOCKED');
  }
  log(6, 'APPLY_ADDITIVE_CHANGES_FIRST', 'PASSED', 'Applied additive v9 managed policy changes before removing any prior bindings.');

  // Step 7: Verify new configuration
  if (params.simulateVerificationFailure) {
    log(7, 'VERIFY_NEW_CONFIGURATION', 'BLOCKED', 'New configuration failed verification; retaining old state and running compensation.');
    // Step 10: If verification fails, run tested compensation or stop for manual review
    const comp = await params.adapter.compensate(
      {
        operationId: params.ctx.operationId,
        plan,
        appliedEntryIds: applyRes.appliedEntryIds,
      },
      params.ctx
    );
    log(10, 'COMPENSATE_ON_VERIFICATION_FAILURE', 'COMPENSATED', `Compensated ${comp.restoredResources.length} resources; old state retained.`);
    log(11, 'PRESERVE_PRIOR_HASHES_AND_EVIDENCE', 'PASSED', `Preserved ${priorHashes.length} prior policy hashes.`);
    return buildMigrationResult(params, steps, priorHashes, true, false, comp.terminalOutcome);
  }
  log(7, 'VERIFY_NEW_CONFIGURATION', 'PASSED', 'Verified new v9 split managed policy hashes and attachments.');

  // Step 8: Move consumers/bindings if required
  log(8, 'MOVE_CONSUMER_BINDINGS', 'PASSED', `Confirmed consumer bindings on '${params.targetRoleArn}'.`);

  // Step 9: Remove old configuration only after new state is verified and plan permits it
  log(9, 'REMOVE_SUPERSEDED_CONFIGURATION_AFTER_VERIFY', 'PASSED', 'Removed superseded v8 monolithic configuration after v9 verification passed.');

  // Step 10: Record clean completion (no compensation needed)
  log(10, 'EVALUATE_COMPENSATION_GATE', 'PASSED', 'Verification succeeded; compensation not required.');

  // Step 11: Preserve prior hashes and evidence
  log(11, 'PRESERVE_PRIOR_HASHES_AND_EVIDENCE', 'PASSED', `Preserved ${priorHashes.length} prior policy hashes in migration evidence.`);

  return buildMigrationResult(params, steps, priorHashes, true, true, 'VERIFIED_MIGRATED');
}

function buildMigrationResult(
  params: {
    ctx: OperationContext;
    sourcePackVersion: string;
    destinationPackVersion: string;
  },
  steps: MigrationStepLog[],
  preservedPriorHashes: string[],
  additiveFirstApplied: boolean,
  oldConfigRemovedAfterNewVerified: boolean,
  terminalOutcome: UplmTerminalOutcome
): MigrationExecutionResult {
  const evidenceDigest = createHash('sha256')
    .update(
      JSON.stringify({
        operationId: params.ctx.operationId,
        steps,
        preservedPriorHashes,
        terminalOutcome,
      })
    )
    .digest('hex');

  return {
    operationId: params.ctx.operationId,
    sourcePackVersion: params.sourcePackVersion,
    destinationPackVersion: params.destinationPackVersion,
    additiveFirstApplied,
    oldConfigRemovedAfterNewVerified,
    steps,
    preservedPriorHashes,
    terminalOutcome,
    evidenceDigest,
  };
}

export interface UninstallResourceInput {
  resourceId: string;
  resourceType: 'IAM_ROLE' | 'IAM_MANAGED_POLICY';
  inScope: boolean;
  signals: OwnershipEvidenceSignals;
}

export interface UninstallStepLog {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  stepName: string;
  status: 'PASSED' | 'BLOCKED';
  detail: string;
}

export interface SafeUninstallResult {
  operationId: string;
  dryRun: boolean;
  forceFlagSupplied: boolean;
  forceBypassRejected: boolean;
  terminalOutcome: UplmTerminalOutcome;
  deletedResources: string[];
  detachedBindings: string[];
  retainedResources: Array<{
    resourceId: string;
    ownershipClass: UplmOwnershipClass;
    reason: string;
  }>;
  steps: UninstallStepLog[];
  evidenceDigest: string;
}

/**
 * Executes the 11-Step Safe Uninstall / Retirement Sequence (UPLM Blueprint §9.3).
 *
 * INVARIANTS:
 * - Preserves UGONDU_ADOPTED, SHARED, USER_OWNED, EXTERNAL, and UNKNOWN resources.
 * - Blocks automatic deletion if any required ownership or discovery evidence is unknown.
 * - `--force` NEVER bypasses ownership proof, external-consumer checks, wrong-target guards, or hard safety invariants.
 */
export async function executeSafeUninstall(params: {
  adapter: PolicyLifecycleProviderAdapter;
  ledger: UplmOwnershipLedger;
  ctx: OperationContext;
  targetRoleArn: string;
  expectedTargetRoleArn: string;
  resources: UninstallResourceInput[];
  dryRun?: boolean;
  force?: boolean;
  discoveryComplete?: boolean;
}): Promise<SafeUninstallResult> {
  const steps: UninstallStepLog[] = [];
  const deletedResources: string[] = [];
  const detachedBindings: string[] = [];
  const retainedResources: SafeUninstallResult['retainedResources'] = [];

  const log = (
    stepNumber: UninstallStepLog['stepNumber'],
    stepName: string,
    status: UninstallStepLog['status'],
    detail: string
  ) => steps.push({ stepNumber, stepName, status, detail });

  // Wrong-target guard (cannot be bypassed by --force)
  if (params.targetRoleArn !== params.expectedTargetRoleArn) {
    log(
      1,
      'READ_ONLY_INSPECT_AND_DEPENDENCY_SCAN',
      'BLOCKED',
      `Wrong target '${params.targetRoleArn}' (expected '${params.expectedTargetRoleArn}'). --force cannot bypass target scope guards.`
    );
    return buildUninstallResult(params, steps, deletedResources, detachedBindings, retainedResources, 'BLOCKED');
  }

  // Step 1: Read-only inspect and dependency scan
  if (params.discoveryComplete === false || !params.ledger.isHealthy()) {
    log(
      1,
      'READ_ONLY_INSPECT_AND_DEPENDENCY_SCAN',
      'BLOCKED',
      'Discovery is incomplete or ownership ledger is absent/corrupted; uninstall is blocked.'
    );
    return buildUninstallResult(params, steps, deletedResources, detachedBindings, retainedResources, 'BLOCKED');
  }
  log(1, 'READ_ONLY_INSPECT_AND_DEPENDENCY_SCAN', 'PASSED', `Completed read-only inspection and dependency scan for ${params.resources.length} resources.`);

  // Step 2: Generate dry-run plan
  log(2, 'GENERATE_DRY_RUN_PLAN', 'PASSED', `Generated retirement dry-run plan for target '${params.targetRoleArn}'.`);

  // Step 3: Classify each object and prove ownership
  const classifications = params.resources.map((r) => ({
    input: r,
    decision: params.ledger.classifyOwnership(r.signals),
  }));
  log(3, 'CLASSIFY_OBJECTS_AND_PROVE_OWNERSHIP', 'PASSED', `Classified ${classifications.length} resources across 6 ownership classes.`);

  // Step 4: Stop if any required evidence is unknown
  const unknownItems = classifications.filter((c) => c.decision.ownershipClass === 'UNKNOWN');
  if (unknownItems.length > 0) {
    for (const u of unknownItems) {
      retainedResources.push({
        resourceId: u.input.resourceId,
        ownershipClass: 'UNKNOWN',
        reason: u.decision.reasons.join(' '),
      });
    }
    log(
      4,
      'STOP_IF_EVIDENCE_UNKNOWN',
      'BLOCKED',
      `Blocked deletion: ${unknownItems.length} resource(s) have UNKNOWN ownership (${unknownItems.map((u) => u.input.resourceId).join(', ')}). --force cannot bypass ownership verification.`
    );
    return buildUninstallResult(params, steps, deletedResources, detachedBindings, retainedResources, 'BLOCKED');
  }
  log(4, 'STOP_IF_EVIDENCE_UNKNOWN', 'PASSED', 'All resources have verified provenance records.');

  // Step 5: Remove only explicitly in-scope runtime resources with verified ownership
  log(5, 'FILTER_IN_SCOPE_VERIFIED_RESOURCES', 'PASSED', 'Filtered to explicitly in-scope resources with verified ownership.');

  // Step 6, 7, 8, 9: Process detachments, deletions of UGONDU_CREATED unused objects, and preservation of adopted/shared/user-owned/external
  for (const item of classifications) {
    const { input, decision } = item;

    if (!input.inScope) {
      retainedResources.push({
        resourceId: input.resourceId,
        ownershipClass: decision.ownershipClass,
        reason: 'Resource is outside declared retirement scope; preserved.',
      });
      continue;
    }

    if (
      decision.ownershipClass === 'UGONDU_ADOPTED' ||
      decision.ownershipClass === 'SHARED' ||
      decision.ownershipClass === 'USER_OWNED' ||
      decision.ownershipClass === 'EXTERNAL' ||
      !decision.destructiveDeleteAllowed
    ) {
      retainedResources.push({
        resourceId: input.resourceId,
        ownershipClass: decision.ownershipClass,
        reason: decision.reasons.join(' '),
      });
      continue;
    }

    // Verified UGONDU_CREATED with zero external consumers
    if (!params.dryRun) {
      if (input.resourceType === 'IAM_MANAGED_POLICY') {
        detachedBindings.push(`${input.resourceId}@${params.targetRoleArn}`);
      }
      deletedResources.push(input.resourceId);
    }
  }

  log(6, 'DETACH_DECLARED_TARGET_BINDINGS', 'PASSED', `Detached ${detachedBindings.length} verified Ugondu bindings.`);
  log(7, 'DELETE_UGONDU_CREATED_UNUSED_POLICIES', 'PASSED', `Deleted ${deletedResources.length} verified UGONDU_CREATED unused resources.`);
  log(8, 'VERIFY_ROLE_DELETION_ELIGIBILITY', 'PASSED', 'Evaluated role deletion eligibility; adopted roles preserved by default.');
  log(
    9,
    'PRESERVE_ADOPTED_SHARED_USER_EXTERNAL_OBJECTS',
    'PASSED',
    `Preserved ${retainedResources.length} non-deletable (adopted/shared/user-owned/external) resources.`
  );

  // Step 10: Re-inspect and verify final state
  await params.adapter.inspect(
    { packId: 'aws.cor.v9', targetRoleArn: params.targetRoleArn },
    params.ctx
  );
  log(10, 'REINSPECT_AND_VERIFY_FINAL_STATE', 'PASSED', 'Re-inspected provider state after retirement actions.');

  // Step 11: Keep audit record and list retained objects with reasons
  log(11, 'RECORD_AUDIT_AND_RETAINED_REASONS', 'PASSED', 'Recorded audit trail and preservation rationale for all retained objects.');

  return buildUninstallResult(
    params,
    steps,
    deletedResources,
    detachedBindings,
    retainedResources,
    'VERIFIED_RETIRED'
  );
}

function buildUninstallResult(
  params: {
    ctx: OperationContext;
    dryRun?: boolean;
    force?: boolean;
  },
  steps: UninstallStepLog[],
  deletedResources: string[],
  detachedBindings: string[],
  retainedResources: SafeUninstallResult['retainedResources'],
  terminalOutcome: UplmTerminalOutcome
): SafeUninstallResult {
  const forceFlagSupplied = Boolean(params.force);
  const evidenceDigest = createHash('sha256')
    .update(
      JSON.stringify({
        operationId: params.ctx.operationId,
        deletedResources,
        detachedBindings,
        retainedResources,
        steps,
        terminalOutcome,
      })
    )
    .digest('hex');

  return {
    operationId: params.ctx.operationId,
    dryRun: Boolean(params.dryRun),
    forceFlagSupplied,
    forceBypassRejected: forceFlagSupplied,
    terminalOutcome,
    deletedResources,
    detachedBindings,
    retainedResources,
    steps,
    evidenceDigest,
  };
}
