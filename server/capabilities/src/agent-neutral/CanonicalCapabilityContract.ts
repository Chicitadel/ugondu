/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Canonical Agent-Neutral Capability Contract
 * File           : CanonicalCapabilityContract.ts
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

export type UplmRiskClass = 'R0' | 'R1' | 'R2' | 'R3' | 'R4';

export type OperationClassification = 'READ' | 'WRITE' | 'DESTRUCTIVE';

export type InteractionSurface =
  | 'AGENT_TOOL'
  | 'CLI'
  | 'API_SDK'
  | 'DESKTOP_UI'
  | 'MANUAL_WORKFLOW';

export const INTERACTION_SURFACES: readonly InteractionSurface[] = [
  'AGENT_TOOL',
  'CLI',
  'API_SDK',
  'DESKTOP_UI',
  'MANUAL_WORKFLOW',
] as const;

export type CapabilityBoundedContext = 'UPLM' | 'GROWTH_MARKETING';

/**
 * 17 Canonical Error Codes across all interaction surfaces and providers.
 */
export const UPLM_ERROR_CODES = [
  'CREDENTIALS_INVALID',
  'CREDENTIALS_EXPIRED',
  'IDENTITY_MISMATCH',
  'PROVIDER_ACCESS_DENIED',
  'PLATFORM_ACCESS_DENIED',
  'EXPLICIT_DENY',
  'PERMISSION_BOUNDARY_BLOCK',
  'ORGANIZATION_POLICY_BLOCK',
  'CAPABILITY_UNSUPPORTED',
  'DISCOVERY_INCOMPLETE',
  'PLAN_STALE',
  'APPROVAL_REQUIRED',
  'PACK_UNTRUSTED',
  'OWNERSHIP_UNKNOWN',
  'QUOTA_EXCEEDED',
  'OPERATION_OUTCOME_UNKNOWN',
  'VERIFICATION_FAILED',
] as const;

export type CanonicalErrorCode = typeof UPLM_ERROR_CODES[number];

/**
 * Stable CLI exit codes per UPLM Expert CLI and Graphical Control Specification §7.
 */
export const CLI_EXIT_CODES = {
  COMPLETED_AND_VERIFIED: 0,
  INVALID_INPUT: 2,
  CREDENTIALS_INVALID_OR_EXPIRED: 3,
  ACCESS_DENIED: 4,
  APPROVAL_REQUIRED: 5,
  CAPABILITY_UNSUPPORTED: 6,
  VALIDATION_OR_PRECONDITION_FAILED: 7,
  OPERATION_FAILED: 8,
  OUTCOME_UNKNOWN_REINSPECT: 9,
  COMPLETED_WITH_WARNINGS: 10,
} as const;

export type CliExitCode = typeof CLI_EXIT_CODES[keyof typeof CLI_EXIT_CODES];

export function mapErrorCodeToExitCode(code: CanonicalErrorCode): CliExitCode {
  switch (code) {
    case 'CREDENTIALS_INVALID':
    case 'CREDENTIALS_EXPIRED':
      return CLI_EXIT_CODES.CREDENTIALS_INVALID_OR_EXPIRED;
    case 'IDENTITY_MISMATCH':
    case 'PROVIDER_ACCESS_DENIED':
    case 'PLATFORM_ACCESS_DENIED':
    case 'EXPLICIT_DENY':
    case 'PERMISSION_BOUNDARY_BLOCK':
    case 'ORGANIZATION_POLICY_BLOCK':
      return CLI_EXIT_CODES.ACCESS_DENIED;
    case 'APPROVAL_REQUIRED':
      return CLI_EXIT_CODES.APPROVAL_REQUIRED;
    case 'CAPABILITY_UNSUPPORTED':
      return CLI_EXIT_CODES.CAPABILITY_UNSUPPORTED;
    case 'PLAN_STALE':
    case 'PACK_UNTRUSTED':
    case 'OWNERSHIP_UNKNOWN':
    case 'QUOTA_EXCEEDED':
      return CLI_EXIT_CODES.VALIDATION_OR_PRECONDITION_FAILED;
    case 'OPERATION_OUTCOME_UNKNOWN':
      return CLI_EXIT_CODES.OUTCOME_UNKNOWN_REINSPECT;
    case 'DISCOVERY_INCOMPLETE':
      return CLI_EXIT_CODES.COMPLETED_WITH_WARNINGS;
    case 'VERIFICATION_FAILED':
    default:
      return CLI_EXIT_CODES.OPERATION_FAILED;
  }
}

export interface CanonicalCapabilityError {
  code: CanonicalErrorCode;
  stage: string;
  operationId: string;
  provider: string;
  target: string;
  effectivePrincipal: string;
  requiredAction?: string;
  mutationUncertainty: boolean;
  retryable: boolean;
  remediation: string;
  approvalRequirement?: {
    required: boolean;
    planHash?: string;
    target?: string;
    reason?: string;
  };
  correlationId: string;
  providerRequestId?: string;
  exitCode: CliExitCode;
  message: string;
}

