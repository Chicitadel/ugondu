/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / cPanel
 * File           : cpanel.ts
 * Version        : 2.0.0
 * Author         : Target Fabric Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';

/**
 * @interface CPanelTargetConfig
 * @description Corporate Governed interface implementation for CPanelTargetConfig
 * @classification ENTERPRISE
 */
export interface CPanelTargetConfig {
    targetId: string;
    serverHostname: string;
    username: string;
    publicHtmlPath: string;
    phpVersion?: string;
    useQuotaSync: boolean;
}

/**
 * @interface CPanelDeploymentPlan
 * @description Corporate Governed interface implementation for CPanelDeploymentPlan
 * @classification ENTERPRISE
 */
export interface CPanelDeploymentPlan {
    strategy: 'quota-sync';
    targetPath: string;
    steps: Array<{ action: string; payload: Record<string, any> }>;
    requiresPhpRestart: boolean;
}

/**
 * @class CPanelTargetAdapter
 * @description Corporate Governed class implementation for CPanelTargetAdapter
 * @classification ENTERPRISE
 */
export class CPanelTargetAdapter {
    private config: CPanelTargetConfig;

    constructor(config: CPanelTargetConfig) {
        if (!config.targetId || !config.serverHostname || !config.username) {
            throw new Error(__t('msg_invalid_deploymentcontext_missing_requir'));
        }
        this.config = {
            ...config,
            publicHtmlPath: config.publicHtmlPath || `/home/${config.username}/public_html`,
            useQuotaSync: true
        };
    }

    public getCapabilities(): string[] {
        return [
            'FETCH_REPOSITORY',
            'SYNC_ENVIRONMENT',
            'COPY_FILE',
            'CREATE_DIRECTORY',
            'SERVICE_RESTART',
            'PRUNE_RELEASES',
            'UPSELL_NOTICE'
        ];
    }

    public generateDeploymentPlan(repositoryUrl: string, branch: string, reloadFpm: boolean = false): CPanelDeploymentPlan {
        const steps: Array<{ action: string; payload: Record<string, any> }> = [
            {
                action: 'FETCH_REPOSITORY',
                payload: { url: repositoryUrl, branch }
            },
            {
                action: 'SYNC_ENVIRONMENT',
                payload: {
                    strategy: 'quota-sync',
                    destination: this.config.publicHtmlPath,
                    preservePermissions: true
                }
            }
        ];

        if (reloadFpm) {
            steps.push({
                action: 'SERVICE_RESTART',
                payload: {
                    serviceName: `ea-php${(this.config.phpVersion || '82').replace('.', '')}-fpm`
                }
            });
        }

        return {
            strategy: 'quota-sync',
            targetPath: this.config.publicHtmlPath,
            steps,
            requiresPhpRestart: reloadFpm
        };
    }

    public validatePreconditions(): boolean {
        // Enforce physical directory safety for cPanel quota tracking (ADR-004)
        if (!this.config.publicHtmlPath.startsWith('/home/')) {
            throw new Error(__t('safepath_boundary_err'));
        }
        return true;
    }
}
