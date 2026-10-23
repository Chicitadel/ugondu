/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Edition Registry
 * File           : EditionDefinition.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-23
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

/**
 * Ugondu canonical edition hierarchy (5 tiers).
 * Aligned with Air Roofers platform standard AR-STD-PKG-005.
 *
 * NOTE: DEVELOPER tier from EAORCS maps to FREE in Ugondu
 * (Ugondu is delivery-focused, not IDE-focused).
 * OEM and MSP are commercial overlays — NOT ranked editions.
 * They MUST NOT appear in EDITION_RANK or capability inheritance.
 */
export const CANONICAL_UGONDU_EDITIONS = [
  'COMMUNITY',
  'PROFESSIONAL',
  'BUSINESS',
  'ENTERPRISE',
  'SOVEREIGN',
] as const;

export const UGONDU_EDITIONS = [
  'FREE',
  'COMMUNITY',
  'PROFESSIONAL',
  'BUSINESS',
  'ENTERPRISE',
  'SOVEREIGN',
] as const;

export type UgonduEdition = typeof UGONDU_EDITIONS[number];

/**
 * Edition ranks for capability inheritance.
 * Higher rank = superset of all lower ranks.
 * FREE is maintained as a backward-compatible alias for COMMUNITY (rank 1).
 * NEVER use these ranks to make authorization decisions (that is CEG/Mandatag territory).
 */
export const EDITION_RANK: Record<UgonduEdition, number> = {
  FREE:         1,
  COMMUNITY:    1,
  PROFESSIONAL: 2,
  BUSINESS:     3,
  ENTERPRISE:   4,
  SOVEREIGN:    5,
};

/**
 * Normalize legacy edition aliases (e.g., FREE -> COMMUNITY) where canonical tier names are needed.
 * @deprecated Deprecated since v1.0.0. 'FREE' edition alias is deprecated; use 'COMMUNITY'.
 */
export function normalizeEdition(value: string): UgonduEdition | undefined {
  const upper = value.trim().toUpperCase();
  if (upper === 'FREE') {
    process.emitWarning(
      "[UGONDU_DEPRECATION] Edition alias 'FREE' is deprecated and will be removed in a future release. Use 'COMMUNITY' instead.",
      'DeprecationWarning'
    );
    return 'COMMUNITY';
  }
  return UGONDU_EDITIONS.find((e) => e === upper);
}

/** Check if edition A is at least as privileged as edition B. */
export function meetsEditionRequirement(
  actual:   UgonduEdition,
  required: UgonduEdition
): boolean {
  return EDITION_RANK[actual] >= EDITION_RANK[required];
}

/** Parse a string to UgonduEdition. Returns undefined if unrecognized. */
export function parseEdition(value: string): UgonduEdition | undefined {
  return UGONDU_EDITIONS.find((e) => e === value.toUpperCase());
}

/**
 * @interface EditionLimits
 * @description Corporate Governed interface implementation for EditionLimits
 * @classification ENTERPRISE
 */
export interface EditionLimits {
  maxWorkspaces:          number | null;   // null = negotiated/policy-defined
  maxEnvironments:        number | null;
  maxTargets:             number | null;
  maxDeploymentsPerMonth: number | null;
  maxFleetNodes:          number | null;
  maxAiRequestsPerMonth:  number | null;
}

const COMMUNITY_LIMITS: EditionLimits = {
  maxWorkspaces:          1,
  maxEnvironments:        1,
  maxTargets:             3,
  maxDeploymentsPerMonth: 10,
  maxFleetNodes:          0,
  maxAiRequestsPerMonth:  0,
};

/** Server-enforced limits per edition. All limits are enforced server-side. */
export const EDITION_LIMITS: Record<UgonduEdition, EditionLimits> = {
  FREE: COMMUNITY_LIMITS,
  COMMUNITY: COMMUNITY_LIMITS,
  PROFESSIONAL: {
    maxWorkspaces:          5,
    maxEnvironments:        10,
    maxTargets:             25,
    maxDeploymentsPerMonth: 100,
    maxFleetNodes:          0,
    maxAiRequestsPerMonth:  100,
  },
  BUSINESS: {
    maxWorkspaces:          50,
    maxEnvironments:        500,
    maxTargets:             null,
    maxDeploymentsPerMonth: null,
    maxFleetNodes:          50,
    maxAiRequestsPerMonth:  1000,
  },
  ENTERPRISE: {
    maxWorkspaces:          250,
    maxEnvironments:        2500,
    maxTargets:             null,
    maxDeploymentsPerMonth: null,
    maxFleetNodes:          500,
    maxAiRequestsPerMonth:  10000,
  },
  SOVEREIGN: {
    maxWorkspaces:          null,
    maxEnvironments:        null,
    maxTargets:             null,
    maxDeploymentsPerMonth: null,
    maxFleetNodes:          null,
    maxAiRequestsPerMonth:  null,
  },
};
