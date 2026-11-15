/******************************************************************************
 * Project        : Ugondu
 * Module         : move/cutover
 * File           : readiness.ts
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

export interface ReadinessCriteria {
    requireZeroReplicationLag: boolean;
    requireActiveHealthChecks: boolean;
    maxAllowedErrorRate: number;
}

/**
 * Metric providers backed by the monitoring/replication systems of the deployment.
 * Each probe is optional at construction; a probe required by the criteria but not
 * supplied blocks cutover rather than being assumed healthy.
 */
export interface ReadinessProbes {
    replicationLagMs?: () => Promise<number>;
    systemHealthy?: () => Promise<boolean>;
    errorRate?: () => Promise<number>;
}

/**
 * @interface ReadinessResult
 * @description Corporate Governed interface implementation for ReadinessResult
 * @classification ENTERPRISE
 */
export interface ReadinessResult {
    isReady: boolean;
    reasons: string[];
}

/**
 * @class ReadinessEvaluator
 * @description Corporate Governed class implementation for ReadinessEvaluator
 * @classification ENTERPRISE
 */
export class ReadinessEvaluator {
    constructor(private readonly probes: ReadinessProbes = {}) {}

    public async evaluate(criteria: ReadinessCriteria): Promise<ReadinessResult> {
        const reasons: string[] = [];

        if (criteria.requireZeroReplicationLag) {
            if (!this.probes.replicationLagMs) {
                reasons.push(__t('messages.error.readiness_probe_unavailable', { probe: 'replicationLagMs' }));
            } else {
                const lag = await this.probes.replicationLagMs();
                if (!(lag === 0)) {
                    reasons.push(__t('messages.error.readiness_replication_lag', { lag }));
                }
            }
        }

        if (criteria.requireActiveHealthChecks) {
            if (!this.probes.systemHealthy) {
                reasons.push(__t('messages.error.readiness_probe_unavailable', { probe: 'systemHealthy' }));
            } else if (!(await this.probes.systemHealthy())) {
                reasons.push(__t('messages.error.readiness_health_failed'));
            }
        }

        if (!this.probes.errorRate) {
            reasons.push(__t('messages.error.readiness_probe_unavailable', { probe: 'errorRate' }));
        } else {
            const errorRate = await this.probes.errorRate();
            if (!(errorRate <= criteria.maxAllowedErrorRate)) {
                reasons.push(__t('messages.error.readiness_error_rate', { errorRate, maxAllowed: criteria.maxAllowedErrorRate }));
            }
        }

        return {
            isReady: reasons.length === 0,
            reasons
        };
    }
}
