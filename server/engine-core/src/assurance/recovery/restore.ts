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

import { RecoveryPoint } from './recovery-point';
import { RestoreAdapter } from '../providers/restore-adapter';
import { DependencyOrderManager } from './dependency-order';

export class RestoreEngine {
    constructor(
        private readonly adapter: RestoreAdapter,
        private readonly dependencyManager: DependencyOrderManager
    ) {}

    public async executeRestore(point: RecoveryPoint): Promise<void> {
        if (!point.isValidated()) {
            throw new Error(`Restore rejected: RecoveryPoint ${point.id} is not validated.`);
        }

        const resources = point.context.map(c => c.resourceId);
        const order = this.dependencyManager.computeRestoreOrder(resources);

        for (const resourceId of order) {
            const context = point.context.find(c => c.resourceId === resourceId);
            if (!context) {
                throw new Error(`Missing context for resource ${resourceId}`);
            }

            await this.adapter.restoreResource(resourceId, context.stateData, context.checksum);
        }
    }
}
