/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : assurance.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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

export enum AssuranceLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

/**
 * @interface AssuranceMetadata
 * @description Corporate Governed interface implementation for AssuranceMetadata
 * @classification ENTERPRISE
 */
export interface AssuranceMetadata {
    readonly timestamp: number;
    readonly agentId: string;
    readonly environment: string;
}

/**
 * @interface AssuranceRecord
 * @description Corporate Governed interface implementation for AssuranceRecord
 * @classification ENTERPRISE
 */
export interface AssuranceRecord {
    readonly id: string;
    readonly level: AssuranceLevel;
    readonly metadata: AssuranceMetadata;
    readonly validUntil: number;
}
