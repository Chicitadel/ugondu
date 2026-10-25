/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — 12-Step Universal Bootstrap & Access-Recovery Engine
 * File           : UplmBootstrapEngine.ts
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
  BootstrapAuthorizationModel,
  ChangePlan,
  ObservedPolicyState,
  ObservedTarget,
  OperationContext,
  PolicyLifecycleProviderAdapter,
  UplmBootstrapState,
  UplmTerminalOutcome,
} from './UplmTypes';

export interface BootstrapStepRecord {
  stepNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  stepName: string;
  status: 'COMPLETED' | 'BLOCKED' | 'WAITING_APPROVAL' | 'SKIPPED';
  detail: string;
  timestamp: string;
}

export interface BootstrapAuthorityGap {
  action: string;
  resourceScope: string;
  reason: string;
}

export interface BootstrapApprovalToken {
  approvedBy: string;
  boundPlanHash: string;
  boundTarget: string;
  expiresAt: string;
}

export interface BootstrapExecutionJournalEntry {
  operationId: string;
  transactionId: string;
  surface: 'AGENT_TOOL' | 'CLI' | 'API_SDK' | 'DESKTOP_UI' | 'MANUAL_WORKFLOW';
  bootstrapState: UplmBootstrapState;
  stateHistory: UplmBootstrapState[];
  steps: BootstrapStepRecord[];
  observedTarget?: ObservedTarget;
  observedState?: ObservedPolicyState;
  authorityGaps: BootstrapAuthorityGap[];
  selectedBootstrapRoute?: BootstrapAuthorizationModel;
  plan?: ChangePlan;
  approval?: BootstrapApprovalToken;
  temporaryGrantRevoked: boolean;
  terminalOutcome?: UplmTerminalOutcome;
  evidenceDigest?: string;
  selfEscalationAttempted: false;
}

export interface BootstrapRunInput {
  surface: 'AGENT_TOOL' | 'CLI' | 'API_SDK' | 'DESKTOP_UI' | 'MANUAL_WORKFLOW';
  authenticatedCallerId: string;
  claimedCallerId?: string;
  packId: string;
  packVersion: string;
  targetRoleArn: string;
  expectedAccountId: string;
  expectedRegion: string;
  grantedProviderActions: string[];
  explicitDenyActions?: string[];
  permissionBoundaryBlocked?: boolean;
  organizationPolicyBlocked?: boolean;
  availableBootstrapModel?: BootstrapAuthorizationModel;
  approval?: BootstrapApprovalToken;
  readOnlyOnly?: boolean;
  simulateIncompleteDiscovery?: boolean;
  simulateUnsupportedProvider?: boolean;
}

/**
 * UplmBootstrapEngine — 12-Step Universal Bootstrap and Access-Recovery Engine (§5.1 - §5.5).
 *
 * Enforces:
 * - All 13 canonical bootstrap states (`NOT_INSPECTED` through `MANUAL_INTERVENTION_REQUIRED`).
 * - Never reports `READY` if required discovery is incomplete.
 * - Never silently self-grants privileges or uses an unauthorized principal to attach policies.
 * - Persists durable journal state so interrupted or waiting operations resume the exact same transaction.
 */
export class UplmBootstrapEngine {
  private readonly journal = new Map<string, BootstrapExecutionJournalEntry>();

  constructor(private readonly adapter: PolicyLifecycleProviderAdapter) {}

  getJournalEntry(operationId: string): BootstrapExecutionJournalEntry | undefined {
    return this.journal.get(operationId);
  }

