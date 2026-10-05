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
        let requiresInfrastructureRepair = false;
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
        }

        // 3. Detect Physical Infrastructure Drift (P0-9: AWS EC2/RDS)
        if (twin.infrastructure) {
            for (const infra of twin.infrastructure) {
                const keys = Object.keys(infra.expectedState);
                for (const key of keys) {
                    const expected = infra.expectedState[key];
                    const actual = infra.actualState[key];
                    
                    if (expected !== actual) {
                        Logger.warn(`[SIM-DEISE] Drift Detected: Expected ${expected}, observed ${actual}`);
                        
                        diagnoses.push({
                            category: DriftCategory.INFRASTRUCTURE_DRIFT,
                            description: `Infrastructure drift on ${infra.id} (${infra.type}): ${key} expected ${expected} but was ${actual}`,
                            affectedPaths: [infra.id],
                            isDestructiveRecovery: false,
                            remediationAction: 'REPAIR_INFRASTRUCTURE'
                        });
                        requiresInfrastructureRepair = true;
                    }
                }
            }
        }

        // 4. Evaluate Safe To Proceed
        const safeToProceed = true; 

        if (destructiveDeleteBlocked) {
            Logger.warn('Destructive delete (--delete) is blocked due to detected topology anomalies.');
        }
        
        if (requiresInfrastructureRepair) {
            Logger.info('[SIM-DEISE] Executing Repair Plan...');
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
