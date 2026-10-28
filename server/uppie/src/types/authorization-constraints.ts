/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : authorization-constraints.ts
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

export type ProviderCapabilityStatus =
  | 'SUPPORTED'
  | 'SUPPORTED_WITH_LIMITS'
  | 'UNSUPPORTED'
  | 'NOT_OBSERVABLE'
  | 'UNKNOWN';

/**
 * @interface ProviderCapabilityValue
 * @description Corporate Governed interface implementation for ProviderCapabilityValue
 * @classification ENTERPRISE
 */
export interface ProviderCapabilityValue<T> {
  status: ProviderCapabilityStatus;
  value?: T;
  note?:  string;
}

/**
 * @interface AuthorizationConstraints
 * @description Corporate Governed interface implementation for AuthorizationConstraints
 * @classification ENTERPRISE
 */
export interface AuthorizationConstraints {
  maxPoliciesPerRole:       ProviderCapabilityValue<number>;
  maxRolesPerIdentity:      ProviderCapabilityValue<number>;
  maxAssignments:           ProviderCapabilityValue<number>;
  maxPolicySize:            ProviderCapabilityValue<number>;
  maxStatements:            ProviderCapabilityValue<number>;
  maxGroups:                ProviderCapabilityValue<number>;
  maxGroupMemberships:      ProviderCapabilityValue<number>;
  maxInheritanceDepth:      ProviderCapabilityValue<number>;
  maxBindings:              ProviderCapabilityValue<number>;
  maxServiceAccounts:       ProviderCapabilityValue<number>;
  maxRules:                 ProviderCapabilityValue<number>;
  maxACLEntries:            ProviderCapabilityValue<number>;
}

export function isApproachingLimit(
  constraint: ProviderCapabilityValue<number>,
  currentCount: number,
  threshold = 0.85
): boolean {
  if (constraint.status !== 'SUPPORTED' && constraint.status !== 'SUPPORTED_WITH_LIMITS') return false;
  if (constraint.value === undefined) return false;
  return currentCount / constraint.value >= threshold;
}
