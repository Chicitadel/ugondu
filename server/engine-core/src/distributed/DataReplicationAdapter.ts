/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : engine-core/distributed
 * File           : DataReplicationAdapter.ts
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

import { ReplicationPlan } from './TopologyModels';

/**
 * Contract for executing multi-region data replication.
 */
export interface DataReplicationAdapter {
    /**
     * Initializes the replication infrastructure based on a ReplicationPlan.
     * @param plan Immutable replication plan.
     */
    setupReplication(plan: ReplicationPlan): Promise<void>;

    /**
     * Retrieves the current replication lag in milliseconds.
     * @param planId ID of the replication plan.
     */
    getReplicationLagMs(planId: string): Promise<number>;

    /**
     * Validates that the replication setup meets the Recovery Point Objective (RPO).
     * @param planId ID of the replication plan.
     * @param targetRpoMs Target RPO in milliseconds.
     */
    validateRpoCompliance(planId: string, targetRpoMs: number): Promise<boolean>;
}
