// @ts-ignore
import { __t } from '../../../shared/i18n';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Capability State Machine
 * File           : CapabilityStateMachine.ts
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

import type { CapabilityState } from '../capability-registry/CapabilityDefinition';
import type { CapabilityDependencyGraph } from
  '../capability-dependency-graph/CapabilityDependencyGraph';

type TransitionMap = Partial<Record<CapabilityState, CapabilityState[]>>;

/**
 * Valid state transitions for the 12-state capability lifecycle.
 * Any transition not listed here is PROHIBITED.
 */
const VALID_TRANSITIONS: TransitionMap = {
  AVAILABLE:          ['ACTIVE', 'PENDING_ACTIVATION', 'UNSUPPORTED'],
  ACTIVE:             ['IN_USE', 'LIMITED', 'SUSPENDED', 'DEACTIVATING', 'GRACE', 'BLOCKED'],
  IN_USE:             ['ACTIVE', 'LIMITED', 'SUSPENDED', 'BLOCKED'],
  LIMITED:            ['ACTIVE', 'SUSPENDED', 'DEACTIVATING', 'BLOCKED'],
  PENDING_UPGRADE:    ['ACTIVE', 'BLOCKED'],
  PENDING_ACTIVATION: ['ACTIVE', 'BLOCKED', 'SUSPENDED'],
  SUSPENDED:          ['ACTIVE', 'DEACTIVATING', 'BLOCKED'],
  DEACTIVATING:       ['DEACTIVATED'],
  DEACTIVATED:        ['AVAILABLE', 'PENDING_ACTIVATION'],
  GRACE:              ['ACTIVE', 'DEACTIVATING', 'SUSPENDED'],
  BLOCKED:            ['AVAILABLE', 'SUSPENDED'],
  UNSUPPORTED:        ['AVAILABLE'],
};

/**
 * @class CapabilityStateMachine
 * @description Corporate Governed class implementation for CapabilityStateMachine
 * @classification ENTERPRISE
 */
export class CapabilityStateMachine {
  private state: CapabilityState;

  constructor(
    initialState: CapabilityState = 'AVAILABLE',
    private readonly dependencyGraph?: CapabilityDependencyGraph,
    private readonly capabilityId?: string,
  ) {
    this.state = initialState;
  }

  get currentState(): CapabilityState {
    return this.state;
  }

  /** Transition to the next state. Throws if transition is invalid. */
  transition(nextState: CapabilityState): void {
    const allowed = VALID_TRANSITIONS[this.state] ?? [];
    if (!allowed.includes(nextState)) {
      throw new Error(
        `Invalid capability state transition: ${this.state} → ${nextState}. ` +
        `Allowed from ${this.state}: [${allowed.join(', ')}]`
      );
    }
    this.state = nextState;
  }

  /** Check if a transition would be valid without performing it. */
  canTransition(nextState: CapabilityState): boolean {
    const allowed = VALID_TRANSITIONS[this.state] ?? [];
    return allowed.includes(nextState);
  }

  /** Check if the capability is currently usable. */
  isUsable(): boolean {
    return this.state === 'ACTIVE' || this.state === 'IN_USE';
  }

  /** Check if the capability is in a deactivation flow. */
  isDeactivating(): boolean {
    return this.state === 'DEACTIVATING' || this.state === 'GRACE';
  }

  /**
   * Transition with dependency safety enforcement.
   *
   * INVARIANT (CEG Safety Preservation): If transitioning to DEACTIVATING and a
   * dependency graph is configured, the transition is BLOCKED when any currently-active
   * capability depends on this capability.
   *
   * @param nextState          - Target capability state
   * @param activeCapabilities - Currently active capability IDs on this tenant
   */
  transitionWithDependencyCheck(
    nextState: CapabilityState,
    activeCapabilities: string[] = [],
  ): void {
    if (nextState === 'DEACTIVATING' && this.dependencyGraph && this.capabilityId) {
      const report = this.dependencyGraph.validateDeactivation(
        this.capabilityId,
        activeCapabilities,
      );
      if (report.result === 'BLOCKED_BY_DEPENDENTS') {
        throw new Error(
          `Cannot deactivate capability '${this.capabilityId}': ` +
          (report.recommendation ??
            `Blocked by active dependents: [${report.blockedBy.join(', ')}]`),
        );
      }
    }
    this.transition(nextState);
  }
}
