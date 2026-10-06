import * as fs from 'fs';
import * as path from 'path';
import { UniversalActionRegistry } from './src/registry/action-registry';
import { AwsNativeClient } from './src/fabric/providers/aws-native-client';
import { URREngine } from './src/urre/execution/urre-engine';
import { EvidenceCollector } from './src/evidence/evidence-engine';
import { EC2Client, DescribeInstancesCommand, DescribeVpcsCommand } from '@aws-sdk/client-ec2';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

async function resolveCertificationAmi(region: string): Promise<string> {
    const ssm = new SSMClient({ region });
    const res = await ssm.send(new GetParameterCommand({ Name: '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64' }));
    const ami = res.Parameter?.Value;
    if (!ami) throw new Error("Could not resolve AMI from SSM");
    return ami;
}

async function runCertification() {
    try {
        console.log("=== UGONDU P0 PHYSICAL CERTIFICATION CAMPAIGN ===");
        
        const region = process.env.UGONDU_CERT_REGION;
        if (!region) {
            throw new Error("BLOCKED: UGONDU_CERT_REGION is required for controlled certification.");
        }

        const campaignId = `UGONDU-COR-${new Date().toISOString().split('T')[0]}-001`;
        console.log(`Campaign ID: ${campaignId}`);

        const urre = new URREngine();
        const registry = new UniversalActionRegistry(urre);
        const evidenceCollector = new EvidenceCollector();
        const ec2 = new EC2Client({ region });

        // 1. VPC Creation via Action Registry
        console.log("Executing canonical network:vpc:create...");
        let vpcRes = await registry.getAction('network:vpc:create')!.execute({
            resourceId: `urn:ugondu:aws:vpc:${campaignId}`,
            tags: { UgonduManaged: 'true', UgonduCampaign: campaignId },
            cidrBlock: '10.0.0.0/16'
        });
        
        // Physical Verification of VPC
        const vpcId = vpcRes.outputs?.vpcId || vpcRes.vpcId;
        const vpcVerification = await ec2.send(new DescribeVpcsCommand({ VpcIds: [vpcId] }));
        
        // Collect evidence of action registry success
        const vpcEvidence = evidenceCollector.recordProviderObservation({
            provider: 'aws',
            operation: 'CREATE_VPC',
            request: { cidrBlock: '10.0.0.0/16' },
            response: vpcRes,
            verification: vpcVerification,
            resourceIdentity: `urn:ugondu:aws:vpc:${campaignId}`,
            executionContext: campaignId
        });
        
        console.log(`VPC Creation Evidence: ${vpcEvidence.status} - Hash: ${vpcEvidence.providerResponseHash}`);

        // 2. EC2 Creation
        const amiId = await resolveCertificationAmi(region);
        if (!/^ami-[0-9a-f]{8,}$/.test(amiId)) {
            throw new Error(`Invalid AMI resolved: ${amiId}`);
        }

        console.log("Executing compute:instance:create...");
        let ec2Res = await registry.getAction('compute:instance:create')!.execute({
            resourceId: `urn:ugondu:aws:ec2:${campaignId}`,
            tags: { UgonduManaged: 'true', UgonduCampaign: campaignId },
            vpcId: vpcId,
            ami: amiId
        });

        // Physical Verification of EC2
        const instanceId = ec2Res.outputs?.instanceId || ec2Res.instanceId || ec2Res.id;
        const ec2Verification = await ec2.send(new DescribeInstancesCommand({ InstanceIds: [instanceId] }));

        const ec2Evidence = evidenceCollector.recordProviderObservation({ 
            provider: 'aws', 
            operation: 'CREATE_EC2',
            request: { vpcId: vpcId, ami: amiId },
            response: ec2Res,
            verification: ec2Verification,
            resourceIdentity: `urn:ugondu:aws:ec2:${campaignId}`,
            executionContext: campaignId
        });
        console.log(`EC2 Creation Evidence: ${ec2Evidence.status} - Hash: ${ec2Evidence.providerResponseHash}`);

        // 4. Cleanup
        console.log("Executing compute:instance:terminate...");
        await registry.getAction('compute:instance:terminate')!.execute({
            resourceId: `urn:ugondu:aws:ec2:${campaignId}`,
            instanceId: instanceId
        });

        console.log("Executing network:vpc:terminate...");
        await registry.getAction('network:vpc:terminate')!.execute({
            resourceId: `urn:ugondu:aws:vpc:${campaignId}`,
            vpcId: vpcId
        });
        
        console.log("\n? Certification Run Complete.");

    } catch (error: any) {
        console.error('Certification run fatally failed', error);
        process.exit(1);
    }
}

runCertification();
