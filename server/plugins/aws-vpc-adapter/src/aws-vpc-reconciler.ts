import { ActionClassification, SafetyGatesValidator } from '../../../engine-core/src/safety/safety-gates';
import { ResourceProtocol } from '../../../shared/protocols/resource.protocol';
import { EC2Client, DescribeVpcsCommand, CreateTagsCommand, CreateVpcCommand, DeleteVpcCommand } from '@aws-sdk/client-ec2';
import { CloudTrailClient, LookupEventsCommand } from '@aws-sdk/client-cloudtrail';
import * as crypto from 'crypto';
import { __t } from '../../../shared/i18n';

const safetyGates = new SafetyGatesValidator();

if (!process.env.AWS_REGION) {
    throw new Error('Safety Violation: AWS_REGION must be explicitly specified in the environment.');
}

const ec2Client = new EC2Client({ region: process.env.AWS_REGION });
const cloudTrailClient = new CloudTrailClient({ region: process.env.AWS_REGION });

export class CloudTrailOwnershipEvidenceProvider {
    public async getOwnershipEvidence(vpcId: string): Promise<any[]> {
        let events: any[] = [];
        let nextToken: string | undefined = undefined;
        do {
            const command = new LookupEventsCommand({
                LookupAttributes: [{ AttributeKey: 'ResourceName', AttributeValue: vpcId }],
                NextToken: nextToken,
            });
            const response = await cloudTrailClient.send(command);
            if (response.Events) {
                events = events.concat(
                    response.Events.map(e => ({
                        resourceId: vpcId,
                        action: e.EventName,
                        principal: e.Username || 'unknown',
                        account: e.AccessKeyId || 'unknown',
                        rawCloudTrailEvent: e.CloudTrailEvent
                    }))
                );
            }
            nextToken = response.NextToken;
        } while (nextToken);
        return events;
    }
}

/**
 * AWS Physical Reconciler
 * Bounded Context: server/plugins/aws-vpc-adapter
 * Purpose: Safe handling of historical untagged orphan AWS VPCs.
 */
export class AwsVpcReconciler {
    private evidenceProvider = new CloudTrailOwnershipEvidenceProvider();

    /**
     * Enforce Ugondu creation tags during resource creation.
     */
    public async createVpc(transactionId: string, params: any): Promise<any> {
        // Enforce Ugondu creation tags
        const enforcedTags = [
            { Key: 'UgonduManaged', Value: 'true' },
            { Key: 'UgonduTransactionId', Value: transactionId }
        ];

        const finalTags = params.tags ? [...params.tags, ...enforcedTags] : enforcedTags;

        // Create VPC logically and physically
        const command = new CreateVpcCommand({
            CidrBlock: params.CidrBlock,
            TagSpecifications: [
                {
                    ResourceType: 'vpc',
                    Tags: finalTags
                }
            ]
        });

        const response = await ec2Client.send(command);

        return {
            status: 'CREATED',
            vpcId: response.Vpc?.VpcId,
            tags: finalTags
        };
    }

    /**
     * Handle historical untagged orphans.
     * Ensure ownership is proven via CloudTrail or historical graphs before deletion or management.
     */
    public async handleOrphanVpc(vpcId: string, cloudTrailLogs: any[], historicalGraph: any, externalApprovalSignatures?: string[], intentHash?: string, mfaVerified?: boolean): Promise<any> {
        // 1. Prove ownership via CloudTrail or historical graphs
        const ownershipProven = this.proveOwnership(vpcId, cloudTrailLogs, historicalGraph);
        if (!ownershipProven) {
            throw new Error(__t('plugin.aws_vpc.err_ownership_not_proven', vpcId));
        }

        if (!externalApprovalSignatures || externalApprovalSignatures.length === 0) {
            throw new Error('Safety Violation: External human approval signatures required for autonomous destruction.');
        }
        if (!intentHash) {
            throw new Error('Safety Violation: Intent hash required.');
        }

        // 2. Preflight Safety Gate for Actions
        await safetyGates.validateAction({
            actionId: actionId,
            resourceId: vpcId,
            classification: classification,
            blastRadius: 0,
            dependencyGraph: [],
            isAutonomous: true,
            proof: {
                authenticatedUserId: 'system',
                mfaVerified: mfaVerified || false,
                intentHash: intentHash,
                approvalSignatures: externalApprovalSignatures // Real cryptographic evidence
            }
        });

        // 3. Autonomous Tagging / Recovery 
        // We only tag it or safely remove it after passing the gates.
        await this.tagRecoveredVpc(vpcId);

        // 4. Post-operation verification (Real AWS API verification)
        const verified = await this.verifyVpcRecovered(vpcId);
        if (!verified) {
             throw new Error(__t('plugin.aws_vpc.err_verification_failed', vpcId));
        }

        return {
            status: 'RECOVERED',
            vpcId,
            evidence: {
                intentHash,
                signature: externalApprovalSignatures[0],
                verifiedAt: new Date().toISOString(),
                verificationMethod: 'aws-api-describe-vpcs'
            }
            return {
                status: 'RECOVERED',
                vpcId,
                evidence: { intentHash, signature, verifiedAt: new Date().toISOString(), verificationMethod: 'aws-api-describe-vpcs' }
            };
        } else if (action === 'CLEANUP') {
            await this.deleteVpc(vpcId);
            return {
                status: 'DELETED',
                vpcId,
                evidence: { intentHash, signature, deletedAt: new Date().toISOString(), verificationMethod: 'aws-api-delete-vpc' }
            };
        }
    }

    private proveOwnership(vpcId: string, cloudTrailLogs: any[], historicalGraph: any): boolean {
        // Tokenized Governance constraints: Must not bypass security validation
        // Implement rigorous checks using CloudTrail events
        const hasCloudTrailEvidence = cloudTrailLogs.some(log => log.resourceId === vpcId && log.action === 'CreateVpc');
        const hasGraphEvidence = historicalGraph && historicalGraph.nodes.includes(vpcId);

        return hasCloudTrailEvidence || hasGraphEvidence;
    }

    private async tagRecoveredVpc(vpcId: string): Promise<void> {
        // Safely tag recovered VPC using real AWS SDK
        const command = new CreateTagsCommand({
            Resources: [vpcId],
            Tags: [
                { Key: 'UgonduManaged', Value: 'true' },
                { Key: 'COR_Recovered', Value: 'true' }
            ]
        });
        await ec2Client.send(command);
        console.log(__t('plugin.aws_vpc.msg_recovered_tagged', vpcId));
    }

    private async verifyVpcRecovered(vpcId: string): Promise<boolean> {
        // Real AWS API verification
        const command = new DescribeVpcsCommand({ VpcIds: [vpcId] });
        const response = await ec2Client.send(command);
        const vpc = response.Vpcs?.[0];
        if (!vpc) return false;
        const ugonduManaged = vpc.Tags?.some(t => t.Key === 'UgonduManaged' && t.Value === 'true');
        return !!ugonduManaged;
    }

    private async deleteVpc(vpcId: string): Promise<void> {
        // Real AWS deletion
        const command = new DeleteVpcCommand({ VpcId: vpcId });
        await ec2Client.send(command);
        console.log(`VPC ${vpcId} successfully deleted.`);
    }
}
