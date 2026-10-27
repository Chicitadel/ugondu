/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : evidence.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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

export enum EvidenceType {
    SECURITY_SCAN = 'SECURITY_SCAN',
    TEST_COVERAGE = 'TEST_COVERAGE',
    MANUAL_APPROVAL = 'MANUAL_APPROVAL',
    COMPLIANCE_CHECK = 'COMPLIANCE_CHECK'
}

/**
 * @interface Evidence
 * @description Corporate Governed interface implementation for Evidence
 * @classification ENTERPRISE
 */
export interface Evidence {
    id: string;
    type: EvidenceType;
    provider: string;
    timestamp: string;
    payload: Record<string, unknown>;
    hash: string;
}

export function createEvidence(
    id: string,
    type: EvidenceType,
    provider: string,
    payload: Record<string, unknown>,
    hash: string
): Evidence {
    return {
        id,
        type,
        provider,
        timestamp: new Date().toISOString(),
        payload,
        hash
    };
}
