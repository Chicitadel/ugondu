/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/urre
 * File           : failure.ts
 * Version        : 1.0.0
 * Author         : Antigravity AI
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

export interface FailureClassification {
    severity: 'TRANSIENT' | 'RECOVERABLE_STATE_CORRUPTION' | 'CRITICAL_DATA_LOSS' | 'IRREVERSIBLE_SIDE_EFFECT' | string;
}


export enum FailureClass {
  PROCESS_CRASH           = 'PROCESS_CRASH',
  POWER_LOSS              = 'POWER_LOSS',
  DISK_FULL               = 'DISK_FULL',
  NETWORK_LOSS            = 'NETWORK_LOSS',
  PARTIAL_COPY            = 'PARTIAL_COPY',
  CORRUPT_BACKUP          = 'CORRUPT_BACKUP',
  PARTIAL_DB_MIGRATION    = 'PARTIAL_DB_MIGRATION',
  LOCK_TIMEOUT            = 'LOCK_TIMEOUT',
  PROVIDER_TIMEOUT        = 'PROVIDER_TIMEOUT',
  PARTIAL_PROVISION       = 'PARTIAL_PROVISION',
  DNS_PROPAGATION_STALL   = 'DNS_PROPAGATION_STALL',
  CERT_ISSUANCE_FAIL      = 'CERT_ISSUANCE_FAIL',
  SECRET_ROTATION_PARTIAL = 'SECRET_ROTATION_PARTIAL',
  ROLLBACK_INCOMPLETE     = 'ROLLBACK_INCOMPLETE',
  CHECKPOINT_MISSING      = 'CHECKPOINT_MISSING',
  STATE_CORRUPTION        = 'STATE_CORRUPTION',
  DUPLICATE_EXECUTION     = 'DUPLICATE_EXECUTION',
  CAPABILITY_MISMATCH     = 'CAPABILITY_MISMATCH',
  SIGNATURE_INVALID       = 'SIGNATURE_INVALID',
  TTL_EXPIRED             = 'TTL_EXPIRED',
  SYMLINK_GAP             = 'SYMLINK_GAP',
  CONTAINER_OOM           = 'CONTAINER_OOM',
  HEALTHCHECK_TIMEOUT     = 'HEALTHCHECK_TIMEOUT',
  DATABASE_UNREACHABLE    = 'DATABASE_UNREACHABLE',
  MIGRATION_CONFLICT      = 'MIGRATION_CONFLICT',
  ARTIFACT_DIGEST_MISMATCH = 'ARTIFACT_DIGEST_MISMATCH',
  SSH_CONNECTION_DROP     = 'SSH_CONNECTION_DROP',
  API_RATE_LIMIT_HIT      = 'API_RATE_LIMIT_HIT',
  PARTIAL_ROLLBACK_DATA   = 'PARTIAL_ROLLBACK_DATA',
  UNKNOWN_FAILURE         = 'UNKNOWN_FAILURE',
}

export type FailureDomain = 
  | 'CONTROL_PLANE'
  | 'DATA_PLANE'
  | 'TARGET_PLANE'
  | 'UGONDU_PLANE';

export interface URREFailure {
  failureId: string;
  failureClass: FailureClass;
  domain: FailureDomain;
  description: string;
  detectedAt: number;
  fatal: boolean;
  rawError?: string;
}

export interface FailureMetadata {
  failureClass: FailureClass;
  description: string;
  recoverable: boolean;
  requiresHumanEscalation: boolean;
}

