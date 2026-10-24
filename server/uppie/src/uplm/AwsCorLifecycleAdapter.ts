/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — AWS COR PolicyLifecycleProviderAdapter
 * File           : AwsCorLifecycleAdapter.ts
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
  type ApplyResult,
  type BootstrapAuthorizationModel,
  type ChangePlan,
  type ChangePlanEntry,
  type CompensationRequest,
  type CompensationResult,
  type DependencyRequest,
  type DiscoverTargetInput,
  type InspectRequest,
  type ObservedPolicyItem,
  type ObservedPolicyState,
  type ObservedTarget,
  type OperationContext,
  type PlanRequest,
  type PolicyLifecycleProviderAdapter,
  type UplmAdapterCapabilities,
  type UplmDependencyReport,
  type UplmNormalizedPolicyState,
  type UplmOwnershipClass,
  type ValidateDocumentRequest,
  type ValidationReport,
  type VerificationCheckResult,
  type VerificationReport,
  type VerifyRequest,
} from './UplmTypes';
import { UplmPackLoaderAndRenderer } from './UplmPackLoaderAndRenderer';
import { UplmOwnershipLedger } from './UplmOwnershipLedger';

export interface SimulatedAwsFixtureState {
  callerArn: string;
  accountId: string;
  partition: string;
  region: string;
  credentialsValid: boolean;
  credentialsExpired: boolean;
  targetRoleExists: boolean;
  targetRoleArn: string;
  trustPrincipalArn: string;
  inlinePolicyNames: string[];
  permissionsBoundaryArn?: string;
  roleTags: Record<string, string>;
  policies: Record<
    string,
    {
      exists: boolean;
      attachedToTargetRole: boolean;
      attachedToRunnerRole: boolean;
      documentHash?: string;
      ownershipClass: UplmOwnershipClass;
      externalConsumers: string[];
    }
  >;
  effectivePermissionVerified: boolean;
  negativeIsolationVerified: boolean;
}

/**
 * Builds the default initial AWS COR V9 fixture state matching Section 0.1 of the UPLM Blueprint:
 * - Role `UgonduCORExecutionRole` exists in account `971671216490` (`eu-west-3`)
 * - Trust policy names `arn:aws:iam::971671216490:role/UgonduCORRunner`
 * - All five `UgonduCOR-V9-*` customer-managed policies exist as unattached test fixtures
 */
export function createDefaultAwsCorV9UnattachedFixture(): SimulatedAwsFixtureState {
  const pack = UplmPackLoaderAndRenderer.loadAwsCorV9Pack();
  const policies: SimulatedAwsFixtureState['policies'] = {};
  for (const p of pack.policies) {
    policies[p.physicalName] = {
      exists: true,
      attachedToTargetRole: false,
      attachedToRunnerRole: false,
      documentHash: p.sha256,
      ownershipClass: 'UGONDU_ADOPTED',
      externalConsumers: [],
    };
  }

  return {
    callerArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
    accountId: '971671216490',
    partition: 'aws',
    region: 'eu-west-3',
    credentialsValid: true,
    credentialsExpired: false,
    targetRoleExists: true,
    targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
    trustPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
    inlinePolicyNames: [],
    roleTags: { UgonduCOR: 'true' },
    policies,
    effectivePermissionVerified: false,
    negativeIsolationVerified: true,
  };
}

/**
 * AwsCorLifecycleAdapter — AWS IAM implementation of `PolicyLifecycleProviderAdapter` for Ugondu COR V9.
 *
 * Enforces:
 * - Section 0.1 Initial Fixture Preservation: No premature attachment or deletion during read-only inspection/planning.
 * - Strict separation between policy existence, policy attachment, and verified effective permissions.
 * - Explicit block if any execution policy is attached or targeted to `UgonduCORRunner`.
 * - Read-only call tracking (`mutationCallCount`) so tests can prove zero writes during inspect/plan.
 */
export class AwsCorLifecycleAdapter implements PolicyLifecycleProviderAdapter {
  readonly providerId = 'aws';
  readonly adapterVersion = '2.0.0';

