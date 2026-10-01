/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : capability-validator.ts
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
import { ExecutionContext } from '../../types/execution';

export class CapabilityValidator {
    public async validate(passport: PassportEnvelope, context: ExecutionContext): Promise<void> {
        const requiredCapabilities = context.requiredCapabilities;
        const grantedCapabilities = passport.capabilities;

        for (const reqCap of requiredCapabilities) {
            if (!grantedCapabilities.includes(reqCap)) {
                throw new Error(`Capability missing: Passport does not grant required capability '${reqCap}'`);
            }
        }
    }
}
