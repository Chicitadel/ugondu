/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / Docker
 * File           : docker.ts
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
 * @interface DockerTargetConfig
 * @description Corporate Governed interface implementation for DockerTargetConfig
 * @classification ENTERPRISE
 */
export interface DockerTargetConfig {
    targetId: string;
    dockerHost: string;
    registryUrl?: string;
    imageName: string;
    containerName: string;
    hostPort: number;
    containerPort: number;
    memoryLimitMb: number;
    cpuQuota: number;
    readOnlyRoot: boolean;
}

/**
 * @interface DockerDeploymentPlan
 * @description Corporate Governed interface implementation for DockerDeploymentPlan
 * @classification ENTERPRISE
 */
export interface DockerDeploymentPlan {
    strategy: 'container-swap';
    imageTag: string;
    steps: Array<{ action: string; payload: Record<string, any> }>;
    healthCheckEndpoint: string;
}

/**
 * @class DockerTargetAdapter
 * @description Corporate Governed class implementation for DockerTargetAdapter
 * @classification ENTERPRISE
 */
export class DockerTargetAdapter {
    private config: DockerTargetConfig;

    constructor(config: DockerTargetConfig) {
        if (!config.targetId || !config.imageName || !config.containerName) {
            throw new Error('Invalid DeploymentContext. Missing required fields or token.');
        }
        this.config = {
            ...config,
            hostPort: config.hostPort || 8080,
            containerPort: config.containerPort || 80,
            memoryLimitMb: config.memoryLimitMb || 256,
            cpuQuota: config.cpuQuota || 0.5,
            readOnlyRoot: config.readOnlyRoot !== undefined ? config.readOnlyRoot : true
        };
    }

    public getCapabilities(): string[] {
        return [
            'FETCH_REPOSITORY',
            'SYNC_ENVIRONMENT',
            'SERVICE_RESTART',
            'PRUNE_RELEASES'
        ];
    }

    public generateDeploymentPlan(repositoryUrl: string, branch: string, tag: string): DockerDeploymentPlan {
        const fullImageTag = `${this.config.imageName}:${tag}`;
        const steps: Array<{ action: string; payload: Record<string, any> }> = [
            {
                action: 'FETCH_REPOSITORY',
                payload: { url: repositoryUrl, branch }
            },
            {
                action: 'SYNC_ENVIRONMENT',
                payload: {
                    strategy: 'container-swap',
                    image: fullImageTag,
                    containerName: this.config.containerName,
                    ports: [{ host: this.config.hostPort, container: this.config.containerPort }],
                    security: {
                        readOnly: this.config.readOnlyRoot,
                        memoryLimitMb: this.config.memoryLimitMb,
                        cpuQuota: this.config.cpuQuota,
                        dropCapabilities: ['ALL'],
                        noNewPrivileges: true
                    }
                }
            }
        ];

        return {
            strategy: 'container-swap',
            imageTag: fullImageTag,
            steps,
            healthCheckEndpoint: `http://${this.config.dockerHost || 'localhost'}:${this.config.hostPort}/health`
        };
    }

    public getHardenedRunFlags(): string[] {
        return [
            '--read-only',
            '--cap-drop=ALL',
            '--security-opt=no-new-privileges',
            `--memory=${this.config.memoryLimitMb}m`,
            `--cpus=${this.config.cpuQuota}`
        ];
    }
}