  readonly capabilities: UplmAdapterCapabilities = {
    discoverIdentity: 'supported',
    inspectPolicyDocument: 'supported',
    inspectAttachments: 'supported',
    inspectTrustRelationship: 'supported',
    validatePolicy: 'supported',
    createPolicy: 'supported',
    updateOwnedPolicy: 'supported',
    attachPolicy: 'supported',
    detachPolicy: 'supported',
    inspectEffectivePermissions: 'partial',
    detectExternalConsumers: 'partial',
    atomicRollback: 'unsupported',
  };

  readonly supportedBootstrapModels: readonly BootstrapAuthorizationModel[] = [
    'PRE_AUTHORIZED_BOOTSTRAP_ROLE',
    'SHORT_LIVED_DELEGATED_IDENTITY',
    'ONE_TIME_PRIVILEGED_HANDOFF',
    'READ_ONLY_MODE',
  ] as const;

  private state: SimulatedAwsFixtureState;
  private mutationCallCount = 0;
  private readCallCount = 0;

  constructor(
    initialState: SimulatedAwsFixtureState = createDefaultAwsCorV9UnattachedFixture(),
    private readonly ledger: UplmOwnershipLedger = new UplmOwnershipLedger()
  ) {
    this.state = JSON.parse(JSON.stringify(initialState)) as SimulatedAwsFixtureState;
  }

  getMutationCallCount(): number {
    return this.mutationCallCount;
  }

  getReadCallCount(): number {
    return this.readCallCount;
  }

  getFixtureState(): SimulatedAwsFixtureState {
    return JSON.parse(JSON.stringify(this.state)) as SimulatedAwsFixtureState;
  }

  async discoverTarget(input: DiscoverTargetInput, _ctx: OperationContext): Promise<ObservedTarget> {
    this.readCallCount++;
    const targetMatchesExpected =
      this.state.accountId === input.expectedAccountId &&
      this.state.region === input.expectedRegion &&
      this.state.targetRoleArn === input.targetRoleArn;

    return {
      discoveredAt: new Date().toISOString(),
      effectivePrincipalArn: this.state.callerArn,
      accountId: this.state.accountId,
      partition: this.state.partition,
      region: this.state.region,
      credentialsValid: this.state.credentialsValid,
      credentialsExpired: this.state.credentialsExpired,
      targetMatchesExpected,
      providerRequestId: `aws-req-discover-${this.readCallCount}`,
    };
  }

