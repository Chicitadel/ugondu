/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Doctor / Remediation
 * File           : registry.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface DeterministicOperation {
    id: string;
    type: string;
    execute: (context: unknown) => Promise<unknown>;
}

export class DeterministicOperationRegistry {
    private readonly operations: Map<string, DeterministicOperation> = new Map();

    public register(op: DeterministicOperation): void {
        this.operations.set(op.id, op);
    }

    public get(id: string): DeterministicOperation | undefined {
        return this.operations.get(id);
    }

    public has(id: string): boolean {
        return this.operations.has(id);
    }

    public list(): string[] {
        return Array.from(this.operations.keys());
    }
}
