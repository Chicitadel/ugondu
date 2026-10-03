/******************************************************************************
 * Project        : Ugondu Engine Core
 * Module         : Autopilot / Reconciliation
 * File           : loop.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export class ReconciliationLoop {
    private active: boolean = false;
    private timer: NodeJS.Timeout | null = null;
    private iterationCount: number = 0;

    public start(intervalMs: number = 5000, onTick?: () => Promise<void>): void {
        if (this.active) return;
        this.active = true;
        this.timer = setInterval(async () => {
            this.iterationCount++;
            if (onTick) {
                try {
                    await onTick();
                } catch {
                    // Suppress and continue loop
                }
            }
        }, intervalMs);
    }

    public stop(): void {
        this.active = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    public isRunning(): boolean {
        return this.active;
    }

    public getIterationCount(): number {
        return this.iterationCount;
    }
}
