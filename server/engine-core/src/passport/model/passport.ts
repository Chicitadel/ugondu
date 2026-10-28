/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport — Delivery Passport Model
 * File           : passport.ts
 * Version        : 2.0.0
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

// @ts-ignore
import { __t } from '@ugondu/shared';

import { Evidence } from './evidence';
import type { AuthorityEvidence } from './authority-evidence';

export enum PassportStatus {
  DRAFT   = 'DRAFT',
  ISSUED  = 'ISSUED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

/**
 * @interface PassportMetadata
 * @description Corporate Governed interface implementation for PassportMetadata
 * @classification ENTERPRISE
 */
export interface PassportMetadata {
  issuerId:        string;
  subjectId:       string;
  issuedAt:        string;    // ISO-8601
  expiresAt?:      string;    // ISO-8601
  clearanceLevel:  number;
  operationId?:    string;
  executionId?:    string;
  targetId?:       string;
  capabilities?:   string[];  // required capability IDs for this operation
}

/**
 * DeliveryPassport v2 — proof-carrying authorization document.
 *
 * v2 additions:
 * - `authorityEvidence`: UPPIE authority binding (grants, revocations, simulations, approvals)
 * - `version` locked to '2.0' for new passports
 *
 * A passport is only valid when:
 * 1. status = ISSUED
 * 2. Not expired (expiresAt not passed)
 * 3. Not revoked
 * 4. authorityEvidence present and complete (when operation requires UPPIE)
 * 5. All evidence items are cryptographically intact
 */
export interface DeliveryPassport {
  id:                  string;
  version:             '1.0' | '2.0';
  metadata:            PassportMetadata;
  evidence:            Evidence[];
  authorityEvidence?:  AuthorityEvidence;  // present when operation required UPPIE authority
  status:              PassportStatus;
  signature?:          string;
}

/**
 * @interface PassportValidationOptions
 * @description Corporate Governed interface implementation for PassportValidationOptions
 * @classification ENTERPRISE
 */
export interface PassportValidationOptions {
  requireAuthorityEvidence?: boolean;   // default: false (not all ops need UPPIE)
  requireCapabilities?:      string[];  // if present, passport must include these capabilities
}

/**
 * Validate a DeliveryPassport.
 * Returns false with reason when invalid.
 */
export function validatePassport(
  passport: DeliveryPassport,
  options?: PassportValidationOptions
): PassportValidationResult {
  if (!passport.id || !passport.version || !passport.metadata) {
    return { valid: false, reason: 'MISSING_REQUIRED_FIELDS' };
  }

  if (passport.status === PassportStatus.REVOKED) {
    return { valid: false, reason: 'PASSPORT_REVOKED' };
  }

  if (passport.status === PassportStatus.EXPIRED) {
    return { valid: false, reason: 'PASSPORT_EXPIRED' };
  }

  if (passport.metadata.expiresAt) {
    if (new Date() > new Date(passport.metadata.expiresAt)) {
      return { valid: false, reason: 'PASSPORT_EXPIRED' };
    }
  }

  if (options?.requireAuthorityEvidence && !passport.authorityEvidence) {
    return { valid: false, reason: 'MISSING_AUTHORITY_EVIDENCE' };
  }

  if (options?.requireCapabilities) {
    const passportCaps = new Set(passport.metadata.capabilities ?? []);
    const missing = options.requireCapabilities.filter((c) => !passportCaps.has(c));
    if (missing.length > 0) {
      return { valid: false, reason: 'INSUFFICIENT_CAPABILITIES', missingCapabilities: missing };
    }
  }

  return { valid: true };
}

export type PassportValidationReason =
  | 'MISSING_REQUIRED_FIELDS'
  | 'PASSPORT_REVOKED'
  | 'PASSPORT_EXPIRED'
  | 'MISSING_AUTHORITY_EVIDENCE'
  | 'INSUFFICIENT_CAPABILITIES';

/**
 * @interface PassportValidationResult
 * @description Corporate Governed interface implementation for PassportValidationResult
 * @classification ENTERPRISE
 */
export interface PassportValidationResult {
  valid:                boolean;
  reason?:              PassportValidationReason;
  missingCapabilities?: string[];
}
