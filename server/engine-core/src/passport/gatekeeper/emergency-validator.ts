/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : emergency-validator.ts
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

import { ExecutionContext } from '../../types/execution';
import { DatabaseClient } from '../../infrastructure/database/client';

/**
 * @class EmergencyValidator
 * @description Corporate Governed class implementation for EmergencyValidator
 * @classification ENTERPRISE
 */
export class EmergencyValidator {
    constructor(private readonly dbClient: DatabaseClient) {}

    public async validate(context: ExecutionContext): Promise<void> {
        const record = await this.dbClient.query(
            'SELECT is_emergency_lockdown FROM system_state LIMIT 1'
        );

        if (record.rows.length > 0 && record.rows[0].is_emergency_lockdown) {
            if (!context.isEmergencyBypassEnabled) {
                throw new Error(__t('messages.error.system_is_in_emergency_lockdown_and_bypass_is'));
            }
        }
    }
}
