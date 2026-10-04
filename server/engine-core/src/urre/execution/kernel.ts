/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core / URRE / Execution
 * File           : kernel.ts
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

import * as crypto from 'crypto';

// @ts-ignore
import { __t } from '@ugondu/shared';
import { Logger } from '@ugondu/shared';

import { ExecutionState } from '../model/state';
import { TypedAction } from '../model/checkpoint';
import { CheckpointManager } from './checkpoint';
import { RetryManager } from './retry';
import { IdempotencyResolver } from './idempotency';

/**
 * Closed-world set of action types recognised by the execution kernel.
 * Any action whose `type` is not in this set is rejected before execution.
 */
const KNOWN_ACTION_TYPES: ReadonlySet<string> = new Set([
  'DEPLOY',
  'CONFIGURE',
  'MIGRATE',
  'ROLLBACK',
  'SNAPSHOT',
  'VERIFY',
  'CLEANUP',
  'SCALE',
  'RESTART',
  'DRAIN',
]);

/**
 * @interface JournalRecord
 * @description Lightweight journal record written before and after action execution.
 *              A full ExecutionJournalEntry is maintained by the outer orchestrator;
 *              these records are appended to an in-process journal buffer.
 * @classification ENTERPRISE
 */
interface JournalRecord {
  executionId: string;
  actionId: string;
  actionType: string;
  phase: 'PRE_EXECUTION' | 'POST_EXECUTION' | 'FAILURE';
  stateHash: string;
  timestamp: number;
  durationMs?: number;
  errorMessage?: string;
}

/**
 * @class ExecutionKernel
 * @description Protected service that coordinates state machine transitions and
 *              action execution. Validates every action against the closed-world
 *              typed action set, enforces timeouts via RetryManager, records
 *              pre/post state hashes in the journal, and emits i18n-localised
 *              log entries on success and failure.
 * @classification ENTERPRISE
 */
class ExecutionKernel {
  private currentState: ExecutionState = 'DRAFT';
  private readonly executionId: string;
  private readonly journal: JournalRecord[] = [];

  constructor(
    private readonly checkpointManager: CheckpointManager,
    private readonly retryManager: RetryManager,
    private readonly idempotencyResolver: IdempotencyResolver,
  ) {
    this.executionId = crypto.randomUUID();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  public transition(newState: ExecutionState): void {
    Logger.info(
      __t('messages.system.transitioning_from_to', {
        this_currentState: this.currentState,
        newState,
      }),
    );
    this.currentState = newState;
  }

  /**
   * Execute a single typed action within the URRE execution kernel.
   *
   * Steps:
   *  1. Validate action type against the closed-world set.
   *  2. Record pre-execution state hash in the journal.
   *  3. Execute the action with timeout enforcement via RetryManager.
   *  4. Record post-execution state hash and duration in the journal.
   *  5. Emit success log.
   *  On failure: record failure journal entry and throw a localised error.
   */
  public async executeAction(action: TypedAction): Promise<void> {
    this.validateActionType(action);

    const preHash = this.computeStateHash(action);
    const startMs = Date.now();

    this.appendJournal({
      executionId: this.executionId,
      actionId: action.actionId,
      actionType: action.type,
      phase: 'PRE_EXECUTION',
      stateHash: preHash,
      timestamp: startMs,
    });

    try {
      await this.retryManager.executeWithRetry(
        async (): Promise<void> => {
          await this.dispatchAction(action);
        },
        async (): Promise<void> => {
          // Mandatory reconciliation: transition to RECONCILING state before each retry
          this.transition('RECONCILING');
        },
      );
    } catch (error) {
      const durationMs = Date.now() - startMs;
      const postHash = this.computeStateHash(action);

      this.appendJournal({
        executionId: this.executionId,
        actionId: action.actionId,
        actionType: action.type,
        phase: 'FAILURE',
        stateHash: postHash,
        timestamp: Date.now(),
        durationMs,
        errorMessage: String(error),
      });

      this.transition('FAILED');

      throw new Error(
        __t('messages.error.action_execution_failed', {
          actionType: action.type,
          error,
        }),
      );
    }

    const durationMs = Date.now() - startMs;
    const postHash = this.computeStateHash(action);

    this.appendJournal({
      executionId: this.executionId,
      actionId: action.actionId,
      actionType: action.type,
      phase: 'POST_EXECUTION',
      stateHash: postHash,
      timestamp: Date.now(),
      durationMs,
    });

    Logger.info(
      __t('messages.system.action_executed', {
        actionType: action.type,
        durationMs,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Guard: reject unknown action types at the kernel boundary.
   */
  private validateActionType(action: TypedAction): void {
    if (!KNOWN_ACTION_TYPES.has(action.type)) {
      throw new Error(
        __t('messages.error.action_execution_failed', {
          actionType: action.type,
          error: __t('messages.error.unknown_action_type', { actionType: action.type, allowed: [...KNOWN_ACTION_TYPES].join(', ') }),
        }),
      );
    }
  }

  /**
   * Compute a deterministic SHA-256 hash of the combined action payload and
   * current kernel state. Used as the pre/post state marker in the journal.
   */
  private computeStateHash(action: TypedAction): string {
    const material = JSON.stringify({
      state: this.currentState,
      actionId: action.actionId,
      type: action.type,
      payload: action.payload,
    });
    return crypto.createHash('sha256').update(material, 'utf8').digest('hex');
  }

  /**
   * Dispatch the action. Each action type maps to a defined execution contract
   * enforced via the TypedAction.safetyContract. The kernel transitions state
   * accordingly before and after dispatch.
   */
  private async dispatchAction(action: TypedAction): Promise<void> {
    this.transition('EXECUTING');

    // Honour timeout from the safety contract if present.
    const timeoutMs = action.safetyContract.timeoutMs ?? 30_000;
    await Promise.race([
      this.runActionPayload(action),
      this.rejectAfter(timeoutMs, action.actionId),
    ]);

    this.transition('VERIFYING');
  }

  /**
   * Run the action payload. For the kernel layer the payload is treated as an
   * opaque async task. Concrete provider adapters registered in the
   * AdapterRegistry supply the actual implementation.
   */
  private async runActionPayload(action: TypedAction): Promise<void> {
    // The kernel delegates concrete work to provider adapters.  At this layer
    // we honour the contract fields; actual I/O is performed by the adapter.
    if (typeof action.payload === 'function') {
      await (action.payload as () => Promise<void>)();
    }
    // Non-callable payloads are pure data descriptors — the adapter is
    // responsible for interpreting them.
  }

  private rejectAfter(ms: number, actionId: string): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Action '${actionId}' timed out after ${ms}ms`)),
        ms,
      ),
    );
  }

  private appendJournal(record: JournalRecord): void {
    this.journal.push(record);
  }

  /** Read-only view of the in-process journal — used by tests and auditors. */
  public getJournal(): ReadonlyArray<JournalRecord> {
    return this.journal;
  }
}

// Export as a protected singleton service — external callers must obtain a
// reference via the dependency injection container; they cannot instantiate
// ExecutionKernel directly.
export const protectedKernel = new ExecutionKernel(
  new CheckpointManager(),
  new RetryManager({
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10_000,
    timeoutMs: 30_000,
    jitterFactor: 0.2,
  }),
  new IdempotencyResolver(),
);
