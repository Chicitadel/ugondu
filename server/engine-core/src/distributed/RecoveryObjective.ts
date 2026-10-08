/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : engine-core/distributed
 * File           : RecoveryObjective.ts
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

/**
 * Defines Recovery Point Objective (RPO) and Recovery Time Objective (RTO).
 * Represented in milliseconds.
 */
export interface RecoveryObjective {
    /**
     * Recovery Point Objective: The maximum acceptable amount of data loss measured in time.
     */
    readonly maxRpoMs: number;

    /**
     * Recovery Time Objective: The maximum tolerable length of time that a computer, system, network, or application can be down.
     */
    readonly maxRtoMs: number;
}
