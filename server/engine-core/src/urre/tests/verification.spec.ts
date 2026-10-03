/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : engine-core/urre/tests
 * File           : verification.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { BackupVerifier } from '../recovery/verification';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any;
declare var it: any;
declare var expect: any;

const HASH = 'a'.repeat(64);

function makePoint(overrides: Record<string, unknown> = {}): any {
  return {
    recoveryPointId: 'rp-001',
    executionId: 'exec-1',
    createdAt: 1000,
    label: 'pre-deploy',
    state: 'CREATED',
    pointClass: 'RP2',
    applicationVersion: '1.0.0',
    artifactDigests: { app: HASH },
    configDigests: { cfg: HASH },
    secretVersionRefs: {},
    infrastructureGraph: { resourceCount: 1, digest: HASH, timestamp: 1000 },
    dnsState: { records: [] },
    tlsCertDigests: {},
    dependencyVersions: {},
    databaseBackupRef: { backupId: 'bk-1', provider: 'aws', createdAt: 1000, sizeBytes: 4096, verified: true },
    backupVerified: true,
    backupRestoreTestedAt: 2000,
    containerImageDigests: {},
    kubernetesManifestDigests: {},
    verificationResults: [],
    verifiedAt: null,
    policyVersionHash: HASH,
    evidenceRef: null,
    signature: 'sig',
    ...overrides,
  };
}

describe('BackupVerifier', () => {
  it('certifies a verified backup using a recorded restore test and a real SHA-256 digest', async () => {
    const cert = await new BackupVerifier().validateBackup(makePoint());
    expect(cert.isValid).toBe(true);
    expect(cert.recoveryPointId).toBe('rp-001');
    expect(/^[a-f0-9]{64}$/.test(cert.digest as string)).toBe(true);
  });

  it('produces a deterministic digest that ignores signature but reflects content changes', async () => {
    const v = new BackupVerifier();
    const a = await v.validateBackup(makePoint());
    const b = await v.validateBackup(makePoint({ signature: 'different' }));
    const c = await v.validateBackup(makePoint({ applicationVersion: '2.0.0' }));
    expect(a.digest).toBe(b.digest);
    expect(a.digest === c.digest).toBe(false);
  });

  it('rejects a point without a database backup reference', async () => {
    let message = '';
    try { await new BackupVerifier().validateBackup(makePoint({ databaseBackupRef: null })); } catch (e: any) { message = e.message; }
    expect(message).toBe(__t('messages.error.backup_validation_failed_for', { point_id: 'rp-001' }));
  });

  it('rejects an empty or unverified backup', async () => {
    const v = new BackupVerifier();
    let failures = 0;
    for (const o of [
      { databaseBackupRef: { backupId: 'bk-1', provider: 'aws', createdAt: 1000, sizeBytes: 0, verified: true } },
      { databaseBackupRef: { backupId: 'bk-1', provider: 'aws', createdAt: 1000, sizeBytes: 10, verified: false } },
      { backupVerified: false },
    ]) {
      try { await v.validateBackup(makePoint(o)); } catch { failures++; }
    }
    expect(failures).toBe(3);
  });

  it('rejects malformed artifact digests', async () => {
    let threw = false;
    try { await new BackupVerifier().validateBackup(makePoint({ artifactDigests: { app: 'not-a-sha256' } })); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('fails closed when no restore test is recorded and no probe is supplied', async () => {
    let threw = false;
    try { await new BackupVerifier().validateBackup(makePoint({ backupRestoreTestedAt: null })); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('rejects a recorded restore test that predates the backup', async () => {
    let threw = false;
    try { await new BackupVerifier().validateBackup(makePoint({ backupRestoreTestedAt: 500 })); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('delegates the read-test to the restore probe when supplied', async () => {
    const ok = new BackupVerifier({ readTest: async () => true });
    const bad = new BackupVerifier({ readTest: async () => false });
    const cert = await ok.validateBackup(makePoint({ backupRestoreTestedAt: null }));
    expect(cert.isValid).toBe(true);
    let threw = false;
    try { await bad.validateBackup(makePoint()); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});
