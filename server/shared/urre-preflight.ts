/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / URRE / Preflight
 * File           : urre-preflight.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export type PreflightVerdict = 'SAFE' | 'CAUTION' | 'BLOCKED';

export type PreflightCategory =
  | 'STORAGE' | 'HEALTH' | 'LOCKS' | 'BACKUP'
  | 'NETWORK' | 'CREDENTIALS' | 'CAPACITY' | 'DEPENDENCIES';

export interface PreflightCheck {
  category: PreflightCategory;
  check: string;
  verdict: PreflightVerdict;
  evidence: string;
}

export interface StorageBudget {
  requiredBytes: number;
  workingBytes: number;
  rollbackBytes: number;
  safetyBytes: number;
  totalRequired: number;
  available: number;
  verdict: PreflightVerdict;
}

export interface PreflightReport {
  overallVerdict: PreflightVerdict;
  checks: PreflightCheck[];
  storageBudget: StorageBudget | null;
  evaluatedAt: number;
}
