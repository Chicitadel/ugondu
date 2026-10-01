/******************************************************************************
 * Project        : Ugondu
 * Module         : move/cutover
 * File           : quiescence.ts
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

import { ITrafficAdapter, TrafficStatus } from './traffic-authority';

export class QuiescenceManager {
    /**
     * Drains all provided traffic adapters and awaits their quiescence.
     * @param adapters List of adapters to drain
     * @param timeoutMs Maximum time to wait for drain completion
     */
    public async achieveQuiescence(adapters: ITrafficAdapter[], timeoutMs: number): Promise<void> {
        if (!adapters || adapters.length === 0) {
            throw new Error("No traffic adapters provided for quiescence.");
        }

        const drainPromises = adapters.map(async (adapter) => {
            try {
                await adapter.drain(timeoutMs);
                
                // Verify the status is actually quiesced
                const status = await adapter.status();
                if (status !== TrafficStatus.QUIESCED) {
                    throw new Error(`Adapter ${adapter.id} failed to reach QUIESCED state. Current state: ${status}`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                throw new Error(`Failed to drain adapter ${adapter.id}: ${errorMessage}`);
            }
        });

        await Promise.all(drainPromises);
    }
}
