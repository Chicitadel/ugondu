/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Assurance / Fault / AWS Residual Scanner
 * File           : aws-residual-scanner.ts
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Fail-Closed Semantics
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { EC2 } from '@aws-sdk/client-ec2';
import { RDS } from '@aws-sdk/client-rds';
import { S3 } from '@aws-sdk/client-s3';
import { translateProviderError } from '@ugondu/shared';

export interface ScanResidualParams {
    transactionId: string;
    manifest?: any;
    bucketNames?: string[];
}

export class AwsResidualScanner {
    private ec2: EC2;
    private rds: RDS;
    private s3: S3;

    constructor(region: string) {
        this.ec2 = new EC2({ region });
        this.rds = new RDS({ region });
        this.s3 = new S3({ region });
    }

    public async scanForLeakedResources(params: string | ScanResidualParams): Promise<boolean> {
        let leakedCount = 0;
        const normalizedParams: ScanResidualParams = typeof params === 'string' ? { transactionId: params } : params;
        const txTag = normalizedParams.transactionId;

        try {
            // Perform live describeVpcs verification
            const vpcRes = await this.ec2.describeVpcs({
                Filters: [{ Name: 'tag:UgonduTransactionId', Values: [txTag] }]
            });
            const vpcResiduals = vpcRes?.Vpcs || [];

            // Perform live describeSubnets verification
            const subnetRes = await this.ec2.describeSubnets({
                Filters: [{ Name: 'tag:UgonduTransactionId', Values: [txTag] }]
            });
            const subnetResiduals = subnetRes?.Subnets || [];

            // Perform live describeInstances verification
            const instRes = await this.ec2.describeInstances({
                Filters: [{ Name: 'tag:UgonduTransactionId', Values: [txTag] }]
            });
            const instanceResiduals = instRes?.Reservations?.flatMap(r => r.Instances || []).filter(i => i.State?.Name !== 'terminated') || [];

            // Perform live describeDBInstances verification
            const rdsRes = await this.rds.describeDBInstances({});
            const rdsResiduals = (rdsRes?.DBInstances || []).filter(db =>
                db.DBInstanceIdentifier?.includes(txTag) && db.DBInstanceStatus !== 'deleting'
            );

            // S3 Residual Verification:
            // Prefer manifest-based and parameter-based known bucket verification via HeadBucket
            // to avoid issuing unscoped account-wide s3:ListAllMyBuckets which is prohibited by least privilege.
            const s3Residuals: string[] = [];
            const manifestBuckets: string[] = [];
            if (normalizedParams.manifest) {
                const m = normalizedParams.manifest;
                if (typeof m.listResources === 'function') {
                    for (const r of m.listResources()) {
                        if (r && r.type === 's3' && r.id) manifestBuckets.push(r.id);
                    }
                } else if (Array.isArray(m.resources)) {
                    for (const r of m.resources) {
                        if (r && r.type === 's3' && r.id) manifestBuckets.push(r.id);
                    }
                }
            }
            if (Array.isArray(normalizedParams.bucketNames)) {
                manifestBuckets.push(...normalizedParams.bucketNames);
            }

            if (manifestBuckets.length > 0) {
                for (const b of manifestBuckets) {
                    try {
                        await this.s3.headBucket({ Bucket: b });
                        // Bucket still exists -> leaked!
                        s3Residuals.push(b);
                    } catch (headErr: any) {
                        const status = headErr?.$metadata?.httpStatusCode || headErr?.statusCode || headErr?.status;
                        const name = headErr?.name || headErr?.Code;
                        if (status === 404 || name === 'NotFound' || name === 'NoSuchBucket') {
                            // Bucket cleanly deleted
                        } else {
                            // Fail-closed on unauthorized, 5xx, or network failure
                            throw headErr;
                        }
                    }
                }
            }

            leakedCount = vpcResiduals.length + subnetResiduals.length + instanceResiduals.length + rdsResiduals.length + s3Residuals.length;
        } catch (err: unknown) {
            // Fail-closed: translate provider exception into typed domain error with structured audit logging
            throw translateProviderError('AWS', err, {
                action: 'scanForLeakedResources',
                transactionId: txTag,
                failClosed: true
            });
        }

        const isClean = leakedCount === 0;
        return !isClean;
    }
}
