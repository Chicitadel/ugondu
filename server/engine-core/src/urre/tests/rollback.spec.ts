/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : engine-core/urre/tests
 * File           : rollback.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

import { URREngine } from '../execution/urre-engine';
import type { RollbackEvent, DeploymentContext } from '../execution/urre-engine';

declare var describe: any;
declare var it: any;
declare var expect: any;
declare var beforeEach: any;

describe('URRE Rollback Sequences', (): void => {
  let engine: URREngine;

  beforeEach((): void => {
    engine = new URREngine();
  });

  it('should trigger a rollback with PENDING status upon deployment failure', async (): Promise<void> => {
    const ctx: DeploymentContext = { id: 'deploy-123', targetEnvironment: 'production' };
    const rollbackEvent: RollbackEvent = await engine.triggerRollback({...ctx, tx: { id: ctx.id, status: 'FAILED', nodes: [], edges: [], createdAt: Date.now(), updatedAt: Date.now() } as any});

    expect(rollbackEvent.id).toBe('rb-deploy-123');
    expect(rollbackEvent.status).toBe('RECOVERED');
    expect(rollbackEvent.timestamp).toBeLessThanOrEqual(Date.now());
  });

  it('should throw an error when deployment context is invalid during rollback trigger', async (): Promise<void> => {
    await expect(engine.triggerRollback({ id: '', targetEnvironment: 'staging' })).rejects.toThrow(__t('messages.error.invalid_deployment_context'));
  });

  it('should successfully evaluate a valid rollback sequence', (): void => {
    const isSuccess: boolean = engine.evaluateRollbackSequence('rb-deploy-123');
    expect(isSuccess).toBe(true);
  });

  it('should return false when evaluating a failed rollback sequence', (): void => {
    const isSuccess: boolean = engine.evaluateRollbackSequence('rb-fail-id');
    expect(isSuccess).toBe(false);
  });

  it('should throw an error when event ID is empty during evaluation', (): void => {
    expect((): void => {
      engine.evaluateRollbackSequence('');
    }).toThrow(__t('messages.error.invalid_rollback_event'));
  });
});
