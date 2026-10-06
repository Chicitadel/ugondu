/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : twin-builder.ts
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

// @ts-ignore
import { __t } from '@ugondu/shared';

import { TwinEvent, EnvironmentTwinState } from '../projection/projector';
import { TwinResource } from '../model/twin-resource';
import { ResourceState } from '../model/resource-state';
import { TwinStateMachine } from '../state-machine/state-machine';

/**
 * @class TwinBuilder
 * @description Corporate Governed class implementation for TwinBuilder
 * @classification ENTERPRISE
 */
export class TwinBuilder {
    private stateMachine = new TwinStateMachine();
    private resources: TwinResource[] = [];
    private lastEventId?: string;

    public build(events: TwinEvent[]): EnvironmentTwinState {
        for (const event of events) {
            this.applyEvent(event);
            this.lastEventId = event.eventId;
        }
        return this.getCurrentState();
    }

    public getCurrentState(): EnvironmentTwinState {
        const resourcesMap = new Map<string, any>();
        for (const res of this.resources) {
            resourcesMap.set(res.id, res);
        }
        return {
            resources: resourcesMap,
            lastEventId: this.lastEventId
        };
    }

    private applyEvent(event: TwinEvent): void {
        const existingIndex = this.resources.findIndex(r => r.id === event.resourceId);

        switch (event.eventType) {
            case 'CREATED':
                if (existingIndex === -1) {
                    const newResource: TwinResource = {
                        id: event.resourceId,
                        type: event.payload.type || 'unknown',
                        name: event.payload.name || 'unnamed',
                        provider: event.payload.provider || 'unknown',
                        state: event.payload.state || ResourceState.DISCOVERED,
                        observedAt: new Date(event.timestamp),
                        metadata: event.payload.metadata || {},
                        stateHistory: []
                    };
                    this.resources.push(newResource);
                }
                break;
            case 'UPDATED':
                if (existingIndex !== -1) {
                    const resource = this.resources[existingIndex];
                    if (event.payload.state && event.payload.state !== resource.state) {
                        this.stateMachine.transition(resource, event.payload.state as ResourceState);
                    }
                    if (event.payload.metadata) {
                        resource.metadata = { ...resource.metadata, ...event.payload.metadata };
                    }
                }
                break;
            case 'DELETED':
                if (existingIndex !== -1) {
                    this.resources.splice(existingIndex, 1);
                }
                break;
            default:
            throw new Error(__t('messages.error.unknown_event_type', { 'event_eventType': event.eventType }));
        }
    }
}
