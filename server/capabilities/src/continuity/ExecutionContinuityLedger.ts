/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : ExecutionContinuityLedger.ts
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';

export type ContinuityExecutionState =
  | 'INITIALIZED'
  | 'PLANNING'
  | 'PLANNED'
  | 'PREVIEWING'
  | 'AUTHORIZING'
  | 'AUTHORIZED'
  | 'EXECUTING'
  | 'STEP_COMMITTED'
  | 'VERIFYING'
  | 'VERIFIED'
  | 'CERTIFIED'
  | 'PAUSED'
  | 'RESUMING'
  | 'COMPENSATING'
  | 'ROLLED_BACK'
  | 'FAILED';

export interface LedgerEntry {
  sequenceNumber: number;
  timestamp: string;
  transactionId: string;
  stepId?: string;
  state: ContinuityExecutionState;
  fencingToken: number;
  payloadDigest: string;
  previousEntryHash: string;
  entryHash: string;
  metadata?: Record<string, unknown>;
}

export interface LedgerIntegrityReport {
  valid: boolean;
  totalEntries: number;
  headHash: string;
  brokenAtSequence?: number;
  reason?: string;
}

export interface CheckpointSnapshot {
  transactionId: string;
  lastSequenceNumber: number;
  lastState: ContinuityExecutionState;
  headHash: string;
  createdAt: string;
  fencingToken: number;
}

export class ExecutionContinuityLedger {
  private readonly entries: LedgerEntry[] = [];
  private currentFencingToken: number;
  private readonly GENESIS_HASH = '0'.repeat(64);

  constructor(initialFencingToken: number = 1) {
    this.currentFencingToken = initialFencingToken;
  }

  private computeEntryHash(
    seq: number,
    ts: string,
    txId: string,
    stepId: string | undefined,
    state: ContinuityExecutionState,
    fence: number,
    payloadDigest: string,
    prevHash: string
  ): string {
    const raw = `${seq}|${ts}|${txId}|${stepId ?? ''}|${state}|${fence}|${payloadDigest}|${prevHash}`;
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Appends an immutable event to the continuity ledger.
   * Fails closed if the provided fencing token is lower than current.
   */
  public append(
    transactionId: string,
    state: ContinuityExecutionState,
    payload: unknown,
    stepId?: string,
    fencingToken?: number,
    metadata?: Record<string, unknown>
  ): LedgerEntry {
    const token = fencingToken ?? this.currentFencingToken;
    if (token < this.currentFencingToken) {
      throw new Error(
        `Fencing token violation: provided ${token} is lower than current active token ${this.currentFencingToken}`
      );
    }
    this.currentFencingToken = token;

    const sequenceNumber = this.entries.length + 1;
    const timestamp = new Date().toISOString();
    const previousEntryHash =
      this.entries.length > 0 ? this.entries[this.entries.length - 1].entryHash : this.GENESIS_HASH;

    const payloadSerialized = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    const payloadDigest = crypto.createHash('sha256').update(payloadSerialized, 'utf8').digest('hex');

    const entryHash = this.computeEntryHash(
      sequenceNumber,
      timestamp,
      transactionId,
      stepId,
      state,
      token,
      payloadDigest,
      previousEntryHash
    );

    const entry: LedgerEntry = {
      sequenceNumber,
      timestamp,
      transactionId,
      stepId,
      state,
      fencingToken: token,
      payloadDigest,
      previousEntryHash,
      entryHash,
      metadata,
    };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Cryptographically verifies the entire append-only hash chain from genesis to head.
   */
  public verifyIntegrity(): LedgerIntegrityReport {
    if (this.entries.length === 0) {
      return { valid: true, totalEntries: 0, headHash: this.GENESIS_HASH };
    }

    let prevHash = this.GENESIS_HASH;

    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      const expectedSeq = i + 1;

      if (e.sequenceNumber !== expectedSeq) {
        return {
          valid: false,
          totalEntries: this.entries.length,
          headHash: e.entryHash,
          brokenAtSequence: e.sequenceNumber,
          reason: `Sequence gap detected: expected ${expectedSeq}, got ${e.sequenceNumber}`,
        };
      }

      if (e.previousEntryHash !== prevHash) {
        return {
          valid: false,
          totalEntries: this.entries.length,
          headHash: e.entryHash,
          brokenAtSequence: e.sequenceNumber,
          reason: `Previous hash mismatch at sequence ${e.sequenceNumber}`,
        };
      }

      const recomputed = this.computeEntryHash(
        e.sequenceNumber,
        e.timestamp,
        e.transactionId,
        e.stepId,
        e.state,
        e.fencingToken,
        e.payloadDigest,
        e.previousEntryHash
      );

      if (recomputed !== e.entryHash) {
        return {
          valid: false,
          totalEntries: this.entries.length,
          headHash: e.entryHash,
          brokenAtSequence: e.sequenceNumber,
          reason: `Cryptographic digest mismatch at sequence ${e.sequenceNumber}`,
        };
      }

      prevHash = e.entryHash;
    }

    return {
      valid: true,
      totalEntries: this.entries.length,
      headHash: prevHash,
    };
  }

  /**
   * Creates an atomic checkpoint snapshot for resumption.
   */
  public createCheckpoint(transactionId: string): CheckpointSnapshot {
    const txEntries = this.entries.filter((e) => e.transactionId === transactionId);
    if (txEntries.length === 0) {
      throw new Error(`Cannot checkpoint non-existent transaction '${transactionId}'`);
    }

    const last = txEntries[txEntries.length - 1];
    return {
      transactionId,
      lastSequenceNumber: last.sequenceNumber,
      lastState: last.state,
      headHash: last.entryHash,
      createdAt: new Date().toISOString(),
      fencingToken: last.fencingToken,
    };
  }

  public getEntries(): ReadonlyArray<LedgerEntry> {
    return this.entries;
  }

  public getHead(): LedgerEntry | undefined {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : undefined;
  }
}
