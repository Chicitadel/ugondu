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
 * - AI Governed
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

export interface RetryConfig {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    timeoutMs: number;
    jitterFactor: number;
}

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
                    throw new Error(`Max retry attempts reached. Last error: ${error}`);
                }

                console.log(`Attempt ${attempt} failed. Reconciling...`);
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
