/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Autopilot / Reconciliation Loop
 * File           : loop.ts
 * Version        : 3.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Observable Telemetry & Audit
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { Logger } from '@ugondu/shared';

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
                } catch (err: unknown) {
                    Logger.error('ReconciliationLoop tick execution encountered error', err, {
                        iteration: this.iterationCount,
                        intervalMs
                    });
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
