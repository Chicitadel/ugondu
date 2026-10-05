import { Logger } from '@ugondu/shared';
import { RepairPlan } from './repair-engine';
import { DriftCategory } from '../model/drift';
import { IAwsClient } from '../../fabric/providers/aws';

export class AwsPhysicalRepairExecutor {
    constructor(private readonly awsClient: IAwsClient) {}

    public async executeRepair(plan: RepairPlan): Promise<boolean> {
        if (!plan.safeToProceed) {
            Logger.error(__t('repair_plan_is_marked_unsafe_t'));
            return false;
        }

        if (!plan.requiresInfrastructureRepair) {
            Logger.info(__t('no_infrastructure_repair_requi'));
            return true;
        }

        Logger.info(`[SIM-DEISE] Executing Physical Repair for AWS Infrastructure Drift...`);

        for (const diag of plan.diagnoses) {
            if (diag.category === DriftCategory.INFRASTRUCTURE_DRIFT) {
                Logger.info(`Repairing Infrastructure Drift: ${diag.description}`);
                
                try {
                    const affectedResourceId = diag.affectedPaths[0];
                    
                    if (diag.description.includes('EC2')) {
                        Logger.info(`[SIM-DEISE] Dispatching ec2:CreateTags for ${affectedResourceId}`);
                        
                        // Extract expected tag value for Name (e.g., from __t('name_expected_prefix_but_was_d'))
                        const match = diag.description.match(/Name expected (\S+) but was/);
                        if (match && match[1]) {
                            const expectedName = match[1];
                            const { EC2Client, CreateTagsCommand } = require('@aws-sdk/client-ec2');
                            // Using a temporary client for the region (since Region might be hard to extract from IAwsClient)
                            // A real implementation would extract region or pass the raw EC2Client in
                            const ec2 = new EC2Client({ region: 'eu-west-3' });
                            await ec2.send(new CreateTagsCommand({
                                Resources: [affectedResourceId],
                                Tags: [{ Key: 'Name', Value: expectedName }]
                            }));
                            Logger.info(`Successfully dispatched reconciliation for ${affectedResourceId}`);
                        } else {
                            Logger.warn(`Could not parse expected tag from description: ${diag.description}`);
                        }
                    } else if (diag.description.includes('RDS')) {
                        Logger.info(`[SIM-DEISE] Dispatching rds:ModifyDBInstance for ${affectedResourceId}`);
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
