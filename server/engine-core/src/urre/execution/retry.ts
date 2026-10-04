/******************************************************************************
 * Project        : URRE
 * Module         : Execution
 * File           : retry.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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

/**
 * @interface RetryConfig
 * @description Corporate Governed interface implementation for RetryConfig
 * @classification ENTERPRISE
 */
export interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    jitterFactor: number;
}

/**
 * @class RetryManager
 * @description Corporate Governed class implementation for RetryManager
 * @classification ENTERPRISE
 */
export class RetryManager {
    constructor(private config: RetryConfig) {}

    public async executeWithRetry<T>(
        operation: () => Promise<T>,
        reconciliationAction: () => Promise<void>
    ): Promise<T> {
        let attempt = 0;

        while (true) {
            attempt++;
            try {
                const result = await Promise.race([
                    operation(),
                    this.timeout(this.config.timeoutMs)
                ]);
                return result as T;
            } catch (error) {
                if (attempt >= this.config.maxAttempts) {
                    throw new Error(__t('messages.error.max_retry_attempts_reached_last_error', { 'error': error }));
                }

                Logger.info(__t('messages.system.attempt_failed_reconciling', { 'attempt': attempt }));
                await reconciliationAction(); // MANDATORY reconciliation before retry

                const delay = this.calculateBackoff(attempt);
                await this.sleep(delay);
            }
        }
    }

    private calculateBackoff(attempt: number): number {
        const exponentialDelay = this.config.baseDelayMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * this.config.jitterFactor * exponentialDelay;
        const delayWithJitter = exponentialDelay + jitter;
        return Math.min(delayWithJitter, this.config.maxDelayMs);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private timeout(ms: number): Promise<never> {
        return new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
    }
}
