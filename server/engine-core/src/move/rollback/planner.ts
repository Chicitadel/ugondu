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

export interface RollbackPlan {
    feasible: boolean;
    strategy: RollbackStrategy;
    reasoning: string[];
}

export interface SystemState {
    targetReceivedWritesCount: number;
    sourceIsStrictlyQuiesced: boolean;
}

export class RollbackPlanner {
    public calculatePlan(state: SystemState): RollbackPlan {
        const reasoning: string[] = [];

        if (state.targetReceivedWritesCount > 0 && state.sourceIsStrictlyQuiesced) {
            reasoning.push('Target has received writes and source is strictly quiesced.');
            reasoning.push('Rollback via DNS flip would result in data loss.');
            
            return {
                feasible: false,
                strategy: RollbackStrategy.FORWARD_RECOVERY,
                reasoning
            };
        }

        reasoning.push('Safe to perform DNS flip rollback.');
        return {
            feasible: true,
            strategy: RollbackStrategy.DNS_FLIP,
            reasoning
        };
    }
}
