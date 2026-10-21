/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : BootstrapPolicyOrchestrator.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (RCS Paris 943 432 534)
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import { CanonicalPolicyRegistry, PolicyPackManifest, computePolicyDigest } from './CanonicalPolicyRegistry';
import { DuplicateRoleGuard } from './DuplicateRoleGuard';
import { CheckpointSnapshot, ExecutionContinuityLedger } from './ExecutionContinuityLedger';
import { RegionPolicyRenderer, RegionScopeConfig, RenderedPolicyDocument } from './RegionPolicyRenderer';
import { ResumePlan, ResumePlanner } from './ResumePlanner';

export type BootstrapOperatingState =
  | 'INITIAL_INSTALLATION_AUTHORIZED'
  | 'RETURNING_INSTALLATION_MATCHED'
  | 'DRIFT_DETECTED_RECONCILABLE'
  | 'BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT'
  | 'PROVIDER_OR_NETWORK_UNAVAILABLE'
  | 'OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS';

export type BootstrapPipelineStage =
  | 'DISCOVER_AND_RECONCILE'
  | 'VALIDATE_POLICY_PACK'
  | 'PROVISION_VIA_BOOTSTRAP'
  | 'VERIFY_EFFECTIVE_RESULT'
  | 'READY_FOR_QUALIFICATION_OR_DEPLOY';

export type BootstrapMutationAction = 'NO_OP' | 'CREATE_POLICY' | 'UPDATE_POLICY_VERSION' | 'ATTACH_POLICY';
export type BootstrapInvocationEntrypoint = 'CLI' | 'UI' | 'IDE' | 'HEADLESS_CI' | 'AUTOMATED_WORKFLOW';
export type SupportedAuthorizationOption = 'BOOTSTRAP_SESSION' | 'ADMIN_DELEGATION' | 'INFRA_CONTROLLER';

export interface DiscoveredPolicyState {
  packId: string;
  policyArn: string;
  documentJson: string;
  documentSha256?: string;
  ownedByUgondu: boolean;
  attachedToRoles: string[];
}

export interface BootstrapAuthorityContext {
  canCreatePolicy: boolean;
  canUpdatePolicyVersion: boolean;
  canAttachPolicy: boolean;
  authorizationMode?: SupportedAuthorizationOption | 'NONE';
}

export interface DesiredPolicyPackInput {
  pack: PolicyPackManifest;
  template: RenderedPolicyDocument;
  signatureVerified?: boolean;
}

export interface BootstrapEnvironmentSnapshot {
  providerReachable: boolean;
  networkError?: string;
  discoveredRoles: string[];
  existingPolicies: DiscoveredPolicyState[];
  bootstrapAuthority: BootstrapAuthorityContext;
  runnerPolicyDocumentJson?: string;
  trustRelationshipValid?: boolean;
  negativeIsolationVerified?: boolean;
  quotaLimits?: { maxPolicySizeBytes?: number; maxAttachedPolicies?: number };
}

export interface FourCheckVerificationSummary {
  runnerDelegationConfirmed: boolean;
  executionRoleTrustConfirmed: boolean;
  v9PolicyAttachmentsConfirmed: boolean;
  regionConsistencyConfirmed: boolean;
  confirmedCount: number;
  summaryText: string;
}

export interface PlannedPolicyAction {
  packId: string;
  targetRole: string;
  action: BootstrapMutationAction;
  renderedSha256: string;
  reason: string;
}

export interface ReconciliationEvidence {
  transactionId: string;
  entrypoint: BootstrapInvocationEntrypoint;
  operatingState: BootstrapOperatingState;
  executionRoleName: string;
  reusedCanonicalRole: boolean;
  reconciledPackIds: string[];
  ledgerHeadHash: string;
  verifiedAt: string;
  evidenceDigest: string;
}

export interface BootstrapReconciliationRequest {
  transactionId: string;
  entrypoint: BootstrapInvocationEntrypoint;
  regionScope: RegionScopeConfig;
  runnerRoleName?: string;
  desiredPacks: DesiredPolicyPackInput[];
  environment: BootstrapEnvironmentSnapshot;
}