  async inspect(input: InspectRequest, _ctx: OperationContext): Promise<ObservedPolicyState> {
    this.readCallCount++;
    const pack = UplmPackLoaderAndRenderer.loadAwsCorV9Pack();
    const expectedExecRole = pack.roles.find((r) => r.roleKind === 'EXECUTION_ROLE')!;

    if (input.simulatePermissionDenied || !this.state.credentialsValid || this.state.credentialsExpired) {
      return {
        inspectedAt: new Date().toISOString(),
        targetRoleArn: input.targetRoleArn,
        targetRoleExists: false,
        expectedTrustPrincipalArn: expectedExecRole.trustedPrincipalArn!,
        trustPrincipalMatches: false,
        inlinePolicyNames: [],
        roleTags: {},
        policies: [],
        discoveryComplete: false,
        overallState: 'UNVERIFIED',
        effectivePermissionVerified: false,
        mutationsPerformed: 0,
        providerRequestIds: [`aws-req-inspect-denied-${this.readCallCount}`],
      };
    }

    const trustPrincipalMatches =
      this.state.trustPrincipalArn === expectedExecRole.trustedPrincipalArn;

    const observedPolicies: ObservedPolicyItem[] = pack.policies.map((p) => {
      const sim = this.state.policies[p.physicalName] ?? {
        exists: false,
        attachedToTargetRole: false,
        attachedToRunnerRole: false,
        ownershipClass: 'UNKNOWN' as UplmOwnershipClass,
        externalConsumers: [],
      };

      let normalizedState: UplmNormalizedPolicyState;
      if (input.simulateIncompletePagination) {
        normalizedState = 'UNVERIFIED';
      } else if (sim.attachedToRunnerRole) {
        normalizedState = 'CONFLICT';
      } else if (!sim.exists) {
        normalizedState = 'MISSING';
      } else if (sim.documentHash && sim.documentHash !== p.sha256) {
        normalizedState = sim.ownershipClass === 'UNKNOWN' ? 'CONFLICT' : 'DRIFTED';
      } else if (!sim.attachedToTargetRole) {
        normalizedState = 'MISSING';
      } else if (sim.externalConsumers.length > 0) {
        normalizedState = 'IN_USE';
      } else {
        normalizedState = 'COMPLIANT';
      }

      return {
        logicalId: p.logicalId,
        physicalName: p.physicalName,
        arn: `arn:${this.state.partition}:iam::${this.state.accountId}:policy/${p.physicalName}`,
        exists: sim.exists,
        attachedToTargetRole: sim.attachedToTargetRole,
        attachedToRunnerRole: sim.attachedToRunnerRole,
        defaultVersionId: sim.exists ? 'v1' : undefined,
        documentHash: sim.documentHash,
        expectedDocumentHash: p.sha256,
        normalizedState,
        ownershipClass: sim.ownershipClass,
        statementCount: p.statementCount,
        externalConsumers: [...sim.externalConsumers],
      };
    });

    const discoveryComplete = !input.simulateIncompletePagination;
    let overallState: UplmNormalizedPolicyState;
    if (!discoveryComplete) {
      overallState = 'UNVERIFIED';
    } else if (!trustPrincipalMatches || observedPolicies.some((p) => p.normalizedState === 'CONFLICT')) {
      overallState = 'CONFLICT';
    } else if (observedPolicies.some((p) => p.normalizedState === 'DRIFTED')) {
      overallState = 'DRIFTED';
    } else if (observedPolicies.some((p) => p.normalizedState === 'MISSING')) {
      overallState = 'MISSING';
    } else if (observedPolicies.every((p) => p.normalizedState === 'COMPLIANT')) {
      overallState = 'COMPLIANT';
    } else {
      overallState = 'UNKNOWN';
    }

    return {
      inspectedAt: new Date().toISOString(),
      targetRoleArn: input.targetRoleArn,
      targetRoleExists: this.state.targetRoleExists,
      trustPolicyHash: expectedExecRole.sha256,
      expectedTrustPrincipalArn: expectedExecRole.trustedPrincipalArn!,
      observedTrustPrincipalArn: this.state.trustPrincipalArn,
      trustPrincipalMatches,
      inlinePolicyNames: [...this.state.inlinePolicyNames],
      permissionsBoundaryArn: this.state.permissionsBoundaryArn,
      roleTags: { ...this.state.roleTags },
      policies: observedPolicies,
      discoveryComplete,
      overallState,
      effectivePermissionVerified:
        overallState === 'COMPLIANT' && this.state.effectivePermissionVerified,
      mutationsPerformed: 0,
      providerRequestIds: [`aws-req-inspect-${this.readCallCount}`],
    };
  }

  async validateDocument(
    input: ValidateDocumentRequest,
    ctx: OperationContext
  ): Promise<ValidationReport> {
    this.readCallCount++;
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const rendered = UplmPackLoaderAndRenderer.renderTemplateObject(
        input.document,
        ctx.resolvedEnvironment
      );
      const statements = Array.isArray(input.document.Statement)
        ? (input.document.Statement as Array<{ Sid?: string; Effect?: string; Action?: unknown; Resource?: unknown }>)
        : [];
      const sids = statements.map((s) => s.Sid ?? '').filter(Boolean);

      if (statements.length === 0) {
        errors.push('Policy document must contain at least one Statement.');
      }

      if (
        input.expectedSha256 &&
        rendered.sha256 !== input.expectedSha256
      ) {
        // Also check raw template hash if formatted with indentation
        const formattedHash = createHash('sha256')
          .update(`${JSON.stringify(input.document, null, 2)}\n`)
          .digest('hex');
        if (formattedHash !== input.expectedSha256) {
          errors.push(
            `Document SHA-256 mismatch for '${input.physicalName}': expected ${input.expectedSha256}.`
          );
        }
      }

      return {
        valid: errors.length === 0,
        sha256: input.expectedSha256 ?? rendered.sha256,
        compactCharLength: rendered.canonicalJson.length,
        statementCount: statements.length,
        sids,
        errors,
        warnings,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      return {
        valid: false,
        sha256: '',
        compactCharLength: 0,
        statementCount: 0,
        sids: [],
        errors,
        warnings,
      };
    }
  }

