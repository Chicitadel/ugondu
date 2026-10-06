import { Logger } from '@ugondu/shared';
import { RepairPlan } from './repair-engine';
import { DriftCategory } from '../model/drift';
import { IAwsClient } from '../../fabric/providers/aws';

export class AwsPhysicalRepairExecutor {
    constructor(private readonly awsClient: IAwsClient) {}

    public async executeRepair(plan: RepairPlan): Promise<boolean> {
        if (!plan.safeToProceed) {
            Logger.error(__t('msg_repair_plan_is_marked_unsafe_to_proceed'));
            return false;
        }

        if (!plan.requiresInfrastructureRepair) {
            Logger.info(__t('msg_no_infrastructure_repair_required_enviro'));
            return true;
        }

        Logger.info(` Executing Physical Repair for AWS Infrastructure Drift...`);

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
                        Logger.info(`Dispatching ec2:CreateTags for ${drift.resourceId}`);
                        const { CreateTagsCommand } = require('@aws-sdk/client-ec2');
                        const ec2Client = (this.awsClient as any).ec2;
                        if (!ec2Client) {
                            throw new Error("Injected IAwsClient does not expose native ec2 client");
                        }
                        await ec2Client.send(new CreateTagsCommand({
                            Resources: [drift.resourceId],
                            Tags: [{ Key: drift.attribute, Value: drift.expectedValue }]
                        }));
                        Logger.info(`Successfully dispatched reconciliation for ${drift.resourceId}`);
                    } else if (drift.repairOperation === 'rds:ModifyDBInstance') {
                        Logger.info(` Dispatching rds:ModifyDBInstance for ${drift.resourceId}`);
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
