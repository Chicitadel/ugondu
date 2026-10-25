/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Server / Engine Core / Assurance / COR Cleanup Contract
 * File           : cor-cleanup-contract.ts
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
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

import {
    DescribeVpcsCommand,
    DescribeSubnetsCommand,
    DescribeSecurityGroupsCommand,
    DeleteSecurityGroupCommand,
    DeleteSubnetCommand,
    DeleteVpcCommand
} from '@aws-sdk/client-ec2';
import { GetBucketTaggingCommand } from '@aws-sdk/client-s3';
import { __t } from '@ugondu/shared';

export interface CorResourceOwnership {
    runId: string;
    candidateSha: string;
    owner: 'ugondu-cor';
    createdAt: string;
    leaseExpiresAt: string;
}

export interface CorResourceEntry {
    type: string;
    id: string;
    createdAt: string;
    metadata?: Record<string, any>;
}

export class CorResourceManifest {
    public readonly ownership: CorResourceOwnership;
    private resources: Map<string, CorResourceEntry> = new Map();

    constructor(ownership: CorResourceOwnership) {
        this.ownership = ownership;
    }

    public registerResource(type: string, id: string, metadata?: Record<string, any>): CorResourceEntry {
        if (!id) {
            throw new Error(__t('messages.error.resource_id_required'));
        }
        const entry: CorResourceEntry = {
            type,
            id,
            createdAt: new Date().toISOString(),
            metadata
        };
        this.resources.set(`${type}:${id}`, entry);
        return entry;
    }

    public getResource(type: string, id: string): CorResourceEntry | undefined {
        return this.resources.get(`${type}:${id}`);
    }

    public listResources(): CorResourceEntry[] {
        return Array.from(this.resources.values());
    }

    public hasResource(type: string, id: string): boolean {
        return this.resources.has(`${type}:${id}`);
    }

    public unregisterResource(type: string, id: string): boolean {
        return this.resources.delete(`${type}:${id}`);
    }

    public toJSON(): object {
        return {
            ownership: this.ownership,
            resources: this.listResources()
        };
    }
}

export class CorCleanupExecutionError extends Error {
    public readonly resourceId?: string;
    public readonly operation?: string;
    public readonly originalError?: Error;

    constructor(message: string, context?: { resourceId?: string; operation?: string; originalError?: Error }) {
        super(message);
        this.name = 'CorCleanupExecutionError';
        this.resourceId = context?.resourceId;
        this.operation = context?.operation;
        this.originalError = context?.originalError;
        Object.setPrototypeOf(this, CorCleanupExecutionError.prototype);
    }
}

export class CorTagVerificationAccessDeniedError extends Error {
    public readonly bucketName: string;
    public readonly originalError?: Error;

    constructor(message: string, context?: { bucketName?: string; originalError?: Error }) {
        super(message);
        this.name = 'CorTagVerificationAccessDeniedError';
        this.bucketName = context?.bucketName || '';
        this.originalError = context?.originalError;
        Object.setPrototypeOf(this, CorTagVerificationAccessDeniedError.prototype);
    }
}

export class CorTagVerificationError extends Error {
    public readonly bucketName: string;
    public readonly missingTags?: string[];
    public readonly originalError?: Error;

    constructor(message: string, context?: { bucketName?: string; missingTags?: string[]; originalError?: Error }) {
        super(message);
        this.name = 'CorTagVerificationError';
        this.bucketName = context?.bucketName || '';
        this.missingTags = context?.missingTags;
        this.originalError = context?.originalError;
        Object.setPrototypeOf(this, CorTagVerificationError.prototype);
    }
}

export interface CleanupOptions {
    now?: number;
    manifest?: CorResourceManifest;
}

export interface CleanupResult {
    deletedVpcIds: string[];
    deletedSubnetIds: string[];
    deletedSecurityGroupIds: string[];
}

function resolveEc2Client(clientOrRegion: any) {
    if (clientOrRegion && typeof clientOrRegion.send === 'function') {
        return clientOrRegion;
    }
    if (clientOrRegion && clientOrRegion.ec2 && typeof clientOrRegion.ec2.send === 'function') {
        return clientOrRegion.ec2;
    }
    const region = typeof clientOrRegion === 'string' ? clientOrRegion : process.env.UGONDU_CERT_REGION || 'eu-west-3';
    const { EC2Client: Ec2SdkClient } = require('@aws-sdk/client-ec2');
    return new Ec2SdkClient({ region });
}

