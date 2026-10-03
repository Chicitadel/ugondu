/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Autonomy
 * File           : authority.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AutonomyLevel } from './levels';

export interface DelegationRecord {
    entityId: string;
    level: AutonomyLevel;
    grantedAt: number;
    expiresAt: number;
}

/**
 * @class AuthorityManager
 * @description Manages autonomous authority delegation, revocation, and validation.
 * @classification ENTERPRISE
 */
export class AuthorityManager {
    private readonly delegations: Map<string, DelegationRecord> = new Map();

    public delegateAuthority(entityId: string, level: AutonomyLevel, durationSecs: number): void {
        const now = Date.now();
        const expiresAt = now + Math.max(1, durationSecs) * 1000;
        this.delegations.set(entityId, {
            entityId,
            level,
            grantedAt: now,
            expiresAt
        });
    }

    public revokeAuthority(entityId: string): void {
        this.delegations.delete(entityId);
    }

    public checkAuthority(entityId: string): AutonomyLevel {
        const record = this.delegations.get(entityId);
        if (!record) {
            return AutonomyLevel.L0_MANUAL;
        }
        if (Date.now() > record.expiresAt) {
            this.delegations.delete(entityId);
            return AutonomyLevel.L0_MANUAL;
        }
        return record.level;
    }

    public listActiveDelegations(): DelegationRecord[] {
        const now = Date.now();
        const active: DelegationRecord[] = [];
        for (const [id, record] of this.delegations.entries()) {
            if (now <= record.expiresAt) {
                active.push(record);
            } else {
                this.delegations.delete(id);
            }
        }
        return active;
    }
}
