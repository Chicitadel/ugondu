import { __t } from "@ugondu/shared";

/******************************************************************************
 * Project        : Ugondu Engine Core
 * Module         : Autopilot / Remediation
 * File           : strategies.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface StrategyDefinition {
    strategyId: string;
    name: string;
    description: string;
    steps: string[];
}

export class RemediationStrategies {
    private readonly strategies: Map<string, StrategyDefinition> = new Map([
        ['NETWORK_TIMEOUT', {
            strategyId: 'strat-net-retry',
            name: __t('exponential_backoff_network_re'),
            description: __t('msg_retries_transient_network_communication'),
            steps: ['validate_dns', 'test_ping', 'retry_request']
        }],
        ['SERVICE_CRASH', {
            strategyId: 'strat-svc-restart',
            name: __t('safe_container_restart'),
            description: __t('msg_drains_connections_and_restarts_failing'),
            steps: ['drain_traffic', 'restart_container', 'verify_health']
        }],
        ['AUTHORIZATION_DRIFT', {
            strategyId: 'strat-auth-reapply',
            name: __t('reapply_frozen_authority_matri'),
            description: __t('msg_reconciles_live_iam_with_uppie_declared'),
            steps: ['fetch_live_policies', 'compute_diff', 'apply_least_privilege']
        }]
    ]);

    public getStrategy(type: string): StrategyDefinition | null {
        return this.strategies.get(type) || {
            strategyId: `strat-generic-${type}`,
            name: `Generic Remediation for ${type}`,
            description: __t('standard_automated_remediation'),
            steps: ['diagnose', 'isolate', 'recover']
        };
    }

    public registerStrategy(type: string, def: StrategyDefinition): void {
        this.strategies.set(type, def);
    }
}
