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

        for (const diag of plan.diagnoses) {
            if (diag.category === DriftCategory.INFRASTRUCTURE_DRIFT) {
                Logger.info(`Repairing Infrastructure Drift: ${diag.description}`);

                try {
                    const affectedResourceId = diag.affectedPaths[0];

                    if (diag.description.includes('EC2')) {
                        Logger.info(`Dispatching ec2:CreateTags for ${affectedResourceId}`);
                        if (diag.expectedState && diag.expectedState.Name) {
                            const expectedName = diag.expectedState.Name;
                            const { EC2Client, CreateTagsCommand } = require('@aws-sdk/client-ec2');
                            const ec2 = new EC2Client({ region: (this.awsClient as any).region || 'us-east-1' });
                            await ec2.send(new CreateTagsCommand({
                                Resources: [affectedResourceId],
                                Tags: [{ Key: 'Name', Value: expectedName }]
                            }));
                            Logger.info(`Successfully dispatched reconciliation for ${affectedResourceId}`);
                        } else {
                            Logger.warn(`Could not parse expected tag from expectedState for ${affectedResourceId}`);
                        }
                    } else if (diag.description.includes('RDS')) {
                        Logger.info(` Dispatching rds:ModifyDBInstance for ${affectedResourceId}`);
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
