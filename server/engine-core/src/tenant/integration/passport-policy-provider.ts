/******************************************************************************
 * Project        : Ugondu
 * Module         : Engine Core / Tenant Integration
 * File           : passport-policy-provider.ts
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

import { Tenant, TenantStatus } from '../model/tenant';
import { Environment } from '../model/environment';
import { BoundaryClassification } from '../model/isolation-boundary';

export interface PassportPolicy {
    policyId: string;
    targetTenantId: string;
    targetEnvironmentId: string;
    allowedActions: string[];
    cryptographicSignature: string;
}

export class PassportPolicyProvider {
    public compileDeliveryPassport(tenant: Tenant, environment: Environment, requestedActions: string[]): PassportPolicy {
        if (tenant.getStatus() !== TenantStatus.ACTIVE) {
            throw new Error(`Cannot compile passport for inactive tenant: ${tenant.getTenantId()}`);
        }

        // Validate environment mapping under this tenant
        const verifiedEnvironment = tenant.getEnvironment(environment.getEnvironmentId());

        const policyId = `plc-${Date.now().toString(36)}`;
        
        // Evaluate allowed actions safely matching boundary constraints
        const allowedActions = this.evaluateActions(verifiedEnvironment, requestedActions);

        // Compute secure signature using the tenant's root cryptographic boundary
        const signaturePayload = `${policyId}:${tenant.getTenantId()}:${verifiedEnvironment.getEnvironmentId()}:${allowedActions.join(',')}`;
        const signature = tenant.getRootBoundary().computeIsolationHash(signaturePayload);

        return {
            policyId,
            targetTenantId: tenant.getTenantId(),
            targetEnvironmentId: verifiedEnvironment.getEnvironmentId(),
            allowedActions,
            cryptographicSignature: signature
        };
    }

    private evaluateActions(environment: Environment, requestedActions: string[]): string[] {
        const boundaryClass = environment.getBoundary().getClassification();
        const restrictedActions = ['DESTROY_INFRASTRUCTURE', 'EXFILTRATE_DATA', 'BYPASS_AUDIT'];

        if (boundaryClass === BoundaryClassification.AIR_GAPPED) {
            return requestedActions.filter(action => 
                !restrictedActions.includes(action) && action !== 'PUBLIC_NETWORK_ACCESS'
            );
        } else if (boundaryClass === BoundaryClassification.SHARED) {
            return requestedActions.filter(action => 
                !restrictedActions.includes(action) && action !== 'MODIFY_GLOBAL_CONFIG'
            );
        }

        return requestedActions.filter(action => !restrictedActions.includes(action));
    }
}
