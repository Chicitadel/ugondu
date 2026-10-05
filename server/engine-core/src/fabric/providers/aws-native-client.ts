/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - Native AWS SDK Client
 * File           : aws-native-client.ts
 * Version        : 2.1.0
 * Author         : Air Roofers Ltd
 * Created Date   : 2026-10-04
 * Classification : ENTERPRISE
 ******************************************************************************/

import { Logger, __t } from '@ugondu/shared';
import { IAwsClient } from './aws';
import { resolveSecret } from '../engine/SecretGuard';
import { ComputeStatus } from '../capabilities/compute';
import { SubnetResult } from '../capabilities/network';

import { 
    EC2Client, 
    RunInstancesCommand, 
    TerminateInstancesCommand, 
    CreateVpcCommand, 
    DeleteVpcCommand, 
    DescribeInstancesCommand,
    CreateSubnetCommand,
    CreateSnapshotCommand,
    DescribeAvailabilityZonesCommand,
    CreateSecurityGroupCommand,
    AuthorizeSecurityGroupIngressCommand,
    DeleteSecurityGroupCommand
} from '@aws-sdk/client-ec2';

import { 
    RDSClient, 
    CreateDBInstanceCommand, 
    DeleteDBInstanceCommand,
    CreateDBSubnetGroupCommand,
    DeleteDBSubnetGroupCommand,
    DescribeDBInstancesCommand
} from '@aws-sdk/client-rds';

import { 
    S3Client, 
    CreateBucketCommand, 
    DeleteBucketCommand 
} from '@aws-sdk/client-s3';

import {
    SSMClient,
    GetParameterCommand
} from '@aws-sdk/client-ssm';

import { 
    ECSClient, 
    CreateClusterCommand, 
    RegisterTaskDefinitionCommand, 
    CreateServiceCommand 
} from '@aws-sdk/client-ecs';

import { 
    ECRClient, 
    CreateRepositoryCommand 
} from '@aws-sdk/client-ecr';

import { 
    CloudWatchLogsClient, 
    CreateLogGroupCommand 
} from '@aws-sdk/client-cloudwatch-logs';

import {
    IAMClient,
    CreateRoleCommand,
    PutRolePolicyCommand
} from '@aws-sdk/client-iam';

import { PolicyGovernanceEngine, ProviderAuthorizationAdapter } from '../../governance/engine/policy-engine';
import { UniversalPermission } from '../../governance/model/authorization';

export class AwsNativeClient implements IAwsClient {
    private ec2: EC2Client;
    private rds: RDSClient;
    private s3: S3Client;
    private ssm: SSMClient;
    private ecs: ECSClient;
    private ecr: ECRClient;
    private cw: CloudWatchLogsClient;
    private iam: IAMClient;

    constructor(region: string, credentials?: { accessKeyId: string, secretAccessKey: string, sessionToken?: string }) {
        const config = { region, ...(credentials ? { credentials } : {}) };
        this.ec2 = new EC2Client(config);
        this.rds = new RDSClient(config);
        this.s3 = new S3Client(config);
        this.ssm = new SSMClient(config);
        this.ecs = new ECSClient(config);
        this.ecr = new ECRClient(config);
        this.cw = new CloudWatchLogsClient(config);
        this.iam = new IAMClient(config);
        Logger.info(`AwsNativeClient natively instantiated for region: ${region}`);
    }

    public async resolveInstanceType(cpuCores: number, memoryMb: number): Promise<string> {
        if (cpuCores <= 2 && memoryMb <= 4096) return 't3.medium';
        if (cpuCores <= 4 && memoryMb <= 16384) return 'm5.xlarge';
        return 'm5.2xlarge';
    }

    private async sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public async runInstances(type: string, image: string, subnetId?: string): Promise<{ id: string; ip: string; state: 'running' | 'failed' }> {
        // Dynamic SSM AMI Resolution if image is 'latest-al2023'
        let actualImage = image;
        if (image === 'latest-al2023') {
            Logger.info('Resolving latest Amazon Linux 2023 AMI via SSM');
            const ssmRes = await this.ssm.send(new GetParameterCommand({ Name: '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64' }));
            actualImage = ssmRes.Parameter?.Value || image;
        }

        const cmd = new RunInstancesCommand({
            ImageId: actualImage,
            InstanceType: type as any,
            MinCount: 1,
            MaxCount: 1,
            NetworkInterfaces: subnetId ? [{ DeviceIndex: 0, SubnetId: subnetId }] : undefined
        });
        const res = await this.ec2.send(cmd) as any;
        const instance = res.Instances?.[0];
        if (!instance || !instance.InstanceId) throw new Error(__t('aws_ec2_creation_failed_no_ins'));
        
        const id = instance.InstanceId;
        
        // P0-4 Waiter Implementation
        Logger.info(`Waiting for EC2 instance ${id} to reach 'running' state...`);
        let ip = 'pending';
        let retries = 0;
        while (retries < 30) {
            await this.sleep(10000);
            const desc = await this.ec2.send(new DescribeInstancesCommand({ InstanceIds: [id] }));
            const inst = desc.Reservations?.[0]?.Instances?.[0];
            if (inst) {
                if (inst.State?.Name === 'running') {
                    ip = inst.PrivateIpAddress || 'unknown';
                    return { id, ip, state: 'running' };
                }
                if (inst.State?.Name === 'terminated' || inst.State?.Name === 'shutting-down') {
                    throw new Error(`Instance ${id} terminated unexpectedly during creation.`);
                }
            }
            retries++;
        }

        throw new Error(`Timeout waiting for instance ${id} to run.`);
    }

