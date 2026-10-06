/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Crypto
 * File           : key-policy.ts
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
 * @interface KeyPolicy
 * @description Corporate Governed interface implementation for KeyPolicy
 * @classification ENTERPRISE
 */
export interface KeyPolicy {
    tenantId: string;
    rotationIntervalDays: number;
    allowExport: boolean;
    requireMfaForRotation: boolean;
}

/**
 * @class KeyPolicyEnforcer
 * @description Corporate Governed class implementation for KeyPolicyEnforcer
 * @classification ENTERPRISE
 */
export class KeyPolicyEnforcer {
    public validatePolicy(policy: KeyPolicy): void {
        if (policy.allowExport) {
            throw new Error(__t('msg_key_export_is_strictly_prohibited_by_sec'));
        }
        if (policy.rotationIntervalDays > 90) {
            throw new Error(__t('msg_key_rotation_interval_cannot_exceed_90_d'));
        }
    }
}
