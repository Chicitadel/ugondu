/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : operation.ts
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

export type IdempotencyClass = 
  | 'DETERMINISTIC' 
  | 'CONDITIONAL' 
  | 'ONCE' 
  | 'DESTRUCTIVE' 
  | 'QUERY';

export type MutationClass = 
  | 'DATA_TRANSFER'
  | 'CONFIGURATION'
  | 'INFRASTRUCTURE'
  | 'DESTRUCTIVE'
  | 'MIGRATION'
  | 'READONLY';

export interface ActionSafetyContract {
  mutationClass: MutationClass;
  idempotencyClass: IdempotencyClass;
  reversible: boolean;
  destructive: boolean;
  requiresBackup: boolean;
  requiresSnapshot: boolean;
  requiresApproval: boolean;
  requiresExclusiveLock: boolean;
  supportsResume: boolean;
  supportsRollback: boolean;
  verificationRequired: boolean;
  reconciliationRequired: boolean;
  minimumFreeSpaceBytes: number;
  maximumRetryCount: number;
  timeoutMs: number;
  rollbackStrategy?: string;
  recoveryStrategy?: string;
}
