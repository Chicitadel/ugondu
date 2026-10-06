/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core
 * File           : state-machine.ts
 * Version        : 1.0.0
 * Author         : Antigravity AI
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { ResourceState, InvalidTransitionError } from '../model/resource-state';
import { TwinResource } from '../model/twin-resource';
import { ALLOWED_TRANSITIONS } from './transition-rules';

/**
 * @class TwinStateMachine
 * @description Corporate Governed class implementation for TwinStateMachine
 * @classification ENTERPRISE
 */
export class TwinStateMachine {
  public isValidTransition(from: ResourceState, to: ResourceState): boolean {
    const allowed = ALLOWED_TRANSITIONS[from];
    return allowed !== undefined && allowed.includes(to);
  }

  public transition(resource: TwinResource, newState: ResourceState): TwinResource {
    if (!this.isValidTransition(resource.state, newState)) {
      throw new InvalidTransitionError(resource.state, newState);
    }

    const now = new Date();

    resource.stateHistory.push({
      from: resource.state,
      to: newState,
      at: now
    });

    resource.state = newState;
    resource.observedAt = now;

    return resource;
  }
}
