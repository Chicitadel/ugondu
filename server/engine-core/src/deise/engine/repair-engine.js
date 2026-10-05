'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentRepairEngine = void 0;
var shared_1 = require("@ugondu/shared");
// @ts-ignore
var shared_2 = require("@ugondu/shared");
var drift_1 = require("../model/drift");
var DeploymentRepairEngine = /** @class */ (function () {
    function DeploymentRepairEngine() {
    }
    /**
     * Inspects the Environment Twin and generates a Repair Plan, classifying drifts.
     */
    DeploymentRepairEngine.prototype.diagnoseEnvironment = function (twin, expectedReleaseId) {
        shared_1.Logger.info((0, shared_2.__t)('messages.deise.starting_diagnosis'));
        var diagnoses = [];
        var requiresApplicationUpload = false;
        var requiresTopologyRepair = false;
        var requiresInfrastructureRepair = false;
        var destructiveDeleteBlocked = false;
        // 1. Detect Topology Drift (e.g. DirectAdmin migration incident)
        if (!twin.topology.currentSymlinkValid) {
            diagnoses.push({
                category: drift_1.DriftCategory.TOPOLOGY_DRIFT,
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
                category: drift_1.DriftCategory.ENVIRONMENT_DRIFT,
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
                category: drift_1.DriftCategory.PAYLOAD_DRIFT,
                description: __t('application_payload_is').concat(twin.application.integrityStatus.toLowerCase(), "."),
                affectedPaths: ['releases/' + expectedReleaseId],
                isDestructiveRecovery: false,
                remediationAction: 'UPLOAD_APPLICATION_PAYLOAD'
            });
            requiresApplicationUpload = true;
        }
        // 3. Detect Physical Infrastructure Drift (P0-9: AWS EC2/RDS)
        if (twin.infrastructure) {
            for (var _i = 0, _a = twin.infrastructure; _i < _a.length; _i++) {
                var infra = _a[_i];
                var keys = Object.keys(infra.expectedState);
                for (var _b = 0, keys_1 = keys; _b < keys_1.length; _b++) {
                    var key = keys_1[_b];
                    var expected = infra.expectedState[key];
                    var actual = infra.actualState[key];
                    if (expected !== actual) {
                        shared_1.Logger.warn('[SIM-DEISE] Drift Detected: Expected '.concat(expected, __t('observed')).concat(actual));
                        diagnoses.push({
                            category: drift_1.DriftCategory.INFRASTRUCTURE_DRIFT,
                            description: __t('infrastructure_drift_on').concat(infra.id, " (").concat(infra.type, "): ").concat(key, __t('expected')).concat(expected, __t('but_was')).concat(actual),
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
        var safeToProceed = true;
        if (destructiveDeleteBlocked) {
            shared_1.Logger.warn('Destructive delete (--delete) is blocked due to detected topology anomalies.');
        }
        if (requiresInfrastructureRepair) {
            shared_1.Logger.info('[SIM-DEISE] Executing Repair Plan...');
        }
        return {
            diagnoses: diagnoses,
            requiresApplicationUpload: requiresApplicationUpload,
            requiresTopologyRepair: requiresTopologyRepair,
            requiresInfrastructureRepair: requiresInfrastructureRepair,
            safeToProceed: safeToProceed,
            destructiveDeleteBlocked: destructiveDeleteBlocked
        };
    };
    return DeploymentRepairEngine;
}());
exports.DeploymentRepairEngine = DeploymentRepairEngine;
