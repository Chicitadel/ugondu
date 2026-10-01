/******************************************************************************
 * Project        : Ugondu
 * Module         : Engine Core / Tenant Integration
 * File           : twin-isolation-guard.ts
 * Version        : 1.0.0
 * Author         : Elite Ugondu Engineer
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

import { Tenant } from '../model/tenant';

export interface TwinInstance {
    instanceId: string;
    tenantId: string;
    environmentId: string;
    payloadHash: string;
}

export class TwinIsolationGuard {
    public static enforceIsolation(sourceTwin: TwinInstance, targetTwin: TwinInstance, sourceTenant: Tenant, targetTenant: Tenant): void {
        // Enforce structural context integrity
        if (sourceTwin.tenantId !== sourceTenant.getTenantId()) {
            throw new Error(`Source twin ${sourceTwin.instanceId} metadata mismatch with provided tenant context`);
        }
        if (targetTwin.tenantId !== targetTenant.getTenantId()) {
            throw new Error(`Target twin ${targetTwin.instanceId} metadata mismatch with provided tenant context`);
        }

        // Validate cross-tenant boundary violation requests
        if (sourceTwin.tenantId !== targetTwin.tenantId) {
            const sourceBoundary = sourceTenant.getRootBoundary();
            const targetBoundary = targetTenant.getRootBoundary();
            
            // Rejects strict separation leaks cryptographically
            if (!sourceBoundary.verifyCrossBoundary(targetBoundary)) {
                throw new Error(`SECURITY VIOLATION: Twin instance ${sourceTwin.instanceId} attempted unauthorized cross-tenant boundary access to ${targetTwin.instanceId}`);
            }
        }

        // Validate intra-tenant environment boundary integrity
        const sourceEnv = sourceTenant.getEnvironment(sourceTwin.environmentId);
        const targetEnv = targetTenant.getEnvironment(targetTwin.environmentId);

        if (sourceEnv.getEnvironmentId() !== targetEnv.getEnvironmentId()) {
            const envBoundaryCheck = sourceEnv.getBoundary().verifyCrossBoundary(targetEnv.getBoundary());
            if (!envBoundaryCheck) {
                throw new Error(`SECURITY VIOLATION: Twin instance ${sourceTwin.instanceId} attempted to cross cryptographic environment boundaries to ${targetTwin.instanceId}`);
            }
        }
    }
}
