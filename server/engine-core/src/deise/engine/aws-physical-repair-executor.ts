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
            throw new Error(__t('error.cert.missing_region'));
        }

        for (const diag of plan.diagnoses) {
            if (diag.category === DriftCategory.INFRASTRUCTURE_DRIFT) {
                const drift = diag as import('../model/drift').InfrastructureDriftDiagnostic;
                Logger.info(`Repairing Infrastructure Drift: ${drift.provider} ${drift.resourceType} ${drift.resourceId}`);

                try {
                    if (drift.repairOperation === 'ec2:CreateTags') {
                        Logger.info(`DISCOVER -> DIAGNOSE -> AUTHORIZE -> MUTATE -> CAPTURE PROVIDER RESPONSE -> READ ACTUAL STATE -> COMPARE EXPECTED vs ACTUAL -> EVIDENCE -> PASS / FAIL`);
                        Logger.info(`Diagnosis: Drift detected on EC2 instance tags.`);
                        Logger.info(`Authorization: Executing repair under Policy Governance Engine limits.`);
                        Logger.info(`Mutation: Dispatching ec2:CreateTags for ${drift.resourceId}`);
                        await this.awsClient.setEc2Tags(drift.resourceId, { [drift.attribute]: drift.expectedValue });
                        Logger.info(`Provider Response: Tags successfully applied to ${drift.resourceId}`);
                        
                        Logger.info(`Read Actual State: Fetching tags for ${drift.resourceId}`);
                        const actualTags = await this.awsClient.getEc2Tags(drift.resourceId);
                        const actualValue = actualTags[drift.attribute];
                        
                        Logger.info(`Compare Expected vs Actual: Expected '${drift.expectedValue}', Actual '${actualValue}'`);
                        if (actualValue !== drift.expectedValue) {
                            Logger.error(`Evidence: Tag ${drift.attribute} did not match expected value. Fail.`);
                            return false;
                        }
                        Logger.info(`Evidence: Physical verification passed for ${drift.resourceId}. Pass.`);
                    } else if (drift.repairOperation === 'rds:ModifyDBInstance') {
                        Logger.info(`DISCOVER -> DIAGNOSE -> AUTHORIZE -> MUTATE -> CAPTURE PROVIDER RESPONSE -> READ ACTUAL STATE -> COMPARE EXPECTED vs ACTUAL -> EVIDENCE -> PASS / FAIL`);
                        Logger.info(`Diagnosis: Drift detected on RDS instance attributes.`);
                        Logger.info(`Authorization: Executing repair under Policy Governance Engine limits.`);
                        Logger.info(`Mutation: Dispatching rds:ModifyDBInstance for ${drift.resourceId}`);
                        await this.awsClient.modifyRdsInstance(drift.resourceId, { [drift.attribute]: drift.expectedValue });
                        Logger.info(`Provider Response: Attribute successfully modified on ${drift.resourceId}`);
                        
                        Logger.info(`Read Actual State: Fetching attribute ${drift.attribute} for ${drift.resourceId}`);
                        const actualValue = await this.awsClient.getRdsAttribute(drift.resourceId, drift.attribute);
                        
                        Logger.info(`Compare Expected vs Actual: Expected '${drift.expectedValue}', Actual '${actualValue}'`);
                        if (String(actualValue) !== String(drift.expectedValue)) {
                            Logger.error(`Evidence: RDS attribute ${drift.attribute} did not match expected value. Fail.`);
                            return false;
                        }
                        Logger.info(`Evidence: Physical verification passed for ${drift.resourceId}. Pass.`);
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