const SECRET_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/g,
  /ASIA[0-9A-Z]{16}/g,
  /(aws_secret_access_key|secretAccessKey|sessionToken|privateKey|bearer|password|apiKey|client_secret)\s*[:=]\s*["']?[^\s"',}]+["']?/gi,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
];

/**
 * Redacts credentials, session tokens, private keys, and secret environment variables.
 */
export function redactSensitiveText(input: string): string {
  let out = input;
  for (const pattern of SECRET_PATTERNS) {
    out = out.replace(pattern, (match) => {
      const sepIdx = match.search(/[:=]/);
      if (sepIdx !== -1 && !match.startsWith('AKIA') && !match.startsWith('ASIA') && !match.startsWith('-----')) {
        return `${match.slice(0, sepIdx + 1)}[REDACTED]`;
      }
      return '[REDACTED]';
    });
  }
  return out;
}

export function redactSensitiveObject<T>(value: T): T {
  if (typeof value === 'string') {
    return redactSensitiveText(value) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveObject(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|token|password|privatekey|accesskey|credential|authorization/i.test(k)) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = redactSensitiveObject(v);
      }
    }
    return out as T;
  }
  return value;
}

export function createCanonicalError(params: {
  code: CanonicalErrorCode;
  stage: string;
  operationId: string;
  provider: string;
  target: string;
  effectivePrincipal: string;
  requiredAction?: string;
  mutationUncertainty?: boolean;
  retryable?: boolean;
  remediation: string;
  approvalRequirement?: {
    required: boolean;
    planHash?: string;
    target?: string;
    reason?: string;
  };
  correlationId: string;
  providerRequestId?: string;
  message: string;
}): CanonicalCapabilityError {
  return {
    code: params.code,
    stage: params.stage,
    operationId: params.operationId,
    provider: params.provider,
    target: params.target,
    effectivePrincipal: redactSensitiveText(params.effectivePrincipal),
    requiredAction: params.requiredAction,
    mutationUncertainty:
      params.mutationUncertainty ?? params.code === 'OPERATION_OUTCOME_UNKNOWN',
    retryable:
      params.retryable ??
      (params.code !== 'OPERATION_OUTCOME_UNKNOWN' &&
        params.code !== 'EXPLICIT_DENY' &&
        params.code !== 'PACK_UNTRUSTED' &&
        params.code !== 'OWNERSHIP_UNKNOWN'),
    remediation: redactSensitiveText(params.remediation),
    approvalRequirement: params.approvalRequirement,
    correlationId: params.correlationId,
    providerRequestId: params.providerRequestId
      ? redactSensitiveText(params.providerRequestId)
      : undefined,
    exitCode: mapErrorCodeToExitCode(params.code),
    message: redactSensitiveText(params.message),
  };
}

/**
 * 11 Canonical UPLM Capability Identifiers.
 */
export const UPLM_CAPABILITY_IDS = [
  'policy.inspect',
  'policy.plan',
  'policy.bootstrap.plan',
  'policy.bootstrap.apply',
  'policy.install',
  'policy.repair',
  'policy.migrate',
  'policy.retire.plan',
  'policy.retire.apply',
  'policy.verify',
  'policy.evidence.export',
] as const;

export type UplmCapabilityId = typeof UPLM_CAPABILITY_IDS[number];

/**
 * Independent Growth Marketing Capability Identifiers.
 */
export const GROWTH_MARKETING_CAPABILITY_IDS = [
  'growth.campaign.plan',
  'growth.referral.verify',
  'growth.reward.audit',
] as const;

export type GrowthMarketingCapabilityId = typeof GROWTH_MARKETING_CAPABILITY_IDS[number];

export type CanonicalCapabilityId = UplmCapabilityId | GrowthMarketingCapabilityId;

export interface CapabilityFieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description: string;
}

export interface CanonicalCapabilityDescriptor {
  id: CanonicalCapabilityId;
  version: string;
  boundedContext: CapabilityBoundedContext;
  minimumEdition: UgonduEdition;
  purpose: string;
  description: string;
  inputSchema: Record<string, CapabilityFieldSchema>;
  outputSchema: Record<string, CapabilityFieldSchema>;
  authZScopes: string[];
  operationClassification: OperationClassification;
  riskClass: UplmRiskClass;
  supportedProviders: string[];
  adapterCapabilityRequirements: string[];
  supportedSurfaces: InteractionSurface[];
  approvalRequirements: {
    requiresApproval: boolean;
    bindToPlanHash: boolean;
    bindToTarget: boolean;
    bindToExpiry: boolean;
    hardSafetyBlockers: string[];
    financialControlsRequired?: boolean;
    fraudControlsRequired?: boolean;
  };
  idempotency: {
    idempotent: boolean;
    resumable: boolean;
    keyDerivationFields: string[];
  };
  auditRequirements: {
    auditRequired: boolean;
    evidenceRequired: boolean;
    redactSecrets: boolean;
  };
  timeoutMs: number;
  retryPolicy: {
    maxAttempts: number;
    backoffMs: number;
    reInspectBeforeRetryOnAmbiguousOutcome: boolean;
  };
  examples: {
    agent: Record<string, unknown>;
    cli: string;
    api: string;
  };
  compatibilityPolicy: {
    sinceVersion: string;
    deprecated: boolean;
    backwardCompatibleWith: string[];
  };
}

