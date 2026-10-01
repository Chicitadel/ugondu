/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Lifecycle
 * File           : expiry.ts
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

import { CacheClient } from '../../../infrastructure/cache/client';
import { DatabaseClient } from '../../../infrastructure/database/client';

export class ExpiryManager {
    constructor(
        private readonly cacheClient: CacheClient,
        private readonly dbClient: DatabaseClient
    ) {}

    public async isExpired(passportId: string): Promise<boolean> {
        const cacheKey = `passport:expiry:${passportId}`;
        const cachedExpiry = await this.cacheClient.get(cacheKey);

        let expiresAt: Date;
        if (cachedExpiry !== null) {
            expiresAt = new Date(cachedExpiry);
        } else {
            const record = await this.dbClient.query(
                'SELECT expires_at FROM passports WHERE id = $1',
                [passportId]
            );

            if (record.rows.length === 0) {
                throw new Error(`Passport ${passportId} not found`);
            }
            expiresAt = record.rows[0].expires_at;
            await this.cacheClient.set(cacheKey, expiresAt.toISOString(), 300);
        }

        return new Date() > expiresAt;
    }
}