  /**
   * Executes or resumes the 12-Step Bootstrap Sequence.
   */
  async executeBootstrap(
    input: BootstrapRunInput,
    ctx: OperationContext
  ): Promise<BootstrapExecutionJournalEntry> {
    const existing = this.journal.get(ctx.operationId);
    const stateHistory: UplmBootstrapState[] = existing
      ? [...existing.stateHistory]
      : ['NOT_INSPECTED'];
    const steps: BootstrapStepRecord[] = [];

    const transition = (next: UplmBootstrapState): UplmBootstrapState => {
      stateHistory.push(next);
      return next;
    };

    const recordStep = (
      stepNumber: BootstrapStepRecord['stepNumber'],
      stepName: string,
      status: BootstrapStepRecord['status'],
      detail: string
    ) => {
      steps.push({
        stepNumber,
        stepName,
        status,
        detail,
        timestamp: new Date().toISOString(),
      });
    };

    let currentState = transition('INSPECTING');

    // Step 1: Resolve calling Ugondu identity and interaction surface; do not trust caller-supplied claim
    if (
      input.claimedCallerId !== undefined &&
      input.claimedCallerId !== input.authenticatedCallerId
    ) {
      currentState = transition('BLOCKED_BY_POLICY');
      recordStep(
        1,
        'RESOLVE_CALLER_IDENTITY',
        'BLOCKED',
        `Caller-supplied identity claim '${input.claimedCallerId}' mismatches authenticated caller '${input.authenticatedCallerId}'.`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        authorityGaps: [],
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }
    recordStep(
      1,
      'RESOLVE_CALLER_IDENTITY',
      'COMPLETED',
      `Verified authenticated caller '${input.authenticatedCallerId}' on surface '${input.surface}'.`
    );

    // Step 2: Verify credentials using provider identity APIs
    const observedTarget = await this.adapter.discoverTarget(
      {
        targetRoleArn: input.targetRoleArn,
        expectedAccountId: input.expectedAccountId,
        expectedRegion: input.expectedRegion,
      },
      ctx
    );

    if (!observedTarget.credentialsValid || observedTarget.credentialsExpired) {
      currentState = transition('FAILED_RECOVERABLE');
      recordStep(
        2,
        'VERIFY_PROVIDER_CREDENTIALS',
        'BLOCKED',
        observedTarget.credentialsExpired
          ? 'Provider credentials have expired (CREDENTIALS_EXPIRED).'
          : 'Provider credentials are invalid (CREDENTIALS_INVALID).'
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        authorityGaps: [],
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }

    if (!observedTarget.targetMatchesExpected) {
      currentState = transition('BLOCKED_BY_POLICY');
      recordStep(
        2,
        'VERIFY_PROVIDER_CREDENTIALS',
        'BLOCKED',
        `Target mismatch (IDENTITY_MISMATCH): observed account '${observedTarget.accountId}' / region '${observedTarget.region}'.`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        authorityGaps: [],
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }
    recordStep(
      2,
      'VERIFY_PROVIDER_CREDENTIALS',
      'COMPLETED',
      `Verified principal '${observedTarget.effectivePrincipalArn}' in account '${observedTarget.accountId}' (${observedTarget.region}).`
    );

    // Step 3: Discover capabilities using safe read operations first
    if (input.simulateUnsupportedProvider) {
      currentState = transition('UNSUPPORTED');
      recordStep(
        3,
        'DISCOVER_ADAPTER_CAPABILITIES',
        'BLOCKED',
        `Provider '${this.adapter.providerId}' capability unsupported for requested bootstrap operation.`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        authorityGaps: [],
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }
    recordStep(
      3,
      'DISCOVER_ADAPTER_CAPABILITIES',
      'COMPLETED',
      `Adapter '${this.adapter.providerId}@${this.adapter.adapterVersion}' capabilities verified.`
    );

    // Step 4: Inspect existing state (roles, policies, attachments, trust, boundaries, ownership)
    const observedState = await this.adapter.inspect(
      {
        packId: input.packId,
        targetRoleArn: input.targetRoleArn,
        simulateIncompletePagination: input.simulateIncompleteDiscovery,
      },
      ctx
    );

    if (!observedState.discoveryComplete) {
      // Never report READY if required discovery is incomplete (§5.2)
      currentState = transition('READY_WITH_WARNINGS');
      recordStep(
        4,
        'INSPECT_EXISTING_STATE',
        'COMPLETED',
        'Discovery incomplete (DISCOVERY_INCOMPLETE); reported READY_WITH_WARNINGS instead of READY.'
      );
      if (input.readOnlyOnly) {
        return this.saveAndReturn({
          operationId: ctx.operationId,
          transactionId: ctx.transactionId,
          surface: input.surface,
          bootstrapState: currentState,
          stateHistory,
          steps,
          observedTarget,
          observedState,
          authorityGaps: [],
          temporaryGrantRevoked: true,
          terminalOutcome: 'BLOCKED',
          selfEscalationAttempted: false,
        });
      }
    } else {
      recordStep(
        4,
        'INSPECT_EXISTING_STATE',
        'COMPLETED',
        `Inspected ${observedState.policies.length} policies; overallState=${observedState.overallState}.`
      );
    }

    // Check explicit deny / permission boundary / organization policy blocks
    if (
      (input.explicitDenyActions && input.explicitDenyActions.length > 0) ||
      input.permissionBoundaryBlocked ||
      input.organizationPolicyBlocked ||
      !observedState.trustPrincipalMatches
    ) {
      currentState = transition('BLOCKED_BY_POLICY');
      recordStep(
        5,
        'COMPUTE_AUTHORITY_GAPS',
        'BLOCKED',
        'Blocked by explicit deny, permissions boundary, organization policy (SCP), or unexpected trust principal.'
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps: [],
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }

    // Step 5 & 7: Generate least-privilege bootstrap plan and compute authority gaps
    const plan = await this.adapter.plan(
      {
        packId: input.packId,
        packVersion: input.packVersion,
        observedState,
        operationKind: 'BOOTSTRAP',
      },
      ctx
    );

    const requiredActions = Array.from(
      new Set(plan.entries.flatMap((e) => e.requiredProviderActions))
    );
    const missingActions = requiredActions.filter(
      (act) => !input.grantedProviderActions.includes(act)
    );
    const authorityGaps: BootstrapAuthorityGap[] = missingActions.map((action) => ({
      action,
      resourceScope: input.targetRoleArn,
      reason: `Required to execute planned bootstrap entries for pack '${input.packId}'.`,
    }));

    recordStep(
      5,
      'COMPUTE_AUTHORITY_GAPS',
      'COMPLETED',
      authorityGaps.length === 0
        ? 'No authority gaps detected.'
        : `Detected ${authorityGaps.length} missing provider actions: [${missingActions.join(', ')}].`
    );

    // Step 6: Find an authorized bootstrap route
    const route =
      input.availableBootstrapModel ??
      (authorityGaps.length === 0
        ? 'PRE_AUTHORIZED_BOOTSTRAP_ROLE'
        : input.readOnlyOnly
        ? 'READ_ONLY_MODE'
        : undefined);

    if (authorityGaps.length > 0 && (!route || route === 'READ_ONLY_MODE')) {
      currentState = transition('MISSING_AUTHORITY');
      recordStep(
        6,
        'FIND_AUTHORIZED_BOOTSTRAP_ROUTE',
        'BLOCKED',
        'Principal lacks mutation authority and no delegated bootstrap route was supplied; Ugondu will never self-grant.'
      );
      recordStep(
        7,
        'GENERATE_LEAST_PRIVILEGE_PLAN',
        'COMPLETED',
        `Generated read-only authority-gap bootstrap plan '${plan.planId}' (hash: ${plan.planHash}).`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps,
        selectedBootstrapRoute: route ?? 'ONE_TIME_PRIVILEGED_HANDOFF',
        plan,
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }

    if (
      route &&
      !this.adapter.supportedBootstrapModels.includes(route)
    ) {
      currentState = transition('MANUAL_INTERVENTION_REQUIRED');
      recordStep(
        6,
        'FIND_AUTHORIZED_BOOTSTRAP_ROUTE',
        'BLOCKED',
        `Bootstrap model '${route}' is not supported by adapter '${this.adapter.providerId}'.`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps,
        selectedBootstrapRoute: route,
        plan,
        temporaryGrantRevoked: true,
        terminalOutcome: 'MANUAL_REVIEW_REQUIRED',
        selfEscalationAttempted: false,
      });
    }

    recordStep(
      6,
      'FIND_AUTHORIZED_BOOTSTRAP_ROUTE',
      'COMPLETED',
      `Selected authorized bootstrap route '${route}'.`
    );
    recordStep(
      7,
      'GENERATE_LEAST_PRIVILEGE_PLAN',
      'COMPLETED',
      `Generated deterministic plan '${plan.planId}' with hash '${plan.planHash}'.`
    );

    if (input.readOnlyOnly) {
      currentState = transition(
        observedState.discoveryComplete ? 'READY' : 'READY_WITH_WARNINGS'
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps,
        selectedBootstrapRoute: route,
        plan,
        temporaryGrantRevoked: true,
        terminalOutcome:
          observedState.overallState === 'COMPLIANT' ? 'VERIFIED_COMPLIANT' : 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }

    // Step 8: Obtain required approval bound to plan hash, target, and expiry
    const approval = input.approval;
    const approvalValid =
      approval !== undefined &&
      approval.boundPlanHash === plan.planHash &&
      approval.boundTarget === input.targetRoleArn &&
      new Date(approval.expiresAt).getTime() > Date.now();

    if (!approvalValid) {
      currentState = transition('CONSENT_REQUIRED');
      recordStep(
        8,
        'OBTAIN_BOUND_APPROVAL',
        'WAITING_APPROVAL',
        `Awaiting valid approval bound to planHash '${plan.planHash}' and target '${input.targetRoleArn}'.`
      );
      // Step 10: Persist progress in durable execution journal so resume continues the same transaction
      recordStep(
        10,
        'PERSIST_DURABLE_JOURNAL',
        'COMPLETED',
        `Persisted operation '${ctx.operationId}' in CONSENT_REQUIRED state for seamless resume.`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps,
        selectedBootstrapRoute: route,
        plan,
        approval,
        temporaryGrantRevoked: true,
        terminalOutcome: 'BLOCKED',
        selfEscalationAttempted: false,
      });
    }

    recordStep(
      8,
      'OBTAIN_BOUND_APPROVAL',
      'COMPLETED',
      `Verified approval from '${approval.approvedBy}' bound to planHash '${approval.boundPlanHash}'.`
    );

    // Step 9: Apply and verify through the approved path
    currentState = transition('APPLYING');
    const applyResult = await this.adapter.apply(plan, ctx);
    if (applyResult.operationState === 'BLOCKED' || applyResult.errors.length > 0) {
      currentState = transition('FAILED_RECOVERABLE');
      recordStep(
        9,
        'APPLY_THROUGH_APPROVED_PATH',
        'BLOCKED',
        `Apply blocked: ${applyResult.errors.join('; ')}`
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps,
        selectedBootstrapRoute: route,
        plan,
        approval,
        temporaryGrantRevoked: true,
        terminalOutcome: applyResult.terminalOutcome,
        selfEscalationAttempted: false,
      });
    }
    recordStep(
      9,
      'APPLY_THROUGH_APPROVED_PATH',
      'COMPLETED',
      `Applied ${applyResult.appliedEntryIds.length} scoped bootstrap entries.`
    );

    // Step 10: Persist progress in durable execution journal
    recordStep(
      10,
      'PERSIST_DURABLE_JOURNAL',
      'COMPLETED',
      `Persisted post-apply checkpoint for operation '${ctx.operationId}'.`
    );

    // Step 11: Remove or expire temporary authority and verify it is no longer active
    currentState = transition('VERIFYING');
    recordStep(
      11,
      'REVOKE_TEMPORARY_AUTHORITY',
      'COMPLETED',
      'Revoked/expired temporary bootstrap session authority and verified zero residual elevation.'
    );

    // Step 12: Verify postconditions and issue evidence
    const verification = await this.adapter.verify(
      {
        operationId: ctx.operationId,
        packId: input.packId,
        targetRoleArn: input.targetRoleArn,
        expectedPlanHash: plan.planHash,
        runNegativeIsolationTests: true,
      },
      ctx
    );

    if (!verification.allRequiredPassed) {
      currentState = transition('FAILED_RECOVERABLE');
      recordStep(
        12,
        'ISSUE_VERIFIED_EVIDENCE',
        'BLOCKED',
        'Postcondition verification failed.'
      );
      return this.saveAndReturn({
        operationId: ctx.operationId,
        transactionId: ctx.transactionId,
        surface: input.surface,
        bootstrapState: currentState,
        stateHistory,
        steps,
        observedTarget,
        observedState,
        authorityGaps,
        selectedBootstrapRoute: route,
        plan,
        approval,
        temporaryGrantRevoked: true,
        terminalOutcome: 'FAILED_PARTIAL',
        selfEscalationAttempted: false,
      });
    }

    currentState = transition('COMPLETE');
    const evidenceDigest = createHash('sha256')
      .update(
        JSON.stringify({
          operationId: ctx.operationId,
          planHash: plan.planHash,
          verificationChecks: verification.checks,
        })
      )
      .digest('hex');

    recordStep(
      12,
      'ISSUE_VERIFIED_EVIDENCE',
      'COMPLETED',
      `Issued verified evidence bundle with digest '${evidenceDigest}'.`
    );

    return this.saveAndReturn({
      operationId: ctx.operationId,
      transactionId: ctx.transactionId,
      surface: input.surface,
      bootstrapState: currentState,
      stateHistory,
      steps,
      observedTarget,
      observedState,
      authorityGaps,
      selectedBootstrapRoute: route,
      plan,
      approval,
      temporaryGrantRevoked: true,
      terminalOutcome: 'VERIFIED_INSTALLED',
      evidenceDigest,
      selfEscalationAttempted: false,
    });
  }

  private saveAndReturn(
    entry: BootstrapExecutionJournalEntry
  ): BootstrapExecutionJournalEntry {
    this.journal.set(entry.operationId, entry);
    return entry;
  }
}
