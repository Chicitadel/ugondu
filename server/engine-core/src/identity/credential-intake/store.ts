/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Identity / Credential Intake Store
 * File           : store.ts
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-10-05
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Fail-Closed Semantics
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as keytar from 'keytar';
import { Logger, ErrorCode, UgonduDomainError } from '@ugondu/shared';
import { NormalizedCredential } from './core';

const UGONDU_KEYTAR_SERVICE = 'UgonduAWSProvider';

export class UgonduCredentialStore {
    public async save(credential: NormalizedCredential): Promise<void> {
        // We partition by provider so multiple providers can be stored
        const accountId = `ugondu-${credential.provider}-credentials`;
        const payload = JSON.stringify(credential);

        await keytar.setPassword(UGONDU_KEYTAR_SERVICE, accountId, payload);
    }

    public async get(provider: string): Promise<NormalizedCredential | null> {
        const accountId = `ugondu-${provider}-credentials`;
        const payload = await keytar.getPassword(UGONDU_KEYTAR_SERVICE, accountId);

        if (!payload) return null;

        try {
            return JSON.parse(payload) as NormalizedCredential;
        } catch (err: unknown) {
            Logger.error(`Credential store contains corrupted JSON payload for provider "${provider}"`, err, {
                provider,
                accountId
            });
            throw new UgonduDomainError(
                ErrorCode.STATE_CORRUPT,
                `Credential store data corruption for provider "${provider}": malformed payload`,
                { provider, accountId, failClosed: true },
                err
            );
        }
    }

    public async remove(provider: string): Promise<void> {
        const accountId = `ugondu-${provider}-credentials`;
        await keytar.deletePassword(UGONDU_KEYTAR_SERVICE, accountId);
    }
}
