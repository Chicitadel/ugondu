/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : freshness-validator.ts
 * Version        : 1.0.0
 * Author         : Engineering Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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

import { PassportEnvelope } from '../../types/passport';

export class FreshnessValidator {
    public async validate(passport: PassportEnvelope): Promise<void> {
        const issueTime = new Date(passport.issuedAt).getTime();
        const currentTime = Date.now();
        const ageSeconds = (currentTime - issueTime) / 1000;

        // Passport must not be older than max allowed ttl (e.g. 3600 seconds)
        const MAX_AGE_SECONDS = 3600;
        if (ageSeconds > MAX_AGE_SECONDS) {
            throw new Error(`Passport ${passport.id} fails freshness validation (age: ${ageSeconds}s)`);
        }

        // Passport cannot be from the future
        if (ageSeconds < 0) {
            throw new Error(`Passport ${passport.id} fails freshness validation (issued in future)`);
        }
    }
}
