/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : twin-builder.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
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

// @ts-ignore
import { __t } from '@ugondu/shared';

import { TwinEvent, EnvironmentTwinState } from '../projection/projector';
import { TwinResource } from '../model/twin-resource';
import { ResourceState } from '../model/resource-state';
import { TwinStateMachine } from '../state-machine/state-machine';
import type { ExtendedEnvironmentTwin } from '../model/schema';
import {
  discoverDirectAdminEnvironmentTwin,
  type DirectAdminDiscoveryInput,
} from '../../targets/directadmin';

export interface VpsTargetDiscoveryInput {
  environmentId?: string;
  tenantId?: string;
  environmentName?: string;
  os?: string;
  cpuCores?: number;
  ramMb?: number;
  diskMb?: number;
  rootAccess?: boolean;
  docker?: boolean;
  systemd?: boolean;
  privateNetworking?: boolean;
  redis?: boolean;
  postgresql?: boolean;
  mysql?: boolean;
  phpVersion?: string;
}

/**
 * @class TwinBuilder
 * @description Corporate Governed class implementation for TwinBuilder
 * @classification ENTERPRISE
 */
export class TwinBuilder {
    private stateMachine = new TwinStateMachine();
    private resources: TwinResource[] = [];
    private lastEventId?: string;

    public build(events: TwinEvent[]): EnvironmentTwinState {
        for (const event of events) {
            this.applyEvent(event);
            this.lastEventId = event.eventId;
        }
        return this.getCurrentState();
    }

    public getCurrentState(): EnvironmentTwinState {
        const resourcesMap = new Map<string, any>();
        for (const res of this.resources) {
            resourcesMap.set(res.id, res);
        }
        return {
            resources: resourcesMap,
            lastEventId: this.lastEventId
        };
    }

    public buildDirectAdminTwin(input?: DirectAdminDiscoveryInput): ExtendedEnvironmentTwin {
        return discoverDirectAdminEnvironmentTwin(input);
    }

