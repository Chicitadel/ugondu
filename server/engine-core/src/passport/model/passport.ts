/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : passport.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { Evidence } from './evidence';

export enum PassportStatus {
    DRAFT = 'DRAFT',
    ISSUED = 'ISSUED',
    REVOKED = 'REVOKED',
    EXPIRED = 'EXPIRED'
}

export interface PassportMetadata {
    issuerId: string;
    subjectId: string;
    issuedAt: string;
    expiresAt?: string;
    clearanceLevel: number;
}

export interface DeliveryPassport {
    id: string;
    version: string;
    metadata: PassportMetadata;
    evidence: Evidence[];
    status: PassportStatus;
    signature?: string;
}

export function validatePassport(passport: DeliveryPassport): boolean {
    if (!passport.id || !passport.version || !passport.metadata) {
        return false;
    }
    if (passport.status === PassportStatus.REVOKED || passport.status === PassportStatus.EXPIRED) {
        return false;
    }
    const now = new Date();
    if (passport.metadata.expiresAt) {
        const expiresAt = new Date(passport.metadata.expiresAt);
        if (now > expiresAt) {
            return false;
        }
    }
    return true;
}
