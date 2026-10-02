/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : policy-validator.ts
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
import { PolicyEngine } from '../../infrastructure/policy/engine';

export class PolicyValidator {
    constructor(private readonly policyEngine: PolicyEngine) {}

    public async validate(passport: PassportEnvelope, context: ExecutionContext): Promise<void> {
        const result = await this.policyEngine.evaluate(passport.policyId, {
            passportId: passport.id,
            principalId: passport.principalId,
            targetId: context.targetId,
            environment: context.environment,
            metadata: context.metadata
        });

        if (!result.allowed) {
            throw new Error(`Policy evaluation failed: ${result.reason}`);
        }
    }
}
