/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Four-Dimensional Universal Authorization Model
 * File           : FourDimensionalAuthZ.ts
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
import type { UgonduEdition } from '../edition-registry/EditionDefinition';
import { meetsEditionRequirement } from '../edition-registry/EditionDefinition';
import {
  type CanonicalCapabilityId,
  type CanonicalErrorCode,
  type CanonicalCapabilityError,
  type InteractionSurface,
  canonicalCapabilityRegistry,
  createCanonicalError,
  redactSensitiveObject,
} from './CanonicalCapabilityContract';

export interface PlatformAuthZDimension {
  allowed: boolean;
  callerIdentity: string;
  tenantId: string;
  capabilityId: CanonicalCapabilityId;
  requiredScopes: string[];
  grantedScopes: string[];
  editionEntitled: boolean;
  reason: string;
  errorCode?: CanonicalErrorCode;
}

export interface ProviderAuthZDimension {
  allowed: boolean;
  effectivePrincipal: string;
  target: string;
  requiredActions: string[];
  missingActions: string[];
  credentialsValid: boolean;
  credentialsExpired: boolean;
  reason: string;
  errorCode?: CanonicalErrorCode;
}

export interface ApprovalPolicyDimension {
  required: boolean;
  satisfied: boolean;
  boundPlanHash?: string;
  boundTarget?: string;
  expiresAt?: string;
  approvedBy?: string;
  financialControlsVerified?: boolean;
  fraudControlsVerified?: boolean;
  reason: string;
  errorCode?: CanonicalErrorCode;
}

export interface ProviderConstraintsDimension {
  allowed: boolean;
  explicitDeny: boolean;
  permissionBoundaryBlocked: boolean;
  organizationPolicyBlocked: boolean;
  quotaExceeded: boolean;
  wrongTargetScope: boolean;
  packTrusted: boolean;
  ownershipVerified: boolean;
  discoveryComplete: boolean;
  planFresh: boolean;
  reason: string;
  errorCode?: CanonicalErrorCode;
}

export interface FourDimensionalAuthZReport {
  allowed: boolean;
  capabilityId: CanonicalCapabilityId;
  surface: InteractionSurface;
  decisionHash: string;
  platformAuthZ: PlatformAuthZDimension;
  providerAuthZ: ProviderAuthZDimension;
  approvalPolicy: ApprovalPolicyDimension;
  providerConstraints: ProviderConstraintsDimension;
  primaryError?: CanonicalCapabilityError;
}

export interface UniversalAuthorizationInput {
  surface: InteractionSurface;
  operationId: string;
  correlationId: string;
  capabilityId: CanonicalCapabilityId;
  authenticatedCaller: {
    subjectId: string;
    tenantId: string;
    edition: UgonduEdition;
    grantedScopes: string[];
    claimedSubjectId?: string;
    claimedTenantId?: string;
  };
  providerContext: {
    provider: string;
    target: string;
    expectedTarget?: string;
    effectivePrincipal: string;
    credentialsValid: boolean;
    credentialsExpired?: boolean;
    requiredActions: string[];
    grantedActions: string[];
    explicitDenyActions?: string[];
    permissionBoundaryBlockedActions?: string[];
    organizationPolicyBlockedActions?: string[];
    quotaExceeded?: boolean;
    packTrusted?: boolean;
    ownershipClass?: 'UGONDU_CREATED' | 'UGONDU_ADOPTED' | 'SHARED' | 'USER_OWNED' | 'EXTERNAL' | 'UNKNOWN';
    discoveryComplete?: boolean;
    planStale?: boolean;
    outcomeUnknown?: boolean;
  };
  planContext?: {
    planId: string;
    planHash: string;
  };
  approvalRecord?: {
    approvedBy: string;
    boundPlanHash: string;
    boundTarget: string;
    expiresAt: string;
    financialApproved?: boolean;
    fraudVerified?: boolean;
  };
  flags?: {
    yes?: boolean;
    nonInteractive?: boolean;
    force?: boolean;
    dryRun?: boolean;
  };
}

