/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Temporary Authorization Manager
 * File           : TemporaryAuthorizationManager.ts
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';

import type {
  TemporaryAuthorization,
  TemporaryAuthorizationStatus,
  ApprovalRecord,
} from '../../types/index';
import { isExpired } from '../../types/temporary-authorization';
import { randomUUID } from 'crypto';

/**
 * TemporaryAuthorizationManager — manages the full lifecycle of temporary grants.
 *
 * State machine:
 *   ISSUED → ACTIVE → REVOKED
 *                  → EXPIRED (if expiresAt passes before revocation)
 *                  → FAILED_TO_REVOKE (if provider revocation fails)
 *
 * INVARIANT: Every operation-scoped grant MUST be revoked after execution.
 *            FAILED_TO_REVOKE triggers an alert and human escalation.
 */
export class TemporaryAuthorizationManager {
  private readonly grants = new Map<string, TemporaryAuthorization>();

  /** Issue a new temporary authorization grant. */
  issue(
    params: IssueTemporaryAuthorizationParams
  ): TemporaryAuthorization {
    const auth: TemporaryAuthorization = {
      authId:            randomUUID(),
      issuedAt:          new Date().toISOString(),
      expiresAt:         params.expiresAt,
      operationId:       params.operationId,
      executionId:       params.executionId,
      targetId:          params.targetId,
      capabilityScope:   params.capabilityScope,
      resourceScope:     params.resourceScope,
      purpose:           params.purpose,
      actor:             params.actor,
      approval:          params.approval,
      status:            'ISSUED',
    };
    this.grants.set(auth.authId, auth);
    return auth;
  }

  /** Transition grant from ISSUED to ACTIVE (after provider-side application). */
  activate(authId: string): TemporaryAuthorization {
    const auth = this.requireGrant(authId);
    if (auth.status !== 'ISSUED') {
      throw new Error(__t('messages.error.cannot_activate_grant_current_status_is', { 'authId': authId, 'auth_status': auth.status }));
    }
    auth.status = 'ACTIVE';
    return auth;
  }

  /** Revoke a grant after execution completes (success or failure). */
  revoke(authId: string, evidence: string): TemporaryAuthorization {
    const auth = this.requireGrant(authId);
    if (auth.status !== 'ISSUED' && auth.status !== 'ACTIVE') {
      throw new Error(__t('messages.error.cannot_revoke_grant_current_status_is', { 'authId': authId, 'auth_status': auth.status }));
    }
    auth.status           = 'REVOKED';
    auth.revokedAt        = new Date().toISOString();
    auth.revocationEvidence = evidence;
    return auth;
  }

  /** Mark revocation as failed — triggers alert path. */
  markRevocationFailed(authId: string, reason: string): TemporaryAuthorization {
    const auth = this.requireGrant(authId);
    auth.status            = 'FAILED_TO_REVOKE';
    auth.revocationEvidence = `FAILED: ${reason}`;
    return auth;
  }

  /** Expire all grants that have passed their expiresAt deadline. */
  expireOverdue(): TemporaryAuthorization[] {
    const expired: TemporaryAuthorization[] = [];
    for (const auth of this.grants.values()) {
      if ((auth.status === 'ISSUED' || auth.status === 'ACTIVE') && isExpired(auth)) {
        auth.status  = 'EXPIRED';
        auth.revokedAt = new Date().toISOString();
        expired.push(auth);
      }
    }
    return expired;
  }

  /** Get all grants requiring revocation (ISSUED or ACTIVE). */
  getPendingRevocation(): TemporaryAuthorization[] {
    return Array.from(this.grants.values()).filter(
      (a) => a.status === 'ISSUED' || a.status === 'ACTIVE'
    );
  }

  /** Get all grants that failed revocation — require immediate human attention. */
  getFailedRevocations(): TemporaryAuthorization[] {
    return Array.from(this.grants.values()).filter(
      (a) => a.status === 'FAILED_TO_REVOKE'
    );
  }

  getGrant(authId: string): TemporaryAuthorization | undefined {
    return this.grants.get(authId);
  }

  private requireGrant(authId: string): TemporaryAuthorization {
    const auth = this.grants.get(authId);
    if (!auth) throw new Error(__t('messages.error.temporary_authorization_grant_not_found', { 'authId': authId }));
    return auth;
  }
}

/**
 * @interface IssueTemporaryAuthorizationParams
 * @description Corporate Governed interface implementation for IssueTemporaryAuthorizationParams
 * @classification ENTERPRISE
 */
export interface IssueTemporaryAuthorizationParams {
  expiresAt:       string;
  operationId:     string;
  executionId:     string;
  targetId:        string;
  capabilityScope: string[];
  resourceScope:   string[];
  purpose:         string;
  actor:           string;
  approval:        ApprovalRecord;
}
