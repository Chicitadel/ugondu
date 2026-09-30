/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Analytics / Trends
 * File           : trends.ts
 * Version        : 2.0.0
 * Author         : Delivery Intelligence Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { DoraAnalyticsEngine, DoraMetricsResult, DoraTier } from './dora';

export type DoraPerformanceTier = 'ELITE' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface DoraMetricsInput {
    leadTimeHours: number;
    deploymentFrequencyDays: number;
    mttrHours: number;
    changeFailureRate: number;
    reworkRate: number;
}

export interface DoraBenchmarkReport {
    timestamp: number;
    metrics: DoraMetricsInput;
    tier: DoraPerformanceTier;
    industryComparison: {
        leadTimeRating: string;
        frequencyRating: string;
        mttrRating: string;
        cfrRating: string;
    };
}

export class DoraTrendsEngine {
    public static computeBenchmarkReport(metrics: DoraMetricsInput): DoraBenchmarkReport {
        // Industry benchmark classification rules (DORA State of DevOps)
        let leadTimeRating = 'LOW';
        if (metrics.leadTimeHours <= 24) leadTimeRating = 'ELITE';
        else if (metrics.leadTimeHours <= 168) leadTimeRating = 'HIGH';
        else if (metrics.leadTimeHours <= 720) leadTimeRating = 'MEDIUM';

        let mttrRating = 'LOW';
        if (metrics.mttrHours <= 1) mttrRating = 'ELITE';
        else if (metrics.mttrHours <= 24) mttrRating = 'HIGH';
        else if (metrics.mttrHours <= 168) mttrRating = 'MEDIUM';

        let cfrRating = 'LOW';
        if (metrics.changeFailureRate <= 0.05) cfrRating = 'ELITE';
        else if (metrics.changeFailureRate <= 0.15) cfrRating = 'HIGH';
        else if (metrics.changeFailureRate <= 0.30) cfrRating = 'MEDIUM';

        // Overall tier: weakest link among primary metrics
        const ratings = [leadTimeRating, mttrRating, cfrRating];
        let tier: DoraPerformanceTier = 'ELITE';
        if (ratings.includes('LOW')) tier = 'LOW';
        else if (ratings.includes('MEDIUM')) tier = 'MEDIUM';
        else if (ratings.includes('HIGH')) tier = 'HIGH';

        return {
            timestamp: Date.now(),
            metrics,
            tier,
            industryComparison: {
                leadTimeRating,
                frequencyRating: metrics.deploymentFrequencyDays <= 1 ? 'ELITE' : 'HIGH',
                mttrRating,
                cfrRating
            }
        };
    }
}
