/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : execution-continuity.spec.ts
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

import { ExecutionContinuityLedger } from '../continuity/ExecutionContinuityLedger';

describe('ExecutionContinuityLedger', () => {
  let ledger: ExecutionContinuityLedger;

  beforeEach(() => {
    ledger = new ExecutionContinuityLedger(1);
  });

  it('starts with valid integrity on empty ledger', () => {
    const report = ledger.verifyIntegrity();
    expect(report.valid).toBe(true);
    expect(report.totalEntries).toBe(0);
  });

  it('appends sequential entries and verifies cryptographic hash chain', () => {
    const tx = 'tx-cont-001';

    ledger.append(tx, 'INITIALIZED', { init: true }, undefined, 1);
    ledger.append(tx, 'PLANNING', { planRequested: true }, undefined, 1);
    ledger.append(tx, 'PLANNED', { steps: ['provision', 'certify'] }, undefined, 1);
    ledger.append(tx, 'EXECUTING', { executingStep: 0 }, 'step_0', 1);
    ledger.append(tx, 'STEP_COMMITTED', { result: 'OK' }, 'step_0', 1);
    ledger.append(tx, 'CERTIFIED', { certId: 'CERT-001' }, undefined, 1);

    const report = ledger.verifyIntegrity();
    expect(report.valid).toBe(true);
    expect(report.totalEntries).toBe(6);
    expect(ledger.getHead()?.state).toBe('CERTIFIED');
  });

  it('enforces monotonic fencing tokens and rejects lower tokens', () => {
    const tx = 'tx-cont-002';

    ledger.append(tx, 'INITIALIZED', {}, undefined, 10);
    expect(() => {
      ledger.append(tx, 'EXECUTING', {}, undefined, 9);
    }).toThrow(/Fencing token violation/);
  });

  it('detects tampering in entry state', () => {
    const tx = 'tx-cont-003';

    ledger.append(tx, 'INITIALIZED', { a: 1 }, undefined, 1);
    ledger.append(tx, 'PLANNING', { a: 2 }, undefined, 1);
    ledger.append(tx, 'EXECUTING', { a: 3 }, 's1', 1);

    // Tamper with second entry
    const mutableEntries = (ledger as any).entries;
    mutableEntries[1].state = 'FAILED';

    const report = ledger.verifyIntegrity();
    expect(report.valid).toBe(false);
    expect(report.brokenAtSequence).toBe(2);
    expect(report.reason).toContain('Cryptographic digest mismatch');
  });

  it('creates atomic checkpoints with head hash and fencing token', () => {
    const tx = 'tx-cont-004';

    ledger.append(tx, 'INITIALIZED', {}, undefined, 5);
    ledger.append(tx, 'PAUSED', { reason: 'manual_hold' }, undefined, 5);

    const cp = ledger.createCheckpoint(tx);
    expect(cp.transactionId).toBe(tx);
    expect(cp.lastSequenceNumber).toBe(2);
    expect(cp.lastState).toBe('PAUSED');
    expect(cp.fencingToken).toBe(5);
    expect(cp.headHash).toBe(ledger.getHead()?.entryHash);
  });

  it('fails to checkpoint non-existent transaction', () => {
    expect(() => {
      ledger.createCheckpoint('tx-non-existent');
    }).toThrow(/Cannot checkpoint non-existent transaction/);
  });
});
