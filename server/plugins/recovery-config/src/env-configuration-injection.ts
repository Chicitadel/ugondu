/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Plugins / Recovery Config
 * File           : env-configuration-injection.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-18
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
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
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { RecoveryCapability } from '../../../engine-core/src/deise/engine/recovery/capabilities/recovery-capability';
import { EnvironmentTwin } from '../../../engine-core/src/deise/twin/environment-twin';
import { RecoveryScope } from '../../../engine-core/src/deise/engine/recovery/live-environment-adapter-contract';

export class EnvConfigurationInjection implements RecoveryCapability {
    get capabilityId(): string {
        return 'EnvConfigurationInjection';
    }

    async diagnose(twin: EnvironmentTwin, scope: RecoveryScope): Promise<any> {
        const configInventory = twin.configurationInventory || {};
        const missingConfigs: Array<{ key: string; target: string; vaultRef: string }> = [];

        for (const [key, state] of Object.entries(configInventory)) {
            if (!state || typeof state !== 'object') continue;
            if (state.status === 'MISSING' || state.status === 'CORRUPTED' || state.status === 'DRIFTED') {
                missingConfigs.push({
                    key,
                    target: String(state.target || `${scope.repositoryPath || '.'}/.env`),
                    vaultRef: String(state.vaultRef || `vault://${scope.tenantId}/${scope.applicationId}/${key}`)
                });
            }
        }

        if (missingConfigs.length > 0) {
            return {
                issue: 'MissingEnvironmentConfiguration',
                missingConfigs,
                confidence: 1.0
            };
        }

        return {
            issue: 'NoIssue',
            missingConfigs: [],
            confidence: 1.0
        };
    }

    async plan(diagnosis: any, scope: RecoveryScope): Promise<any> {
        if (diagnosis?.issue === 'MissingEnvironmentConfiguration' || (Array.isArray(diagnosis?.missingConfigs) && diagnosis.missingConfigs.length > 0)) {
            const configs = Array.isArray(diagnosis.missingConfigs) && diagnosis.missingConfigs.length > 0
                ? diagnosis.missingConfigs
                : [{
                    key: '.env',
                    target: `${scope.repositoryPath || '.'}/.env`,
                    vaultRef: `vault://${scope.tenantId}/${scope.applicationId}/.env`
                }];

            return {
                requiresConfigurationRepair: true,
                configurationRepairs: configs.map((cfg: any) => ({
                    type: 'INJECT_ENV_FROM_VAULT',
                    source: cfg.vaultRef || `vault://${scope.tenantId}/${scope.applicationId}/.env`,
                    target: cfg.target || `${scope.repositoryPath || '.'}/.env`
                })),
                safeToProceed: true
            };
        }

        return {
            requiresConfigurationRepair: false,
            configurationRepairs: [],
            safeToProceed: true
        };
    }

    async execute(plan: any, adapter: any, scope: RecoveryScope): Promise<boolean> {
        if (!plan.requiresConfigurationRepair) return true;

        for (const repair of plan.configurationRepairs) {
            if (repair.type === 'INJECT_ENV_FROM_VAULT') {
                // We assume adapter has a universal capability to copy or inject configuration artifacts
                if (typeof adapter.copyConfigurationArtifact === 'function') {
                    await adapter.copyConfigurationArtifact(repair.source, repair.target, scope);
                } else {
                    throw new Error(__t('adapter_does_not_support_copyc'));
                }
            }
        }
        const configRepaired = true;
        return configRepaired;
    }
}
