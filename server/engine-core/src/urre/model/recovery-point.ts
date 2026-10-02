/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : recovery-point.ts
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

import { RecoveryPointState } from './state';
import { VerificationResult } from './checkpoint';

export type RecoveryPointClass = 'RP0' | 'RP1' | 'RP2' | 'RP3' | 'RP4' | 'RP5';

export interface DatabaseBackupRef {
  backupId: string;
  provider: string;
  createdAt: number;
  sizeBytes: number;
  verified: boolean;
}

export interface InfrastructureSnapshot {
  resourceCount: number;
  digest: string;
  timestamp: number;
}

export interface DnsSnapshot {
  records: Array<{ name: string; type: string; value: string }>;
}

export interface RecoveryPoint {
  recoveryPointId: string;
  executionId: string;
  createdAt: number;
  label: string;
  state: RecoveryPointState;
  pointClass: RecoveryPointClass;
  
  applicationVersion: string;
  artifactDigests: Record<string, string>;
  configDigests: Record<string, string>;
  secretVersionRefs: Record<string, string>;
  
  infrastructureGraph: InfrastructureSnapshot;
  dnsState: DnsSnapshot;
  tlsCertDigests: Record<string, string>;
  dependencyVersions: Record<string, string>;
  
  databaseBackupRef: DatabaseBackupRef | null;
  backupVerified: boolean;
  backupRestoreTestedAt: number | null;
  
  containerImageDigests: Record<string, string>;
  kubernetesManifestDigests: Record<string, string>;
  
  verificationResults: VerificationResult[];
  verifiedAt: number | null;
  policyVersionHash: string;
  evidenceRef: string | null;
  signature: string;
  id?: string;
  timestamp?: number;
  status?: string;
  metadata?: any;
}

export interface RecoveryPointCertificate {
  recoveryPointId: string;
  sourceStateDigest?: string;
  backupArtifactDigest?: string;
  createdAt?: number;
  retentionDays?: number;
  encryptionMethod?: string;
  storageLocation?: string;
  restoreProcedure?: string;
  verificationStatus?: string;
  rpoSeconds?: number;
  rtoSeconds?: number;
  dependencies?: string[];
  verifiedAt?: number;
  digest?: string;
  isValid?: boolean;
  certifiedBy?: string;
}
