/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Lifecycle
 * File           : consumption.ts
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
// @ts-ignore
import { __t } from '@ugondu/shared';


import { DatabaseClient } from '../../infrastructure/database/client';

/**
 * @class ConsumptionManager
 * @description Corporate Governed class implementation for ConsumptionManager
 * @classification ENTERPRISE
 */
export class ConsumptionManager {
    constructor(
        private readonly dbClient: DatabaseClient
    ) {}

    public async isConsumed(passportId: string): Promise<boolean> {
        const record = await this.dbClient.query(
            __t('msg_select_is_consumed_from_passports_where'),
            [passportId]
        );

        if (record.rows.length === 0) {
            throw new Error(__t('messages.error.passport_not_found', { 'passportId': passportId }));
        }

        return record.rows[0].is_consumed;
    }

    public async markConsumed(passportId: string, executionId: string): Promise<void> {
        await this.dbClient.execute(
            __t('msg_update_passports_set_is_consumed_true_co'),
            [executionId, passportId]
        );
    }
}
