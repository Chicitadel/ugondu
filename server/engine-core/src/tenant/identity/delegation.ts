/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Identity
 * File           : delegation.ts
 * Version        : 1.0.0
 * Author         : Phase 14 AI Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { SubjectContext } from './subject-context';

/**
 * @interface DelegationRecord
 * @description Corporate Governed interface implementation for DelegationRecord
 * @classification ENTERPRISE
 */
export interface DelegationRecord {
  readonly delegatorId: string;
  readonly delegateId: string;
  readonly tenantId: string;
  readonly scope: ReadonlyArray<string>;
  readonly expiresAt: Date;
}

/**
 * @class DelegationManager
 * @description Corporate Governed class implementation for DelegationManager
 * @classification ENTERPRISE
 */
export class DelegationManager {
  private delegations: DelegationRecord[] = [];

  public grantDelegation(record: DelegationRecord): void {
    this.delegations.push(record);
  }

  public getDelegationsForDelegate(delegate: SubjectContext): DelegationRecord[] {
    const now = new Date();
    return this.delegations.filter(
      (d) => d.delegateId === delegate.id && d.tenantId === delegate.tenantId && d.expiresAt > now
    );
  }
}
