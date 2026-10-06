/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant / Policy
 * File           : baseline.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface TenantPolicyBaseline {
    defaultEffect: 'DENY';
    maxRolesPerPrincipal: number;
    mfaRequiredForProduction: boolean;
    allowedProviders: string[];
}

export class BaselinePolicy {
    public getBaseline(tenantId?: string): TenantPolicyBaseline {
        return {
            defaultEffect: 'DENY',
            maxRolesPerPrincipal: 10,
            mfaRequiredForProduction: true,
            allowedProviders: ['AWS_IAM', 'AZURE_RBAC', 'GCP_IAM', 'KUBERNETES_RBAC', 'LINUX_ACL', 'CPANEL']
        };
    }
}
