/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/urre
 * File           : failure-signature.ts
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

import { FailureClass } from './failure';

/**
 * @interface FailureSignature
 * @description Corporate Governed interface implementation for FailureSignature
 * @classification ENTERPRISE
 */
export interface FailureSignature {
  failureClass: FailureClass;
  messagePatterns: string[];
  contextSignals: string[];
}

export const FAILURE_SIGNATURES: FailureSignature[] = [
  { failureClass: FailureClass.PROCESS_CRASH, messagePatterns: ['sigsegv', 'segmentation fault', __t('core_dumped')], contextSignals: ['processDead'] },
  { failureClass: FailureClass.POWER_LOSS, messagePatterns: [__t('power_failure'), __t('unexpected_shutdown'), 'acpi'], contextSignals: ['powerLost'] },
  { failureClass: FailureClass.DISK_FULL, messagePatterns: [__t('no_space_left'), 'enospc', __t('disk_full'), __t('storage_limit')], contextSignals: ['diskFull'] },
  { failureClass: FailureClass.NETWORK_LOSS, messagePatterns: [__t('network_unreachable'), 'enotfound', __t('connection_reset'), 'econnrefused'], contextSignals: ['networkOffline'] },
  { failureClass: FailureClass.PARTIAL_COPY, messagePatterns: [__t('partial_copy'), __t('incomplete_transfer'), __t('bytes_mismatch')], contextSignals: ['copyIncomplete'] },
  { failureClass: FailureClass.CORRUPT_BACKUP, messagePatterns: [__t('backup_corrupt'), __t('invalid_archive'), __t('checksum_failed')], contextSignals: ['backupInvalid'] },
  { failureClass: FailureClass.PARTIAL_DB_MIGRATION, messagePatterns: [__t('migration_aborted'), __t('partial_transaction'), __t('dirty_database')], contextSignals: ['migrationFailed'] },
  { failureClass: FailureClass.LOCK_TIMEOUT, messagePatterns: [__t('lock_wait_timeout'), __t('failed_to_acquire_lock'), 'deadlock'], contextSignals: ['lockTimeout'] },
  { failureClass: FailureClass.PROVIDER_TIMEOUT, messagePatterns: [__t('provider_timeout'), __t('gateway_timeout'), __t('504_timeout')], contextSignals: ['apiTimeout'] },
  { failureClass: FailureClass.PARTIAL_PROVISION, messagePatterns: [__t('provisioning_partially'), __t('resource_stuck'), __t('create_failed_halfway')], contextSignals: ['provisionStalled'] },
  { failureClass: FailureClass.DNS_PROPAGATION_STALL, messagePatterns: [__t('dns_not_propagated'), 'nxdomain', __t('unresolved_host')], contextSignals: ['dnsStall'] },
  { failureClass: FailureClass.CERT_ISSUANCE_FAIL, messagePatterns: [__t('certificate_request_failed'), __t('acme_error'), __t('letsencrypt_failure')], contextSignals: ['certFailed'] },
  { failureClass: FailureClass.SECRET_ROTATION_PARTIAL, messagePatterns: [__t('secret_sync_failed'), __t('partial_rotation'), __t('key_mismatch')], contextSignals: ['rotationFailed'] },
  { failureClass: FailureClass.ROLLBACK_INCOMPLETE, messagePatterns: [__t('rollback_failed'), __t('stuck_in_rollback'), __t('revert_error')], contextSignals: ['rollbackStalled'] },
  { failureClass: FailureClass.CHECKPOINT_MISSING, messagePatterns: [__t('checkpoint_not_found'), __t('missing_state_file'), __t('no_checkpoint')], contextSignals: ['checkpointLost'] },
  { failureClass: FailureClass.STATE_CORRUPTION, messagePatterns: [__t('invalid_state'), __t('corrupt_json'), __t('unparseable_state')], contextSignals: ['stateCorrupt'] },
  { failureClass: FailureClass.DUPLICATE_EXECUTION, messagePatterns: [__t('already_running'), __t('duplicate_job'), __t('concurrent_execution')], contextSignals: ['duplicateJob'] },
  { failureClass: FailureClass.CAPABILITY_MISMATCH, messagePatterns: [__t('unsupported_capability'), __t('missing_requirement'), __t('incompatible_version')], contextSignals: ['capabilityMissing'] },
  { failureClass: FailureClass.SIGNATURE_INVALID, messagePatterns: [__t('invalid_signature'), __t('bad_sig'), __t('verification_failed')], contextSignals: ['sigFailed'] },
  { failureClass: FailureClass.TTL_EXPIRED, messagePatterns: [__t('ttl_expired'), __t('token_expired'), __t('session_timeout')], contextSignals: ['ttlHit'] },
  { failureClass: FailureClass.SYMLINK_GAP, messagePatterns: [__t('too_many_levels_of_symbolic_li'), __t('broken_symlink'), __t('enoent_link')], contextSignals: ['symlinkBroken'] },
  { failureClass: FailureClass.CONTAINER_OOM, messagePatterns: ['oomkilled', __t('out_of_memory'), __t('heap_out_of_memory')], contextSignals: ['oom'] },
  { failureClass: FailureClass.HEALTHCHECK_TIMEOUT, messagePatterns: [__t('healthcheck_timeout'), __t('probe_failed'), 'unhealthy'], contextSignals: ['probeTimeout'] },
  { failureClass: FailureClass.DATABASE_UNREACHABLE, messagePatterns: [__t('db_offline'), __t('database_connection_refused'), __t('sql_timeout')], contextSignals: ['dbOffline'] },
  { failureClass: FailureClass.MIGRATION_CONFLICT, messagePatterns: [__t('migration_conflict'), __t('version_mismatch'), __t('schema_divergence')], contextSignals: ['schemaConflict'] },
  { failureClass: FailureClass.ARTIFACT_DIGEST_MISMATCH, messagePatterns: [__t('digest_mismatch'), __t('hash_mismatch'), __t('sha256_mismatch')], contextSignals: ['hashFailed'] },
  { failureClass: FailureClass.SSH_CONNECTION_DROP, messagePatterns: [__t('ssh_drop'), __t('connection_closed_by_remote_ho'), __t('broken_pipe')], contextSignals: ['sshDrop'] },
  { failureClass: FailureClass.API_RATE_LIMIT_HIT, messagePatterns: [__t('rate_limit_exceeded'), __t('429_too_many_requests'), 'throttled'], contextSignals: ['rateLimited'] },
  { failureClass: FailureClass.PARTIAL_ROLLBACK_DATA, messagePatterns: [__t('data_revert_failed'), __t('partial_table_restore'), __t('rollback_data_corrupt')], contextSignals: ['dataRevertFailed'] }
];
