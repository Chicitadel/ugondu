/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : resume-planner.spec.ts
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

import { ResumePlanner } from '../continuity/ResumePlanner';
import { ReconciliationReport } from '../continuity/EnvironmentReconciler';

describe('ResumePlanner', () => {
  let planner: ResumePlanner;

  beforeEach(() => {
    planner = new ResumePlanner();
  });

  it('fails closed with BLOCKED_UNPROBED if reconciliation is unprobed', () => {
    const unprobed: ReconciliationReport = {
      status: 'INDETERMINATE_UNPROBED',
      desiredCount: 1,
      observedCount: 0,
      deltas: [],
      requiresDestructiveApproval: false,
      reconciliationDigest: 'UNPROBED_FAIL_CLOSED',
    };

    const plan = planner.generateResumePlan('tx-resume-001', unprobed);
    expect(plan.status).toBe('BLOCKED_UNPROBED');
    expect(plan.executableSteps).toBe(0);
  });

  it('returns ALREADY_CONVERGED when reconciliation is in sync', () => {
    const inSync: ReconciliationReport = {
      status: 'IN_SYNC',
      desiredCount: 2,
      observedCount: 2,
      deltas: [
        { resourceId: 'r1', resourceType: 'S3', action: 'NOOP', requiresApproval: false, reason: '' },
      ],
      requiresDestructiveApproval: false,
      reconciliationDigest: 'hash1',
    };

    const plan = planner.generateResumePlan('tx-resume-002', inSync);
    expect(plan.status).toBe('ALREADY_CONVERGED');
    expect(plan.executableSteps).toBe(0);
  });

  it('generates minimal-delta resume plan skipping NOOPs and scheduling CREATE/UPDATE', () => {
    const delta: ReconciliationReport = {
      status: 'DELTA_DETECTED',
      desiredCount: 2,
      observedCount: 1,
      deltas: [
        { resourceId: 'r1', resourceType: 'S3', action: 'NOOP', requiresApproval: false, reason: 'Already in sync' },
        { resourceId: 'r2', resourceType: 'EC2', action: 'CREATE', requiresApproval: false, reason: 'Creation required' },
      ],
      requiresDestructiveApproval: false,
      reconciliationDigest: 'hash2',
    };

    const plan = planner.generateResumePlan('tx-resume-003', delta);
    expect(plan.status).toBe('READY');
    expect(plan.totalSteps).toBe(2);
    expect(plan.skippedSteps).toBe(1);
    expect(plan.executableSteps).toBe(1);
    expect(plan.steps[0].action).toBe('NOOP');
    expect(plan.steps[0].status).toBe('SKIPPED');
    expect(plan.steps[1].action).toBe('CREATE');
    expect(plan.steps[1].status).toBe('PENDING');
  });

  it('blocks plan with AWAITING_APPROVAL when destructive action lacks approval token', () => {
    const destructive: ReconciliationReport = {
      status: 'DRIFT_DETECTED',
      desiredCount: 0,
      observedCount: 1,
      deltas: [
        {
          resourceId: 'orphan-1',
          resourceType: 'EC2',
          action: 'DESTRUCTIVE_DELETE',
          requiresApproval: true,
          reason: 'Unmanaged resource',
        },
      ],
      requiresDestructiveApproval: true,
      reconciliationDigest: 'hash3',
    };

    const plan = planner.generateResumePlan('tx-resume-004', destructive);
    expect(plan.status).toBe('AWAITING_APPROVAL');
    expect(plan.approvalRequired).toBe(true);
    expect(plan.steps[0].status).toBe('BLOCKED');
  });

  it('unblocks destructive action when valid approval token is provided', () => {
    const destructive: ReconciliationReport = {
      status: 'DRIFT_DETECTED',
      desiredCount: 0,
      observedCount: 1,
      deltas: [
        {
          resourceId: 'orphan-1',
          resourceType: 'EC2',
          action: 'DESTRUCTIVE_DELETE',
          requiresApproval: true,
          reason: 'Unmanaged resource',
        },
      ],
      requiresDestructiveApproval: true,
      reconciliationDigest: 'hash3',
    };

    const plan = planner.generateResumePlan('tx-resume-005', destructive, {
      destructiveApprovalToken: 'approval-token-xyz-123456789',
    });

    expect(plan.status).toBe('READY');
    expect(plan.approvalRequired).toBe(false);
    expect(plan.steps[0].status).toBe('APPROVED');
  });
});