const STANDARD_HARD_SAFETY_BLOCKERS = [
  'WRONG_ACCOUNT_TENANT_PROJECT',
  'UNTRUSTED_PACK',
  'UNKNOWN_OWNERSHIP',
  'UNEXPECTED_TRUST_PRINCIPAL',
  'UNSUPPORTED_CAPABILITY',
  'INVALID_DOCUMENT_OR_QUOTA_EXCEEDED',
  'INCOMPLETE_REQUIRED_DISCOVERY',
  'UNRESOLVED_EXTERNAL_DEPENDENCY',
  'FAILED_NEGATIVE_AUTHORIZATION_TEST',
  'STALE_PLAN_OR_VIOLATED_INVARIANT',
];

export const CANONICAL_CAPABILITY_DESCRIPTORS: Record<
  CanonicalCapabilityId,
  CanonicalCapabilityDescriptor
> = {
  'policy.inspect': {
    id: 'policy.inspect',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'COMMUNITY',
    purpose: 'Read-only inspection of target identity, roles, policies, attachments, trust, boundaries, ownership, and drift.',
    description: 'Discovers observed provider authorization state without performing any mutations.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/account/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier (aws, azure, gcp, kubernetes, etc.)' },
      packId: { type: 'string', required: false, description: 'Optional policy pack ID for desired-vs-observed comparison' },
    },
    outputSchema: {
      observedState: { type: 'object', required: true, description: 'Normalized observed policy and role state' },
      discoveryComplete: { type: 'boolean', required: true, description: 'Whether pagination and required checks completed' },
      mutationsPerformed: { type: 'number', required: true, description: 'Always 0 for read-only inspection' },
    },
    authZScopes: ['uplm:policy:read', 'uplm:environment:inspect'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC', 'LINUX_ACL', 'CPANEL'],
    adapterCapabilityRequirements: ['discoverPolicies', 'discoverRoles', 'discoverAssignments'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: false,
      bindToTarget: true,
      bindToExpiry: false,
      hardSafetyBlockers: ['WRONG_ACCOUNT_TENANT_PROJECT'],
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'operationType'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 30000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 500,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'policy.inspect', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9' } },
      cli: 'ugondu policy inspect --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole --pack aws.cor.v9',
      api: 'POST /v1/capabilities/policy.inspect/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.plan': {
    id: 'policy.plan',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'COMMUNITY',
    purpose: 'Generate an immutable, hash-bound desired-state reconciliation plan without mutating the provider.',
    description: 'Computes exact create/update/attach/detach actions, blast radius, risk class, and required approvals.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/account/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack identifier' },
    },
    outputSchema: {
      planId: { type: 'string', required: true, description: 'Deterministic plan identifier' },
      planHash: { type: 'string', required: true, description: 'SHA-256 digest of normalized plan inputs and actions' },
      actions: { type: 'array', required: true, description: 'Ordered list of planned provider operations' },
    },
    authZScopes: ['uplm:policy:read', 'uplm:policy:plan'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC', 'LINUX_ACL', 'CPANEL'],
    adapterCapabilityRequirements: ['discoverPolicies', 'validate', 'reconcile'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'packVersion'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 30000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 500,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'policy.plan', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9' } },
      cli: 'ugondu policy plan --pack aws.cor.v9 --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      api: 'POST /v1/capabilities/policy.plan/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.bootstrap.plan': {
    id: 'policy.bootstrap.plan',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'COMMUNITY',
    purpose: 'Compute authority gaps and produce a least-privilege bootstrap plan for first-run or access recovery.',
    description: 'Read-only bootstrap inspection and planning across pre-authorized roles, delegated identities, or bounded consent.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/account/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack identifier' },
    },
    outputSchema: {
      bootstrapState: { type: 'string', required: true, description: 'Current bootstrap state (READY, MISSING_AUTHORITY, etc.)' },
      planId: { type: 'string', required: true, description: 'Bootstrap plan ID' },
      planHash: { type: 'string', required: true, description: 'Canonical SHA-256 plan hash' },
      authorityGaps: { type: 'array', required: true, description: 'Exact missing provider actions and scopes' },
    },
    authZScopes: ['uplm:bootstrap:plan', 'uplm:policy:read'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['discoverIdentities', 'discoverPolicies', 'validate'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'operationType'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 30000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 500,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'policy.bootstrap.plan', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9' } },
      cli: 'ugondu policy bootstrap plan --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole --pack aws.cor.v9',
      api: 'POST /v1/capabilities/policy.bootstrap.plan/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.bootstrap.apply': {
    id: 'policy.bootstrap.apply',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'PROFESSIONAL',
    purpose: 'Execute an approved, hash-bound bootstrap plan through an authorized bootstrap route and verify postconditions.',
    description: 'Applies scoped bootstrap changes, persists checkpoints in the durable journal, revokes temporary grants, and verifies effective state.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/account/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      planId: { type: 'string', required: true, description: 'Reviewed bootstrap plan ID' },
      planHash: { type: 'string', required: true, description: 'SHA-256 hash of the approved bootstrap plan' },
      approvalToken: { type: 'string', required: true, description: 'Approval record bound to planHash, target, and expiry' },
    },
    outputSchema: {
      operationId: { type: 'string', required: true, description: 'Durable operation identifier' },
      bootstrapState: { type: 'string', required: true, description: 'Post-apply bootstrap state' },
      terminalOutcome: { type: 'string', required: true, description: 'Verified terminal outcome' },
      evidenceRef: { type: 'string', required: true, description: 'Evidence bundle reference' },
    },
    authZScopes: ['uplm:bootstrap:apply', 'uplm:policy:write'],
    operationClassification: 'WRITE',
    riskClass: 'R2',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['validate', 'attach', 'discoverPolicies'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: true,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'planId', 'planHash'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 60000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 1000,
      reInspectBeforeRetryOnAmbiguousOutcome: true,
    },
    examples: {
      agent: { capability: 'policy.bootstrap.apply', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', planId: 'plan-001', planHash: 'sha256...', approvalToken: 'appr-001' } },
      cli: 'ugondu policy apply --plan plan-001',
      api: 'POST /v1/capabilities/policy.bootstrap.apply/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.install': {
    id: 'policy.install',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'PROFESSIONAL',
    purpose: 'Install a verified policy pack onto a target environment under a hash-bound approval.',
    description: 'Creates missing Ugondu-managed policies, attaches them to the validated target role, records ownership provenance, and verifies postconditions.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target role/principal identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack ID' },
      planId: { type: 'string', required: true, description: 'Validated installation plan ID' },
      planHash: { type: 'string', required: true, description: 'Expected plan SHA-256 hash' },
    },
    outputSchema: {
      operationId: { type: 'string', required: true, description: 'Durable operation ID' },
      terminalOutcome: { type: 'string', required: true, description: 'VERIFIED_INSTALLED or blocked/failure outcome' },
      evidenceRef: { type: 'string', required: true, description: 'Signed evidence bundle reference' },
    },
    authZScopes: ['uplm:policy:install', 'uplm:policy:write'],
    operationClassification: 'WRITE',
    riskClass: 'R2',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['generate', 'validate', 'attach', 'discoverPolicies'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: true,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'planHash'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 60000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 1000,
      reInspectBeforeRetryOnAmbiguousOutcome: true,
    },
    examples: {
      agent: { capability: 'policy.install', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9', planId: 'plan-install-01', planHash: 'sha256...' } },
      cli: 'ugondu policy install --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole --pack aws.cor.v9 --plan plan-install-01',
      api: 'POST /v1/capabilities/policy.install/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.repair': {
    id: 'policy.repair',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'PROFESSIONAL',
    purpose: 'Perform narrowly scoped, idempotent drift repair for verified Ugondu-owned policies and attachments.',
    description: 'Repairs missing attachments or drifted Ugondu-owned policy documents while blocking on unexpected trust principals or unknown ownership.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target role/principal identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack ID' },
      planId: { type: 'string', required: true, description: 'Validated repair plan ID' },
      planHash: { type: 'string', required: true, description: 'Expected plan SHA-256 hash' },
    },
    outputSchema: {
      operationId: { type: 'string', required: true, description: 'Durable operation ID' },
      terminalOutcome: { type: 'string', required: true, description: 'VERIFIED_REPAIRED or blocked/failure outcome' },
      repairedResources: { type: 'array', required: true, description: 'List of repaired policy/attachment resources' },
    },
    authZScopes: ['uplm:policy:repair', 'uplm:policy:write'],
    operationClassification: 'WRITE',
    riskClass: 'R2',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['discoverPolicies', 'validate', 'update', 'attach'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: true,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'planHash'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 60000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 1000,
      reInspectBeforeRetryOnAmbiguousOutcome: true,
    },
    examples: {
      agent: { capability: 'policy.repair', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9', planId: 'plan-repair-01', planHash: 'sha256...' } },
      cli: 'ugondu policy repair apply --plan plan-repair-01',
      api: 'POST /v1/capabilities/policy.repair/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.migrate': {
    id: 'policy.migrate',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'BUSINESS',
    purpose: 'Execute an 11-step additive-first policy pack migration across declared compatible pack versions.',
    description: 'Applies new policies first, verifies new configuration, migrates bindings, and removes superseded configuration only after verification.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      sourcePackId: { type: 'string', required: true, description: 'Source policy pack ID/version' },
      destinationPackId: { type: 'string', required: true, description: 'Destination policy pack ID/version' },
      planId: { type: 'string', required: true, description: 'Validated migration plan ID' },
      planHash: { type: 'string', required: true, description: 'Expected plan SHA-256 hash' },
    },
    outputSchema: {
      operationId: { type: 'string', required: true, description: 'Durable migration operation ID' },
      terminalOutcome: { type: 'string', required: true, description: 'VERIFIED_MIGRATED or compensation/manual review outcome' },
      preservedHashes: { type: 'array', required: true, description: 'Prior policy hashes retained for audit and rollback' },
    },
    authZScopes: ['uplm:policy:migrate', 'uplm:policy:write'],
    operationClassification: 'WRITE',
    riskClass: 'R3',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['discoverPolicies', 'validate', 'attach', 'detach', 'update', 'findDependencies'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: true,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'sourcePackId', 'destinationPackId', 'planHash'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 90000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 1000,
      reInspectBeforeRetryOnAmbiguousOutcome: true,
    },
    examples: {
      agent: { capability: 'policy.migrate', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', sourcePackId: 'aws.cor.v8', destinationPackId: 'aws.cor.v9', planId: 'plan-mig-01', planHash: 'sha256...' } },
      cli: 'ugondu policy replace plan --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole --old aws.cor.v8 --new-pack aws.cor.v9',
      api: 'POST /v1/capabilities/policy.migrate/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.retire.plan': {
    id: 'policy.retire.plan',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'COMMUNITY',
    purpose: 'Generate a read-only retirement/uninstall dry-run plan classifying ownership and external dependencies.',
    description: 'Classifies every resource into UGONDU_CREATED, UGONDU_ADOPTED, SHARED, USER_OWNED, EXTERNAL, or UNKNOWN and plans safe detachment/preservation.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack ID to plan retirement for' },
    },
    outputSchema: {
      planId: { type: 'string', required: true, description: 'Retirement plan ID' },
      planHash: { type: 'string', required: true, description: 'Canonical SHA-256 hash of the retirement plan' },
      eligibleForDeletion: { type: 'array', required: true, description: 'Verified UGONDU_CREATED unused policies eligible for deletion' },
      preservedResources: { type: 'array', required: true, description: 'Adopted, shared, user-owned, external, or unknown resources preserved with reasons' },
    },
    authZScopes: ['uplm:policy:retire:plan', 'uplm:policy:read'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['discoverPolicies', 'findDependencies'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'operationType'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 30000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 500,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'policy.retire.plan', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9' } },
      cli: 'ugondu policy retire plan --pack aws.cor.v9 --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      api: 'POST /v1/capabilities/policy.retire.plan/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.retire.apply': {
    id: 'policy.retire.apply',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'PROFESSIONAL',
    purpose: 'Execute an 11-step safe retirement/uninstall plan, preserving adopted, shared, user-owned, external, and unknown objects.',
    description: 'Detaches bindings from the declared target and deletes only verified UGONDU_CREATED unused objects. Blocks on unknown ownership or --force safety bypass attempts.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack ID' },
      planId: { type: 'string', required: true, description: 'Validated retirement plan ID' },
      planHash: { type: 'string', required: true, description: 'Approved retirement plan SHA-256 hash' },
      approvalToken: { type: 'string', required: true, description: 'Destructive operation approval token bound to planHash' },
    },
    outputSchema: {
      operationId: { type: 'string', required: true, description: 'Durable operation ID' },
      terminalOutcome: { type: 'string', required: true, description: 'VERIFIED_RETIRED or BLOCKED' },
      retainedObjects: { type: 'array', required: true, description: 'Retained objects with preservation rationale' },
      evidenceRef: { type: 'string', required: true, description: 'Signed retirement certificate and evidence reference' },
    },
    authZScopes: ['uplm:policy:retire:apply', 'uplm:policy:delete'],
    operationClassification: 'DESTRUCTIVE',
    riskClass: 'R4',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC'],
    adapterCapabilityRequirements: ['detach', 'retire', 'findDependencies', 'discoverPolicies'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: true,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: STANDARD_HARD_SAFETY_BLOCKERS,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'planHash'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 60000,
    retryPolicy: {
      maxAttempts: 2,
      backoffMs: 1000,
      reInspectBeforeRetryOnAmbiguousOutcome: true,
    },
    examples: {
      agent: { capability: 'policy.retire.apply', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9', planId: 'plan-retire-01', planHash: 'sha256...', approvalToken: 'appr-retire-01' } },
      cli: 'ugondu policy retire apply --plan plan-retire-01',
      api: 'POST /v1/capabilities/policy.retire.apply/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.verify': {
    id: 'policy.verify',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'COMMUNITY',
    purpose: 'Independently verify provider postconditions, document hashes, attachments, trust relationships, and isolation gates.',
    description: 'Re-reads provider state to confirm that policy existence, attachment, trust, and negative isolation checks pass.',
    inputSchema: {
      target: { type: 'string', required: true, description: 'Target environment/role identifier' },
      provider: { type: 'string', required: true, description: 'Provider identifier' },
      packId: { type: 'string', required: true, description: 'Policy pack ID' },
      operationId: { type: 'string', required: false, description: 'Optional operation ID being verified' },
    },
    outputSchema: {
      verified: { type: 'boolean', required: true, description: 'True only when all required checks pass' },
      terminalOutcome: { type: 'string', required: true, description: 'VERIFIED_COMPLIANT or failure/blocked outcome' },
      checks: { type: 'array', required: true, description: 'Individual PASS / FAIL / UNVERIFIED / NOT_APPLICABLE checks' },
    },
    authZScopes: ['uplm:policy:verify', 'uplm:policy:read'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC', 'LINUX_ACL', 'CPANEL'],
    adapterCapabilityRequirements: ['discoverPolicies', 'discoverAssignments', 'validate'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: false,
      bindToTarget: true,
      bindToExpiry: false,
      hardSafetyBlockers: ['WRONG_ACCOUNT_TENANT_PROJECT', 'INCOMPLETE_REQUIRED_DISCOVERY'],
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'target', 'packId', 'operationId'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 30000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 500,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'policy.verify', input: { provider: 'AWS_IAM', target: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole', packId: 'aws.cor.v9' } },
      cli: 'ugondu policy verify --target arn:aws:iam::971671216490:role/UgonduCORExecutionRole --pack aws.cor.v9',
      api: 'POST /v1/capabilities/policy.verify/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'policy.evidence.export': {
    id: 'policy.evidence.export',
    version: '1.0.0',
    boundedContext: 'UPLM',
    minimumEdition: 'COMMUNITY',
    purpose: 'Export a redacted, integrity-hashed audit and assurance evidence bundle for an inspection or lifecycle operation.',
    description: 'Produces machine-verifiable evidence recording identity, target, pack hash, pre/post document hashes, verification checks, and unresolved items with full secret redaction.',
    inputSchema: {
      operationId: { type: 'string', required: true, description: 'Operation ID to export evidence for' },
      format: { type: 'string', required: false, description: 'Output format (json | yaml)' },
    },
    outputSchema: {
      evidenceId: { type: 'string', required: true, description: 'Evidence bundle identifier' },
      digestSha256: { type: 'string', required: true, description: 'SHA-256 digest of the canonical evidence bundle' },
      bundle: { type: 'object', required: true, description: 'Redacted evidence payload' },
    },
    authZScopes: ['uplm:evidence:export', 'uplm:policy:read'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC', 'LINUX_ACL', 'CPANEL'],
    adapterCapabilityRequirements: ['discoverPolicies'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: false,
      bindToTarget: false,
      bindToExpiry: false,
      hardSafetyBlockers: [],
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'operationId'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 15000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 250,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'policy.evidence.export', input: { operationId: 'op-001', format: 'json' } },
      cli: 'ugondu evidence export --operation op-001 --output evidence.json',
      api: 'GET /v1/capabilities/policy.evidence.export/op-001',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'growth.campaign.plan': {
    id: 'growth.campaign.plan',
    version: '1.0.0',
    boundedContext: 'GROWTH_MARKETING',
    minimumEdition: 'BUSINESS',
    purpose: 'Plan a tenant-isolated growth marketing campaign independently of UPLM and deployment execution.',
    description: 'Generates a deterministic growth campaign plan with audience segmentation, budget bounds, and compliance checks.',
    inputSchema: {
      tenantId: { type: 'string', required: true, description: 'Tenant identifier' },
      campaignName: { type: 'string', required: true, description: 'Campaign name' },
      budgetCapMinorUnits: { type: 'number', required: true, description: 'Maximum campaign budget in minor currency units' },
    },
    outputSchema: {
      campaignPlanId: { type: 'string', required: true, description: 'Generated campaign plan ID' },
      planHash: { type: 'string', required: true, description: 'SHA-256 digest of campaign plan' },
    },
    authZScopes: ['growth:campaign:plan', 'growth:marketing:read'],
    operationClassification: 'READ',
    riskClass: 'R0',
    supportedProviders: ['UGONDU_GROWTH_ENGINE'],
    adapterCapabilityRequirements: ['campaignPlanning'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: ['WRONG_ACCOUNT_TENANT_PROJECT'],
      financialControlsRequired: true,
      fraudControlsRequired: true,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'campaignName', 'budgetCapMinorUnits'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 15000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 250,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'growth.campaign.plan', input: { tenantId: 'tenant-1', campaignName: 'Q4-Enterprise', budgetCapMinorUnits: 500000 } },
      cli: 'ugondu growth campaign plan --name Q4-Enterprise --budget 500000',
      api: 'POST /v1/capabilities/growth.campaign.plan/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'growth.referral.verify': {
    id: 'growth.referral.verify',
    version: '1.0.0',
    boundedContext: 'GROWTH_MARKETING',
    minimumEdition: 'BUSINESS',
    purpose: 'Verify referral attribution and anti-fraud signals within the Growth Marketing bounded context.',
    description: 'Evaluates referral eligibility, tenant isolation, self-referral blocks, and velocity checks without touching deployment or IAM systems.',
    inputSchema: {
      tenantId: { type: 'string', required: true, description: 'Tenant identifier' },
      referralCode: { type: 'string', required: true, description: 'Referral tracking code' },
      referredSubjectId: { type: 'string', required: true, description: 'Referred account subject ID' },
    },
    outputSchema: {
      verified: { type: 'boolean', required: true, description: 'Whether referral passed fraud and attribution verification' },
      fraudCheckStatus: { type: 'string', required: true, description: 'PASS or REJECTED_FRAUD_SIGNAL' },
    },
    authZScopes: ['growth:referral:verify', 'growth:fraud:read'],
    operationClassification: 'READ',
    riskClass: 'R1',
    supportedProviders: ['UGONDU_GROWTH_ENGINE'],
    adapterCapabilityRequirements: ['referralVerification', 'fraudScreening'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: false,
      bindToPlanHash: false,
      bindToTarget: true,
      bindToExpiry: false,
      hardSafetyBlockers: ['WRONG_ACCOUNT_TENANT_PROJECT', 'SELF_REFERRAL_DETECTED'],
      financialControlsRequired: false,
      fraudControlsRequired: true,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'referralCode', 'referredSubjectId'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 15000,
    retryPolicy: {
      maxAttempts: 3,
      backoffMs: 250,
      reInspectBeforeRetryOnAmbiguousOutcome: false,
    },
    examples: {
      agent: { capability: 'growth.referral.verify', input: { tenantId: 'tenant-1', referralCode: 'REF-100', referredSubjectId: 'subj-200' } },
      cli: 'ugondu growth referral verify --code REF-100 --subject subj-200',
      api: 'POST /v1/capabilities/growth.referral.verify/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
  'growth.reward.audit': {
    id: 'growth.reward.audit',
    version: '1.0.0',
    boundedContext: 'GROWTH_MARKETING',
    minimumEdition: 'ENTERPRISE',
    purpose: 'Audit and authorize monetary or credit growth rewards under dedicated financial, fraud, and approval controls.',
    description: 'Enforces dual financial and fraud control verification before recording an auditable reward disbursement ledger entry.',
    inputSchema: {
      tenantId: { type: 'string', required: true, description: 'Tenant identifier' },
      rewardId: { type: 'string', required: true, description: 'Reward transaction ID' },
      amountMinorUnits: { type: 'number', required: true, description: 'Reward amount in minor units' },
      financialApprovalToken: { type: 'string', required: true, description: 'Dedicated financial approval token' },
    },
    outputSchema: {
      auditRecordId: { type: 'string', required: true, description: 'Immutable reward audit record ID' },
      approved: { type: 'boolean', required: true, description: 'Whether financial and fraud gates passed' },
      evidenceDigest: { type: 'string', required: true, description: 'SHA-256 digest of reward audit trail' },
    },
    authZScopes: ['growth:reward:audit', 'growth:finance:approve'],
    operationClassification: 'WRITE',
    riskClass: 'R2',
    supportedProviders: ['UGONDU_GROWTH_ENGINE'],
    adapterCapabilityRequirements: ['rewardAudit', 'financialControlGate', 'fraudScreening'],
    supportedSurfaces: [...INTERACTION_SURFACES],
    approvalRequirements: {
      requiresApproval: true,
      bindToPlanHash: true,
      bindToTarget: true,
      bindToExpiry: true,
      hardSafetyBlockers: ['WRONG_ACCOUNT_TENANT_PROJECT', 'MISSING_FINANCIAL_APPROVAL', 'FRAUD_SIGNAL_BLOCKED'],
      financialControlsRequired: true,
      fraudControlsRequired: true,
    },
    idempotency: {
      idempotent: true,
      resumable: true,
      keyDerivationFields: ['tenantId', 'rewardId', 'amountMinorUnits'],
    },
    auditRequirements: {
      auditRequired: true,
      evidenceRequired: true,
      redactSecrets: true,
    },
    timeoutMs: 30000,
    retryPolicy: {
      maxAttempts: 2,
      backoffMs: 500,
      reInspectBeforeRetryOnAmbiguousOutcome: true,
    },
    examples: {
      agent: { capability: 'growth.reward.audit', input: { tenantId: 'tenant-1', rewardId: 'rew-01', amountMinorUnits: 10000, financialApprovalToken: 'fin-appr-01' } },
      cli: 'ugondu growth reward audit --reward rew-01 --amount 10000',
      api: 'POST /v1/capabilities/growth.reward.audit/invoke',
    },
    compatibilityPolicy: {
      sinceVersion: '1.0.0',
      deprecated: false,
      backwardCompatibleWith: ['1.0.0'],
    },
  },
};

export interface SurfaceCompatibilityEntry {
  capabilityId: CanonicalCapabilityId;
  boundedContext: CapabilityBoundedContext;
  surface: InteractionSurface;
  provider: string;
  supported: boolean;
  disclosureReason?: string;
}

/**
 * CanonicalCapabilityRegistry — single source of truth for agent-neutral capability discovery,
 * schema retrieval, compatibility matrices, and bounded-context isolation between UPLM and Growth Marketing.
 */
export class CanonicalCapabilityRegistry {
  private readonly descriptors = new Map<CanonicalCapabilityId, CanonicalCapabilityDescriptor>();

  constructor(
    initialDescriptors: Record<CanonicalCapabilityId, CanonicalCapabilityDescriptor> = CANONICAL_CAPABILITY_DESCRIPTORS
  ) {
    for (const desc of Object.values(initialDescriptors)) {
      this.descriptors.set(desc.id, desc);
    }
  }

  list(filter?: { boundedContext?: CapabilityBoundedContext; surface?: InteractionSurface }): CanonicalCapabilityDescriptor[] {
    let all = Array.from(this.descriptors.values());
    if (filter?.boundedContext) {
      all = all.filter((d) => d.boundedContext === filter.boundedContext);
    }
    if (filter?.surface) {
      all = all.filter((d) => d.supportedSurfaces.includes(filter.surface!));
    }
    return all;
  }

  describe(capabilityId: string): CanonicalCapabilityDescriptor | undefined {
    return this.descriptors.get(capabilityId as CanonicalCapabilityId);
  }

  getCompatibilityMatrix(provider: string, surface: InteractionSurface): SurfaceCompatibilityEntry[] {
    return Array.from(this.descriptors.values()).map((desc) => {
      const surfaceSupported = desc.supportedSurfaces.includes(surface);
      const providerSupported = desc.supportedProviders.includes(provider);
      const supported = surfaceSupported && providerSupported;
      return {
        capabilityId: desc.id,
        boundedContext: desc.boundedContext,
        surface,
        provider,
        supported,
        disclosureReason: supported
          ? undefined
          : !providerSupported
          ? `Provider '${provider}' is not supported for capability '${desc.id}'. Supported providers: [${desc.supportedProviders.join(', ')}].`
          : `Interaction surface '${surface}' is not supported for capability '${desc.id}'.`,
      };
    });
  }

  /**
   * Verifies that UPLM and Growth Marketing remain strictly independent bounded contexts
   * with zero runtime coupling while sharing the canonical contract format.
   */
  verifyBoundedContextIndependence(): {
    independent: boolean;
    uplmCount: number;
    growthCount: number;
    sharedProviderOverlap: string[];
    sharedScopeOverlap: string[];
  } {
    const uplm = this.list({ boundedContext: 'UPLM' });
    const growth = this.list({ boundedContext: 'GROWTH_MARKETING' });

    const uplmProviders = new Set(uplm.flatMap((d) => d.supportedProviders));
    const growthProviders = new Set(growth.flatMap((d) => d.supportedProviders));
    const sharedProviderOverlap = Array.from(uplmProviders).filter((p) => growthProviders.has(p));

    const uplmScopes = new Set(uplm.flatMap((d) => d.authZScopes));
    const growthScopes = new Set(growth.flatMap((d) => d.authZScopes));
    const sharedScopeOverlap = Array.from(uplmScopes).filter((s) => growthScopes.has(s));

    return {
      independent:
        uplm.length === 11 &&
        growth.length === 3 &&
        sharedProviderOverlap.length === 0 &&
        sharedScopeOverlap.length === 0,
      uplmCount: uplm.length,
      growthCount: growth.length,
      sharedProviderOverlap,
      sharedScopeOverlap,
    };
  }

  computeManifestDigest(): string {
    const canonical = JSON.stringify(this.list().map((d) => ({ id: d.id, version: d.version, riskClass: d.riskClass })));
    return createHash('sha256').update(canonical).digest('hex');
  }
}

export const canonicalCapabilityRegistry = new CanonicalCapabilityRegistry();
