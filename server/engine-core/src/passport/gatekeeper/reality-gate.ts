/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : reality-gate.ts
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
import { DatabaseClient } from '../../infrastructure/database/client';

export class RealityGate {
    constructor(private readonly dbClient: DatabaseClient) {}

    public async validate(passport: PassportEnvelope, context: ExecutionContext): Promise<void> {
        // Ensures the requested target state hasn't been mutated out-of-band
        const record = await this.dbClient.query(
            'SELECT version_hash FROM entities WHERE id = $1',
            [context.targetId]
        );

        if (record.rows.length === 0) {
            throw new Error(`Reality gate failure: Target ${context.targetId} does not exist`);
        }

        const currentHash = record.rows[0].version_hash;
        if (passport.targetVersionHash !== currentHash) {
            throw new Error(`Reality gate failure: Target ${context.targetId} version mismatch. Expected ${passport.targetVersionHash}, got ${currentHash}`);
        }
    }
}
