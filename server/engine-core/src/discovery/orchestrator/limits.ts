/******************************************************************************
 * Project        : ugondu
 * Module         : engine-core/discovery/orchestrator
 * File           : limits.ts
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
 * @interface LimitConfig
 * @description Corporate Governed interface implementation for LimitConfig
 * @classification ENTERPRISE
 */
export interface LimitConfig {
    globalMax: number;
    providerMax: number;
    targetMax: number;
}

/**
 * @class ConcurrencyThrottler
 * @description Corporate Governed class implementation for ConcurrencyThrottler
 * @classification ENTERPRISE
 */
export class ConcurrencyThrottler {
    private activeGlobal: number = 0;
    private activeProviders: Map<string, number> = new Map();
    private activeTargets: Map<string, number> = new Map();

    constructor(private readonly config: LimitConfig) {}

    public canAcquire(providerId: string, targetId: string): boolean {
        if (this.activeGlobal >= this.config.globalMax) return false;
        
        const providerActive = this.activeProviders.get(providerId) || 0;
        if (providerActive >= this.config.providerMax) return false;

        const targetActive = this.activeTargets.get(targetId) || 0;
        if (targetActive >= this.config.targetMax) return false;

        return true;
    }

    public acquire(providerId: string, targetId: string): void {
        if (!this.canAcquire(providerId, targetId)) {
            throw new Error(__t('messages.error.concurrency_limit_exceeded_for_provider_or_ta', { 'providerId': providerId, 'targetId': targetId }));
        }

        this.activeGlobal++;
        this.activeProviders.set(providerId, (this.activeProviders.get(providerId) || 0) + 1);
        this.activeTargets.set(targetId, (this.activeTargets.get(targetId) || 0) + 1);
    }

    public release(providerId: string, targetId: string): void {
        if (this.activeGlobal > 0) this.activeGlobal--;
        
        const providerActive = this.activeProviders.get(providerId) || 0;
        if (providerActive > 0) {
            this.activeProviders.set(providerId, providerActive - 1);
        }

        const targetActive = this.activeTargets.get(targetId) || 0;
        if (targetActive > 0) {
            this.activeTargets.set(targetId, targetActive - 1);
        }
    }
}
