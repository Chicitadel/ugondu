/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / DEISE / Engine
 * File           : repair-engine.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import { EnvironmentTwin } from '../twin/environment-twin';
import { DriftCategory, DriftDiagnosis, ObjectType } from '../model/drift';

export interface RepairPlan {
    diagnoses: DriftDiagnosis[];
    requiresApplicationUpload: boolean;
    requiresTopologyRepair: boolean;
    safeToProceed: boolean;
    destructiveDeleteBlocked: boolean;
}

export class DeploymentRepairEngine {

    /**
     * Inspects the Environment Twin and generates a Repair Plan, classifying drifts.
     */
    public diagnoseEnvironment(twin: EnvironmentTwin, expectedReleaseId: string): RepairPlan {
        Logger.info(__t('messages.deise.starting_diagnosis'));

        const diagnoses: DriftDiagnosis[] = [];
        let requiresApplicationUpload = false;
        let requiresTopologyRepair = false;
        let destructiveDeleteBlocked = false;

        // 1. Detect Topology Drift (e.g. DirectAdmin migration incident)
        if (!twin.topology.currentSymlinkValid) {
            diagnoses.push({
                category: DriftCategory.TOPOLOGY_DRIFT,
                description: 'The `current` release pointer is broken or missing.',
                affectedPaths: ['current'],
                isDestructiveRecovery: false,
                remediationAction: 'RESTORE_SYMLINK'
            });
            requiresTopologyRepair = true;
            // Block destructive syncing because the topology itself is broken, not the files.
            destructiveDeleteBlocked = true;
        }

        if (twin.topology.webrootSymlinkTarget !== 'current/public_html') {
            diagnoses.push({
                category: DriftCategory.ENVIRONMENT_DRIFT,
                description: 'Webroot pointer does not match expected platform topology. Possible hosting migration detected.',
                affectedPaths: [twin.topology.webrootPath],
                isDestructiveRecovery: false,
                remediationAction: 'RECONFIGURE_WEBROOT'
            });
            requiresTopologyRepair = true;
            destructiveDeleteBlocked = true;
        }

        // 2. Detect Payload Drift
        if (twin.application.integrityStatus === 'MISSING' || twin.application.integrityStatus === 'CORRUPTED') {
            diagnoses.push({
                category: DriftCategory.PAYLOAD_DRIFT,
                description: `Application payload is ${twin.application.integrityStatus.toLowerCase()}.`,
                affectedPaths: ['releases/' + expectedReleaseId],
                isDestructiveRecovery: false,
                remediationAction: 'UPLOAD_APPLICATION_PAYLOAD'
            });
            requiresApplicationUpload = true;
        } else {
            // Application is valid! Do not re-upload unnecessarily!
            if (requiresTopologyRepair) {
                Logger.info('Application intact but topology broken. Smart repair will skip upload.');
            }
        }

        // 3. Evaluate Safe To Proceed
        // If we only have Topology drift, we can safely repair it.
        // If we have an unknown topology but the engine cannot fix it automatically, block deployment.
        const safeToProceed = true; // In a full implementation, this evaluates if the remediation actions are fully mapped.

        if (destructiveDeleteBlocked) {
            Logger.warn('Destructive delete (--delete) is blocked due to detected topology anomalies.');
        }

        return {
            diagnoses,
            requiresApplicationUpload,
            requiresTopologyRepair,
            safeToProceed,
            destructiveDeleteBlocked
        };
    }
}
