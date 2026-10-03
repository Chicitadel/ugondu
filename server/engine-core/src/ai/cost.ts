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

/**
 * @interface ModelRoutingDecision
 * @description Corporate Governed interface implementation for ModelRoutingDecision
 * @classification ENTERPRISE
 */
export interface ModelRoutingDecision {
    selectedModel: 'local-fast' | 'cloud-standard' | 'cloud-reasoning';
    estimatedCostUsd: number;
    reason: string;
}

/**
 * @interface InfrastructureCostComparison
 * @description Corporate Governed interface implementation for InfrastructureCostComparison
 * @classification ENTERPRISE
 */
export interface InfrastructureCostComparison {
    currentMonthlyUsd: number;
    proposedMonthlyUsd: number;
    monthlySavingsUsd: number;
    percentageSavings: number;
}

/**
 * @class ModelCascadeCostEngine
 * @description Corporate Governed class implementation for ModelCascadeCostEngine
 * @classification ENTERPRISE
 */
export class ModelCascadeCostEngine {
    public static selectOptimalModel(taskComplexity: 'SIMPLE' | 'INTERMEDIATE' | 'COMPLEX'): ModelRoutingDecision {
        switch (taskComplexity) {
            case 'SIMPLE':
                // Simple repo file scan / lint: local or ultra-light model
                return {
                    selectedModel: 'local-fast',
                    estimatedCostUsd: 0.0001,
                    reason: __t('ui.responses.local_fast_for_heuristic_parsing')
                };
            case 'INTERMEDIATE':
                // Single-service standard deployment planning
                return {
                    selectedModel: 'cloud-standard',
                    estimatedCostUsd: 0.002,
                    reason: __t('ui.responses.standard_model_for_standard_topology')
                };
            case 'COMPLEX':
                // Multi-cluster / sovereign disaster recovery simulation
                return {
                    selectedModel: 'cloud-reasoning',
                    estimatedCostUsd: 0.015,
                    reason: __t('ui.responses.high_reasoning_for_multi_graph_chaos_dr')
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
