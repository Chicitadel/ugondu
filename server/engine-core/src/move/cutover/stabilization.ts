/******************************************************************************
 * Project        : Ugondu
 * Module         : move/cutover
 * File           : stabilization.ts
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
import { __t } from '../../../../shared/i18n';

/**
 * @class StabilizationMonitor
 * @description Corporate Governed class implementation for StabilizationMonitor
 * @classification ENTERPRISE
 */
export class StabilizationMonitor {
    private monitoringWindowMs: number;

    constructor(monitoringWindowMs: number) {
        if (monitoringWindowMs <= 0) {
            throw new Error(__t('messages.error.monitoring_window_must_be_positive'));
        }
        this.monitoringWindowMs = monitoringWindowMs;
    }

    public async waitForStabilization(checkHealth: () => Promise<boolean>): Promise<boolean> {
        const startTime = Date.now();
        const pollInterval = Math.min(1000, this.monitoringWindowMs / 10);

        while (Date.now() - startTime < this.monitoringWindowMs) {
            const isHealthy = await checkHealth();
            if (!isHealthy) {
                return false;
            }
            await this.delay(pollInterval);
        }

        return true;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