export const FAILURE_REGISTRY: Record<FailureClass, FailureMetadata> = {
  [FailureClass.PROCESS_CRASH]: { failureClass: FailureClass.PROCESS_CRASH, description: 'Process crashed unexpectedly', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.POWER_LOSS]: { failureClass: FailureClass.POWER_LOSS, description: 'Power loss detected', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.DISK_FULL]: { failureClass: FailureClass.DISK_FULL, description: 'Disk is full', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.NETWORK_LOSS]: { failureClass: FailureClass.NETWORK_LOSS, description: 'Network connectivity lost', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PARTIAL_COPY]: { failureClass: FailureClass.PARTIAL_COPY, description: 'Data copy completed partially', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CORRUPT_BACKUP]: { failureClass: FailureClass.CORRUPT_BACKUP, description: 'Backup file is corrupt', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.PARTIAL_DB_MIGRATION]: { failureClass: FailureClass.PARTIAL_DB_MIGRATION, description: 'Database migration partially failed', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.LOCK_TIMEOUT]: { failureClass: FailureClass.LOCK_TIMEOUT, description: 'Timeout acquiring lock', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PROVIDER_TIMEOUT]: { failureClass: FailureClass.PROVIDER_TIMEOUT, description: 'Cloud provider timed out', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PARTIAL_PROVISION]: { failureClass: FailureClass.PARTIAL_PROVISION, description: 'Resource partially provisioned', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.DNS_PROPAGATION_STALL]: { failureClass: FailureClass.DNS_PROPAGATION_STALL, description: 'DNS propagation stalled', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CERT_ISSUANCE_FAIL]: { failureClass: FailureClass.CERT_ISSUANCE_FAIL, description: 'Certificate issuance failed', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.SECRET_ROTATION_PARTIAL]: { failureClass: FailureClass.SECRET_ROTATION_PARTIAL, description: 'Secret rotated partially', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.ROLLBACK_INCOMPLETE]: { failureClass: FailureClass.ROLLBACK_INCOMPLETE, description: 'Rollback incomplete', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.CHECKPOINT_MISSING]: { failureClass: FailureClass.CHECKPOINT_MISSING, description: 'Execution checkpoint missing', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.STATE_CORRUPTION]: { failureClass: FailureClass.STATE_CORRUPTION, description: 'State file is corrupted', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.DUPLICATE_EXECUTION]: { failureClass: FailureClass.DUPLICATE_EXECUTION, description: 'Duplicate execution detected', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CAPABILITY_MISMATCH]: { failureClass: FailureClass.CAPABILITY_MISMATCH, description: 'Required capability missing', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.SIGNATURE_INVALID]: { failureClass: FailureClass.SIGNATURE_INVALID, description: 'Signature validation failed', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.TTL_EXPIRED]: { failureClass: FailureClass.TTL_EXPIRED, description: 'Time-to-live expired', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.SYMLINK_GAP]: { failureClass: FailureClass.SYMLINK_GAP, description: 'Symlink points to missing file', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CONTAINER_OOM]: { failureClass: FailureClass.CONTAINER_OOM, description: 'Container out of memory', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.HEALTHCHECK_TIMEOUT]: { failureClass: FailureClass.HEALTHCHECK_TIMEOUT, description: 'Healthcheck timed out', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.DATABASE_UNREACHABLE]: { failureClass: FailureClass.DATABASE_UNREACHABLE, description: 'Database is unreachable', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.MIGRATION_CONFLICT]: { failureClass: FailureClass.MIGRATION_CONFLICT, description: 'Migration conflict detected', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.ARTIFACT_DIGEST_MISMATCH]: { failureClass: FailureClass.ARTIFACT_DIGEST_MISMATCH, description: 'Artifact digest mismatch', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.SSH_CONNECTION_DROP]: { failureClass: FailureClass.SSH_CONNECTION_DROP, description: 'SSH connection dropped', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.API_RATE_LIMIT_HIT]: { failureClass: FailureClass.API_RATE_LIMIT_HIT, description: 'API rate limit hit', recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PARTIAL_ROLLBACK_DATA]: { failureClass: FailureClass.PARTIAL_ROLLBACK_DATA, description: 'Data rollback incomplete', recoverable: false, requiresHumanEscalation: true },
  [FailureClass.UNKNOWN_FAILURE]: { failureClass: FailureClass.UNKNOWN_FAILURE, description: 'Unknown failure occurred', recoverable: false, requiresHumanEscalation: true },
};
