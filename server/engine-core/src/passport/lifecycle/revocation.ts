/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Lifecycle
 * File           : revocation.ts
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
import { __t } from '../../../../shared/i18n';


import { CacheClient } from '../../infrastructure/cache/client';
import { DatabaseClient } from '../../infrastructure/database/client';

/**
 * @class RevocationManager
 * @description Corporate Governed class implementation for RevocationManager
 * @classification ENTERPRISE
 */
export class RevocationManager {
    constructor(
        private readonly cacheClient: CacheClient,
        private readonly dbClient: DatabaseClient
    ) {}

    public async isRevoked(passportId: string): Promise<boolean> {
        const cacheKey = `passport:revocation:${passportId}`;
        const cachedRevocation = await this.cacheClient.get(cacheKey);
        
        if (cachedRevocation !== null) {
            return cachedRevocation === 'true';
        }

        const record = await this.dbClient.query(
            'SELECT is_revoked FROM passports WHERE id = $1',
            [passportId]
        );

        if (record.rows.length === 0) {
            throw new Error(__t('messages.error.passport_not_found', { 'passportId': passportId }));
        }

        const isRevoked = record.rows[0].is_revoked;
        await this.cacheClient.set(cacheKey, String(isRevoked), 300);
        return isRevoked;
    }

    public async revoke(passportId: string, reason: string): Promise<void> {
        await this.dbClient.execute(
            'UPDATE passports SET is_revoked = true, revocation_reason = $1, updated_at = NOW() WHERE id = $2',
            [reason, passportId]
        );
        const cacheKey = `passport:revocation:${passportId}`;
        await this.cacheClient.set(cacheKey, 'true', 300);
    }
}
