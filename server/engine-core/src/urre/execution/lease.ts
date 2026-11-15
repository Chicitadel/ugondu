/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Execution
 * File           : lease.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - SOVEREIGN Governed
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

import { ExecutionLease } from '../model/execution';

/**
 * @class ExecutionLeaseManager
 * @description Corporate Governed class implementation for ExecutionLeaseManager
 * @classification ENTERPRISE
 */
export class ExecutionLeaseManager {
  private leases: Map<string, ExecutionLease> = new Map();

  constructor() {}

  public acquireLease(
    executionId: string,
    workerId: string,
    ttlMs: number,
    fencingToken: number
  ): ExecutionLease {
    const now = Date.now();
    const existingLease = this.leases.get(executionId);

    if (existingLease && existingLease.expiresAt > now) {
      throw new Error(__t('messages.error.lease_already_held_for_execution', { 'executionId': executionId }));
    }

    const leaseId = `${executionId}-${workerId}-${now}`;
    const newLease: ExecutionLease = {
      executionId,
      workerId,
      leaseId,
      acquiredAt: now,
      expiresAt: now + ttlMs,
      lastHeartbeatAt: now,
      fencingToken
    };

    this.leases.set(executionId, newLease);
    return newLease;
  }

  public renewLease(executionId: string, workerId: string, leaseId: string, ttlMs: number): ExecutionLease {
    const lease = this.leases.get(executionId);
    if (!lease) {
      throw new Error(__t('messages.error.no_lease_found_for_execution', { 'executionId': executionId }));
    }
    if (lease.workerId !== workerId || lease.leaseId !== leaseId) {
      throw new Error(__t('messages.error.lease_ownership_mismatch_for_execution', { 'executionId': executionId }));
    }
    const now = Date.now();
    if (lease.expiresAt < now) {
      throw new Error(__t('messages.error.lease_for_execution_has_already_expired', { 'executionId': executionId }));
    }

    lease.lastHeartbeatAt = now;
    lease.expiresAt = now + ttlMs;
    return lease;
  }

  public isLeaseValid(executionId: string): boolean {
    const lease = this.leases.get(executionId);
    if (!lease) return false;
    return lease.expiresAt > Date.now();
  }

  public releaseLease(executionId: string, workerId: string, leaseId: string): void {
    const lease = this.leases.get(executionId);
    if (lease && lease.workerId === workerId && lease.leaseId === leaseId) {
      this.leases.delete(executionId);
    }
  }
}
