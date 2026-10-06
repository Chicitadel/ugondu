import { Logger } from '@ugondu/shared';
// @ts-ignore
import { __t } from '@ugondu/shared';

import { EnvironmentTwin } from '../twin/environment-twin';
import { DriftCategory, DriftDiagnosis } from '../model/drift';

export interface RepairPlan {
    diagnoses: DriftDiagnosis[];
    requiresApplicationUpload: boolean;
    requiresTopologyRepair: boolean;
    requiresInfrastructureRepair: boolean;
    infrastructureRepairs?: any[];
    safeToProceed: boolean;
    destructiveDeleteBlocked: boolean;
}

export class DeploymentRepairEngine {

    private capabilityRegistry = require('./recovery/capability-registry').GlobalCapabilityRegistry;

    /**
     * Inspects the Environment Twin and generates a Repair Plan, classifying drifts.
     */
    public diagnoseEnvironment(twin: EnvironmentTwin, expectedReleaseId: string): RepairPlan {
        Logger.info(__t('messages.deise.starting_diagnosis'));

        const diagnoses: DriftDiagnosis[] = [];
        let requiresApplicationUpload = false;
        let requiresTopologyRepair = false;
        let requiresInfrastructureRepair = false;
        let destructiveDeleteBlocked = false;

        // 1. Detect Topology Drift (e.g. DirectAdmin migration incident)
        if (!twin.topology.currentSymlinkValid) {
            diagnoses.push({
                category: DriftCategory.TOPOLOGY_DRIFT,
                description: __t('msg_the_current_release_pointer_is_broken_or'),
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
                description: __t('msg_webroot_pointer_does_not_match_expected'),
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
        }

        // 3. Detect Physical Infrastructure Drift
        if (twin.infrastructure) {
            for (const infra of twin.infrastructure) {
                const keys = Object.keys(infra.expectedState);
                for (const key of keys) {
                    const expected = infra.expectedState[key];
                    const actual = infra.actualState[key];

                    if (expected !== actual) {
                        Logger.warn(`Drift Detected: Expected ${expected}, observed ${actual}`);

                        // Delegate remediation verb to Provider Adapter via universal contract
                        let repairOperation = 'adapter:ReconcileResourceState';

                        diagnoses.push({
                            category: DriftCategory.INFRASTRUCTURE_DRIFT,
                            description: `Infrastructure drift on ${infra.id} (${infra.type}): ${key} expected ${expected} but was ${actual}`,
                            affectedPaths: [infra.id],
                            isDestructiveRecovery: false,
                            remediationAction: 'REPAIR_INFRASTRUCTURE',
                            provider: infra.provider || 'universal',
                            resourceType: infra.type,
                            resourceId: infra.id,
                            attribute: key,
                            expectedValue: expected,
                            actualValue: actual,
                            repairOperation: repairOperation
                        } as import('../model/drift').InfrastructureDriftDiagnostic);
                        requiresInfrastructureRepair = true;
                    }
                }
            }
        }

        // 4. Evaluate Safe To Proceed
        const safeToProceed = !destructiveDeleteBlocked;

        if (destructiveDeleteBlocked) {
            Logger.warn(__t('msg_destructive_delete_delete_is_blocked_due'));
        }

        if (requiresInfrastructureRepair) {
            Logger.info(__t('msg_executing_repair_plan'));
        }

        return {
            diagnoses,
            requiresApplicationUpload,
            requiresTopologyRepair,
            requiresInfrastructureRepair,
            safeToProceed,
            destructiveDeleteBlocked
        };
    }
}
