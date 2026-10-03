/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : freshness-validator.ts
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
import { __t } from '../../../../shared/i18n';

import type { DeliveryPassport } from '../model/passport';

/**
 * @class FreshnessValidator
 * @description Corporate Governed class implementation for FreshnessValidator
 * @classification ENTERPRISE
 */
export class FreshnessValidator {
    public async validate(passport: DeliveryPassport): Promise<void> {
        const issueTime = new Date(passport.metadata.issuedAt).getTime();
        const currentTime = Date.now();
        const ageSeconds = (currentTime - issueTime) / 1000;

        // Passport must not be older than max allowed ttl (e.g. 3600 seconds)
        const MAX_AGE_SECONDS = 3600;
        if (ageSeconds > MAX_AGE_SECONDS) {
            throw new Error(__t('messages.error.passport_fails_freshness_validation_age_s', { 'passport_id': passport.id, 'ageSeconds': ageSeconds }));
        }

        // Passport cannot be from the future
        if (ageSeconds < 0) {
            throw new Error(__t('messages.error.passport_fails_freshness_validation_issued_in', { 'passport_id': passport.id }));
        }
    }
}
