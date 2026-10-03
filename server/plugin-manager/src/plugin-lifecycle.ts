// @ts-ignore
import { __t } from '../../shared/i18n';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Plugin Manager — Plugin Lifecycle
 * File           : plugin-lifecycle.ts
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
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

/**
 * Plugin deactivation lifecycle states.
 *
 * INVARIANT:
 * - Plugin executions in progress MUST NEVER be killed mid-flight on downgrade.
 * - Deactivation follows: ACTIVE → DEPRECATION_PENDING → DISABLE_NEW_INVOCATIONS
 *     → DRAIN_ACTIVE_EXECUTIONS → DISABLE → RETAIN_METADATA
 */
export type PluginLifecycleState =
  | 'ACTIVE'
  | 'DEPRECATION_PENDING'
  | 'DISABLE_NEW_INVOCATIONS'
  | 'DRAIN_ACTIVE_EXECUTIONS'
  | 'DISABLE'
  | 'RETAIN_METADATA';

const DEACTIVATION_TRANSITIONS: Partial<Record<PluginLifecycleState, PluginLifecycleState>> = {
  ACTIVE:                  'DEPRECATION_PENDING',
  DEPRECATION_PENDING:     'DISABLE_NEW_INVOCATIONS',
  DISABLE_NEW_INVOCATIONS: 'DRAIN_ACTIVE_EXECUTIONS',
  DRAIN_ACTIVE_EXECUTIONS: 'DISABLE',
  DISABLE:                 'RETAIN_METADATA',
};

/**
 * @interface PluginLifecycleRecord
 * @description Corporate Governed interface implementation for PluginLifecycleRecord
 * @classification ENTERPRISE
 */
export interface PluginLifecycleRecord {
  pluginId:         string;
  tenantId:         string;
  state:            PluginLifecycleState;
  transitionedAt:   string;    // ISO-8601
  reason:           string;
  activeExecutions: number;   // snapshot at time of record
}

/**
 * @class PluginLifecycle
 * @description Corporate Governed class implementation for PluginLifecycle
 * @classification ENTERPRISE
 */
export class PluginLifecycle {
  private state: PluginLifecycleState;
  private readonly history: PluginLifecycleRecord[] = [];

  constructor(
    private readonly pluginId: string,
    private readonly tenantId: string,
    initialState: PluginLifecycleState = 'ACTIVE'
  ) {
    this.state = initialState;
  }

  get currentState(): PluginLifecycleState {
    return this.state;
  }

  /** Begin the graceful deactivation sequence. */
  beginDeactivation(reason: string, activeExecutions: number): PluginLifecycleRecord {
    const next = DEACTIVATION_TRANSITIONS[this.state];
    if (!next) {
      throw new Error(
        `Cannot begin deactivation for plugin '${this.pluginId}': ` +
        `current state '${this.state}' has no deactivation path.`
      );
    }
    return this.transitionTo(next, reason, activeExecutions);
  }

  /** Advance one step in the deactivation sequence. */
  advanceDeactivation(reason: string, activeExecutions: number): PluginLifecycleRecord | null {
    const next = DEACTIVATION_TRANSITIONS[this.state];
    if (!next) return null;  // already at terminal state
    return this.transitionTo(next, reason, activeExecutions);
  }

  /** Check if new invocations are allowed. */
  allowsNewInvocations(): boolean {
    return this.state === 'ACTIVE';
  }

  /** Check if runtime execution is permitted. */
  allowsRuntimeExecution(): boolean {
    return this.state === 'ACTIVE' || this.state === 'DEPRECATION_PENDING';
  }

  /** Check if the plugin is fully deactivated. */
  isFullyDeactivated(): boolean {
    return this.state === 'DISABLE' || this.state === 'RETAIN_METADATA';
  }

  getHistory(): PluginLifecycleRecord[] {
    return [...this.history];
  }

  private transitionTo(
    next:             PluginLifecycleState,
    reason:           string,
    activeExecutions: number
  ): PluginLifecycleRecord {
    this.state = next;
    const record: PluginLifecycleRecord = {
      pluginId:         this.pluginId,
      tenantId:         this.tenantId,
      state:            next,
      transitionedAt:   new Date().toISOString(),
      reason,
      activeExecutions,
    };
    this.history.push(record);
    return record;
  }
}
