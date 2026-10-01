/******************************************************************************
 * Project        : Ugondu
 * Module         : move/cutover
 * File           : traffic-authority.ts
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

export interface ITrafficAdapter {
    id: string;
    drain(timeoutMs: number): Promise<void>;
    resume(): Promise<void>;
    status(): Promise<TrafficStatus>;
}

export enum TrafficStatus {
    ACTIVE = 'ACTIVE',
    DRAINING = 'DRAINING',
    QUIESCED = 'QUIESCED',
    ERROR = 'ERROR'
}

export class TrafficAuthority {
    private adapters: Map<string, ITrafficAdapter> = new Map();

    public registerAdapter(adapter: ITrafficAdapter): void {
        if (this.adapters.has(adapter.id)) {
            throw new Error(`Adapter with ID ${adapter.id} is already registered.`);
        }
        this.adapters.set(adapter.id, adapter);
    }

    public getAdapters(): ITrafficAdapter[] {
        return Array.from(this.adapters.values());
    }

    public async checkGlobalStatus(): Promise<Record<string, TrafficStatus>> {
        const statuses: Record<string, TrafficStatus> = {};
        for (const [id, adapter] of this.adapters) {
            statuses[id] = await adapter.status();
        }
        return statuses;
    }
}