/**
 * Evaluates the 4-Dimensional Authorization Model identically across all interaction surfaces
 * (AGENT_TOOL, CLI, API_SDK, DESKTOP_UI, MANUAL_WORKFLOW).
 *
 * INVARIANTS:
 * - Never trusts a caller-supplied identity claim that mismatches the authenticated session.
 * - `--yes`, `--non-interactive`, and `--force` never bypass approval, ownership, or safety blockers.
 * - Reports PlatformAuthZ, ProviderAuthZ, ApprovalPolicy, and ProviderConstraints separately.
 */
export function evaluateFourDimensionalAuthorization(
  input: UniversalAuthorizationInput
): FourDimensionalAuthZReport {
  const descriptor = canonicalCapabilityRegistry.describe(input.capabilityId);
  if (!descriptor) {
    const err = createCanonicalError({
      code: 'CAPABILITY_UNSUPPORTED',
      stage: 'AUTHORIZATION',
      operationId: input.operationId,
      provider: input.providerContext.provider,
      target: input.providerContext.target,
      effectivePrincipal: input.providerContext.effectivePrincipal,
      remediation: `Use a registered canonical capability ID from 'ugondu capability list'.`,
      correlationId: input.correlationId,
      message: `Capability '${input.capabilityId}' is not registered.`,
    });
    return buildBlockedReport(input, undefined, err);
  }

  // Check provider/surface support
  const surfaceSupported = descriptor.supportedSurfaces.includes(input.surface);
  const providerSupported = descriptor.supportedProviders.includes(input.providerContext.provider);

  // 1. Platform Authorization
  const identityMismatch =
    (input.authenticatedCaller.claimedSubjectId !== undefined &&
      input.authenticatedCaller.claimedSubjectId !== input.authenticatedCaller.subjectId) ||
    (input.authenticatedCaller.claimedTenantId !== undefined &&
      input.authenticatedCaller.claimedTenantId !== input.authenticatedCaller.tenantId);

  const missingScopes = descriptor.authZScopes.filter(
    (s) => !input.authenticatedCaller.grantedScopes.includes(s)
  );
  const editionEntitled = meetsEditionRequirement(
    input.authenticatedCaller.edition,
    descriptor.minimumEdition
  );

  let platformError: CanonicalErrorCode | undefined;
  let platformReason = 'Caller has required Ugondu platform scopes and edition entitlement.';
  if (identityMismatch) {
    platformError = 'IDENTITY_MISMATCH';
    platformReason = 'Caller-supplied identity or tenant claim mismatches authenticated session identity.';
  } else if (!surfaceSupported || !providerSupported) {
    platformError = 'CAPABILITY_UNSUPPORTED';
    platformReason = !providerSupported
      ? `Provider '${input.providerContext.provider}' does not support capability '${input.capabilityId}'.`
      : `Surface '${input.surface}' does not support capability '${input.capabilityId}'.`;
  } else if (missingScopes.length > 0 || !editionEntitled) {
    platformError = 'PLATFORM_ACCESS_DENIED';
    platformReason = !editionEntitled
      ? `Edition '${input.authenticatedCaller.edition}' does not meet minimum edition '${descriptor.minimumEdition}'.`
      : `Missing platform scopes: [${missingScopes.join(', ')}].`;
  }

  const platformAuthZ: PlatformAuthZDimension = {
    allowed: platformError === undefined,
    callerIdentity: input.authenticatedCaller.subjectId,
    tenantId: input.authenticatedCaller.tenantId,
    capabilityId: input.capabilityId,
    requiredScopes: descriptor.authZScopes,
    grantedScopes: input.authenticatedCaller.grantedScopes,
    editionEntitled,
    reason: platformReason,
    errorCode: platformError,
  };

  // 2. Provider Authorization
  const credsExpired = Boolean(input.providerContext.credentialsExpired);
  const credsValid = input.providerContext.credentialsValid && !credsExpired;
  const missingActions = input.providerContext.requiredActions.filter(
    (a) => !input.providerContext.grantedActions.includes(a)
  );

  let providerError: CanonicalErrorCode | undefined;
  let providerReason = 'Provider principal holds all required actions for the operation.';
  if (credsExpired) {
    providerError = 'CREDENTIALS_EXPIRED';
    providerReason = 'Provider credentials or session token have expired.';
  } else if (!credsValid) {
    providerError = 'CREDENTIALS_INVALID';
    providerReason = 'Provider credentials could not be verified by provider identity API.';
  } else if (missingActions.length > 0) {
    providerError = 'PROVIDER_ACCESS_DENIED';
    providerReason = `Effective principal '${input.providerContext.effectivePrincipal}' lacks provider actions: [${missingActions.join(', ')}].`;
  }

  const providerAuthZ: ProviderAuthZDimension = {
    allowed: providerError === undefined,
    effectivePrincipal: input.providerContext.effectivePrincipal,
    target: input.providerContext.target,
    requiredActions: input.providerContext.requiredActions,
    missingActions,
    credentialsValid: credsValid,
    credentialsExpired: credsExpired,
    reason: providerReason,
    errorCode: providerError,
  };

  // 3. Provider Constraints & Hard Safety Blockers
  const explicitDeny = (input.providerContext.explicitDenyActions?.length ?? 0) > 0;
  const permissionBoundaryBlocked =
    (input.providerContext.permissionBoundaryBlockedActions?.length ?? 0) > 0;
  const organizationPolicyBlocked =
    (input.providerContext.organizationPolicyBlockedActions?.length ?? 0) > 0;
  const quotaExceeded = Boolean(input.providerContext.quotaExceeded);
  const wrongTargetScope =
    input.providerContext.expectedTarget !== undefined &&
    input.providerContext.expectedTarget !== input.providerContext.target;
  const packTrusted = input.providerContext.packTrusted ?? true;
  const discoveryComplete = input.providerContext.discoveryComplete ?? true;
  const planFresh = !(input.providerContext.planStale ?? false);

  const isDestructive = descriptor.operationClassification === 'DESTRUCTIVE';
  const ownershipClass = input.providerContext.ownershipClass ?? 'UGONDU_CREATED';
  const ownershipVerified = isDestructive
    ? ownershipClass === 'UGONDU_CREATED'
    : ownershipClass !== 'UNKNOWN' || descriptor.operationClassification === 'READ';

  let constraintError: CanonicalErrorCode | undefined;
  let constraintReason = 'All provider constraints, boundaries, quotas, and ownership checks passed.';
  if (wrongTargetScope) {
    constraintError = 'IDENTITY_MISMATCH';
    constraintReason = `Target '${input.providerContext.target}' does not match expected target scope '${input.providerContext.expectedTarget}'.`;
  } else if (!packTrusted) {
    constraintError = 'PACK_UNTRUSTED';
    constraintReason = 'Policy pack provenance, hash, or signature verification failed.';
  } else if (explicitDeny) {
    constraintError = 'EXPLICIT_DENY';
    constraintReason = `Explicit IAM deny blocks actions: [${input.providerContext.explicitDenyActions!.join(', ')}].`;
  } else if (permissionBoundaryBlocked) {
    constraintError = 'PERMISSION_BOUNDARY_BLOCK';
    constraintReason = `Permissions boundary blocks actions: [${input.providerContext.permissionBoundaryBlockedActions!.join(', ')}].`;
  } else if (organizationPolicyBlocked) {
    constraintError = 'ORGANIZATION_POLICY_BLOCK';
    constraintReason = `Organization policy (SCP) blocks actions: [${input.providerContext.organizationPolicyBlockedActions!.join(', ')}].`;
  } else if (quotaExceeded) {
    constraintError = 'QUOTA_EXCEEDED';
    constraintReason = 'Provider managed-policy size, version, or attachment quota exceeded.';
  } else if (!discoveryComplete && descriptor.operationClassification !== 'READ') {
    constraintError = 'DISCOVERY_INCOMPLETE';
    constraintReason = 'Required discovery is incomplete; mutation is blocked.';
  } else if (!planFresh && descriptor.operationClassification !== 'READ') {
    constraintError = 'PLAN_STALE';
    constraintReason = 'Plan is stale or target state changed since planning.';
  } else if (!ownershipVerified) {
    constraintError = 'OWNERSHIP_UNKNOWN';
    constraintReason = `Resource ownership class '${ownershipClass}' blocks destructive or unverified mutation.`;
  } else if (input.providerContext.outcomeUnknown) {
    constraintError = 'OPERATION_OUTCOME_UNKNOWN';
    constraintReason = 'Prior mutation outcome is ambiguous; provider state must be re-inspected before retry.';
  }

  const providerConstraints: ProviderConstraintsDimension = {
    allowed: constraintError === undefined,
    explicitDeny,
    permissionBoundaryBlocked,
    organizationPolicyBlocked,
    quotaExceeded,
    wrongTargetScope,
    packTrusted,
    ownershipVerified,
    discoveryComplete,
    planFresh,
    reason: constraintReason,
    errorCode: constraintError,
  };

  // 4. Approval Policy (Note: --yes, --non-interactive, and --force NEVER bypass required approval)
  const requiresApproval = descriptor.approvalRequirements.requiresApproval && !input.flags?.dryRun;
  let approvalSatisfied = !requiresApproval;
  let approvalReason = requiresApproval
    ? 'Awaiting hash-bound approval for mutating/destructive operation.'
    : 'No approval required for read-only operation.';
  let approvalError: CanonicalErrorCode | undefined;

  if (requiresApproval) {
    const rec = input.approvalRecord;
    const now = Date.now();
    const expired = rec ? new Date(rec.expiresAt).getTime() <= now : true;
    const hashMatches = rec && input.planContext ? rec.boundPlanHash === input.planContext.planHash : false;
    const targetMatches = rec ? rec.boundTarget === input.providerContext.target : false;
    const financialOk = descriptor.approvalRequirements.financialControlsRequired
      ? Boolean(rec?.financialApproved)
      : true;
    const fraudOk = descriptor.approvalRequirements.fraudControlsRequired
      ? Boolean(rec?.fraudVerified)
      : true;

    if (!rec) {
      approvalSatisfied = false;
      approvalError = 'APPROVAL_REQUIRED';
      approvalReason = input.flags?.nonInteractive
        ? 'Non-interactive mode cannot prompt; returning typed APPROVAL_REQUIRED blocker.'
        : input.flags?.yes
        ? '--yes flag cannot bypass privileged governance approval requirement.'
        : 'Explicit approval bound to planHash and target is required.';
    } else if (expired) {
      approvalSatisfied = false;
      approvalError = 'APPROVAL_REQUIRED';
      approvalReason = `Approval record from '${rec.approvedBy}' expired at ${rec.expiresAt}.`;
    } else if (!hashMatches) {
      approvalSatisfied = false;
      approvalError = 'PLAN_STALE';
      approvalReason = 'Approval record planHash does not match current planHash (plan was edited or superseded).';
    } else if (!targetMatches) {
      approvalSatisfied = false;
      approvalError = 'IDENTITY_MISMATCH';
      approvalReason = `Approval record boundTarget '${rec.boundTarget}' does not match target '${input.providerContext.target}'.`;
    } else if (!financialOk || !fraudOk) {
      approvalSatisfied = false;
      approvalError = 'APPROVAL_REQUIRED';
      approvalReason = 'Required financial and fraud control approvals are not satisfied.';
    } else {
      approvalSatisfied = true;
      approvalReason = `Approved by '${rec.approvedBy}' bound to planHash '${rec.boundPlanHash}'.`;
    }
  }

  const approvalPolicy: ApprovalPolicyDimension = {
    required: requiresApproval,
    satisfied: approvalSatisfied,
    boundPlanHash: input.approvalRecord?.boundPlanHash,
    boundTarget: input.approvalRecord?.boundTarget,
    expiresAt: input.approvalRecord?.expiresAt,
    approvedBy: input.approvalRecord?.approvedBy,
    financialControlsVerified: input.approvalRecord?.financialApproved,
    fraudControlsVerified: input.approvalRecord?.fraudVerified,
    reason: approvalReason,
    errorCode: approvalError,
  };

  const allowed =
    platformAuthZ.allowed &&
    providerAuthZ.allowed &&
    providerConstraints.allowed &&
    approvalPolicy.satisfied;

  // Deterministic decision hash independent of surface!
  const canonicalDecisionPayload = JSON.stringify({
    capabilityId: input.capabilityId,
    caller: input.authenticatedCaller.subjectId,
    tenantId: input.authenticatedCaller.tenantId,
    edition: input.authenticatedCaller.edition,
    target: input.providerContext.target,
    effectivePrincipal: input.providerContext.effectivePrincipal,
    planHash: input.planContext?.planHash ?? null,
    allowed,
    platformAllowed: platformAuthZ.allowed,
    providerAllowed: providerAuthZ.allowed,
    constraintsAllowed: providerConstraints.allowed,
    approvalSatisfied: approvalPolicy.satisfied,
  });
  const decisionHash = createHash('sha256').update(canonicalDecisionPayload).digest('hex');

  let primaryError: CanonicalCapabilityError | undefined;
  const firstErrorCode =
    platformAuthZ.errorCode ??
    providerConstraints.errorCode ??
    providerAuthZ.errorCode ??
    approvalPolicy.errorCode;

  if (!allowed && firstErrorCode) {
    const primaryReason =
      !platformAuthZ.allowed
        ? platformAuthZ.reason
        : !providerConstraints.allowed
        ? providerConstraints.reason
        : !providerAuthZ.allowed
        ? providerAuthZ.reason
        : approvalPolicy.reason;

    primaryError = createCanonicalError({
      code: firstErrorCode,
      stage: 'AUTHORIZATION',
      operationId: input.operationId,
      provider: input.providerContext.provider,
      target: input.providerContext.target,
      effectivePrincipal: input.providerContext.effectivePrincipal,
      requiredAction: providerAuthZ.missingActions[0],
      approvalRequirement: requiresApproval
        ? {
            required: true,
            planHash: input.planContext?.planHash,
            target: input.providerContext.target,
            reason: approvalPolicy.reason,
          }
        : undefined,
      remediation: buildRemediationForErrorCode(firstErrorCode, input),
      correlationId: input.correlationId,
      message: primaryReason,
    });
  }

  return redactSensitiveObject({
    allowed,
    capabilityId: input.capabilityId,
    surface: input.surface,
    decisionHash,
    platformAuthZ,
    providerAuthZ,
    approvalPolicy,
    providerConstraints,
    primaryError,
  });
}

