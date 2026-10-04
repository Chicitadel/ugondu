/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : projector.ts
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

/**
 * @interface TwinEvent
 * @description Corporate Governed interface implementation for TwinEvent
 * @classification ENTERPRISE
 */
export interface TwinEvent {
    eventId: string;
    resourceId: string;
    eventType: 'CREATED' | 'UPDATED' | 'DELETED';
    payload: any;
    timestamp: number;
}

/**
 * @interface EnvironmentTwinState
 * @description Corporate Governed interface implementation for EnvironmentTwinState
 * @classification ENTERPRISE
 */
export interface EnvironmentTwinState {
    resources: Map<string, any>;
    lastEventId?: string;
}

/**
 * @class TwinProjector
 * @description Corporate Governed class implementation for TwinProjector
 * @classification ENTERPRISE
 */
export class TwinProjector {
    public project(events: TwinEvent[], currentState: EnvironmentTwinState): EnvironmentTwinState {
        const nextState: EnvironmentTwinState = {
            resources: new Map(currentState.resources),
            lastEventId: currentState.lastEventId
        };

        for (const event of events) {
            this.applyEvent(event, nextState);
            nextState.lastEventId = event.eventId;
        }

        return nextState;
    }

    private applyEvent(event: TwinEvent, state: EnvironmentTwinState): void {
        switch (event.eventType) {
            case 'CREATED':
            case 'UPDATED':
                state.resources.set(event.resourceId, event.payload);
                break;
            case 'DELETED':
                state.resources.delete(event.resourceId);
                break;
            default:
                throw new Error(__t('messages.error.unknown_event_type', { 'event_eventType': event.eventType }));
        }
    }
}
