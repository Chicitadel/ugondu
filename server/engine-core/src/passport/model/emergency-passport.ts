/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : emergency-passport.ts
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

import { DeliveryPassport, PassportStatus, PassportMetadata } from './passport';

/**
 * @interface EmergencyPassport
 * @description Corporate Governed interface implementation for EmergencyPassport
 * @classification ENTERPRISE
 */
export interface EmergencyPassport extends DeliveryPassport {
    emergencyReason: string;
    authorizingOfficial: string;
    incidentTicketId: string;
}

export function createEmergencyPassport(
    issuerId: string,
    subjectId: string,
    clearanceLevel: number,
    emergencyReason: string,
    authorizingOfficial: string,
    incidentTicketId: string
): EmergencyPassport {
    const metadata: PassportMetadata = {
        issuerId,
        subjectId,
        issuedAt: new Date().toISOString(),
        clearanceLevel
    };

    return {
        id: `epass-${Date.now()}`,
        version: '1.0',
        metadata,
        evidence: [],
        status: PassportStatus.ISSUED,
        emergencyReason,
        authorizingOfficial,
        incidentTicketId
    };
}
