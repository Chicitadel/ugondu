/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Passport Gatekeeper
 * File           : reality-gate.ts
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

import type { DeliveryPassport } from '../model/passport';
import { ExecutionContext } from '../../types/execution';
import { DatabaseClient } from '../../infrastructure/database/client';

/**
 * @class RealityGate
 * @description Corporate Governed class implementation for RealityGate
 * @classification ENTERPRISE
 */
export class RealityGate {
    constructor(private readonly dbClient: DatabaseClient) {}

    public async validate(passport: DeliveryPassport, context: ExecutionContext): Promise<void> {
        // Ensures the requested target state hasn't been mutated out-of-band.
        // The version hash is retrieved from the DB and compared against the
        // passport's execution-scoped hash stored in metadata.executionId.
        const record = await this.dbClient.query(
            __t('msg_select_version_hash_from_entities_where'),
            [context.targetId]
        );

        if (record.rows.length === 0) {
            throw new Error(__t('messages.error.reality_gate_failure_target_does_not_exist', { 'context_targetId': context.targetId }));
        }

        const currentHash = record.rows[0].version_hash as string;
        const expectedHash = passport.metadata.executionId ?? '';

        if (expectedHash === '') {
            throw new Error(__t('messages.error.reality_gate_failure_passport_carries_no_exec', { 'passport_id': passport.id }));
        }

        if (expectedHash !== currentHash) {
            throw new Error(__t('messages.error.reality_gate_failure_target_version_mismatch_', { 'context_targetId': context.targetId, 'expectedHash': expectedHash, 'currentHash': currentHash }));
        }
    }
}
