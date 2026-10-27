/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Engine Core / Distributed Topology
 * File           : DistributedPlanner.ts
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { Region, ReplicationPlan, FailoverPlan } from './TopologyModels';
import { RecoveryObjective } from './RecoveryObjective';

/**
 * Planner for multi-region and AZ placements ensuring structural resilience.
 */
export class DistributedPlanner {
    
    /**
     * Generates an immutable replication plan between primary and secondary regions.
     * @param primary Primary active region
     * @param secondary Standby secondary region
     * @param recoveryObjective Objective definitions (RPO/RTO)
     * @returns Readonly replication plan
     */
    public generateReplicationPlan(
        primary: Region, 
        secondary: Region, 
        recoveryObjective: RecoveryObjective
    ): Readonly<ReplicationPlan> {
        if (primary.role !== 'PRIMARY') {
            throw new Error(__t('source_region_must_be_designat'));
        }
        if (secondary.role !== 'SECONDARY') {
            throw new Error(__t('target_region_must_be_designat'));
        }

        // Determine replication mode based on RPO
        // For very tight RPO (e.g. 0 or near 0), synchronous replication might be required.
        const mode = recoveryObjective.maxRpoMs < 10 ? 'SYNCHRONOUS' : 'ASYNCHRONOUS';

        return Object.freeze({
            id: `repl-${primary.id}-${secondary.id}-${Date.now()}`,
            sourceRegionId: primary.id,
            targetRegionId: secondary.id,
            replicationMode: mode,
            createdAt: new Date()
        });
    }

    /**
     * Generates an immutable failover plan based on the topological setup.
     * @param primary Primary region
     * @param secondary Standby secondary region
     * @param recoveryObjective Objective definitions (RPO/RTO)
     * @returns Readonly failover plan
     */
    public generateFailoverPlan(
        primary: Region,
        secondary: Region,
        recoveryObjective: RecoveryObjective
    ): Readonly<FailoverPlan> {
        if (primary.id === secondary.id) {
            throw new Error(__t('primary_and_secondary_regions_'));
        }

        // Evaluate if auto-failover can be safely enabled within RTO budgets
        const autoFailover = recoveryObjective.maxRtoMs < 60000; // e.g. < 1 minute RTO requires automation

        return Object.freeze({
            id: `fo-${primary.id}-${secondary.id}-${Date.now()}`,
            primaryRegionId: primary.id,
            standbyRegionId: secondary.id,
            estimatedRtoMs: recoveryObjective.maxRtoMs, // target estimation
            autoFailoverEnabled: autoFailover,
            createdAt: new Date()
        });
    }
}
