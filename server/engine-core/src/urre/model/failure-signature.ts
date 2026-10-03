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
  { failureClass: FailureClass.PROCESS_CRASH, messagePatterns: ['sigsegv', 'segmentation fault', 'core dumped'], contextSignals: ['processDead'] },
  { failureClass: FailureClass.POWER_LOSS, messagePatterns: ['power failure', 'unexpected shutdown', 'acpi'], contextSignals: ['powerLost'] },
  { failureClass: FailureClass.DISK_FULL, messagePatterns: ['no space left', 'enospc', 'disk full', 'storage limit'], contextSignals: ['diskFull'] },
  { failureClass: FailureClass.NETWORK_LOSS, messagePatterns: ['network unreachable', 'enotfound', 'connection reset', 'econnrefused'], contextSignals: ['networkOffline'] },
  { failureClass: FailureClass.PARTIAL_COPY, messagePatterns: ['partial copy', 'incomplete transfer', 'bytes mismatch'], contextSignals: ['copyIncomplete'] },
  { failureClass: FailureClass.CORRUPT_BACKUP, messagePatterns: ['backup corrupt', 'invalid archive', 'checksum failed'], contextSignals: ['backupInvalid'] },
  { failureClass: FailureClass.PARTIAL_DB_MIGRATION, messagePatterns: ['migration aborted', 'partial transaction', 'dirty database'], contextSignals: ['migrationFailed'] },
  { failureClass: FailureClass.LOCK_TIMEOUT, messagePatterns: ['lock wait timeout', 'failed to acquire lock', 'deadlock'], contextSignals: ['lockTimeout'] },
  { failureClass: FailureClass.PROVIDER_TIMEOUT, messagePatterns: ['provider timeout', 'gateway timeout', '504 timeout'], contextSignals: ['apiTimeout'] },
  { failureClass: FailureClass.PARTIAL_PROVISION, messagePatterns: ['provisioning partially', 'resource stuck', 'create failed halfway'], contextSignals: ['provisionStalled'] },
  { failureClass: FailureClass.DNS_PROPAGATION_STALL, messagePatterns: ['dns not propagated', 'nxdomain', 'unresolved host'], contextSignals: ['dnsStall'] },
  { failureClass: FailureClass.CERT_ISSUANCE_FAIL, messagePatterns: ['certificate request failed', 'acme error', 'letsencrypt failure'], contextSignals: ['certFailed'] },
  { failureClass: FailureClass.SECRET_ROTATION_PARTIAL, messagePatterns: ['secret sync failed', 'partial rotation', 'key mismatch'], contextSignals: ['rotationFailed'] },
  { failureClass: FailureClass.ROLLBACK_INCOMPLETE, messagePatterns: ['rollback failed', 'stuck in rollback', 'revert error'], contextSignals: ['rollbackStalled'] },
  { failureClass: FailureClass.CHECKPOINT_MISSING, messagePatterns: ['checkpoint not found', 'missing state file', 'no checkpoint'], contextSignals: ['checkpointLost'] },
  { failureClass: FailureClass.STATE_CORRUPTION, messagePatterns: ['invalid state', 'corrupt json', 'unparseable state'], contextSignals: ['stateCorrupt'] },
  { failureClass: FailureClass.DUPLICATE_EXECUTION, messagePatterns: ['already running', 'duplicate job', 'concurrent execution'], contextSignals: ['duplicateJob'] },
  { failureClass: FailureClass.CAPABILITY_MISMATCH, messagePatterns: ['unsupported capability', 'missing requirement', 'incompatible version'], contextSignals: ['capabilityMissing'] },
  { failureClass: FailureClass.SIGNATURE_INVALID, messagePatterns: ['invalid signature', 'bad sig', 'verification failed'], contextSignals: ['sigFailed'] },
  { failureClass: FailureClass.TTL_EXPIRED, messagePatterns: ['ttl expired', 'token expired', 'session timeout'], contextSignals: ['ttlHit'] },
  { failureClass: FailureClass.SYMLINK_GAP, messagePatterns: ['too many levels of symbolic links', 'broken symlink', 'enoent link'], contextSignals: ['symlinkBroken'] },
  { failureClass: FailureClass.CONTAINER_OOM, messagePatterns: ['oomkilled', 'out of memory', 'heap out of memory'], contextSignals: ['oom'] },
  { failureClass: FailureClass.HEALTHCHECK_TIMEOUT, messagePatterns: ['healthcheck timeout', 'probe failed', 'unhealthy'], contextSignals: ['probeTimeout'] },
  { failureClass: FailureClass.DATABASE_UNREACHABLE, messagePatterns: ['db offline', 'database connection refused', 'sql timeout'], contextSignals: ['dbOffline'] },
  { failureClass: FailureClass.MIGRATION_CONFLICT, messagePatterns: ['migration conflict', 'version mismatch', 'schema divergence'], contextSignals: ['schemaConflict'] },
  { failureClass: FailureClass.ARTIFACT_DIGEST_MISMATCH, messagePatterns: ['digest mismatch', 'hash mismatch', 'sha256 mismatch'], contextSignals: ['hashFailed'] },
  { failureClass: FailureClass.SSH_CONNECTION_DROP, messagePatterns: ['ssh drop', 'connection closed by remote host', 'broken pipe'], contextSignals: ['sshDrop'] },
  { failureClass: FailureClass.API_RATE_LIMIT_HIT, messagePatterns: ['rate limit exceeded', '429 too many requests', 'throttled'], contextSignals: ['rateLimited'] },
  { failureClass: FailureClass.PARTIAL_ROLLBACK_DATA, messagePatterns: ['data revert failed', 'partial table restore', 'rollback data corrupt'], contextSignals: ['dataRevertFailed'] }
];
