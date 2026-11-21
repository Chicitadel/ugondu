/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Doctor / Safety
 * File           : circuit-breaker.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export class CircuitBreaker {
    private readonly brokenOperations: Set<string> = new Set();

    public break(operation: { id: string } | string): void {
        const id = typeof operation === 'string' ? operation : operation.id;
        this.brokenOperations.add(id);
    }

    public isOpen(operationId: string): boolean {
        return this.brokenOperations.has(operationId);
    }

    public reset(operationId: string): void {
        this.brokenOperations.delete(operationId);
    }
}
