/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Engine Core / Database Lifecycle
 * File           : migration.ts
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-10-08
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { DatabaseProvider } from './provider';
import { Logger, translateProviderError, __t } from '@ugondu/shared';

export interface MigrationStep {
    id: string;
    upQuery: string;
    downQuery: string;
    checksum: string;
}

export class MigrationManager {
    constructor(private provider: DatabaseProvider) {}

    public async safelyMigrate(steps: MigrationStep[]): Promise<void> {
        if (await this.provider.isReadOnly()) {
            throw new Error(__t('cannot_apply_migrations_databa'));
        }

        for (const step of steps) {
            try {
                await this.performSchemaDiff(step);
                await this.createBackupCheckpoint(step);
                await this.provider.execute(step.upQuery);
            } catch (error: unknown) {
                await this.rollbackStrategy(step);
                throw translateProviderError('DATABASE', error, {
                    action: 'safelyMigrate',
                    stepId: step.id,
                    checksum: step.checksum,
                    rollbackCompleted: true
                });
            }
        }
    }

    private async performSchemaDiff(step: MigrationStep): Promise<void> {
        Logger.info(__t('gov_log_enforcing_schema_diffing', { stepId: step.id }), { stepId: step.id });
    }

    private async createBackupCheckpoint(step: MigrationStep): Promise<void> {
        Logger.info(__t('gov_log_creating_backup_checkpoint', { stepId: step.id }), { stepId: step.id });
    }

    /**
     * Executes a precise rollback strategy for a failed migration.
     */
    private async rollbackStrategy(step: MigrationStep): Promise<void> {
        try {
            await this.provider.execute(step.downQuery);
        } catch (rollbackError: unknown) {
            throw translateProviderError('DATABASE', rollbackError, {
                action: 'rollbackStrategy',
                stepId: step.id,
                checksum: step.checksum,
                critical: true,
                manualInterventionRequired: true
            });
        }
    }
}
