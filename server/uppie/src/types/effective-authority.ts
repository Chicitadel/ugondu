/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : effective-authority.ts
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

export type EffectivePermissionState =
  | 'GRANTED'
  | 'DENIED'
  | 'CONDITIONALLY_GRANTED'
  | 'UNKNOWN'
  | 'NOT_OBSERVABLE'
  | 'NEEDS_SIMULATION';

export type SimulationConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNKNOWN';

/**
 * @interface EffectivePermission
 * @description Corporate Governed interface implementation for EffectivePermission
 * @classification ENTERPRISE
 */
export interface EffectivePermission {
  capability:    string;
  resource:      string;
  state:         EffectivePermissionState;
  confidence:    SimulationConfidence;
  sourcePolicies: string[];    // policy IDs contributing to this result
  denyPolicies:  string[];     // policy IDs explicitly denying
  conditions?:   string[];     // active conditions on the grant
  expiresAt?:    string;       // ISO-8601 if time-bound
}

/**
 * @interface EffectiveAuthorityResult
 * @description Corporate Governed interface implementation for EffectiveAuthorityResult
 * @classification ENTERPRISE
 */
export interface EffectiveAuthorityResult {
  actorId:      string;
  resourceId:   string;
  evaluatedAt:  string;       // ISO-8601
  permissions:  EffectivePermission[];
  evaluationMethod: 'PROVIDER_API' | 'POLICY_MODEL' | 'PARTIAL_MODEL' | 'UNKNOWN';
}

/**
 * @interface PermissionDiff
 * @description Corporate Governed interface implementation for PermissionDiff
 * @classification ENTERPRISE
 */
export interface PermissionDiff {
  required:   string[];    // capability IDs needed
  available:  string[];    // capability IDs already held with GRANTED state
  missing:    string[];    // required minus available
  proposed:   string[];    // capabilities to be granted
  unchanged:  string[];    // existing permissions unchanged by proposal
  removed:    string[];    // permissions to be revoked (for retirement diff)
}

export function computeDiff(
  required:  string[],
  available: string[]
): Pick<PermissionDiff, 'available' | 'missing'> {
  const availableSet = new Set(available);
  const missing = required.filter((c) => !availableSet.has(c));
  const matched = required.filter((c) => availableSet.has(c));
  return { available: matched, missing };
}
