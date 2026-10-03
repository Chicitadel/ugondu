/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : expiry.ts
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
// @ts-ignore
import { __t } from '../../../../shared/i18n';


import { Certificate } from './certificate';

/**
 * @class ExpiryManager
 * @description Corporate Governed class implementation for ExpiryManager
 * @classification ENTERPRISE
 */
export class ExpiryManager {
    public static readonly DEFAULT_VALIDITY_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

    public calculateExpiry(issueDate: number = Date.now(), validityMs: number = ExpiryManager.DEFAULT_VALIDITY_MS): number {
        return issueDate + validityMs;
    }

    public enforceExpiry(cert: Certificate): void {
        if (cert.isExpired()) {
            throw new Error(__t('messages.error.certificate_has_expired', { 'cert_id': cert.id }));
        }
    }
}
