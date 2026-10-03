/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Adapter Analysis
 * File           : BlastRadius.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import type { DependencyReport } from '../IPolicyProviderAdapter';

export type BlastRadiusLevel = DependencyReport['blastRadius'];

/** Number of dependents above which a change is SIGNIFICANT, and above which it is BROAD. */
export const BLAST_RADIUS_THRESHOLDS = { limited: 3, significant: 10 } as const;

/**
 * Single classification rule shared by every provider adapter, so blast radius means the same thing everywhere.
 * A group-like dependent (membership managed elsewhere and therefore unbounded) always makes the change BROAD.
 */
export function classifyBlast(dependents: number, hasGroupDependent: boolean): BlastRadiusLevel {
  if (hasGroupDependent || dependents > BLAST_RADIUS_THRESHOLDS.significant) return 'BROAD';
  if (dependents > BLAST_RADIUS_THRESHOLDS.limited) return 'SIGNIFICANT';
  return dependents > 0 ? 'LIMITED' : 'MINIMAL';
}
