/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : policy-validator.ts
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
import { ExecutionContext } from '../../types/execution';
import { PolicyEngine } from '../../infrastructure/policy/engine';

/**
 * @class PolicyValidator
 * @description Corporate Governed class implementation for PolicyValidator
 * @classification ENTERPRISE
 */
export class PolicyValidator {
    constructor(private readonly policyEngine: PolicyEngine) {}

    public async validate(passport: DeliveryPassport, context: ExecutionContext): Promise<void> {
        // passport.metadata.operationId maps to the former policyId (operation-scoped policy reference).
        // passport.metadata.subjectId maps to the former principalId (actor performing the operation).
        const result = await this.policyEngine.evaluate(passport.metadata.operationId ?? '', {
            passportId: passport.id,
            principalId: passport.metadata.subjectId,
            targetId: context.targetId,
            environment: context.environment,
            metadata: context.metadata
        });

        if (!result.allowed) {
            throw new Error(__t('messages.error.policy_evaluation_failed', { 'result_reason': result.reason }));
        }
    }
}
