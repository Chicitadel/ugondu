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
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/

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

export class TenantIsolationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TenantIsolationError';
    }
}

export class TenantContextGuard {
    public assertContext(securityContext: any): void {
        if (!securityContext) {
            throw new TenantIsolationError('Security context is null or undefined');
        }
        const tenantId = securityContext.tenantId;
        
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
            throw new TenantIsolationError('tenantId must be a non-empty string');
        }
        
        if (!securityContext.tenant || tenantId !== securityContext.tenant.id) {
            throw new TenantIsolationError('tenantId does not match securityContext.tenant.id');
        }
        
        if (securityContext.organizationId && securityContext.tenant.organizationId && 
            securityContext.organizationId !== securityContext.tenant.organizationId) {
            throw new TenantIsolationError('organizationId is inconsistent with tenantId');
        }
    }
}
