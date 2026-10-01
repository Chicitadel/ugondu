/******************************************************************************
 * Project        : ugondu
 * Module         : engine-core/discovery/orchestrator
 * File           : scheduler.ts
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

import { ConcurrencyThrottler } from './limits';
import { CancellationToken } from './cancellation';

export interface DiscoveryTask {
    executionId: string;
    providerId: string;
    targetId: string;
    execute: (token: CancellationToken) => Promise<void>;
}

export class DiscoveryScheduler {
    private queue: DiscoveryTask[] = [];
    private running: boolean = false;

    constructor(private readonly throttler: ConcurrencyThrottler) {}

    public schedule(task: DiscoveryTask): void {
        this.queue.push(task);
        this.processQueue();
    }

    private async processQueue(): Promise<void> {
        if (this.running) return;
        this.running = true;

        try {
            while (this.queue.length > 0) {
                const index = this.queue.findIndex(t => 
                    this.throttler.canAcquire(t.providerId, t.targetId)
                );

                if (index === -1) {
                    // No task can run right now, wait for a spot
                    break;
                }

                const task = this.queue.splice(index, 1)[0];
                this.throttler.acquire(task.providerId, task.targetId);

                // Start execution without awaiting, to process more items
                this.executeTask(task).catch(console.error);
            }
        } finally {
            this.running = false;
        }
    }

    private async executeTask(task: DiscoveryTask): Promise<void> {
        const token = new CancellationToken();
        try {
            await task.execute(token);
        } finally {
            this.throttler.release(task.providerId, task.targetId);
            this.processQueue(); // Try processing queue after task completes
        }
    }
}
