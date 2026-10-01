/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : emergency-validator.ts
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

import { ExecutionContext } from '../../types/execution';
import { DatabaseClient } from '../../../infrastructure/database/client';

export class EmergencyValidator {
    constructor(private readonly dbClient: DatabaseClient) {}

    public async validate(context: ExecutionContext): Promise<void> {
        const record = await this.dbClient.query(
            'SELECT is_emergency_lockdown FROM system_state LIMIT 1'
        );

        if (record.rows.length > 0 && record.rows[0].is_emergency_lockdown) {
            if (!context.isEmergencyBypassEnabled) {
                throw new Error('System is in emergency lockdown and bypass is not enabled for this context');
            }
        }
    }
}
