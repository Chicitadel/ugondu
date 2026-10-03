/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance
 * File           : restore.ts
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
import { __t } from '../../../../shared/i18n';


import { RecoveryPoint } from './recovery-point';
import { RestoreAdapter } from '../providers/restore-adapter';
import { DependencyOrderManager } from './dependency-order';

/**
 * @class RestoreEngine
 * @description Corporate Governed class implementation for RestoreEngine
 * @classification ENTERPRISE
 */
export class RestoreEngine {
    constructor(
        private readonly adapter: RestoreAdapter,
        private readonly dependencyManager: DependencyOrderManager
    ) {}

    public async executeRestore(point: RecoveryPoint): Promise<void> {
        if (!point.isValidated()) {
            throw new Error(__t('messages.error.restore_rejected_recoverypoint_is_not_validat', { 'point_id': point.id }));
        }

        const resources = point.context.map(c => c.resourceId);
        const order = this.dependencyManager.computeRestoreOrder(resources);

        for (const resourceId of order) {
            const context = point.context.find(c => c.resourceId === resourceId);
            if (!context) {
                throw new Error(__t('messages.error.missing_context_for_resource', { 'resourceId': resourceId }));
            }

            await this.adapter.restoreResource(resourceId, context.stateData, context.checksum);
        }
    }
}