    public async terminateInstances(id: string): Promise<void> {
        const cmd = new TerminateInstancesCommand({ InstanceIds: [id] });
        await this.ec2.send(cmd);
    }

    public async createVpc(cidr: string, name: string): Promise<string> {
        const cmd = new CreateVpcCommand({ CidrBlock: cidr });
        const res = await this.ec2.send(cmd) as any;
        if (!res.Vpc || !res.Vpc.VpcId) throw new Error(__t('aws_vpc_creation_failed'));
        // Waiter could be added here if needed, but VPCs are usually available instantly.
        return res.Vpc.VpcId;
    }

    public async deleteVpc(id: string): Promise<void> {
        const cmd = new DeleteVpcCommand({ VpcId: id });
        await this.ec2.send(cmd);
    }

    public async discoverAvailabilityZones(): Promise<string[]> {
        const res = await this.ec2.send(new DescribeAvailabilityZonesCommand({}));
        if (!res.AvailabilityZones) return [];
        return res.AvailabilityZones.filter(az => az.State === 'available').map(az => az.ZoneName!);
    }

    public async createSubnet(vpcId: string, cidr: string, az?: string): Promise<SubnetResult> {
        const cmd = new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: cidr, AvailabilityZone: az });
        const res = await this.ec2.send(cmd) as any;
        if (!res.Subnet || !res.Subnet.SubnetId) throw new Error(__t('aws_subnet_creation_failed'));
        return { id: res.Subnet.SubnetId, cidr: cidr };
    }

    public async createSecurityGroup(vpcId: string, name: string): Promise<string> {
        const cmd = new CreateSecurityGroupCommand({ VpcId: vpcId, GroupName: name, Description: `Ugondu Managed SG ${name}` });
        const res = await this.ec2.send(cmd) as any;
        if (!res.GroupId) throw new Error(__t('aws_security_group_creation_fa'));
        return res.GroupId;
    }

    public async deleteSecurityGroup(id: string): Promise<void> {
        await this.ec2.send(new DeleteSecurityGroupCommand({ GroupId: id }));
    }

    public async createDBSubnetGroup(name: string, subnetIds: string[]): Promise<string> {
        const cmd = new CreateDBSubnetGroupCommand({
            DBSubnetGroupName: name,
            DBSubnetGroupDescription: __t('ugondu_managed_db_subnet_group'),
            SubnetIds: subnetIds
        });
        const res = await this.rds.send(cmd);
        if (!res.DBSubnetGroup || !res.DBSubnetGroup.DBSubnetGroupName) throw new Error(__t('aws_db_subnet_group_creation_f'));
        return res.DBSubnetGroup.DBSubnetGroupName;
    }

    public async deleteDBSubnetGroup(name: string): Promise<void> {
        await this.rds.send(new DeleteDBSubnetGroupCommand({ DBSubnetGroupName: name }));
    }

    public async createRds(name: string, engine: string, capacity: number, securityGroupId?: string, credentialsRef?: string, dbSubnetGroupName?: string): Promise<{ id: string; endpoint: string }> {
        const dbInstanceClass = capacity > 100 ? 'db.m5.large' : 'db.t3.micro';
        
        if (!credentialsRef || !credentialsRef.startsWith('secret:')) {
            throw new Error('Security Audit: Physical AWS RDS deployment requires a secure credentialsRef mapping.');
        }
        
        const password = await resolveSecret(credentialsRef);
        
        const cmd = new CreateDBInstanceCommand({
            DBInstanceIdentifier: name,
            AllocatedStorage: capacity,
            DBInstanceClass: dbInstanceClass,
            Engine: engine,
            MasterUsername: 'admin',
            MasterUserPassword: password,
            VpcSecurityGroupIds: securityGroupId ? [securityGroupId] : undefined,
            DBSubnetGroupName: dbSubnetGroupName
        });
        
        const res = await this.rds.send(cmd);
        if (!res.DBInstance || !res.DBInstance.DBInstanceIdentifier) throw new Error(__t('aws_rds_creation_failed'));
        
        const id = res.DBInstance.DBInstanceIdentifier;

        // P0-4 Waiter Implementation
        Logger.info(`Waiting for RDS instance ${id} to become 'available'...`);
        let retries = 0;
        while (retries < 60) { // Can take up to 10-15 mins
            await this.sleep(15000);
            const desc = await this.rds.send(new DescribeDBInstancesCommand({ DBInstanceIdentifier: id }));
            const inst = desc.DBInstances?.[0];
            if (inst) {
                if (inst.DBInstanceStatus === 'available') {
                    return { 
                        id, 
                        endpoint: inst.Endpoint?.Address || 'unknown'
                    };
                }
                if (inst.DBInstanceStatus === 'failed' || inst.DBInstanceStatus === 'incompatible-parameters') {
                    throw new Error(`RDS ${id} entered failed state: ${inst.DBInstanceStatus}`);
                }
            }
            retries++;
        }
        
        throw new Error(`Timeout waiting for RDS ${id} to become available.`);
    }

    public async deleteRds(id: string): Promise<void> {
        const cmd = new DeleteDBInstanceCommand({ DBInstanceIdentifier: id, SkipFinalSnapshot: true });
        await this.rds.send(cmd);
    }

    public async createS3Bucket(name: string, isPublic: boolean): Promise<{ id: string; endpoint: string }> {
        const cmd = new CreateBucketCommand({ Bucket: name });
        await this.s3.send(cmd);
        return { id: name, endpoint: `${name}.s3.amazonaws.com` };
    }

    public async deleteS3Bucket(id: string): Promise<void> {
        const cmd = new DeleteBucketCommand({ Bucket: id });
        await this.s3.send(cmd);
    }

    public async getInstanceStatus(id: string): Promise<ComputeStatus> {
        const res = await this.ec2.send(new DescribeInstancesCommand({ InstanceIds: [id] }));
        const state = res.Reservations?.[0]?.Instances?.[0]?.State?.Name;
        return { 
            id, 
            state: state === 'running' ? 'running' : 'failed',
            health: 'healthy' 
        };
    }

    public async createSnapshot(req: { resourceType: 'EBS_VOLUME' | 'RDS_INSTANCE' | 'EC2_INSTANCE' | string, resourceId: string } | string): Promise<string> {
        const type = typeof req === 'string' ? 'EBS_VOLUME' : req.resourceType;
        const id = typeof req === 'string' ? req : req.resourceId;

        if (type === 'RDS_INSTANCE') {
            const { CreateDBSnapshotCommand } = require('@aws-sdk/client-rds');
            const snapId = `snap-${id}-${Date.now()}`;
            const cmd = new CreateDBSnapshotCommand({ DBInstanceIdentifier: id, DBSnapshotIdentifier: snapId });
            await this.rds.send(cmd);
            return snapId;
        } else if (type === 'EBS_VOLUME') {
            const { CreateSnapshotCommand } = require('@aws-sdk/client-ec2');
            const cmd = new CreateSnapshotCommand({ VolumeId: id });
            const res = await this.ec2.send(cmd) as any;
            if (!res.SnapshotId) throw new Error(__t('ebs_snapshot_creation_failed'));
            return res.SnapshotId;
        } else if (type === 'EC2_INSTANCE') {
            const { CreateImageCommand } = require('@aws-sdk/client-ec2');
            const amiName = `ami-${id}-${Date.now()}`;
            const cmd = new CreateImageCommand({ InstanceId: id, Name: amiName, NoReboot: true });
            const res = await this.ec2.send(cmd) as any;
            if (!res.ImageId) throw new Error(__t('ec2_ami_snapshot_creation_fail'));
            return res.ImageId;
        }
        throw new Error(`Unsupported AWS snapshot resourceType: ${type}`);
    }
    public async createEcsCluster(name: string): Promise<string> {
        const res = await this.ecs.send(new CreateClusterCommand({ clusterName: name }));
        if (!res.cluster || !res.cluster.clusterName) throw new Error(__t('ecs_cluster_creation_failed'));
        return res.cluster.clusterName;
    }

    public async registerTaskDefinition(name: string, imageUri: string, cpu: string, memory: string, executionRoleArn: string, taskRoleArn: string, logGroupName: string): Promise<string> {
        const cmd = new RegisterTaskDefinitionCommand({
            family: name,
            networkMode: 'awsvpc',
            requiresCompatibilities: ['FARGATE'],
            cpu,
            memory,
            executionRoleArn,
            taskRoleArn,
            containerDefinitions: [{
                name,
                image: imageUri,
                essential: true,
                logConfiguration: {
                    logDriver: 'awslogs',
                    options: {
                        'awslogs-group': logGroupName,
                        'awslogs-region': await this.ecs.config.region(),
                        'awslogs-stream-prefix': 'fargate'
                    }
                }
            }]
        });
        const res = await this.ecs.send(cmd);
        if (!res.taskDefinition || !res.taskDefinition.taskDefinitionArn) throw new Error(__t('task_definition_registration_f'));
        return res.taskDefinition.taskDefinitionArn;
    }

    public async createEcsService(clusterName: string, serviceName: string, taskDefinitionArn: string, desiredCount: number, subnets: string[], securityGroups: string[], targetGroupArn?: string): Promise<string> {
        const cmd = new CreateServiceCommand({
            cluster: clusterName,
            serviceName: serviceName,
            taskDefinition: taskDefinitionArn,
            desiredCount,
            launchType: 'FARGATE',
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets,
                    securityGroups,
                    assignPublicIp: 'ENABLED'
                }
            },
            loadBalancers: targetGroupArn ? [{
                targetGroupArn,
                containerName: serviceName,
                containerPort: 80
            }] : undefined
        });
        const res = await this.ecs.send(cmd);
        if (!res.service || !res.service.serviceArn) throw new Error(__t('ecs_service_creation_failed'));
        return res.service.serviceArn;
    }

    public async createEcrRepository(name: string): Promise<string> {
        const res = await this.ecr.send(new CreateRepositoryCommand({ repositoryName: name }));
        if (!res.repository || !res.repository.repositoryUri) throw new Error(__t('ecr_repository_creation_failed'));
        return res.repository.repositoryUri;
    }

    public async createLogGroup(name: string): Promise<string> {
        await this.cw.send(new CreateLogGroupCommand({ logGroupName: name }));
        return name;
    }

    public async createFargateRoles(taskName: string): Promise<{ executionRoleArn: string, taskRoleArn: string }> {
        const engine = new PolicyGovernanceEngine();
        // Mock adapter implementation for AWS IAM
        const awsAdapter: ProviderAuthorizationAdapter = {
            providerIdentifier: 'aws',
            translateIntent: () => { throw new Error('NotImplemented'); },
            synthesizePolicy: () => { throw new Error('NotImplemented'); },
            verifyCapability: (intent) => { throw new Error('NotImplemented'); }
        };
        engine.registerAdapter(awsAdapter);

        // Define intent
        const execIntent: UniversalPermission[] = [
            { action: 'ecr:GetAuthorizationToken', resource: 'arn:aws:ecr:*:*:repository/*' },
            { action: 'ecr:BatchCheckLayerAvailability', resource: 'arn:aws:ecr:*:*:repository/*' },
            { action: 'ecr:GetDownloadUrlForLayer', resource: 'arn:aws:ecr:*:*:repository/*' },
            { action: 'ecr:BatchGetImage', resource: 'arn:aws:ecr:*:*:repository/*' },
            { action: 'logs:CreateLogStream', resource: 'arn:aws:logs:*:*:log-group:*' },
            { action: 'logs:PutLogEvents', resource: 'arn:aws:logs:*:*:log-group:*' }
        ];

        // Evaluate intent through Governance Engine
        const decision = engine.evaluateIntent('aws', execIntent, `fargate-${taskName}`);
        
        if (decision.decision !== 'ALLOW') {
            throw new Error(`Governance Policy Denied: ${decision.reason}`);
        }

        const execRoleName = `${taskName}-ExecRole-${Date.now()}`;
        const taskRoleName = `${taskName}-TaskRole-${Date.now()}`;
        
        const assumeRolePolicyDocument = JSON.stringify({
            Version: '2012-10-17',
            Statement: [{ Effect: 'Allow', Principal: { Service: 'ecs-tasks.amazonaws.com' }, Action: 'sts:AssumeRole' }]
        });

        // Create Execution Role
        const execRoleRes = await this.iam.send(new CreateRoleCommand({
            RoleName: execRoleName,
            AssumeRolePolicyDocument: assumeRolePolicyDocument
        }));

        // Attach minimal inline policy based on intent
        const inlinePolicyDoc = JSON.stringify({
            Version: '2012-10-17',
            Statement: execIntent.map(i => ({
                Effect: 'Allow',
                Action: i.action,
                Resource: i.resource
            }))
        });

        await this.iam.send(new PutRolePolicyCommand({
            RoleName: execRoleName,
            PolicyName: 'UgonduMinimalExecutionPolicy',
            PolicyDocument: inlinePolicyDoc
        }));

        // Create Task Role
        const taskRoleRes = await this.iam.send(new CreateRoleCommand({
            RoleName: taskRoleName,
            AssumeRolePolicyDocument: assumeRolePolicyDocument
        }));

        return {
            executionRoleArn: execRoleRes.Role!.Arn!,
            taskRoleArn: taskRoleRes.Role!.Arn!
        };
    }
}

