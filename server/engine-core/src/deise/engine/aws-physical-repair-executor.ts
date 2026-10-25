/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / DEISE / AWS Physical Repair Executor
 * File           : aws-physical-repair-executor.ts
 * Version        : 2.1.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import { RepairPlan } from './repair-engine';
import { DriftCategory } from '../model/drift';
import { IAwsClient } from '../../fabric/providers/aws';

export class AwsPhysicalRepairExecutor {
    constructor(private readonly awsClient: IAwsClient) {}

    public async executeRepair(planOrRepair: any): Promise<boolean> {
        const plan: RepairPlan = (planOrRepair && 'requiresInfrastructureRepair' in planOrRepair) ? planOrRepair : {
            diagnoses: Array.isArray(planOrRepair) ? planOrRepair : (planOrRepair ? [planOrRepair] : []),
            requiresApplicationUpload: false,
            requiresTopologyRepair: false,
            requiresInfrastructureRepair: true,
            safeToProceed: true,
            destructiveDeleteBlocked: false
        };
        if (!plan.requiresInfrastructureRepair || plan.diagnoses.length === 0) {
            Logger.info(__t('msg_no_infrastructure_repair_required_enviro'));
            return true;
        }

        Logger.info(__t('deise.aws_repair.executing'));

        const region = process.env.UGONDU_CERT_REGION;
        if (!region) {
            throw new Error(__t('error.cert.missing_region'));
        }

        for (const diag of plan.diagnoses) {
            if (diag.category === DriftCategory.INFRASTRUCTURE_DRIFT) {
                const drift = diag as import('../model/drift').InfrastructureDriftDiagnostic;
                Logger.info(__t('deise.aws_repair.repairing_drift', {
                    provider: drift.provider,
                    resourceType: drift.resourceType,
                    resourceId: drift.resourceId
                }));

                try {
                    if (drift.repairOperation === 'ec2:CreateTags') {
                        Logger.info(__t('deise.aws_repair.pipeline_steps'));
                        Logger.info(__t('deise.aws_repair.diagnosis_ec2_tags'));
                        Logger.info(__t('deise.aws_repair.auth_limits'));
                        Logger.info(__t('deise.aws_repair.dispatch_ec2_tags', { resourceId: drift.resourceId }));
                        await this.awsClient.setEc2Tags(drift.resourceId, { [drift.attribute]: drift.expectedValue });
                        Logger.info(__t('deise.aws_repair.ec2_tags_applied', { resourceId: drift.resourceId }));
                        
                        Logger.info(__t('deise.aws_repair.fetching_ec2_tags', { resourceId: drift.resourceId }));
                        const actualTags = await this.awsClient.getEc2Tags(drift.resourceId);
                        const actualValue = actualTags[drift.attribute];
                        
                        Logger.info(__t('deise.aws_repair.compare_expected_actual', {
                            expected: drift.expectedValue,
                            actual: actualValue
                        }));
                        if (actualValue !== drift.expectedValue) {
                            Logger.error(__t('deise.aws_repair.ec2_tag_mismatch', { attribute: drift.attribute }));
                            return false;
                        }
                        Logger.info(__t('deise.aws_repair.ec2_passed', { resourceId: drift.resourceId }));
                    } else if (drift.repairOperation === 'rds:ModifyDBInstance') {
                        Logger.info(__t('deise.aws_repair.pipeline_steps'));
                        Logger.info(__t('deise.aws_repair.diagnosis_rds_attrs'));
                        Logger.info(__t('deise.aws_repair.auth_limits'));
                        Logger.info(__t('deise.aws_repair.dispatch_rds_modify', { resourceId: drift.resourceId }));
                        await this.awsClient.modifyRdsInstance(drift.resourceId, { [drift.attribute]: drift.expectedValue });
                        Logger.info(__t('deise.aws_repair.rds_modified', { resourceId: drift.resourceId }));
                        
                        Logger.info(__t('deise.aws_repair.fetching_rds_attr', {
                            attribute: drift.attribute,
                            resourceId: drift.resourceId
                        }));
                        const actualValue = await this.awsClient.getRdsAttribute(drift.resourceId, drift.attribute);
                        
                        Logger.info(__t('deise.aws_repair.compare_expected_actual', {
                            expected: drift.expectedValue,
                            actual: actualValue
                        }));
                        if (String(actualValue) !== String(drift.expectedValue)) {
                            Logger.error(__t('deise.aws_repair.rds_attr_mismatch', { attribute: drift.attribute }));
                            return false;
                        }
                        Logger.info(__t('deise.aws_repair.rds_passed', { resourceId: drift.resourceId }));
                    }
                } catch (err: any) {
                    Logger.error(__t('deise.aws_repair.failed', { error: err.message }));
                    return false;
                }
            }
        }

        return true;
    }
}
