/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : state.ts
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

export type ExecutionState =
  | 'DRAFT'
  | 'ADMITTED'
  | 'PREPARED'
  | 'SNAPSHOTTED'
  | 'CHECKPOINTED'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMMITTED'
  | 'RECOVERY_REQUIRED'
  | 'PAUSED'
  | 'UNKNOWN'
  | 'RECONCILING'
  | 'FAILED'
  | 'RECOVERY'
  | 'CERTIFIED';

export type RecoveryState =
  | 'RESUME'
  | 'REPAIR'
  | 'ROLLBACK'
  | 'FORWARD_RECOVERY'
  | 'HUMAN_REQUIRED';

export type RecoveryPointState =
  | 'CREATING'
  | 'VERIFIED'
  | 'CORRUPT'
  | 'ARCHIVED';
