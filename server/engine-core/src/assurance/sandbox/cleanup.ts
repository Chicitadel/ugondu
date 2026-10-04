/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : cleanup.ts
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Team
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


import { SecretManager } from './secrets';
import { IdentityManager } from './identity';

/**
 * @class SandboxCleanup
 * @description Corporate Governed class implementation for SandboxCleanup
 * @classification ENTERPRISE
 */
export class SandboxCleanup {
    constructor(
        private readonly secretManager: SecretManager,
        private readonly identityManager: IdentityManager
    ) {}

    public async purge(sandboxId: string): Promise<void> {
        if (!sandboxId) {
            throw new Error(__t('messages.error.cannot_purge_empty_sandbox_id'));
        }

        this.secretManager.purgeSecrets(sandboxId);
        this.identityManager.revokeIdentity(sandboxId);
    }
}
