/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / Kubernetes
 * File           : k8s.ts
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
 * @interface KubernetesTargetConfig
 * @description Corporate Governed interface implementation for KubernetesTargetConfig
 * @classification ENTERPRISE
 */
export interface KubernetesTargetConfig {
    targetId: string;
    clusterEndpoint: string;
    namespace: string;
    appName: string;
    replicas: number;
    containerImage: string;
    containerPort: number;
    servicePort: number;
    enableRollingUpdate: boolean;
}

/**
 * @interface KubernetesManifestBundle
 * @description Corporate Governed interface implementation for KubernetesManifestBundle
 * @classification ENTERPRISE
 */
export interface KubernetesManifestBundle {
    deployment: Record<string, any>;
    service: Record<string, any>;
    helmValues: Record<string, any>;
}

/**
 * @class KubernetesTargetAdapter
 * @description Corporate Governed class implementation for KubernetesTargetAdapter
 * @classification ENTERPRISE
 */
export class KubernetesTargetAdapter {
    private config: KubernetesTargetConfig;

    constructor(config: KubernetesTargetConfig) {
        if (!config.targetId || !config.clusterEndpoint || !config.appName || !config.containerImage) {
            throw new Error('Invalid DeploymentContext. Missing required fields or token.');
        }
        this.config = {
            ...config,
            namespace: config.namespace || 'default',
            replicas: config.replicas || 2,
            containerPort: config.containerPort || 8080,
            servicePort: config.servicePort || 80,
            enableRollingUpdate: config.enableRollingUpdate !== undefined ? config.enableRollingUpdate : true
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

    public generateManifests(): KubernetesManifestBundle {
        const labels = { app: this.config.appName };

        const deployment = {
            apiVersion: 'apps/v1',
            kind: 'Deployment',
            metadata: {
                name: this.config.appName,
                namespace: this.config.namespace,
                labels
            },
            spec: {
                replicas: this.config.replicas,
                selector: { matchLabels: labels },
                strategy: this.config.enableRollingUpdate ? {
                    type: 'RollingUpdate',
                    rollingUpdate: { maxSurge: '25%', maxUnavailable: 0 }
                } : { type: 'Recreate' },
                template: {
                    metadata: { labels },
                    spec: {
                        containers: [
                            {
                                name: this.config.appName,
                                image: this.config.containerImage,
                                ports: [{ containerPort: this.config.containerPort }],
                                livenessProbe: {
                                    httpGet: { path: '/health', port: this.config.containerPort },
                                    initialDelaySeconds: 10,
                                    periodSeconds: 10
                                },
                                readOnlyRootFilesystem: true
                            }
                        ]
                    }
                }
            }
        };

        const service = {
            apiVersion: 'v1',
            kind: 'Service',
            metadata: {
                name: `${this.config.appName}-svc`,
                namespace: this.config.namespace
            },
            spec: {
                selector: labels,
                ports: [{ port: this.config.servicePort, targetPort: this.config.containerPort }]
            }
        };

        const helmValues = {
            replicaCount: this.config.replicas,
            image: { repository: this.config.containerImage.split(':')[0], tag: this.config.containerImage.split(':')[1] || 'latest' },
            service: { port: this.config.servicePort, targetPort: this.config.containerPort }
        };

        return { deployment, service, helmValues };
    }
}
