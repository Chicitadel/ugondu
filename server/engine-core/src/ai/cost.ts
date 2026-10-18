/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Cost
 * File           : cost.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { ModelCatalog } from './model-catalog';

export interface ModelRoutingDecision {
    selectedModel: 'local-fast' | 'cloud-standard' | 'cloud-reasoning';
    catalogAlias: 'deployment-classifier' | 'general-chat' | 'policy-advisor';
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
    public static selectOptimalModel(
        taskComplexity: 'SIMPLE' | 'INTERMEDIATE' | 'COMPLEX'
    ): ModelRoutingDecision {
        switch (taskComplexity) {
            case 'SIMPLE':
                return {
                    selectedModel: 'local-fast',
                    catalogAlias: 'deployment-classifier',
                    estimatedCostUsd: 0.0001,
                    reason: __t('ui.responses.local_fast_for_heuristic_parsing'),
                };
            case 'INTERMEDIATE':
                return {
                    selectedModel: 'cloud-standard',
                    catalogAlias: 'general-chat',
                    estimatedCostUsd: 0.002,
                    reason: __t('ui.responses.standard_model_for_standard_topology'),
                };
            case 'COMPLEX':
                return {
                    selectedModel: 'cloud-reasoning',
                    catalogAlias: 'policy-advisor',
                    estimatedCostUsd: 0.015,
                    reason: __t('ui.responses.high_reasoning_for_multi_graph_chaos_dr'),
                };
            default:
                throw new Error(__t('msg_invalid_deploymentcontext_missing_requir'));
        }
    }

    public static estimateCatalogUsageCostUsd(
        modelAlias: string,
        inputTokens: number,
        outputTokens: number,
        catalog?: ModelCatalog
    ): number {
        const activeCatalog = catalog ?? new ModelCatalog();
        const model = activeCatalog.getModel(modelAlias);
        if (!model) {
            return 0;
        }
        const cost =
            (Math.max(0, inputTokens) / 1000) * model.policy.costPer1kInput +
            (Math.max(0, outputTokens) / 1000) * model.policy.costPer1kOutput;
        return Number(cost.toFixed(6));
    }

    public static compareInfrastructureCost(
        currentMonthlyUsd: number,
        proposedMonthlyUsd: number
    ): InfrastructureCostComparison {
        const savings = Math.max(0, currentMonthlyUsd - proposedMonthlyUsd);
        const percentage =
            currentMonthlyUsd > 0
                ? parseFloat(((savings / currentMonthlyUsd) * 100).toFixed(1))
                : 0;

        return {
            currentMonthlyUsd,
            proposedMonthlyUsd,
            monthlySavingsUsd: savings,
            percentageSavings: percentage,
        };
    }
}
