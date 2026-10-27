/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : temporary-authorization.ts
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

import { z } from 'zod';

export type TemporaryAuthorizationStatus =
  | 'ISSUED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'FAILED_TO_REVOKE';

/**
 * @interface ApprovalRecord
 * @description Corporate Governed interface implementation for ApprovalRecord
 * @classification ENTERPRISE
 */
export interface ApprovalRecord {
  approvedBy:    string;
  approvedAt:    string;    // ISO-8601
  scope:         string;
  expiresAt:     string;    // ISO-8601
  approvalNonce: string;
}

/**
 * @interface TemporaryAuthorization
 * @description Corporate Governed interface implementation for TemporaryAuthorization
 * @classification ENTERPRISE
 */
export interface TemporaryAuthorization {
  authId:           string;    // UUID
  issuedAt:         string;    // ISO-8601
  expiresAt:        string;    // ISO-8601 — hard deadline
  operationId:      string;
  executionId:      string;
  targetId:         string;
  capabilityScope:  string[];
  resourceScope:    string[];
  purpose:          string;
  actor:            string;
  approval:         ApprovalRecord;
  status:           TemporaryAuthorizationStatus;
  revokedAt?:       string;    // ISO-8601
  revocationEvidence?: string;
}

export const TemporaryAuthorizationSchema = z.object({
  authId:           z.string().uuid(),
  issuedAt:         z.string().datetime(),
  expiresAt:        z.string().datetime(),
  operationId:      z.string(),
  executionId:      z.string(),
  targetId:         z.string(),
  capabilityScope:  z.array(z.string()),
  resourceScope:    z.array(z.string()),
  purpose:          z.string(),
  actor:            z.string(),
  approval:         z.object({
    approvedBy:    z.string(),
    approvedAt:    z.string().datetime(),
    scope:         z.string(),
    expiresAt:     z.string().datetime(),
    approvalNonce: z.string(),
  }),
  status:           z.enum(['ISSUED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'FAILED_TO_REVOKE']),
  revokedAt:        z.string().datetime().optional(),
  revocationEvidence: z.string().optional(),
});

export function isExpired(auth: TemporaryAuthorization): boolean {
  return new Date(auth.expiresAt) <= new Date();
}

export function requiresRevocation(auth: TemporaryAuthorization): boolean {
  return auth.status === 'ISSUED' || auth.status === 'ACTIVE';
}