  async plan(input: PlanRequest, ctx: OperationContext): Promise<ChangePlan> {
    this.readCallCount++;
    const blockReasons: string[] = [];
    const entries: ChangePlanEntry[] = [];

    // Hard safety blocker checks (§8.3)
    if (
      ctx.resolvedEnvironment.accountId !== '971671216490' ||
      ctx.resolvedEnvironment.region !== 'eu-west-3'
    ) {
      blockReasons.push(
        `WRONG_TARGET_SCOPE: Expected account 971671216490 in eu-west-3, got ${ctx.resolvedEnvironment.accountId} in ${ctx.resolvedEnvironment.region}.`
      );
    }

    if (input.observedState.targetRoleArn.endsWith('/UgonduCORRunner')) {
      blockReasons.push(
        'PROHIBITED_RUNNER_ATTACHMENT: Execution policies must never be attached to UgonduCORRunner.'
      );
    }

    if (!input.observedState.discoveryComplete) {
      blockReasons.push('DISCOVERY_INCOMPLETE: Required inspection did not complete.');
    }

    if (!input.observedState.trustPrincipalMatches) {
      blockReasons.push(
        `UNEXPECTED_TRUST_PRINCIPAL: Observed '${input.observedState.observedTrustPrincipalArn}' does not match '${input.observedState.expectedTrustPrincipalArn}'.`
      );
    }

    let seq = 1;
    for (const pol of input.observedState.policies) {
      if (pol.attachedToRunnerRole) {
        blockReasons.push(
          `CONFLICT: Policy '${pol.physicalName}' is improperly attached to UgonduCORRunner.`
        );
      }

      if (input.operationKind === 'RETIRE') {
        if (
          pol.ownershipClass !== 'UGONDU_CREATED' ||
          pol.externalConsumers.length > 0 ||
          !this.ledger.isHealthy()
        ) {
          blockReasons.push(
            `RETIREMENT_PRESERVED_OR_BLOCKED: Policy '${pol.physicalName}' has ownership '${pol.ownershipClass}' or external consumers and cannot be deleted.`
          );
          continue;
        }
        if (pol.attachedToTargetRole) {
          entries.push({
            entryId: `entry-${seq}`,
            sequence: seq++,
            logicalResourceId: pol.logicalId,
            providerResourceId: pol.arn,
            operation: 'DETACH_MANAGED_POLICY',
            desiredHash: pol.expectedDocumentHash,
            observedHash: pol.documentHash,
            ownershipClass: pol.ownershipClass,
            riskClass: 'R2',
            requiredCapability: 'detachPolicy',
            requiredProviderActions: ['iam:DetachRolePolicy'],
            requiresApproval: true,
            idempotencyKey: this.computeIdempotencyKey(ctx, pol.logicalId, 'DETACH_MANAGED_POLICY'),
            preconditions: [`Role ${input.observedState.targetRoleArn} has ${pol.physicalName} attached`],
            postconditions: [`Policy ${pol.physicalName} is detached from ${input.observedState.targetRoleArn}`],
            compensationStrategy: `Re-attach ${pol.arn} to ${input.observedState.targetRoleArn}`,
          });
        }
        entries.push({
          entryId: `entry-${seq}`,
          sequence: seq++,
          logicalResourceId: pol.logicalId,
          providerResourceId: pol.arn,
          operation: 'DELETE_MANAGED_POLICY',
          desiredHash: pol.expectedDocumentHash,
          observedHash: pol.documentHash,
          ownershipClass: pol.ownershipClass,
          riskClass: 'R4',
          requiredCapability: 'detachPolicy',
          requiredProviderActions: ['iam:DeletePolicy'],
          requiresApproval: true,
          idempotencyKey: this.computeIdempotencyKey(ctx, pol.logicalId, 'DELETE_MANAGED_POLICY'),
          preconditions: [`Policy ${pol.physicalName} has 0 attachments and ownership is UGONDU_CREATED`],
          postconditions: [`Policy ${pol.physicalName} no longer exists`],
          compensationStrategy: `Recreate ${pol.physicalName} from signed retirement snapshot`,
        });
        continue;
      }

      // BOOTSTRAP / INSTALL / REPAIR / MIGRATE
      if (!pol.exists) {
        entries.push({
          entryId: `entry-${seq}`,
          sequence: seq++,
          logicalResourceId: pol.logicalId,
          providerResourceId: pol.arn,
          operation: 'CREATE_MANAGED_POLICY',
          desiredHash: pol.expectedDocumentHash,
          ownershipClass: 'UGONDU_CREATED',
          riskClass: 'R1',
          requiredCapability: 'createPolicy',
          requiredProviderActions: ['iam:CreatePolicy'],
          requiresApproval: true,
          idempotencyKey: this.computeIdempotencyKey(ctx, pol.logicalId, 'CREATE_MANAGED_POLICY'),
          preconditions: [`Policy ${pol.physicalName} does not exist`],
          postconditions: [`Policy ${pol.physicalName} exists with hash ${pol.expectedDocumentHash}`],
          compensationStrategy: `Delete created policy ${pol.arn}`,
        });
      } else if (pol.documentHash !== pol.expectedDocumentHash) {
        if (pol.ownershipClass !== 'UGONDU_CREATED' && pol.ownershipClass !== 'UGONDU_ADOPTED') {
          blockReasons.push(
            `OWNERSHIP_UNKNOWN: Cannot update drifted policy '${pol.physicalName}' with ownership '${pol.ownershipClass}'.`
          );
        } else {
          entries.push({
            entryId: `entry-${seq}`,
            sequence: seq++,
            logicalResourceId: pol.logicalId,
            providerResourceId: pol.arn,
            operation: 'UPDATE_MANAGED_POLICY_VERSION',
            desiredHash: pol.expectedDocumentHash,
            observedHash: pol.documentHash,
            ownershipClass: pol.ownershipClass,
            riskClass: 'R2',
            requiredCapability: 'updateOwnedPolicy',
            requiredProviderActions: ['iam:CreatePolicyVersion'],
            requiresApproval: true,
            idempotencyKey: this.computeIdempotencyKey(ctx, pol.logicalId, 'UPDATE_MANAGED_POLICY_VERSION'),
            preconditions: [`Policy ${pol.physicalName} is owned/managed by Ugondu`],
            postconditions: [`Default policy version matches hash ${pol.expectedDocumentHash}`],
            compensationStrategy: `Restore previous default policy version for ${pol.arn}`,
          });
        }
      }

      if (!pol.attachedToTargetRole) {
        entries.push({
          entryId: `entry-${seq}`,
          sequence: seq++,
          logicalResourceId: pol.logicalId,
          providerResourceId: pol.arn,
          operation: 'ATTACH_MANAGED_POLICY',
          desiredHash: pol.expectedDocumentHash,
          observedHash: pol.documentHash,
          ownershipClass: pol.ownershipClass,
          riskClass: 'R2',
          requiredCapability: 'attachPolicy',
          requiredProviderActions: ['iam:AttachRolePolicy'],
          requiresApproval: true,
          idempotencyKey: this.computeIdempotencyKey(ctx, pol.logicalId, 'ATTACH_MANAGED_POLICY'),
          preconditions: [
            `Target role is ${input.observedState.targetRoleArn} (not UgonduCORRunner)`,
            `Policy ${pol.physicalName} exists and matches hash ${pol.expectedDocumentHash}`,
          ],
          postconditions: [`Policy ${pol.physicalName} is attached to ${input.observedState.targetRoleArn}`],
          compensationStrategy: `Detach ${pol.arn} from ${input.observedState.targetRoleArn}`,
        });
      }
    }

    const canonicalPlanBody = JSON.stringify({
      packId: input.packId,
      packVersion: input.packVersion,
      targetRoleArn: input.observedState.targetRoleArn,
      operationKind: input.operationKind,
      blocked: blockReasons.length > 0,
      blockReasons,
      entries: entries.map((e) => ({
        logicalResourceId: e.logicalResourceId,
        providerResourceId: e.providerResourceId,
        operation: e.operation,
        desiredHash: e.desiredHash,
        riskClass: e.riskClass,
      })),
    });
    const planHash = createHash('sha256').update(canonicalPlanBody).digest('hex');

    return {
      planId: `plan-${input.operationKind.toLowerCase()}-${planHash.slice(0, 12)}`,
      planHash,
      packId: input.packId,
      packVersion: input.packVersion,
      targetRoleArn: input.observedState.targetRoleArn,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      operationKind: input.operationKind,
      blocked: blockReasons.length > 0,
      blockReasons,
      entries,
      readOnlyGenerated: true,
    };
  }

