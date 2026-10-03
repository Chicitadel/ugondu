/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : index.ts
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

export type { ManagementAuthority } from './management-authority';
export { MANAGEMENT_AUTHORITY_VALUES, isExternallyManaged, isSafeToModify } from './management-authority';

export type { UsageClassification } from './usage-classification';
export { isRetirementCandidate, requiresUsageAnalysisBeforeRetirement } from './usage-classification';

export type { ProvenanceSource, AuthorizationProvenance } from './policy-provenance';
export { isIaCManaged } from './policy-provenance';

export type {
  ProviderCapabilityStatus,
  ProviderCapabilityValue,
  AuthorizationConstraints,
} from './authorization-constraints';
export { isApproachingLimit } from './authorization-constraints';

export type {
  TemporaryAuthorizationStatus,
  ApprovalRecord,
  TemporaryAuthorization,
} from './temporary-authorization';
export { TemporaryAuthorizationSchema, isExpired, requiresRevocation } from './temporary-authorization';

export type {
  AuthorizationEffect,
  AuthorizationSubjectType,
  AuthorizationValidityType,
  AuthorizationSubject,
  AuthorizationAction,
  AuthorizationResource,
  AuthorizationCondition,
  AuthorizationScope,
  AuthorizationValidity,
  AuthorizationRuleConstraints,
  AuthorizationRule,
} from './authorization-rule';

export type {
  EffectivePermissionState,
  SimulationConfidence,
  EffectivePermission,
  EffectiveAuthorityResult,
  PermissionDiff,
} from './effective-authority';
export { computeDiff } from './effective-authority';

export type {
  AuthorityTopologyPattern,
  AuthorityActor,
  AuthorityRole,
  AuthorityPolicy,
  AuthorityEdge,
  PermissionBoundary,
  AuthorityGraph,
  AuthorityGraphSnapshot,
} from './authority-graph';

export type { PolicyRetirementCertificate } from './policy-retirement-certificate';
