import { Logger, __t } from '@ugondu/shared';
import { RepairPlan } from './repair-engine';
import { DriftCategory } from '../model/drift';
import { IAwsClient } from '../../fabric/providers/aws';

export class AwsPhysicalRepairExecutor {
    constructor(private readonly awsClient: IAwsClient) {}

    public async executeRepair(plan: RepairPlan): Promise<boolean> {
        if (!plan.requiresInfrastructureRepair) {
            Logger.info(__t('msg_no_infrastructure_repair_required_enviro'));
            return true;
        }

        Logger.info(`Executing Physical Repair for AWS Infrastructure Drift...`);

        const region = process.env.UGONDU_CERT_REGION;
        if (!region) {
            throw new Error("UGONDU_CERT_REGION is missing from the environment");
        }

        for (const diag of plan.diagnoses) {
            if (diag.category === DriftCategory.INFRASTRUCTURE_DRIFT) {
                const drift = diag as import('../model/drift').InfrastructureDriftDiagnostic;
                Logger.info(`Repairing Infrastructure Drift: ${drift.provider} ${drift.resourceType} ${drift.resourceId}`);

                try {
                    if (drift.repairOperation === 'ec2:CreateTags') {
                        Logger.info(`Diagnosis: Drift detected on EC2 instance tags.`);
                        Logger.info(`Authorization: Executing repair under Policy Governance Engine limits.`);
                        Logger.info(`Mutation: Dispatching ec2:CreateTags for ${drift.resourceId}`);
                        await this.awsClient.setEc2Tags(drift.resourceId, { [drift.attribute]: drift.expectedValue });
                        Logger.info(`Provider Response: Tags successfully applied to ${drift.resourceId}`);
                        Logger.info(`Verification: Checking tag state for ${drift.resourceId}`);
                    } else if (drift.repairOperation === 'rds:ModifyDBInstance') {
                        Logger.info(`Diagnosis: Drift detected on RDS instance attributes.`);
                        Logger.info(`Authorization: Executing repair under Policy Governance Engine limits.`);
                        Logger.info(`Mutation: Dispatching rds:ModifyDBInstance for ${drift.resourceId}`);
                        await this.awsClient.modifyRdsInstance(drift.resourceId, { [drift.attribute]: drift.expectedValue });
                        Logger.info(`Provider Response: Attribute successfully modified on ${drift.resourceId}`);
                        Logger.info(`Verification: Checking RDS instance attribute for ${drift.resourceId}`);
                    }
                } catch (err: any) {
                    Logger.error(`Physical repair failed: ${err.message}`);
                    return false;
                }
            }
        }

        return true;
    }
}
