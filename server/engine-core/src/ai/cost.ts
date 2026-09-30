/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Cost
 * File           : cost.ts
 * Version        : 2.0.0
 * Author         : Model Cascade Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

export interface ModelRoutingDecision {
    selectedModel: 'local-fast' | 'cloud-standard' | 'cloud-reasoning';
    estimatedCostUsd: number;
    reason: string;
}

export interface InfrastructureCostComparison {
    currentMonthlyUsd: number;
    proposedMonthlyUsd: number;
    monthlySavingsUsd: number;
    percentageSavings: number;
}

export class ModelCascadeCostEngine {
    public static selectOptimalModel(taskComplexity: 'SIMPLE' | 'INTERMEDIATE' | 'COMPLEX'): ModelRoutingDecision {
        switch (taskComplexity) {
            case 'SIMPLE':
                // Simple repo file scan / lint: local or ultra-light model
                return {
                    selectedModel: 'local-fast',
                    estimatedCostUsd: 0.0001,
                    reason: 'LOCAL_FAST_FOR_HEURISTIC_PARSING'
                };
            case 'INTERMEDIATE':
                // Single-service standard deployment planning
                return {
                    selectedModel: 'cloud-standard',
                    estimatedCostUsd: 0.002,
                    reason: 'STANDARD_MODEL_FOR_STANDARD_TOPOLOGY'
                };
            case 'COMPLEX':
                // Multi-cluster / sovereign disaster recovery simulation
                return {
                    selectedModel: 'cloud-reasoning',
                    estimatedCostUsd: 0.015,
                    reason: 'HIGH_REASONING_FOR_MULTI_GRAPH_CHAOS_DR'
                };
            default:
                throw new Error(__t('invalid_ctx'));
        }
    }

    public static compareInfrastructureCost(
        currentMonthlyUsd: number,
        proposedMonthlyUsd: number
    ): InfrastructureCostComparison {
        const savings = Math.max(0, currentMonthlyUsd - proposedMonthlyUsd);
        const percentage = currentMonthlyUsd > 0 ? parseFloat(((savings / currentMonthlyUsd) * 100).toFixed(1)) : 0;

        return {
            currentMonthlyUsd,
            proposedMonthlyUsd,
            monthlySavingsUsd: savings,
            percentageSavings: percentage
        };
    }
}
