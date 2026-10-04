/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Integration
 * File           : provider-credential-guard.ts
 * Version        : 1.0.0
 * Author         : Elite Phase 14 Ugondu Engineer
 * Organization   : Ujomor Platform
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
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

/**
 * @class ProviderCredentialGuard
 * @description Corporate Governed class implementation for ProviderCredentialGuard
 * @classification ENTERPRISE
 */
export class ProviderCredentialGuard {
    public protectCredentials(tenantContextGuard: any): void {
        const derivedTenantId = tenantContextGuard.getDerivedTenantId();
        if (!derivedTenantId) {
            throw new Error(__t('messages.error.credential_access_denied_caller_supplied_tena'));
        }
    }
}
