/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : target-validator.ts
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

export class TargetValidator {
    public async validate(passport: PassportEnvelope, context: ExecutionContext): Promise<void> {
        if (passport.targetId !== context.targetId) {
            throw new Error(`Target mismatch: Passport is for ${passport.targetId} but execution is for ${context.targetId}`);
        }

        if (passport.targetType !== context.targetType) {
            throw new Error(`Target type mismatch: Passport is for ${passport.targetType} but execution is for ${context.targetType}`);
        }
    }
}
