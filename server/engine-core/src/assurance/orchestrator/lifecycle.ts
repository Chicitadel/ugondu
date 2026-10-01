/******************************************************************************
 * Project        : Ugondu Assurance Engine
 * Module         : Assurance - Orchestrator
 * File           : lifecycle.ts
 * Version        : 1.0.0
 * Author         : Architecture Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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
export type State = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export class LifecycleManager {
    private state: State = 'IDLE';

    public transitionTo(newState: State): void {
        const allowedTransitions: Record<State, State[]> = {
            'IDLE': ['RUNNING'],
            'RUNNING': ['COMPLETED', 'FAILED'],
            'COMPLETED': ['IDLE'],
            'FAILED': ['IDLE']
        };

        if (allowedTransitions[this.state].includes(newState)) {
            this.state = newState;
        } else {
            throw new Error(`Invalid transition from ${this.state} to ${newState}`);
        }
    }

    public getState(): State {
        return this.state;
    }
}