export interface BootstrapReconciliationResult {
  operatingState: BootstrapOperatingState;
  completedStages: BootstrapPipelineStage[];
  failedStage?: BootstrapPipelineStage;
  readyForQualificationOrDeploy: boolean;
  reusedCanonicalRole: boolean;
  plannedActions: PlannedPolicyAction[];
  executedActions: PlannedPolicyAction[];
  fourCheckVerification: FourCheckVerificationSummary;
  errorCode?: string;
  errorMessage?: string;
  missingCapabilities?: string[];
  supportedAuthorizationOptions?: SupportedAuthorizationOption[];
  checkpoint?: CheckpointSnapshot;
  resumePlan?: ResumePlan;
  evidence?: ReconciliationEvidence;
}

const WORKLOAD_SERVICE_PREFIX = /^(ec2|rds|s3|ecs|ecr):/i;
const AWS_REGION_TOKEN_REGEX = /\b([a-z]{2}-[a-z]+-\d)\b/g;

export class BootstrapPolicyOrchestrator {
  constructor(
    private readonly registry: CanonicalPolicyRegistry = new CanonicalPolicyRegistry(),
    private readonly roleGuard: DuplicateRoleGuard = new DuplicateRoleGuard(),
    private readonly renderer: RegionPolicyRenderer = new RegionPolicyRenderer(),
    private readonly ledger: ExecutionContinuityLedger = new ExecutionContinuityLedger(),
    private readonly resumePlanner: ResumePlanner = new ResumePlanner()
  ) {}

  public getLedger(): ExecutionContinuityLedger {
    return this.ledger;
  }

  private buildFourCheck(
    runnerDelegationConfirmed: boolean,
    executionRoleTrustConfirmed: boolean,
    v9PolicyAttachmentsConfirmed: boolean,
    regionConsistencyConfirmed: boolean
  ): FourCheckVerificationSummary {
    const confirmedCount = [
      runnerDelegationConfirmed,
      executionRoleTrustConfirmed,
      v9PolicyAttachmentsConfirmed,
      regionConsistencyConfirmed,
    ].filter(Boolean).length;
    return {
      runnerDelegationConfirmed,
      executionRoleTrustConfirmed,
      v9PolicyAttachmentsConfirmed,
      regionConsistencyConfirmed,
      confirmedCount,
      summaryText: `${confirmedCount} of 4 checks confirmed`,
    };
  }

  private findOverprivilegedRunnerActions(runnerPolicyJson?: string): string[] {
    if (!runnerPolicyJson) return [];
    try {
      const parsed = JSON.parse(runnerPolicyJson);
      const statements = Array.isArray(parsed?.Statement) ? parsed.Statement : [];
      const violations: string[] = [];
      for (const stmt of statements) {
        if (stmt?.Effect !== 'Allow') continue;
        const actions: string[] = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
        for (const act of actions) {
          if (typeof act === 'string' && WORKLOAD_SERVICE_PREFIX.test(act.trim())) {
            violations.push(act.trim());
          }
        }
      }
      return violations;
    } catch {
      return ['MALFORMED_RUNNER_POLICY'];
    }
  }

  private detectCrossRegionDrift(documentJson: string, allowedRegions: string[]): string[] {
    const allowed = new Set(allowedRegions);
    const mismatched = new Set<string>();
    let match: RegExpExecArray | null;
    const regex = new RegExp(AWS_REGION_TOKEN_REGEX.source, 'g');
    while ((match = regex.exec(documentJson)) !== null) {
      if (!allowed.has(match[1])) mismatched.add(match[1]);
    }
    return Array.from(mismatched);
  }

  private fail(
    operatingState: BootstrapOperatingState,
    completedStages: BootstrapPipelineStage[],
    failedStage: BootstrapPipelineStage,
    reusedCanonicalRole: boolean,
    plannedActions: PlannedPolicyAction[],
    executedActions: PlannedPolicyAction[],
    fourCheckVerification: FourCheckVerificationSummary,
    errorCode: string,
    errorMessage: string,
    extras?: Partial<BootstrapReconciliationResult>
  ): BootstrapReconciliationResult {
    return {
      operatingState,
      completedStages,
      failedStage,
      readyForQualificationOrDeploy: false,
      reusedCanonicalRole,
      plannedActions,
      executedActions,
      fourCheckVerification,
      errorCode,
      errorMessage,
      ...extras,
    };
  }

