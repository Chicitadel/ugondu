/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : environment-reconciler.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { EnvironmentReconciler } from '../continuity/EnvironmentReconciler';

describe('EnvironmentReconciler', () => {
  let reconciler: EnvironmentReconciler;

  beforeEach(() => {
    reconciler = new EnvironmentReconciler();
  });

  it('fails closed as INDETERMINATE_UNPROBED when probe is unverified', () => {
    const report = reconciler.reconcile(
      [{ id: 'res-1', type: 'S3_BUCKET', properties: { name: 'app-bucket' } }],
      {
        probedAt: new Date().toISOString(),
        verified: false,
        resources: [],
      }
    );

    expect(report.status).toBe('INDETERMINATE_UNPROBED');
    expect(report.reconciliationDigest).toBe('UNPROBED_FAIL_CLOSED');
  });

  it('reports IN_SYNC when desired and observed resources are identical', () => {
    const report = reconciler.reconcile(
      [{ id: 'res-1', type: 'S3_BUCKET', properties: { name: 'app-bucket', versioning: true } }],
      {
        probedAt: new Date().toISOString(),
        verified: true,
        evidenceDigest: 'sha256:abc123456789',
        resources: [{ id: 'res-1', type: 'S3_BUCKET', properties: { name: 'app-bucket', versioning: true } }],
      }
    );

    expect(report.status).toBe('IN_SYNC');
    expect(report.deltas.length).toBe(1);
    expect(report.deltas[0].action).toBe('NOOP');
    expect(report.requiresDestructiveApproval).toBe(false);
  });

  it('reports DELTA_DETECTED and CREATE action when desired resource is absent', () => {
    const report = reconciler.reconcile(
      [{ id: 'res-new', type: 'EC2_INSTANCE', properties: { instanceType: 't3.micro' } }],
      {
        probedAt: new Date().toISOString(),
        verified: true,
        evidenceDigest: 'sha256:abc123456789',
        resources: [],
      }
    );

    expect(report.status).toBe('DELTA_DETECTED');
    expect(report.deltas[0].action).toBe('CREATE');
    expect(report.deltas[0].resourceId).toBe('res-new');
  });

  it('reports DRIFT_DETECTED and UPDATE action when configuration diverges', () => {
    const report = reconciler.reconcile(
      [{ id: 'res-1', type: 'RDS_INSTANCE', properties: { engineVersion: '15.4' } }],
      {
        probedAt: new Date().toISOString(),
        verified: true,
        evidenceDigest: 'sha256:abc123456789',
        resources: [{ id: 'res-1', type: 'RDS_INSTANCE', properties: { engineVersion: '14.2' } }],
      }
    );

    expect(report.status).toBe('DRIFT_DETECTED');
    expect(report.deltas[0].action).toBe('UPDATE');
  });

  it('detects orphaned unmanaged resources and flags destructive approval requirement', () => {
    const report = reconciler.reconcile(
      [],
      {
        probedAt: new Date().toISOString(),
        verified: true,
        evidenceDigest: 'sha256:abc123456789',
        resources: [{ id: 'res-orphan', type: 'SECURITY_GROUP', properties: { port: 22 } }],
      }
    );

    expect(report.status).toBe('DRIFT_DETECTED');
    expect(report.requiresDestructiveApproval).toBe(true);
    expect(report.deltas[0].action).toBe('DESTRUCTIVE_DELETE');
    expect(report.deltas[0].requiresApproval).toBe(true);
  });
});
