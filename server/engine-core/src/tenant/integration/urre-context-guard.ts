/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Integration
 * File           : urre-context-guard.ts
 * Version        : 1.0.0
 * Author : Ujomor Systems Engineering & Governance Authority
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
 * @class UrreContextGuard
 * @description Corporate Governed class implementation for UrreContextGuard
 * @classification ENTERPRISE
 */
export class UrreContextGuard {
    public enforce(tenantContextGuard: any): void {
        const derivedTenantId = tenantContextGuard.getDerivedTenantId();
        if (!derivedTenantId) {
            throw new Error(__t('msg_urre_context_rejected_tenant_authority_m'));
        }
    }
}
