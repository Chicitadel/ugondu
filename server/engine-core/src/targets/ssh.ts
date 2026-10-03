/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / SSH
 * File           : ssh.ts
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
 * @interface SshTargetConfig
 * @description Corporate Governed interface implementation for SshTargetConfig
 * @classification ENTERPRISE
 */
export interface SshTargetConfig {
    targetId: string;
    host: string;
    port: number;
    username: string;
    remoteBasePath: string;
    expectedHostKeyFingerprint: string;
}

/**
 * @interface SshDeploymentPlan
 * @description Corporate Governed interface implementation for SshDeploymentPlan
 * @classification ENTERPRISE
 */
export interface SshDeploymentPlan {
    strategy: 'atomic';
    releasesPath: string;
    currentLinkPath: string;
    steps: Array<{ action: string; payload: Record<string, any> }>;
}

/**
 * @class SshTargetAdapter
 * @description Corporate Governed class implementation for SshTargetAdapter
 * @classification ENTERPRISE
 */
export class SshTargetAdapter {
    private config: SshTargetConfig;

    constructor(config: SshTargetConfig) {
        if (!config.targetId || !config.host || !config.username || !config.expectedHostKeyFingerprint) {
            throw new Error(__t('invalid_ctx'));
        }
        this.config = {
            ...config,
            port: config.port || 22,
            remoteBasePath: config.remoteBasePath || `/var/www/${config.username}`
        };
    }

    public getCapabilities(): string[] {
        return [
            'FETCH_REPOSITORY',
            'SYNC_ENVIRONMENT',
            'COPY_FILE',
            'CREATE_DIRECTORY',
            'SYMLINK',
            'SERVICE_RESTART',
            'NODE_INSTALL',
            'COMPOSER_INSTALL',
            'PRUNE_RELEASES'
        ];
    }

    public generateDeploymentPlan(repositoryUrl: string, branch: string, releaseId: string): SshDeploymentPlan {
        const releasePath = `${this.config.remoteBasePath}/releases/${releaseId}`;
        const currentLink = `${this.config.remoteBasePath}/current`;

        const steps: Array<{ action: string; payload: Record<string, any> }> = [
            {
                action: 'CREATE_DIRECTORY',
                payload: { path: releasePath }
            },
            {
                action: 'FETCH_REPOSITORY',
                payload: { url: repositoryUrl, branch, destination: releasePath }
            },
            {
                action: 'SYMLINK',
                payload: { target: releasePath, link: currentLink }
            },
            {
                action: 'PRUNE_RELEASES',
                payload: { basePath: `${this.config.remoteBasePath}/releases`, retention: 3 }
            }
        ];

        return {
            strategy: 'atomic',
            releasesPath: releasePath,
            currentLinkPath: currentLink,
            steps
        };
    }

    public verifyHostKey(actualFingerprint: string): boolean {
        if (!actualFingerprint || actualFingerprint !== this.config.expectedHostKeyFingerprint) {
            throw new Error(__t('error_key_purpose_mismatch'));
        }
        return true;
    }
}
