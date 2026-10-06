import { __t } from "@ugondu/shared";

/******************************************************************************
 * Project        : Ugondu
 * Module         : move/rollback
 * File           : planner.ts
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

export enum RollbackStrategy {
    DNS_FLIP = 'DNS_FLIP',
    FORWARD_RECOVERY = 'FORWARD_RECOVERY'
}

/**
 * @interface RollbackPlan
 * @description Corporate Governed interface implementation for RollbackPlan
 * @classification ENTERPRISE
 */
export interface RollbackPlan {
    feasible: boolean;
    strategy: RollbackStrategy;
    reasoning: string[];
}

/**
 * @interface SystemState
 * @description Corporate Governed interface implementation for SystemState
 * @classification ENTERPRISE
 */
export interface SystemState {
    targetReceivedWritesCount: number;
    sourceIsStrictlyQuiesced: boolean;
}

/**
 * @class RollbackPlanner
 * @description Corporate Governed class implementation for RollbackPlanner
 * @classification ENTERPRISE
 */
export class RollbackPlanner {
    public calculatePlan(state: SystemState): RollbackPlan {
        const reasoning: string[] = [];

        if (state.targetReceivedWritesCount > 0 && state.sourceIsStrictlyQuiesced) {
            reasoning.push(__t('msg_target_has_received_writes_and_source_is'));
            reasoning.push(__t('msg_rollback_via_dns_flip_would_result_in_da'));

            return {
                feasible: false,
                strategy: RollbackStrategy.FORWARD_RECOVERY,
                reasoning
            };
        }

        reasoning.push(__t('msg_safe_to_perform_dns_flip_rollback'));
        return {
            feasible: true,
            strategy: RollbackStrategy.DNS_FLIP,
            reasoning
        };
    }
}
