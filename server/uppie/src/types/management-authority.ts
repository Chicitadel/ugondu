/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : management-authority.ts
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

export type ManagementAuthority =
  | 'UGONDU_MANAGED'
  | 'EXTERNALLY_MANAGED'
  | 'SHARED'
  | 'PROVIDER_DEFAULT'
  | 'UNKNOWN';

export const MANAGEMENT_AUTHORITY_VALUES = [
  'UGONDU_MANAGED',
  'EXTERNALLY_MANAGED',
  'SHARED',
  'PROVIDER_DEFAULT',
  'UNKNOWN',
] as const;

/**
 * INVARIANT: EXTERNALLY_MANAGED policies must NEVER be mutated or deleted by Ugondu.
 * Detected drift in EXTERNALLY_MANAGED policies triggers notification/escalation only.
 */
export function isExternallyManaged(authority: ManagementAuthority): boolean {
  return authority === 'EXTERNALLY_MANAGED';
}

export function isSafeToModify(authority: ManagementAuthority): boolean {
  return authority === 'UGONDU_MANAGED' || authority === 'PROVIDER_DEFAULT';
}