  async apply(plan: ChangePlan, ctx: OperationContext): Promise<ApplyResult> {
    if (ctx.autonomyMode === 'inspect') {
      return {
        operationId: ctx.operationId,
        planId: plan.planId,
        planHash: plan.planHash,
        appliedAt: new Date().toISOString(),
        operationState: 'BLOCKED',
        terminalOutcome: 'BLOCKED',
        appliedEntryIds: [],
        failedEntryIds: [],
        errors: ['Autonomy mode is inspect (read-only); mutations are prohibited.'],
        providerRequestIds: [],
      };
    }

    if (ctx.preserveInitialFixture) {
      return {
        operationId: ctx.operationId,
        planId: plan.planId,
        planHash: plan.planHash,
        appliedAt: new Date().toISOString(),
        operationState: 'BLOCKED',
        terminalOutcome: 'BLOCKED',
        appliedEntryIds: [],
        failedEntryIds: [],
        errors: [
          'Section 0.1 Initial Fixture Guard: preserveInitialFixture is active; skipping live attachment/mutation until gate is explicitly released.',
        ],
        providerRequestIds: [],
      };
    }

    if (plan.blocked) {
      return {
        operationId: ctx.operationId,
        planId: plan.planId,
        planHash: plan.planHash,
        appliedAt: new Date().toISOString(),
        operationState: 'BLOCKED',
        terminalOutcome: 'BLOCKED',
        appliedEntryIds: [],
        failedEntryIds: [],
        errors: [...plan.blockReasons],
        providerRequestIds: [],
      };
    }

    if (new Date(plan.expiresAt).getTime() <= Date.now()) {
      return {
        operationId: ctx.operationId,
        planId: plan.planId,
        planHash: plan.planHash,
        appliedAt: new Date().toISOString(),
        operationState: 'BLOCKED',
        terminalOutcome: 'BLOCKED',
        appliedEntryIds: [],
        failedEntryIds: [],
        errors: ['PLAN_STALE: ChangePlan has expired.'],
        providerRequestIds: [],
      };
    }

    const appliedEntryIds: string[] = [];
    const providerRequestIds: string[] = [];
    const pack = UplmPackLoaderAndRenderer.loadAwsCorV9Pack();

    for (const entry of plan.entries) {
      this.mutationCallCount++;
      providerRequestIds.push(`aws-req-mutate-${this.mutationCallCount}`);
      const policyMeta = pack.policies.find((p) => p.logicalId === entry.logicalResourceId);
      if (!policyMeta) continue;

      const simPol = this.state.policies[policyMeta.physicalName] ?? {
        exists: false,
        attachedToTargetRole: false,
        attachedToRunnerRole: false,
        ownershipClass: 'UGONDU_CREATED' as UplmOwnershipClass,
        externalConsumers: [],
      };

      if (entry.operation === 'CREATE_MANAGED_POLICY') {
        simPol.exists = true;
        simPol.documentHash = entry.desiredHash;
        simPol.ownershipClass = 'UGONDU_CREATED';
      } else if (entry.operation === 'UPDATE_MANAGED_POLICY_VERSION') {
        simPol.documentHash = entry.desiredHash;
      } else if (entry.operation === 'ATTACH_MANAGED_POLICY') {
        simPol.attachedToTargetRole = true;
      } else if (entry.operation === 'DETACH_MANAGED_POLICY') {
        simPol.attachedToTargetRole = false;
      } else if (entry.operation === 'DELETE_MANAGED_POLICY') {
        simPol.exists = false;
        simPol.attachedToTargetRole = false;
      }

      this.state.policies[policyMeta.physicalName] = simPol;
      appliedEntryIds.push(entry.entryId);
    }

    this.state.effectivePermissionVerified = true;

    const outcomeByKind = {
      BOOTSTRAP: 'VERIFIED_INSTALLED',
      INSTALL: 'VERIFIED_INSTALLED',
      REPAIR: 'VERIFIED_REPAIRED',
      MIGRATE: 'VERIFIED_MIGRATED',
      RETIRE: 'VERIFIED_RETIRED',
    } as const;

    return {
      operationId: ctx.operationId,
      planId: plan.planId,
      planHash: plan.planHash,
      appliedAt: new Date().toISOString(),
      operationState: 'VERIFIED',
      terminalOutcome: outcomeByKind[plan.operationKind],
      appliedEntryIds,
      failedEntryIds: [],
      errors: [],
      providerRequestIds,
    };
  }

