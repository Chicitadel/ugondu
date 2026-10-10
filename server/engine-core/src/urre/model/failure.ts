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

/**
 * @interface URREFailure
 * @description Corporate Governed interface implementation for URREFailure
 * @classification ENTERPRISE
 */
export interface URREFailure {
  failureId: string;
  failureClass: FailureClass;
  domain: FailureDomain;
  description: string;
  detectedAt: number;
  fatal: boolean;
  rawError?: string;
}

/**
 * @interface FailureMetadata
 * @description Corporate Governed interface implementation for FailureMetadata
 * @classification ENTERPRISE
 */
export interface FailureMetadata {
  failureClass: FailureClass;
  description: string;
  recoverable: boolean;
  requiresHumanEscalation: boolean;
}

export const FAILURE_REGISTRY: Record<FailureClass, FailureMetadata> = {
  [FailureClass.PROCESS_CRASH]: { failureClass: FailureClass.PROCESS_CRASH, description: __t('process_crashed_unexpectedly'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.POWER_LOSS]: { failureClass: FailureClass.POWER_LOSS, description: __t('power_loss_detected'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.DISK_FULL]: { failureClass: FailureClass.DISK_FULL, description: __t('disk_is_full'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.NETWORK_LOSS]: { failureClass: FailureClass.NETWORK_LOSS, description: __t('network_connectivity_lost'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PARTIAL_COPY]: { failureClass: FailureClass.PARTIAL_COPY, description: __t('data_copy_completed_partially'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CORRUPT_BACKUP]: { failureClass: FailureClass.CORRUPT_BACKUP, description: __t('backup_file_is_corrupt'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.PARTIAL_DB_MIGRATION]: { failureClass: FailureClass.PARTIAL_DB_MIGRATION, description: __t('database_migration_partially_f'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.LOCK_TIMEOUT]: { failureClass: FailureClass.LOCK_TIMEOUT, description: __t('timeout_acquiring_lock'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PROVIDER_TIMEOUT]: { failureClass: FailureClass.PROVIDER_TIMEOUT, description: __t('cloud_provider_timed_out'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PARTIAL_PROVISION]: { failureClass: FailureClass.PARTIAL_PROVISION, description: __t('resource_partially_provisioned'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.DNS_PROPAGATION_STALL]: { failureClass: FailureClass.DNS_PROPAGATION_STALL, description: __t('dns_propagation_stalled'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CERT_ISSUANCE_FAIL]: { failureClass: FailureClass.CERT_ISSUANCE_FAIL, description: __t('certificate_issuance_failed'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.SECRET_ROTATION_PARTIAL]: { failureClass: FailureClass.SECRET_ROTATION_PARTIAL, description: __t('secret_rotated_partially'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.ROLLBACK_INCOMPLETE]: { failureClass: FailureClass.ROLLBACK_INCOMPLETE, description: __t('rollback_incomplete'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.CHECKPOINT_MISSING]: { failureClass: FailureClass.CHECKPOINT_MISSING, description: __t('execution_checkpoint_missing'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.STATE_CORRUPTION]: { failureClass: FailureClass.STATE_CORRUPTION, description: __t('state_file_is_corrupted'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.DUPLICATE_EXECUTION]: { failureClass: FailureClass.DUPLICATE_EXECUTION, description: __t('duplicate_execution_detected'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CAPABILITY_MISMATCH]: { failureClass: FailureClass.CAPABILITY_MISMATCH, description: __t('required_capability_missing'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.SIGNATURE_INVALID]: { failureClass: FailureClass.SIGNATURE_INVALID, description: __t('signature_validation_failed'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.TTL_EXPIRED]: { failureClass: FailureClass.TTL_EXPIRED, description: __t('time_to_live_expired'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.SYMLINK_GAP]: { failureClass: FailureClass.SYMLINK_GAP, description: __t('symlink_points_to_missing_file'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.CONTAINER_OOM]: { failureClass: FailureClass.CONTAINER_OOM, description: __t('container_out_of_memory'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.HEALTHCHECK_TIMEOUT]: { failureClass: FailureClass.HEALTHCHECK_TIMEOUT, description: __t('healthcheck_timed_out'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.DATABASE_UNREACHABLE]: { failureClass: FailureClass.DATABASE_UNREACHABLE, description: __t('database_is_unreachable'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.MIGRATION_CONFLICT]: { failureClass: FailureClass.MIGRATION_CONFLICT, description: __t('migration_conflict_detected'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.ARTIFACT_DIGEST_MISMATCH]: { failureClass: FailureClass.ARTIFACT_DIGEST_MISMATCH, description: __t('artifact_digest_mismatch'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.SSH_CONNECTION_DROP]: { failureClass: FailureClass.SSH_CONNECTION_DROP, description: __t('ssh_connection_dropped'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.API_RATE_LIMIT_HIT]: { failureClass: FailureClass.API_RATE_LIMIT_HIT, description: __t('api_rate_limit_hit'), recoverable: true, requiresHumanEscalation: false },
  [FailureClass.PARTIAL_ROLLBACK_DATA]: { failureClass: FailureClass.PARTIAL_ROLLBACK_DATA, description: __t('data_rollback_incomplete'), recoverable: false, requiresHumanEscalation: true },
  [FailureClass.UNKNOWN_FAILURE]: { failureClass: FailureClass.UNKNOWN_FAILURE, description: __t('unknown_failure_occurred'), recoverable: false, requiresHumanEscalation: true },
};
