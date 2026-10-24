/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : execution.ts
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

export interface ExecutionIdContext {
  executionId: string;
  stepId: string;
  operationId: string;
  attemptId: string;
  recoveryId?: string;
  idempotencyKey: string;
  targetId: string;
  tenantId: string;
  planDigest: string;
  policyDigest: string;
  actorIdentity: string;
  authorizationContext: string;
}

/**
 * @interface ExecutionLease
 * @description Corporate Governed interface implementation for ExecutionLease
 * @classification ENTERPRISE
 */
export interface ExecutionLease {
  executionId: string;
  workerId: string;
  leaseId: string;
  acquiredAt: number;
  expiresAt: number;
  lastHeartbeatAt: number;
  fencingToken: number;
}
