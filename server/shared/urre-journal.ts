/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / URRE / Execution Journal
 * File           : urre-journal.ts
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
  | 'DISCOVER' | 'SNAPSHOT' | 'PREFLIGHT' | 'PREPARE'
  | 'EXECUTING' | 'VERIFYING' | 'COMMITTING' | 'COMPLETED'
  | 'FROZEN' | 'ROLLING_BACK' | 'ROLLED_BACK' | 'ESCALATED' | 'FAILED';

export type IdempotencyClass =
  | 'DETERMINISTIC' | 'CONDITIONAL' | 'ONCE' | 'DESTRUCTIVE' | 'QUERY';

export interface ArtifactRef {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface VerificationResult {
  passed: boolean;
  checkName: string;
  evidence: string;
  timestamp: number;
}

export interface ExecutionLease {
  leaseId: string;
  holder: string;
  expiresAt: number;
}

export interface RollbackManifest {
  recoveryPointId: string;
  strategy: string;
  estimatedDurationMs: number;
}

export interface RecoveryPointRef {
  recoveryPointId: string;
  createdAt: number;
  label: string;
}

export interface ExecutionJournalEntry {
  executionId: string;
  operationId: string;
  planHash: string;
  policyHash: string;
  targetEnvironmentId: string;
  provider: string;
  startedAt: number;
  lastCheckpointAt: number;
  currentCheckpoint: string;
  state: ExecutionState;
  completedUnits: number;
  totalUnits: number;
  artifactsCreated: ArtifactRef[];
  artifactsModified: ArtifactRef[];
  recoveryPoints: RecoveryPointRef[];
  verificationResults: VerificationResult[];
  rollbackManifest: RollbackManifest;
  executionLease: ExecutionLease;
  evidenceRef: string | null;
}

export interface Checkpoint {
  checkpointId: string;
  description: string;
  idempotent: boolean;
  idempotencyClass: IdempotencyClass;
  rollbackActionIds: string[];
}
