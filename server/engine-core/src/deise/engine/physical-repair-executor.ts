/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / DEISE / Physical Repair Executor
 * File           : physical-repair-executor.ts
 * Version        : 2.1.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import { RepairPlan } from './repair-engine';
import { DriftCategory } from '../model/drift';
import { DirectAdminNativeClient } from '../../fabric/providers/directadmin-native-client';

/**
 * Physically executes a DEISE Repair Plan against a target environment.
 */
export class PhysicalRepairExecutor {
    constructor(private readonly daClient: DirectAdminNativeClient) {}

    public async executeRepair(plan: RepairPlan, instanceId: string, username: string): Promise<boolean> {
        if (!plan.requiresTopologyRepair) {
            Logger.info(__t('msg_no_topology_repair_required_environment'));
            return true; // Nothing to repair physically
        }

        Logger.info(__t('deise.repair.executing_instance', { instanceId }));

        for (const diag of plan.diagnoses) {
            if (diag.category === DriftCategory.TOPOLOGY_DRIFT) {
                Logger.info(__t('deise.repair.repairing_drift', { description: diag.description }));

                // Specific fix for the DirectAdmin "public_html broken symlink" incident
                if (diag.description.includes('pointer') || diag.description.includes('public_html')) {
                    try {
                        // The 'daClient' now has a physical execCmd (exposed or used internally)
                        // However, we need a specific 'repairSymlink' capability or just use createHostedApp
                        // For a precise DirectAdmin physical fix:
                        Logger.info(__t('deise.repair.ssh_restoration', { instanceId }));

                        // We will physically recreate the public_html symlink pointing to the current release
                        // (Assuming release_currentVersion is tracked or we fallback to an empty safe dir)
                        // Note: For full safety, DirectAdminNativeClient should expose `execCmd` securely for repair operations.
                        // We'll call a dedicated repair function on the client.
                        await this.daClient.restorePublicHtmlDirectory(instanceId);

                        Logger.info(__t('deise.repair.topology_repaired', { instanceId }));
                    } catch (err) {
                        Logger.error(__t('deise.repair.failed', { error: (err as Error).message }));
                        return false;
                    }
                }
            }
        }

        return true;
    }
}