export async function cleanupOwnedCorVpcs(
    clientOrRegion: any,
    currentRunId: string,
    options?: CleanupOptions
): Promise<CleanupResult> {
    const ec2 = resolveEc2Client(clientOrRegion);
    const now = options?.now !== undefined ? options.now : Date.now();
    const result: CleanupResult = {
        deletedVpcIds: [],
        deletedSubnetIds: [],
        deletedSecurityGroupIds: []
    };

    let vpcsResponse: any;
    try {
        vpcsResponse = await ec2.send(new DescribeVpcsCommand({
            Filters: [{ Name: 'tag:UgonduOwner', Values: ['ugondu-cor'] }]
        }));
    } catch (err: any) {
        throw new CorCleanupExecutionError(
            __t('cor.cleanup.describe_vpcs_failed', { error: err.message }),
            { operation: 'DescribeVpcs', originalError: err }
        );
    }

    for (const vpc of vpcsResponse?.Vpcs || []) {
        if (!vpc.VpcId) continue;
        const tags: Array<{ Key?: string; Value?: string }> = vpc.Tags || [];
        const tagMap: Record<string, string> = {};
        for (const t of tags) {
            if (t.Key && t.Value !== undefined) {
                tagMap[t.Key] = t.Value;
            }
        }

        const ownerTag = tagMap['UgonduOwner'];
        const runIdTag = tagMap['UgonduRunId'];
        const leaseExpiresAtTag = tagMap['UgonduLeaseExpiresAt'];

        // Strict Ownership Enforcement:
        // 1. Must have UgonduOwner === 'ugondu-cor'
        if (ownerTag !== 'ugondu-cor') {
            continue;
        }

        // 2. Must have UgonduRunId and it must NOT match current active runId
        if (!runIdTag || runIdTag === currentRunId) {
            continue;
        }

        // 3. Must have UgonduLeaseExpiresAt and lease must have expired (Date.parse < now)
        if (!leaseExpiresAtTag) {
            continue;
        }

        const leaseExpiryTime = Date.parse(leaseExpiresAtTag);
        if (isNaN(leaseExpiryTime) || leaseExpiryTime >= now) {
            // Active lease or invalid lease date -> NEVER delete
            continue;
        }

        // Stale expired VPC with matching ownership tags qualifies for cleanup
        // Step A: Describe and delete non-default security groups
        let sgsResponse: any;
        try {
            sgsResponse = await ec2.send(new DescribeSecurityGroupsCommand({
                Filters: [{ Name: 'vpc-id', Values: [vpc.VpcId] }]
            }));
        } catch (err: any) {
            throw new CorCleanupExecutionError(
                __t('cor.cleanup.describe_sgs_failed', { vpcId: vpc.VpcId, error: err.message }),
                { resourceId: vpc.VpcId, operation: 'DescribeSecurityGroups', originalError: err }
            );
        }

        for (const sg of sgsResponse?.SecurityGroups || []) {
            if (sg.GroupId && sg.GroupName !== 'default') {
                try {
                    await ec2.send(new DeleteSecurityGroupCommand({ GroupId: sg.GroupId }));
                    result.deletedSecurityGroupIds.push(sg.GroupId);
                    options?.manifest?.unregisterResource('security-group', sg.GroupId);
                } catch (err: any) {
                    throw new CorCleanupExecutionError(
                        __t('cor.cleanup.delete_sg_failed', { sgId: sg.GroupId, vpcId: vpc.VpcId, error: err.message }),
                        { resourceId: sg.GroupId, operation: 'DeleteSecurityGroup', originalError: err }
                    );
                }
            }
        }

        // Step B: Describe and delete subnets
        let subsResponse: any;
        try {
            subsResponse = await ec2.send(new DescribeSubnetsCommand({
                Filters: [{ Name: 'vpc-id', Values: [vpc.VpcId] }]
            }));
        } catch (err: any) {
            throw new CorCleanupExecutionError(
                __t('cor.cleanup.describe_subnets_failed', { vpcId: vpc.VpcId, error: err.message }),
                { resourceId: vpc.VpcId, operation: 'DescribeSubnets', originalError: err }
            );
        }

        for (const sub of subsResponse?.Subnets || []) {
            if (sub.SubnetId) {
                try {
                    await ec2.send(new DeleteSubnetCommand({ SubnetId: sub.SubnetId }));
                    result.deletedSubnetIds.push(sub.SubnetId);
                    options?.manifest?.unregisterResource('subnet', sub.SubnetId);
                } catch (err: any) {
                    throw new CorCleanupExecutionError(
                        __t('cor.cleanup.delete_subnet_failed', { subnetId: sub.SubnetId, vpcId: vpc.VpcId, error: err.message }),
                        { resourceId: sub.SubnetId, operation: 'DeleteSubnet', originalError: err }
                    );
                }
            }
        }

        // Step C: Delete VPC
        try {
            await ec2.send(new DeleteVpcCommand({ VpcId: vpc.VpcId }));
            result.deletedVpcIds.push(vpc.VpcId);
            options?.manifest?.unregisterResource('vpc', vpc.VpcId);
        } catch (err: any) {
            throw new CorCleanupExecutionError(
                __t('cor.cleanup.delete_vpc_failed', { vpcId: vpc.VpcId, error: err.message }),
                { resourceId: vpc.VpcId, operation: 'DeleteVpc', originalError: err }
            );
        }
    }

    return result;
}

