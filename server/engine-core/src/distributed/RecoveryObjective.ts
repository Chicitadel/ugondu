/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Engine Core / Distributed Topology
 * File           : RecoveryObjective.ts
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
