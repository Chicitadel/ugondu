/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : capability-validator.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

import type { DeliveryPassport } from '../model/passport';
import { ExecutionContext } from '../../types/execution';

/**
 * @class CapabilityValidator
 * @description Corporate Governed class implementation for CapabilityValidator
 * @classification ENTERPRISE
 */
export class CapabilityValidator {
    public async validate(passport: DeliveryPassport, context: ExecutionContext): Promise<void> {
        const requiredCapabilities = context.requiredCapabilities;
        const grantedCapabilities = passport.metadata.capabilities ?? [];

        for (const reqCap of requiredCapabilities) {
            if (!grantedCapabilities.includes(reqCap)) {
                throw new Error(__t('messages.error.capability_missing_passport_does_not_grant_re', { 'reqCap': reqCap }));
            }
        }
    }
}
