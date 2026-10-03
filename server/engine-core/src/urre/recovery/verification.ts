/******************************************************************************
 * Project        : URRE Engine Core
 * Module         : URRE Recovery
 * File           : verification.ts
 * Version        : 1.0.0
 * Author         : Corporate Engineer
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';

import { createHash } from 'crypto';
import { RecoveryPoint, RecoveryPointCertificate, DatabaseBackupRef } from '../model/recovery-point';
import { verifyRecoveryAuthority, shouldHaltRecovery } from './authority-check';
import type { UppiePreflightContext } from '../admission/authorization-readiness';

const SHA256_HEX = /^[a-f0-9]{64}$/i;

/**
 * Provider-specific restore read-test. Supplied by the deployment (storage adapter);
 * when absent, the verifier relies solely on a recorded restore test and fails closed otherwise.
 */
export interface BackupRestoreProbe {
  readTest(ref: DatabaseBackupRef): Promise<boolean>;
}

/** Deterministic JSON with sorted keys so digests are reproducible across processes. */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`).join(',')}}`;
}

/**
 * @class BackupVerifier
 * @description Corporate Governed class implementation for BackupVerifier
 * @classification ENTERPRISE
 */
export class BackupVerifier {
  constructor(private readonly restoreProbe?: BackupRestoreProbe) {}

  public async validateBackup(point: RecoveryPoint): Promise<RecoveryPointCertificate> {
    // Validate backup (integrity, read-test, digest)
    const isIntegrityValid = this.checkIntegrity(point);
    const isReadTestPassed = isIntegrityValid && (await this.performReadTest(point));
    const digest = this.calculateDigest(point);

    if (!isIntegrityValid || !isReadTestPassed) {
      throw new Error(__t('messages.error.backup_validation_failed_for', { 'point_id': point.recoveryPointId }));
    }

    return {
      recoveryPointId: point.recoveryPointId,
      backupArtifactDigest: digest,
      verifiedAt: Date.now(),
      digest: digest,
      isValid: true,
      certifiedBy: 'BackupVerifier'
    } as RecoveryPointCertificate;
  }

  /** Structural integrity: backup reference present, flagged verified, non-empty, and every recorded digest is SHA-256. */
  private checkIntegrity(point: RecoveryPoint): boolean {
    const ref = point.databaseBackupRef;
    if (!ref || !ref.backupId || !(ref.sizeBytes > 0) || !ref.verified || !point.backupVerified) {
      return false;
    }
    const digestSets = [
      point.artifactDigests,
      point.configDigests,
      point.tlsCertDigests,
      point.containerImageDigests,
      point.kubernetesManifestDigests,
    ];
    return digestSets.every((set) => Object.values(set ?? {}).every((d) => SHA256_HEX.test(d)));
  }

  /** Restore read-test via the provider probe; without a probe, only a recorded restore test counts. */
  private async performReadTest(point: RecoveryPoint): Promise<boolean> {
    const ref = point.databaseBackupRef;
    if (!ref) return false;
    if (this.restoreProbe) {
      return this.restoreProbe.readTest(ref);
    }
    return point.backupRestoreTestedAt !== null && point.backupRestoreTestedAt >= ref.createdAt;
  }

  /** SHA-256 over the canonical form of the recovery point, excluding its own signature and verification results. */
  private calculateDigest(point: RecoveryPoint): string {
    const { signature: _signature, verificationResults: _results, ...content } = point;
    return createHash('sha256').update(canonicalize(content)).digest('hex');
  }
}

/**
 * Guard: run authority check before executing any recovery mutation.
 * Returns true if recovery may proceed.
 * Returns false and logs detail if recovery must halt.
 */
export function checkRecoveryAuthority(
  operationId:   string,
  executionId:   string,
  uppieContext?: UppiePreflightContext
): boolean {
  const report = verifyRecoveryAuthority(operationId, executionId, uppieContext);
  if (shouldHaltRecovery(report)) {
    // Caller must handle: escalate to human, block recovery, surface incident
    return false;
  }
  return true;
}
