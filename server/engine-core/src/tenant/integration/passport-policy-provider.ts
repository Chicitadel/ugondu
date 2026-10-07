/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Integration
 * File           : passport-policy-provider.ts
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
 * @interface PassportPolicy
 * @description Corporate Governed interface implementation for PassportPolicy
 * @classification ENTERPRISE
 */
export interface PassportPolicy {
    enforceMfa: boolean;
    allowedRegions: string[];
}

/**
 * @class PassportPolicyProvider
 * @description Corporate Governed class implementation for PassportPolicyProvider
 * @classification ENTERPRISE
 */
export class PassportPolicyProvider {
    public getPolicy(tenantId: string): PassportPolicy {
        if (!tenantId) {
            throw new Error(__t('msg_tenant_id_required_to_fetch_passport_pol'));
        }
        return {
            enforceMfa: true,
            allowedRegions: ['us-east-1', 'eu-west-1']
        };
    }
}
