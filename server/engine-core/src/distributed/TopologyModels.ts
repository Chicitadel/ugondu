/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : engine-core/distributed
 * File           : TopologyModels.ts
 * Version        : 1.0.0
 * Author         : Distributed Topology Engineer
 * Organization   : UAIGOS
 * Created Date   : 2026-10-08
 * Classification : ENTERPRISE
 * 
 * Governance:
 * - AI Governed
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
 * Copyright (c) 2026 UAIGOS
 * All Rights Reserved.
 ******************************************************************************/

export type RegionRole = 'PRIMARY' | 'SECONDARY';

export interface AvailabilityZone {
    readonly id: string;
    readonly name: string;
    readonly isActive: boolean;
}

export interface Region {
    readonly id: string;
    readonly name: string;
    readonly role: RegionRole;
    readonly faultDomains: ReadonlyArray<AvailabilityZone>;
}

export interface ReplicationPlan {
    readonly id: string;
    readonly sourceRegionId: string;
    readonly targetRegionId: string;
    readonly replicationMode: 'SYNCHRONOUS' | 'ASYNCHRONOUS';
    readonly createdAt: Date;
}

export interface FailoverPlan {
    readonly id: string;
    readonly primaryRegionId: string;
    readonly standbyRegionId: string;
    readonly estimatedRtoMs: number;
    readonly autoFailoverEnabled: boolean;
    readonly createdAt: Date;
}
