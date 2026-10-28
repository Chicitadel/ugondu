/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Doctor / Safety
 * File           : loop-prevention.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export class LoopPrevention {
    private readonly attemptCounts: Map<string, number> = new Map();
    private readonly maxRetries: number;

    constructor(maxRetries: number = 3) {
        this.maxRetries = maxRetries;
    }

    public prevent(operation: { id: string } | string): boolean {
        const id = typeof operation === 'string' ? operation : operation.id;
        const current = this.attemptCounts.get(id) || 0;
        if (current >= this.maxRetries) {
            return true; // Blocked: loop prevented
        }
        this.attemptCounts.set(id, current + 1);
        return false; // Allowed to proceed
    }

    public reset(id: string): void {
        this.attemptCounts.delete(id);
    }
}
