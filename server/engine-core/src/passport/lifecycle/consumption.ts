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

import { DatabaseClient } from '../../infrastructure/database/client';

export class ConsumptionManager {
    constructor(
        private readonly dbClient: DatabaseClient
    ) {}

    public async isConsumed(passportId: string): Promise<boolean> {
        const record = await this.dbClient.query(
            'SELECT is_consumed FROM passports WHERE id = $1',
            [passportId]
        );

        if (record.rows.length === 0) {
            throw new Error(`Passport ${passportId} not found`);
        }

        return record.rows[0].is_consumed;
    }

    public async markConsumed(passportId: string, executionId: string): Promise<void> {
        await this.dbClient.execute(
            'UPDATE passports SET is_consumed = true, consumed_by = $1, consumed_at = NOW() WHERE id = $2 AND is_consumed = false',
            [executionId, passportId]
        );
    }
}
