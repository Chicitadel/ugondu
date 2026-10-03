/******************************************************************************
 * Project        : Ugondu - Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Targets / Lifecycle
 * File           : lifecycle.ts
 * Version        : 2.0.0
 * Author         : Target Fabric Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import { TargetDescriptor, globalTargetFabric } from './fabric';
import * as crypto from 'crypto';

export type LeaseState = 'REQUESTED' | 'ACQUIRED' | 'RENEWED' | 'EXPIRED' | 'REVOKED';

export interface TargetLease {
    leaseId: string;
    targetId: string;
    tenantId: string;
    state: LeaseState;
    expiresAt: Date;
    issuedAt: Date;
}

export class TargetLifecycleManager {
    private activeLeases = new Map<string, TargetLease>();
    private readonly LEASE_DURATION_MS = 15 * 60 * 1000; // 15 minutes default

    public async acquireLease(targetId: string, tenantId: string): Promise<TargetLease> {
        Logger.info(__t('messages.target.requesting_lease', { targetId, tenantId }));
        
        const target = globalTargetFabric.getTarget(targetId);
        if (!target) {
            throw new Error(__t('messages.error.target_not_found', { targetId }));
        }

        if (target.status !== 'ONLINE') {
            throw new Error(__t('messages.error.target_offline', { targetId, status: target.status }));
        }

        // Check for existing active lease
        for (const lease of this.activeLeases.values()) {
            if (lease.targetId === targetId && lease.state === 'ACQUIRED' && lease.expiresAt > new Date()) {
                throw new Error(__t('messages.error.target_locked', { targetId, tenantId: lease.tenantId }));
            }
        }

        const now = new Date();
        const lease: TargetLease = {
            leaseId: crypto.randomUUID(),
            targetId,
            tenantId,
            state: 'ACQUIRED',
            issuedAt: now,
            expiresAt: new Date(now.getTime() + this.LEASE_DURATION_MS)
        };

        this.activeLeases.set(lease.leaseId, lease);
        Logger.info(__t('messages.target.lease_acquired', { targetId, leaseId: lease.leaseId }));
        
        return lease;
    }

    public async renewLease(leaseId: string, tenantId: string): Promise<TargetLease> {
        const lease = this.activeLeases.get(leaseId);
        if (!lease) {
            throw new Error(__t('messages.error.lease_not_found', { leaseId }));
        }

        if (lease.tenantId !== tenantId) {
            throw new Error(__t('messages.error.lease_unauthorized', { leaseId, tenantId }));
        }

        if (lease.state !== 'ACQUIRED' && lease.state !== 'RENEWED') {
            throw new Error(__t('messages.error.lease_invalid_state', { leaseId, state: lease.state }));
        }

        lease.state = 'RENEWED';
        lease.expiresAt = new Date(Date.now() + this.LEASE_DURATION_MS);
        this.activeLeases.set(leaseId, lease);

        Logger.info(__t('messages.target.lease_renewed', { leaseId }));
        return lease;
    }

    public async releaseLease(leaseId: string, tenantId: string): Promise<void> {
        const lease = this.activeLeases.get(leaseId);
        if (!lease) return;

        if (lease.tenantId !== tenantId) {
            throw new Error(__t('messages.error.lease_unauthorized', { leaseId, tenantId }));
        }

        lease.state = 'REVOKED';
        this.activeLeases.set(leaseId, lease);
        Logger.info(__t('messages.target.lease_released', { leaseId, targetId: lease.targetId }));
    }

    public checkHealth(targetId: string): 'HEALTHY' | 'DEGRADED' | 'OFFLINE' {
        const target = globalTargetFabric.getTarget(targetId);
        if (!target) return 'OFFLINE';
        
        // Mock health check evaluation based on TargetDescriptor status
        if (target.status === 'ONLINE') return 'HEALTHY';
        if (target.status === 'DEGRADED') return 'DEGRADED';
        return 'OFFLINE';
    }
}

export const globalLifecycleManager = new TargetLifecycleManager();