function buildRemediationForErrorCode(
  code: CanonicalErrorCode,
  input: UniversalAuthorizationInput
): string {
  switch (code) {
    case 'CREDENTIALS_INVALID':
    case 'CREDENTIALS_EXPIRED':
      return `Refresh short-lived credentials for target '${input.providerContext.target}' and re-run 'ugondu identity inspect'.`;
    case 'IDENTITY_MISMATCH':
      return `Ensure authenticated caller and target scope match the configured account/tenant/role '${input.providerContext.expectedTarget ?? input.providerContext.target}'.`;
    case 'PROVIDER_ACCESS_DENIED':
      return `Run 'ugondu policy bootstrap plan --target ${input.providerContext.target}' to generate a least-privilege authority-gap plan without self-escalation.`;
    case 'PLATFORM_ACCESS_DENIED':
      return `Grant required platform scopes or upgrade edition to invoke '${input.capabilityId}'.`;
    case 'EXPLICIT_DENY':
      return `Inspect explicit Deny statements on '${input.providerContext.effectivePrincipal}' before attempting mutation.`;
    case 'PERMISSION_BOUNDARY_BLOCK':
      return `Inspect the IAM permissions boundary attached to '${input.providerContext.effectivePrincipal}'.`;
    case 'ORGANIZATION_POLICY_BLOCK':
      return `Inspect AWS Organizations SCPs or tenant organization policies governing '${input.providerContext.target}'.`;
    case 'CAPABILITY_UNSUPPORTED':
      return `Check 'ugondu capability matrix' for supported providers and interaction surfaces.`;
    case 'DISCOVERY_INCOMPLETE':
      return `Ensure read permissions and complete pagination succeed before planning mutations.`;
    case 'PLAN_STALE':
      return `Re-run 'ugondu policy plan' to compute a fresh planHash and request a new approval bound to the updated hash.`;
    case 'APPROVAL_REQUIRED':
      return `Obtain an authorized approval bound to planHash '${input.planContext?.planHash ?? 'N/A'}' and target '${input.providerContext.target}', then resume the operation.`;
    case 'PACK_UNTRUSTED':
      return `Verify pack.yaml SHA-256 digests and Ed25519 release signature before applying.`;
    case 'OWNERSHIP_UNKNOWN':
      return `Verify resource provenance in the Ugondu ownership ledger; unknown, adopted, shared, or external objects cannot be deleted.`;
    case 'QUOTA_EXCEEDED':
      return `Check managed policy size (<=6144 chars) and role managed-policy attachment quota before applying.`;
    case 'OPERATION_OUTCOME_UNKNOWN':
      return `Do not blindly retry. Run 'ugondu policy inspect --target ${input.providerContext.target}' to reconcile observed provider state first.`;
    case 'VERIFICATION_FAILED':
      return `Inspect postcondition check failures and run compensation or manual review.`;
  }
}