  async verify(input: VerifyRequest, ctx: OperationContext): Promise<VerificationReport> {
    const observed = await this.inspect(
      { packId: input.packId, targetRoleArn: input.targetRoleArn },
      ctx
    );

    const checks: VerificationCheckResult[] = [
      {
        checkId: 'TARGET_ROLE_EXISTS',
        status: observed.targetRoleExists ? 'PASS' : 'FAIL',
        rationale: observed.targetRoleExists
          ? `Role '${observed.targetRoleArn}' exists.`
          : `Role '${observed.targetRoleArn}' is missing.`,
      },
      {
        checkId: 'TRUST_POLICY_VERIFIED',
        status: observed.trustPrincipalMatches ? 'PASS' : 'FAIL',
        rationale: observed.trustPrincipalMatches
          ? `Trust principal matches '${observed.expectedTrustPrincipalArn}'.`
          : `Trust principal mismatch: observed '${observed.observedTrustPrincipalArn}'.`,
      },
      {
        checkId: 'ALL_FIVE_V9_POLICIES_EXIST_AND_HASH_MATCH',
        status: observed.policies.every(
          (p) => p.exists && p.documentHash === p.expectedDocumentHash
        )
          ? 'PASS'
          : 'FAIL',
        rationale: 'Checked existence and SHA-256 digest of all 5 split V9 managed policies.',
      },
      {
        checkId: 'ALL_FIVE_V9_POLICIES_ATTACHED_TO_EXECUTION_ROLE',
        status: observed.policies.every(
          (p) => p.attachedToTargetRole && !p.attachedToRunnerRole
        )
          ? 'PASS'
          : 'FAIL',
        rationale:
          'Verified attachment to UgonduCORExecutionRole and absence from UgonduCORRunner.',
      },
      {
        checkId: 'NEGATIVE_ISOLATION_FOREIGN_TRANSACTION_DENIED',
        status:
          input.runNegativeIsolationTests === false
            ? 'NOT_APPLICABLE'
            : this.state.negativeIsolationVerified
            ? 'PASS'
            : 'UNVERIFIED',
        rationale:
          'Verified foreign transaction tag isolation and tag-stripping Deny statements.',
      },
    ];

    const allRequiredPassed = checks.every(
      (c) => c.status === 'PASS' || c.status === 'NOT_APPLICABLE'
    );

    return {
      verifiedAt: new Date().toISOString(),
      operationId: input.operationId,
      allRequiredPassed,
      terminalOutcome: allRequiredPassed ? 'VERIFIED_COMPLIANT' : 'BLOCKED',
      checks,
    };
  }

