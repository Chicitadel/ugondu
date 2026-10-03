/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Safety
 * File           : rate-limit.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface RateLimitPolicy {
    maxRequests: number;
    timeWindowSeconds: number;
}

/**
 * @class RateLimiter
 * @description Sliding window rate-limiting controller for automated remediation.
 * @classification ENTERPRISE
 */
export class RateLimiter {
    private readonly executionHistory: Map<string, number[]> = new Map();

    public checkLimit(entityId: string, policy: RateLimitPolicy): boolean {
        const now = Date.now();
        const windowMs = policy.timeWindowSeconds * 1000;
        const timestamps = this.executionHistory.get(entityId) || [];
        const validTimestamps = timestamps.filter(t => now - t <= windowMs);
        return validTimestamps.length < policy.maxRequests;
    }

    public recordExecution(entityId: string): void {
        const now = Date.now();
        const timestamps = this.executionHistory.get(entityId) || [];
        timestamps.push(now);
        this.executionHistory.set(entityId, timestamps);
    }

    public reset(entityId: string): void {
        this.executionHistory.delete(entityId);
    }
}