export async function cleanupStaleTestVpcs(
    regionOrClient: any,
    currentRunIdOrTxId: string,
    options?: CleanupOptions
): Promise<void> {
    await cleanupOwnedCorVpcs(regionOrClient, currentRunIdOrTxId, options);
}

export interface S3TagVerificationOptions {
    expectedRunId?: string;
    expectedOwner?: string;
}

export async function verifyS3BucketTags(
    s3Client: any,
    bucketName: string,
    expectedTxId: string,
    options?: S3TagVerificationOptions
): Promise<{ verified: boolean; tagSet: Array<{ Key: string; Value: string }> }> {
    if (!s3Client || typeof s3Client.send !== 'function') {
        throw new CorTagVerificationError('Invalid S3 client provided for tag verification', { bucketName });
    }
    if (!bucketName) {
        throw new CorTagVerificationError('Bucket name is required for tag verification');
    }
    if (!expectedTxId) {
        throw new CorTagVerificationError('Expected transaction ID is required for tag verification', { bucketName });
    }

    let tagResponse: any;
    try {
        tagResponse = await s3Client.send(new GetBucketTaggingCommand({ Bucket: bucketName }));
    } catch (err: any) {
        if (err.name === 'AccessDenied' || err.Code === 'AccessDenied' || err.$metadata?.httpStatusCode === 403) {
            throw new CorTagVerificationAccessDeniedError(
                __t('cor.cleanup.tag_verification_denied', { bucketName, error: err.message }),
                { bucketName, originalError: err }
            );
        }
        if (err.name === 'NoSuchTagSet' || err.Code === 'NoSuchTagSet' || err.$metadata?.httpStatusCode === 404) {
            tagResponse = { TagSet: [] };
        } else {
            throw new CorTagVerificationError(
                __t('cor.cleanup.tag_verification_failed', { bucketName, error: err.message }),
                { bucketName, originalError: err }
            );
        }
    }

    const tagSet: Array<{ Key: string; Value: string }> = Array.isArray(tagResponse?.TagSet) ? tagResponse.TagSet : [];
    const missing: string[] = [];

    const hasCOR = tagSet.some(t => t.Key === 'UgonduCOR' && t.Value === 'true');
    if (!hasCOR) missing.push('UgonduCOR=true');

    const hasTx = tagSet.some(t => t.Key === 'UgonduTransactionId' && t.Value === expectedTxId);
    if (!hasTx) missing.push(`UgonduTransactionId=${expectedTxId}`);

    if (options?.expectedRunId) {
        const hasRun = tagSet.some(t => t.Key === 'UgonduRunId' && t.Value === options.expectedRunId);
        if (!hasRun) missing.push(`UgonduRunId=${options.expectedRunId}`);
    }

    if (options?.expectedOwner) {
        const hasOwner = tagSet.some(t => t.Key === 'UgonduOwner' && t.Value === options.expectedOwner);
        if (!hasOwner) missing.push(`UgonduOwner=${options.expectedOwner}`);
    }

    if (missing.length > 0) {
        throw new CorTagVerificationError(
            __t('cor.cleanup.missing_ugondu_tags', { bucketName, tags: missing.join(', ') }),
            { bucketName, missingTags: missing }
        );
    }

    return { verified: true, tagSet };
}
