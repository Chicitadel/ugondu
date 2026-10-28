/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : target-validator.ts
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
 * @class TargetValidator
 * @description Corporate Governed class implementation for TargetValidator
 * @classification ENTERPRISE
 */
export class TargetValidator {
    public async validate(passport: DeliveryPassport, context: ExecutionContext): Promise<void> {
        if (passport.metadata.targetId !== context.targetId) {
            throw new Error(__t('messages.error.target_mismatch_passport_is_for_but_execution', { 'passport_metadata_targetId': passport.metadata.targetId, 'context_targetId': context.targetId }));
        }

        if (context.targetType !== undefined && passport.version !== undefined) {
            // targetType is carried on the ExecutionContext; the passport does not encode it.
            // Validate that the context's targetType is provided and non-empty.
            if (context.targetType.trim() === '') {
                throw new Error(__t('messages.error.target_type_mismatch_executioncontext_carries'));
            }
        }
    }
}
