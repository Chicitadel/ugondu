/******************************************************************************
 * Project        : Ugondu
 * Module         : move/cutover
 * File           : transition.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

// @ts-ignore
import { __t } from '@ugondu/shared';

export enum TransitionState {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

/**
 * @class TransitionStateMachine
 * @description Corporate Governed class implementation for TransitionStateMachine
 * @classification ENTERPRISE
 */
export class TransitionStateMachine {
    private currentState: TransitionState = TransitionState.PENDING;
    private stateHistory: { state: TransitionState; timestamp: Date }[] = [];

    public constructor() {
        this.recordState();
    }

    public getState(): TransitionState {
        return this.currentState;
    }

    public async executeTransition(task: () => Promise<void>): Promise<void> {
        if (this.currentState !== TransitionState.PENDING) {
            throw new Error(__t('messages.error.cannot_execute_transition_from_state', { 'this_currentState': this.currentState }));
        }

        this.transitionTo(TransitionState.IN_PROGRESS);

        try {
            await task();
            this.transitionTo(TransitionState.COMPLETED);
        } catch (error) {
            this.transitionTo(TransitionState.FAILED);
            throw error;
        }
    }

    private transitionTo(newState: TransitionState): void {
        this.currentState = newState;
        this.recordState();
    }

    private recordState(): void {
        this.stateHistory.push({
            state: this.currentState,
            timestamp: new Date()
        });
    }

    public getHistory() {
        return [...this.stateHistory];
    }
}
