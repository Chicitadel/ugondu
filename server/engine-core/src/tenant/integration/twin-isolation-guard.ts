/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Integration
 * File           : twin-isolation-guard.ts
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
 * @class TwinIsolationGuard
 * @description Corporate Governed class implementation for TwinIsolationGuard
 * @classification ENTERPRISE
 */
export class TwinIsolationGuard {
    public verifyIsolation(tenantContextGuard: any, resourceContext: any): void {
        // Enforce that authority is derived from TenantContextGuard and not caller-supplied
        const derivedTenantId = tenantContextGuard.getDerivedTenantId();
        if (!derivedTenantId) {
            throw new Error('Tenant authority mismatch. No subsystem can accept caller-supplied tenant authority; it must be derived from the TenantContextGuard.');
        }
        if (resourceContext.tenantId !== derivedTenantId) {
            throw new Error('Isolation breach: resource belongs to a different tenant.');
        }
    }
}

/**
 * @class TenantIsolationError
 * @description Corporate Governed class implementation for TenantIsolationError
 * @classification ENTERPRISE
 */
export class TenantIsolationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TenantIsolationError';
    }
}

/**
 * @class TenantContextGuard
 * @description Corporate Governed class implementation for TenantContextGuard
 * @classification ENTERPRISE
 */
export class TenantContextGuard {
    public assertContext(securityContext: any): void {
        if (!securityContext) {
            throw new TenantIsolationError(__t('messages.error.security_context_is_null_or_undefined'));
        }
        const tenantId = securityContext.tenantId;

        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
            throw new TenantIsolationError(__t('messages.error.tenantid_must_be_a_non_empty_string'));
        }

        if (!securityContext.tenant || tenantId !== securityContext.tenant.id) {
            throw new TenantIsolationError(__t('messages.error.tenantid_does_not_match_securitycontext_tenan'));
        }

        if (securityContext.organizationId && securityContext.tenant.organizationId &&
            securityContext.organizationId !== securityContext.tenant.organizationId) {
            throw new TenantIsolationError(__t('messages.error.organizationid_is_inconsistent_with_tenantid'));
        }
    }
}