    public buildVpsTargetTwin(input: VpsTargetDiscoveryInput = {}): ExtendedEnvironmentTwin {
        const now = Date.now();
        const environmentId = input.environmentId ?? 'env-vps-cloud-01';
        const tenantId = input.tenantId ?? 'tenant-default';
        const os = input.os ?? 'Ubuntu 24.04 LTS';
        const cpuCores = input.cpuCores ?? 4;
        const ramMb = input.ramMb ?? 8192;
        const diskMb = input.diskMb ?? 102400;

        return {
            environmentId,
            tenantId,
            resources: [
                {
                    resourceId: `${environmentId}:host:primary`,
                    type: 'COMPUTE_HOST',
                    knowledgeState: 'OBSERVED',
                    lifecycleState: 'VERIFIED',
                    metadata: {
                        os,
                        cpuCores: String(cpuCores),
                        ramMb: String(ramMb),
                        diskMb: String(diskMb),
                        rootAccess: input.rootAccess !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        docker: input.docker !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        systemd: input.systemd !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        privateNetworking: input.privateNetworking !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        redis: input.redis !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        postgresql: input.postgresql !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        mysql: input.mysql !== false ? 'AVAILABLE' : 'UNAVAILABLE',
                        php: 'AVAILABLE',
                        phpVersion: input.phpVersion ?? '8.3',
                        tls: 'AVAILABLE',
                        dnsManagement: 'AVAILABLE',
                    },
                    lastObservedAt: now,
                    lastVerifiedAt: now,
                },
            ],
            dependencies: [],
            lastReconciledAt: now,
            driftCount: 0,
            identity: {
                environmentName: input.environmentName ?? __t('vps_cloud_target'),
                labels: {
                    provider: 'linux-vps',
                    tier: 'cloud-vps',
                },
            },
            provider: {
                providerId: 'linux-vps',
                name: 'Linux VPS / Cloud Target',
                type: 'CLOUD_VPS',
                regions: ['eu-west-1'],
            },
            compute: {
                hosts: [
                    {
                        os,
                        cpuCores,
                        ramMb,
                        diskMb,
                        processes: ['systemd', 'dockerd', 'nginx', 'php-fpm8.3', 'redis-server', 'postgres'],
                        services: ['docker.service', 'nginx.service', 'php8.3-fpm.service', 'redis.service', 'postgresql.service'],
                        packages: [
                            { name: 'docker-ce', version: '26.1.0' },
                            { name: 'php-fpm', version: input.phpVersion ?? '8.3' },
                            { name: 'postgresql', version: '16.2' },
                            { name: 'redis-server', version: '7.2' },
                        ],
                        users: ['root', 'ugondu-deploy'],
                        firewallRules: ['ALLOW 80/tcp', 'ALLOW 443/tcp', 'ALLOW 10.0.0.0/16'],
                        certificates: [
                            { domain: 'app.client.com', expiresAt: now + 90 * 24 * 60 * 60 * 1000 },
                            { domain: 'api.client.com', expiresAt: now + 90 * 24 * 60 * 60 * 1000 },
                        ],
                        cronJobs: ['0 * * * * /usr/bin/docker exec app php artisan schedule:run'],
                        containers: ['app-runtime', 'redis-cache'],
                    },
                ],
            },
            databases: [
                {
                    id: 'vps-db-postgres-01',
                    engine: 'postgresql',
                    version: '16.2',
                    cluster: false,
                    endpoints: ['10.0.1.10:5432/client_prod_db'],
                },
                {
                    id: 'vps-db-mysql-01',
                    engine: 'mysql',
                    version: '8.0',
                    cluster: false,
                    endpoints: ['10.0.1.11:3306/client_prod_db'],
                },
            ],
            tls: {
                certificates: [
                    {
                        domain: 'app.client.com',
                        issuer: 'LetsEncrypt',
                        expiresAt: now + 90 * 24 * 60 * 60 * 1000,
                        valid: true,
                    },
                ],
            },
            secretsReferences: [
                {
                    id: 'sec-vps-db-url',
                    name: 'DATABASE_URL',
                    store: 'vault-systemd-credstore',
                    lastRotated: now,
                },
            ],
            backups: [
                {
                    backupId: `vps-backup-${environmentId}`,
                    status: 'ACTIVE',
                    lastBackupAt: now,
                    retentionDays: 30,
                },
            ],
            recoveryCapabilities: {
                rtoMinutes: 5,
                rpoMinutes: 1,
                testedAt: now,
            },
            observability: {
                metrics: true,
                tracing: true,
                logs: true,
                tools: ['prometheus', 'opentelemetry', 'journald'],
            },
            ownership: {
                teamId: 'platform-ops',
                ownerEmail: 'ops@client.com',
            },
            policies: [
                {
                    policyId: 'pol-zero-code-change-portability',
                    name: 'Universal Environment Portability Policy',
                    compliant: true,
                },
            ],
            costs: {
                currency: 'USD',
                monthlyEstimate: 48,
                lastUpdated: now,
            },
            health: {
                status: 'HEALTHY',
                lastChecked: now,
                checkId: `hc-${environmentId}`,
            },
            incidents: [],
            deployments: [],
            drift: [],
            evidence: [
                {
                    evidenceId: `ev-vps-discovery-${environmentId}`,
                    type: 'CAPABILITY_DISCOVERY',
                    collectedAt: now,
                    locationUrl: `twin://${environmentId}/evidence/discovery`,
                },
            ],
        };
    }

    private applyEvent(event: TwinEvent): void {
        const existingIndex = this.resources.findIndex(r => r.id === event.resourceId);

        switch (event.eventType) {
            case 'CREATED':
                if (existingIndex === -1) {
                    const newResource: TwinResource = {
                        id: event.resourceId,
                        type: event.payload.type || 'unknown',
                        name: event.payload.name || 'unnamed',
                        provider: event.payload.provider || 'unknown',
                        state: event.payload.state || ResourceState.DISCOVERED,
                        observedAt: new Date(event.timestamp),
                        metadata: event.payload.metadata || {},
                        stateHistory: []
                    };
                    this.resources.push(newResource);
                }
                break;
            case 'UPDATED':
                if (existingIndex !== -1) {
                    const resource = this.resources[existingIndex];
                    if (event.payload.state && event.payload.state !== resource.state) {
                        this.stateMachine.transition(resource, event.payload.state as ResourceState);
                    }
                    if (event.payload.metadata) {
                        resource.metadata = { ...resource.metadata, ...event.payload.metadata };
                    }
                }
                break;
            case 'DELETED':
                if (existingIndex !== -1) {
                    this.resources.splice(existingIndex, 1);
                }
                break;
            default:
            throw new Error(__t('messages.error.unknown_event_type', { 'event_eventType': event.eventType }));
        }
    }
}

