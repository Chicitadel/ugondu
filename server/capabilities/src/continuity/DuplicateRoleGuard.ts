/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : DuplicateRoleGuard.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed / Security Reviewed / Architecture Controlled
 * - Protocol Frozen / Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export type RoleGuardStatus =
  | 'PERMITTED'
  | 'EXACT_MATCH_EXISTS'
  | 'NEAR_DUPLICATE_DETECTED'
  | 'CANONICAL_ALTERNATIVE_EXISTS'
  | 'INVALID_ROLE_NAME'
  | 'UNVERIFIED_PREFLIGHT_BLOCKED'
  | 'DISCOVERY_INCOMPLETE_FAIL_CLOSED';

export interface RoleValidationResult {
  allowed: boolean;
  status: RoleGuardStatus;
  targetRole: string;
  matchedExistingRole?: string;
  canonicalRole?: string;
  reason: string;
}

export interface PreflightProbeResult {
  success: boolean;
  discoveredRoles: string[];
  errorCode?: string;
  errorMessage?: string;
  isTruncated?: boolean;
  nextPaginationToken?: string;
  paginationComplete?: boolean;
  isPartial?: boolean;
  status?: string;
}

/**
 * Normalizes a role identifier by removing hyphens, underscores, dots, and lowercasing.
 */
export function normalizeRoleKey(roleName: string): string {
  return roleName.toLowerCase().replace(/[-_.]/g, '');
}

/**
 * Validates role creation intent to prevent duplicate roles, near-duplicates,
 * and divergence from approved canonical role definitions under authoritative discovery.
 */
export class DuplicateRoleGuard {
  private readonly canonicalRoles: Map<string, string>;

  constructor(canonicalRoleList: string[] = ['UgonduCORExecutionRole', 'UgonduCORRunner']) {
    this.canonicalRoles = new Map();
    for (const role of canonicalRoleList) {
      this.canonicalRoles.set(normalizeRoleKey(role), role);
    }
  }

  /**
   * Evaluates whether a role creation action is permitted given a preflight discovery probe.
   * If discovery result is partial or incomplete due to access denied, API error, or pagination truncation,
   * fails closed with DISCOVERY_INCOMPLETE_FAIL_CLOSED rather than treating as empty or complete.
   * If preflight completely fails without discovery attempted, returns UNVERIFIED_PREFLIGHT_BLOCKED.
   */
  public evaluateCreationWithPreflight(
    targetRole: string,
    preflight: PreflightProbeResult
  ): RoleValidationResult {
    const trimmed = (targetRole ?? '').trim();

    // 1. Pagination truncation detection
    const isPaginationTruncated =
      preflight.isTruncated === true ||
      preflight.paginationComplete === false ||
      Boolean(preflight.nextPaginationToken);

    // 2. Partial discovery detection (interrupted mid-enumeration or error with partial roles)
    const isPartialDiscovery =
      preflight.isPartial === true ||
      preflight.errorCode === 'DISCOVERY_INCOMPLETE' ||
      preflight.status === 'DISCOVERY_INCOMPLETE_FAIL_CLOSED' ||
      (Boolean(preflight.discoveredRoles?.length) && !preflight.success);

    if (isPaginationTruncated || isPartialDiscovery) {
      const code = preflight.errorCode ?? (isPaginationTruncated ? 'PAGINATION_TRUNCATED' : 'DISCOVERY_INCOMPLETE');
      return {
        allowed: false,
        status: 'DISCOVERY_INCOMPLETE_FAIL_CLOSED',
        targetRole: trimmed,
        reason: `Role discovery is incomplete (${code}): ${
          preflight.errorMessage ??
          'Role discovery returned partial or truncated results; refusing to treat incomplete results as exhaustive.'
        } Prohibiting role creation until authoritative enumeration completes.`,
      };
    }

    // 3. Unverified preflight (complete probe failure before any roles discovered)
    if (!preflight.success) {
      return {
        allowed: false,
        status: 'UNVERIFIED_PREFLIGHT_BLOCKED',
        targetRole: trimmed,
        reason: `Preflight discovery probe failed (${preflight.errorCode ?? 'UNKNOWN'}): ${
          preflight.errorMessage ?? 'Unable to verify existing roles in target environment'
        }. Prohibiting speculative role creation.`,
      };
    }

    return this.evaluateCreation(trimmed, preflight.discoveredRoles);
  }

  /**
   * Evaluates role creation intent against an authoritative list of existing roles.
   * Fails closed if partial discovery options indicate incomplete pagination or access restrictions.
   */
  public evaluateCreation(
    targetRole: string,
    existingRoles: string[],
    options?: { isPartial?: boolean; paginationComplete?: boolean }
  ): RoleValidationResult {
    const trimmed = (targetRole ?? '').trim();

    // 0. Explicit partial discovery guard
    if (options?.isPartial === true || options?.paginationComplete === false) {
      return {
        allowed: false,
        status: 'DISCOVERY_INCOMPLETE_FAIL_CLOSED',
        targetRole: trimmed,
        reason: 'Role discovery list is partial or incomplete; failing closed to prevent duplicate role creation.',
      };
    }

    // 1. Syntax and naming convention validation
    if (!trimmed || !/^[A-Za-z0-9+=,.@\-_]{1,64}$/.test(trimmed)) {
      return {
        allowed: false,
        status: 'INVALID_ROLE_NAME',
        targetRole: trimmed,
        reason: `Role name '${trimmed}' violates IAM naming constraints (1-64 alphanumeric chars plus +=,.@-_).`,
      };
    }

    const targetNormalized = normalizeRoleKey(trimmed);

    // 2. Exact match check
    const exactMatch = existingRoles.find((r) => r.trim() === trimmed);
    if (exactMatch) {
      return {
        allowed: false,
        status: 'EXACT_MATCH_EXISTS',
        targetRole: trimmed,
        matchedExistingRole: exactMatch,
        reason: `Role '${exactMatch}' already exists in target environment. Reuse existing role instead of creating duplicate.`,
      };
    }

    // 3. Near-duplicate / case / delimiter collision check
    const nearDuplicate = existingRoles.find((r) => normalizeRoleKey(r) === targetNormalized);
    if (nearDuplicate) {
      return {
        allowed: false,
        status: 'NEAR_DUPLICATE_DETECTED',
        targetRole: trimmed,
        matchedExistingRole: nearDuplicate,
        reason: `Target role '${trimmed}' is a near-duplicate variation of existing role '${nearDuplicate}'. Prohibiting duplicate creation.`,
      };
    }

    // 4. Canonical alternative check
    const canonical = this.canonicalRoles.get(targetNormalized);
    if (canonical && canonical !== trimmed) {
      return {
        allowed: false,
        status: 'CANONICAL_ALTERNATIVE_EXISTS',
        targetRole: trimmed,
        canonicalRole: canonical,
        reason: `Role '${trimmed}' diverges from approved canonical role '${canonical}'. Use canonical role '${canonical}'.`,
      };
    }

    // 5. Permitted
    return {
      allowed: true,
      status: 'PERMITTED',
      targetRole: trimmed,
      reason: `Role '${trimmed}' verified unique and compliant with canonical policies.`,
    };
  }
}