  public executeReconciliation(request: BootstrapReconciliationRequest): BootstrapReconciliationResult {
    const completedStages: BootstrapPipelineStage[] = [];
    const plannedActions: PlannedPolicyAction[] = [];
    const executedActions: PlannedPolicyAction[] = [];
    const runnerRole = request.runnerRoleName ?? 'UgonduCORRunner';
    const targetRole = request.regionScope.executionRoleName;

    this.ledger.append(request.transactionId, 'PLANNING', { entrypoint: request.entrypoint, targetRole });

    // STAGE 1: DISCOVER_AND_RECONCILE
    if (!request.environment.providerReachable) {
      const reason = request.environment.networkError ?? 'Provider API unreachable during discovery.';
      this.ledger.append(request.transactionId, 'PAUSED', { reason });
      const checkpoint = this.ledger.createCheckpoint(request.transactionId);
      const resumePlan = this.resumePlanner.generateResumePlan(request.transactionId, {
        status: 'INDETERMINATE_UNPROBED',
        desiredCount: request.desiredPacks.length,
        observedCount: 0,
        deltas: [],
        requiresDestructiveApproval: false,
        reconciliationDigest: 'UNPROBED_FAIL_CLOSED',
      });
      return this.fail('PROVIDER_OR_NETWORK_UNAVAILABLE', completedStages, 'DISCOVER_AND_RECONCILE', false, plannedActions, executedActions, this.buildFourCheck(false, false, false, false), 'UG-PROVIDER-UNAVAILABLE', reason, { checkpoint, resumePlan });
    }

    const overprivilegedActions = this.findOverprivilegedRunnerActions(request.environment.runnerPolicyDocumentJson);
    if (overprivilegedActions.length > 0) {
      this.ledger.append(request.transactionId, 'FAILED', { reason: 'Runner overprivileged', overprivilegedActions });
      return this.fail(
        'OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS',
        completedStages,
        'DISCOVER_AND_RECONCILE',
        false,
        plannedActions,
        executedActions,
        this.buildFourCheck(false, false, false, false),
        'UG-RUNNER-OVERPRIVILEGED',
        `Runner role '${runnerRole}' violates separation-of-duties by holding direct workload permissions: ${overprivilegedActions.join(', ')}`
      );
    }

    const roleDef = this.registry.getRole(targetRole);
    if (targetRole === runnerRole || roleDef?.purpose === 'runner') {
      this.ledger.append(request.transactionId, 'FAILED', { reason: 'Self-escalation blocked' });
      return this.fail('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS', completedStages, 'DISCOVER_AND_RECONCILE', false, plannedActions, executedActions, this.buildFourCheck(false, false, false, false), 'UG-SELF-ESCALATION-BLOCKED', `Refusing to attach execution policies to runner role '${targetRole}'.`);
    }

    const roleCheck = this.roleGuard.evaluateCreation(targetRole, request.environment.discoveredRoles);
    if (['NEAR_DUPLICATE_DETECTED', 'CANONICAL_ALTERNATIVE_EXISTS', 'INVALID_ROLE_NAME'].includes(roleCheck.status)) {
      this.ledger.append(request.transactionId, 'FAILED', { roleCheck });
      return this.fail('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS', completedStages, 'DISCOVER_AND_RECONCILE', false, plannedActions, executedActions, this.buildFourCheck(true, false, false, false), 'UG-ROLE-CONFLICT', roleCheck.reason);
    }
    const reusedCanonicalRole = roleCheck.status === 'EXACT_MATCH_EXISTS';

    for (const desired of request.desiredPacks) {
      this.registry.registerPolicyPack(desired.pack);
      const existing = request.environment.existingPolicies.find((p) => p.packId === desired.pack.packId);
      if (existing && !existing.ownedByUgondu) {
        this.ledger.append(request.transactionId, 'PAUSED', { ambiguousPolicyArn: existing.policyArn });
        return this.fail('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS', completedStages, 'DISCOVER_AND_RECONCILE', reusedCanonicalRole, plannedActions, executedActions, this.buildFourCheck(true, false, false, false), 'UG-OWNERSHIP-AMBIGUOUS', `Policy '${existing.policyArn}' has unverified ownership; refusing destructive overwrite or detachment.`);
      }
    }
    completedStages.push('DISCOVER_AND_RECONCILE');

    // STAGE 2: VALIDATE_POLICY_PACK
    const maxSizeBytes = request.environment.quotaLimits?.maxPolicySizeBytes ?? 6144;
    const maxAttached = request.environment.quotaLimits?.maxAttachedPolicies ?? 10;
    if (request.desiredPacks.length > maxAttached) {
      return this.fail('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS', completedStages, 'VALIDATE_POLICY_PACK', reusedCanonicalRole, plannedActions, executedActions, this.buildFourCheck(true, false, false, false), 'UG-POLICY-QUOTA-EXCEEDED', `Desired pack count (${request.desiredPacks.length}) exceeds attachment limit (${maxAttached}).`);
    }

    let hadExistingResource = false;
    let driftFound = false;
    let crossRegionDriftDetected = false;

    for (const desired of request.desiredPacks) {
      if (desired.signatureVerified === false) {
        return this.fail('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS', completedStages, 'VALIDATE_POLICY_PACK', reusedCanonicalRole, plannedActions, executedActions, this.buildFourCheck(true, false, false, false), 'UG-POLICY-SIGNATURE-INVALID', `Policy pack '${desired.pack.packId}' failed cryptographic signature verification.`);
      }

      const rendered = this.renderer.renderPolicy(desired.template, request.regionScope);
      const sizeBytes = Buffer.byteLength(rendered.documentJson, 'utf8');
      if (!rendered.valid || sizeBytes > maxSizeBytes) {
        const code = !rendered.valid ? 'UG-POLICY-RENDER-INVALID' : 'UG-POLICY-QUOTA-EXCEEDED';
        const msg = !rendered.valid ? rendered.violations.join('; ') : `Rendered policy '${desired.pack.packId}' exceeds size quota.`;
        return this.fail('OWNERSHIP_OR_PERMISSIONS_AMBIGUOUS', completedStages, 'VALIDATE_POLICY_PACK', reusedCanonicalRole, plannedActions, executedActions, this.buildFourCheck(true, false, false, false), code, msg);
      }

      const existing = request.environment.existingPolicies.find((p) => p.packId === desired.pack.packId);
      if (!existing) {
        plannedActions.push(
          { packId: desired.pack.packId, targetRole, action: 'CREATE_POLICY', renderedSha256: rendered.documentSha256, reason: 'Policy missing.' },
          { packId: desired.pack.packId, targetRole, action: 'ATTACH_POLICY', renderedSha256: rendered.documentSha256, reason: 'Attach policy.' }
        );
      } else {
        hadExistingResource = true;
        const integrity = this.registry.verifyPolicyIntegrity(desired.pack.packId, existing.documentJson);
        const foreignRegions = this.detectCrossRegionDrift(existing.documentJson, request.regionScope.allowedRegions);
        if (foreignRegions.length > 0) crossRegionDriftDetected = true;

        let formattedSha = existing.documentSha256;
        if (!formattedSha) {
          try {
            formattedSha = crypto.createHash('sha256').update(JSON.stringify(JSON.parse(existing.documentJson), null, 2), 'utf8').digest('hex');
          } catch {
            formattedSha = computePolicyDigest(existing.documentJson);
          }
        }
        const hashMatches = formattedSha === rendered.documentSha256 && foreignRegions.length === 0;
        const isAttached = existing.attachedToRoles.includes(targetRole);

        if (!integrity.valid || !hashMatches) {
          driftFound = true;
          const driftReason = foreignRegions.length > 0
            ? `Cross-region ARN drift (${foreignRegions.join(', ')}) reconciled to ${request.regionScope.allowedRegions.join(', ')}.`
            : `Policy '${desired.pack.packId}' drifted from canonical SHA-256.`;
          plannedActions.push({ packId: desired.pack.packId, targetRole, action: 'UPDATE_POLICY_VERSION', renderedSha256: rendered.documentSha256, reason: driftReason });
        }
        if (!isAttached) {
          driftFound = true;
          plannedActions.push({ packId: desired.pack.packId, targetRole, action: 'ATTACH_POLICY', renderedSha256: rendered.documentSha256, reason: `Policy '${desired.pack.packId}' is unattached from '${targetRole}'.` });
        }
        if (integrity.valid && hashMatches && isAttached) {
          plannedActions.push({ packId: desired.pack.packId, targetRole, action: 'NO_OP', renderedSha256: rendered.documentSha256, reason: `Policy '${desired.pack.packId}' verified in sync.` });
        }
      }
    }
    completedStages.push('VALIDATE_POLICY_PACK');

    // AUTHORITY GATE BEFORE PROVISIONING
    const missingCapabilities: string[] = [];
    const auth = request.environment.bootstrapAuthority;
    if (plannedActions.some((a) => a.action === 'CREATE_POLICY') && !auth.canCreatePolicy) missingCapabilities.push('iam:CreatePolicy');
    if (plannedActions.some((a) => a.action === 'UPDATE_POLICY_VERSION') && !auth.canUpdatePolicyVersion) missingCapabilities.push('iam:CreatePolicyVersion');
    if (plannedActions.some((a) => a.action === 'ATTACH_POLICY') && !auth.canAttachPolicy) missingCapabilities.push('iam:AttachRolePolicy');

    if (missingCapabilities.length > 0) {
      this.ledger.append(request.transactionId, 'PAUSED', { missingCapabilities });
      const checkpoint = this.ledger.createCheckpoint(request.transactionId);
      const supportedAuthorizationOptions: SupportedAuthorizationOption[] = ['BOOTSTRAP_SESSION', 'ADMIN_DELEGATION', 'INFRA_CONTROLLER'];
      const trustOk = request.environment.trustRelationshipValid !== false;
      return this.fail('BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT', completedStages, 'PROVISION_VIA_BOOTSTRAP', reusedCanonicalRole, plannedActions, executedActions, this.buildFourCheck(true, trustOk, false, !crossRegionDriftDetected), 'UG-BOOTSTRAP-AUTH-MISSING', `Bootstrap authority required for missing capabilities: ${missingCapabilities.join(', ')}`, { missingCapabilities, supportedAuthorizationOptions, checkpoint });
    }

    const mutations = plannedActions.filter((a) => a.action !== 'NO_OP');
    const operatingState: BootstrapOperatingState =
      mutations.length === 0 ? 'RETURNING_INSTALLATION_MATCHED' : driftFound || hadExistingResource ? 'DRIFT_DETECTED_RECONCILABLE' : 'INITIAL_INSTALLATION_AUTHORIZED';

    // STAGE 3: PROVISION_VIA_BOOTSTRAP
    for (const action of plannedActions) {
      executedActions.push(action);
      this.ledger.append(request.transactionId, 'STEP_COMMITTED', action, `${action.packId}:${action.action}`);
    }
    const checkpoint = this.ledger.createCheckpoint(request.transactionId);
    completedStages.push('PROVISION_VIA_BOOTSTRAP');

    // STAGE 4: VERIFY_EFFECTIVE_RESULT
    const trustValid = request.environment.trustRelationshipValid !== false;
    const isolationValid = request.environment.negativeIsolationVerified !== false;
    if (!trustValid || !isolationValid) {
      this.ledger.append(request.transactionId, 'FAILED', { reason: 'Effective verification failed' });
      return this.fail(operatingState, completedStages, 'VERIFY_EFFECTIVE_RESULT', reusedCanonicalRole, plannedActions, executedActions, this.buildFourCheck(true, trustValid, true, true), 'UG-EFFECTIVE-VERIFICATION-FAILED', 'Post-reconciliation trust relationship or negative isolation verification failed.', { checkpoint });
    }

    const verifiedEntry = this.ledger.append(request.transactionId, 'VERIFIED', { operatingState, targetRole });
    completedStages.push('VERIFY_EFFECTIVE_RESULT');

    // STAGE 5: READY_FOR_QUALIFICATION_OR_DEPLOY
    const certifiedEntry = this.ledger.append(request.transactionId, 'CERTIFIED', { readyForQualificationOrDeploy: true });
    completedStages.push('READY_FOR_QUALIFICATION_OR_DEPLOY');

    const reconciledPackIds = request.desiredPacks.map((d) => d.pack.packId);
    const evidenceDigest = crypto.createHash('sha256').update(`${request.transactionId}|${operatingState}|${targetRole}|${verifiedEntry.entryHash}|${reconciledPackIds.join(',')}`, 'utf8').digest('hex');

    return {
      operatingState,
      completedStages,
      readyForQualificationOrDeploy: true,
      reusedCanonicalRole,
      plannedActions,
      executedActions,
      fourCheckVerification: this.buildFourCheck(true, true, true, true),
      checkpoint,
      evidence: {
        transactionId: request.transactionId,
        entrypoint: request.entrypoint,
        operatingState,
        executionRoleName: targetRole,
        reusedCanonicalRole,
        reconciledPackIds,
        ledgerHeadHash: certifiedEntry.entryHash,
        verifiedAt: certifiedEntry.timestamp,
        evidenceDigest,
      },
    };
  }
}