  async inspectDependencies(
    input: DependencyRequest,
    _ctx: OperationContext
  ): Promise<UplmDependencyReport> {
    this.readCallCount++;
    return {
      targetRoleArn: input.targetRoleArn,
      policyDependencies: input.policyArns.map((arn) => {
        const name = arn.split('/').pop() ?? arn;
        const sim = this.state.policies[name];
        const attachedRoles = sim?.attachedToTargetRole ? [input.targetRoleArn] : [];
        const externalConsumers = sim?.externalConsumers ?? [];
        return {
          policyArn: arn,
          attachedRoles,
          externalConsumers,
          inUseByExternal: externalConsumers.length > 0,
        };
      }),
      activeTransactions: [],
    };
  }

  async compensate(
    input: CompensationRequest,
    _ctx: OperationContext
  ): Promise<CompensationResult> {
    this.mutationCallCount++;
    return {
      operationId: input.operationId,
      compensated: true,
      operationState: 'COMPENSATED',
      terminalOutcome: 'FAILED_RECOVERED',
      restoredResources: [...input.appliedEntryIds],
      unresolvedResources: [],
    };
  }

  private computeIdempotencyKey(
    ctx: OperationContext,
    logicalResourceId: string,
    operationType: string
  ): string {
    return createHash('sha256')
      .update(
        [
          ctx.transactionId,
          ctx.resolvedEnvironment.targetRoleArn,
          'aws.cor.v9',
          logicalResourceId,
          operationType,
        ].join('|')
      )
      .digest('hex');
  }
}
