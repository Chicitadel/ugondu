/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Lifecycle
 * File           : validator.ts
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
import { LifecycleState } from '../../types/lifecycle';
import { ExpiryManager } from './expiry';
import { RevocationManager } from './revocation';
import { ConsumptionManager } from './consumption';

export class LifecycleValidator {
    constructor(
        private readonly expiryManager: ExpiryManager,
        private readonly revocationManager: RevocationManager,
        private readonly consumptionManager: ConsumptionManager
    ) {}

    public async validateState(passportId: string, expectedState: LifecycleState): Promise<boolean> {
        // Core state validation logic
        const isRevoked = await this.revocationManager.isRevoked(passportId);
        if (isRevoked) {
            throw new Error(`Passport ${passportId} is revoked.`);
        }

        const isExpired = await this.expiryManager.isExpired(passportId);
        if (isExpired) {
            throw new Error(`Passport ${passportId} is expired.`);
        }

        const isConsumed = await this.consumptionManager.isConsumed(passportId);
        if (isConsumed && expectedState !== LifecycleState.CONSUMED) {
            throw new Error(`Passport ${passportId} has already been consumed.`);
        }

        return true;
    }
}
