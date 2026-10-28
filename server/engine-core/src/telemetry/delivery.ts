/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Telemetry / Delivery
 * File           : delivery.ts
 * Version        : 2.0.0
 * Author         : Observability Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { randomUUID } from 'crypto';

/**
 * @interface TimelineEvent
 * @description Corporate Governed interface implementation for TimelineEvent
 * @classification ENTERPRISE
 */
export interface TimelineEvent {
    eventId: string;
    phase: 'INIT' | 'PREFLIGHT' | 'EXECUTE' | 'VERIFY' | 'COMPLETE' | 'FAILED' | 'ROLLED_BACK';
    timestamp: number;
    stepIndex?: number;
    actionName?: string;
    details: string;
}

/**
 * @class DeliveryObservabilityEngine
 * @description Corporate Governed class implementation for DeliveryObservabilityEngine
 * @classification ENTERPRISE
 */
export class DeliveryObservabilityEngine {
    private timeline: TimelineEvent[] = [];

    public recordEvent(phase: TimelineEvent['phase'], details: string, stepIndex?: number, actionName?: string): void {
        this.timeline.push({
            eventId: `evt_${Date.now()}_${randomUUID()}`,
            phase,
            timestamp: Date.now(),
            stepIndex,
            actionName,
            details
        });
    }

    public getTimeline(): TimelineEvent[] {
        return [...this.timeline];
    }

    public computeExecutionSummary(): {
        totalEvents: number;
        finalPhase: string;
        durationMs: number;
        hasFailures: boolean;
    } {
        if (this.timeline.length === 0) {
            return { totalEvents: 0, finalPhase: 'NONE', durationMs: 0, hasFailures: false };
        }
        const start = this.timeline[0].timestamp;
        const end = this.timeline[this.timeline.length - 1].timestamp;
        const hasFailures = this.timeline.some(e => e.phase === 'FAILED');

        return {
            totalEvents: this.timeline.length,
            finalPhase: this.timeline[this.timeline.length - 1].phase,
            durationMs: Math.max(0, end - start),
            hasFailures
        };
    }
}
