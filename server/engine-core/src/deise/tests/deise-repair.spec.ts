/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Server / Engine Core / DEISE / Tests
 * File           : deise-repair.spec.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/

import { DeploymentRepairEngine } from '../engine/repair-engine';
import { EnvironmentTwin } from '../twin/environment-twin';
import { DriftCategory } from '../model/drift';
import { __t } from "@ugondu/shared";

describe(__t('msg_deise_deployment_environment_integrity_s'), () => {
    let deise: DeploymentRepairEngine;

    beforeEach(() => {
        deise = new DeploymentRepairEngine();
    });

    it(__t('msg_cor_31_1_distinguish_application_corrupt'), () => {
        // Stubing the scenario provided by the user:
        // Migrated to DirectAdmin.
        // `releases/release_20260730` exists and is perfectly healthy.
        // `current` symlink is broken or missing.
        // `public_html` is empty/broken instead of pointing to current.

        const targetTwin: EnvironmentTwin = {
            provider: {
                platform: 'directadmin',
                symlinkSupported: true,
                atomicRenameSupported: true,
                rsyncAvailable: true
            },
            application: {
                version: 'release_20260730',
                manifests: [], // (assumed 100% matched by discovery)
                integrityStatus: 'VALID' // Application payload is healthy!
            },
            topology: {
                currentSymlinkValid: false,
                currentSymlinkTarget: null,
                webrootPath: 'domains/admin.airroofers.eu/public_html',
                webrootSymlinkTarget: 'UNKNOWN_PHYSICAL_DIR',
                availableReleases: ['release_20260730']
            },
            runtime: {
                primaryRuntime: 'php',
                primaryRuntimeVersion: '8.3',
                missingDependencies: []
            }
        };

        const repairPlan = deise.diagnoseEnvironment(targetTwin, 'release_20260730');

        // Verify that DEISE protects the application files from destruction/re-upload
        expect(repairPlan.requiresApplicationUpload).toBe(false);
        expect(repairPlan.requiresTopologyRepair).toBe(true);

        // Verify that it correctly categorizes the DRIFT
        const driftCategories = repairPlan.diagnoses.map(d => d.category);
        expect(driftCategories).toContain(DriftCategory.TOPOLOGY_DRIFT);
        expect(driftCategories).toContain(DriftCategory.ENVIRONMENT_DRIFT);
        expect(driftCategories).not.toContain(DriftCategory.PAYLOAD_DRIFT);

        // Verify the __t('do_no_harm') constraint: It must explicitly block destructive deletions
        // because the structural drift implies we don't fully understand the mapping yet.
        expect(repairPlan.destructiveDeleteBlocked).toBe(true);
    });

    it(__t('msg_cor_31_2_proceed_with_upload_if_payload'), () => {
        const targetTwin: EnvironmentTwin = {
            provider: {
                platform: 'cpanel',
                symlinkSupported: true,
                atomicRenameSupported: true,
                rsyncAvailable: true
            },
            application: {
                version: 'release_20260730',
                manifests: [],
                integrityStatus: 'CORRUPTED' // A file was modified or missing in the payload
            },
            topology: {
                currentSymlinkValid: true,
                currentSymlinkTarget: 'releases/release_20260730',
                webrootPath: 'public_html',
                webrootSymlinkTarget: 'current/public_html',
                availableReleases: ['release_20260730']
            },
            runtime: {
                primaryRuntime: 'php',
                primaryRuntimeVersion: '8.3',
                missingDependencies: []
            }
        };

        const repairPlan = deise.diagnoseEnvironment(targetTwin, 'release_20260730');

        expect(repairPlan.requiresTopologyRepair).toBe(false);
        expect(repairPlan.requiresApplicationUpload).toBe(true);
        expect(repairPlan.destructiveDeleteBlocked).toBe(false); // Safe to synchronize within valid structure
    });
});
