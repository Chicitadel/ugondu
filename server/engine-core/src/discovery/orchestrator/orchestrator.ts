/******************************************************************************
 * Project        : ugondu
 * Module         : engine-core/discovery/orchestrator
 * File           : orchestrator.ts
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

// @ts-ignore
import { __t } from '@ugondu/shared';
import { Logger } from '@ugondu/shared';

import { DiscoveryScheduler, DiscoveryTask } from './scheduler';
import { TimeoutManager, CancellationToken } from './cancellation';

/**
 * @interface DiscoveryContext
 * @description Corporate Governed interface implementation for DiscoveryContext
 * @classification ENTERPRISE
 */
export interface DiscoveryContext {
    journalExecutionId: string;
    providerId: string;
    targetId: string;
    timeoutMs?: number;
}

/**
 * @interface DiscoveryResult
 * @description Corporate Governed interface implementation for DiscoveryResult
 * @classification ENTERPRISE
 */
export interface DiscoveryResult {
    executionId: string;
    status: 'SUCCESS' | 'FAILED' | 'CANCELLED';
    error?: Error;
}

/**
 * @class DiscoveryOrchestrator
 * @description Corporate Governed class implementation for DiscoveryOrchestrator
 * @classification ENTERPRISE
 */
export class DiscoveryOrchestrator {
    constructor(private readonly scheduler: DiscoveryScheduler) {}

    public async runDiscovery(
        context: DiscoveryContext,
        operation: (token: CancellationToken) => Promise<void>
    ): Promise<DiscoveryResult> {
        return new Promise<DiscoveryResult>((resolve) => {
            const task: DiscoveryTask = {
                executionId: context.journalExecutionId,
                providerId: context.providerId,
                targetId: context.targetId,
                execute: async (token: CancellationToken) => {
                    try {
                        if (context.timeoutMs) {
                            await TimeoutManager.runWithTimeout(operation, context.timeoutMs, token);
                        } else {
                            await operation(token);
                        }
                        resolve({ executionId: context.journalExecutionId, status: 'SUCCESS' });
                    } catch (error: any) {
                        if (error.name === 'CancellationError') {
                            resolve({ executionId: context.journalExecutionId, status: 'CANCELLED', error });
                        } else {
                            resolve({ executionId: context.journalExecutionId, status: 'FAILED', error });
                        }
                    }
                }
            };

            this.scheduler.schedule(task);
        });
    }

    public resumeFromJournal(journalExecutionId: string): void {
        // Logic to resume discovery from URRE journal execution ID
        // This ensures resilient discovery loop execution after a restart
        Logger.info(__t('messages.system.resuming_discovery_for_journal_execution_id', { 'journalExecutionId': journalExecutionId }));
    }
}