function buildBlockedReport(
  input: UniversalAuthorizationInput,
  _descriptor: undefined,
  err: CanonicalCapabilityError
): FourDimensionalAuthZReport {
  const decisionHash = createHash('sha256')
    .update(JSON.stringify({ capabilityId: input.capabilityId, allowed: false, code: err.code }))
    .digest('hex');

  return {
    allowed: false,
    capabilityId: input.capabilityId,
    surface: input.surface,
    decisionHash,
    platformAuthZ: {
      allowed: false,
      callerIdentity: input.authenticatedCaller.subjectId,
      tenantId: input.authenticatedCaller.tenantId,
      capabilityId: input.capabilityId,
      requiredScopes: [],
      grantedScopes: input.authenticatedCaller.grantedScopes,
      editionEntitled: false,
      reason: err.message,
      errorCode: err.code,
    },
    providerAuthZ: {
      allowed: false,
      effectivePrincipal: input.providerContext.effectivePrincipal,
      target: input.providerContext.target,
      requiredActions: input.providerContext.requiredActions,
      missingActions: input.providerContext.requiredActions,
      credentialsValid: input.providerContext.credentialsValid,
      credentialsExpired: Boolean(input.providerContext.credentialsExpired),
      reason: err.message,
      errorCode: err.code,
    },
    approvalPolicy: {
      required: true,
      satisfied: false,
      reason: err.message,
      errorCode: err.code,
    },
    providerConstraints: {
      allowed: false,
      explicitDeny: false,
      permissionBoundaryBlocked: false,
      organizationPolicyBlocked: false,
      quotaExceeded: false,
      wrongTargetScope: false,
      packTrusted: false,
      ownershipVerified: false,
      discoveryComplete: false,
      planFresh: false,
      reason: err.message,
      errorCode: err.code,
    },
    primaryError: err,
  };
}
