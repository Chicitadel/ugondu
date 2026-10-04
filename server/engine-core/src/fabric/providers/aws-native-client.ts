/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric - Native AWS SDK Client
 * File           : aws-native-client.ts
 * Version        : 2.0.0
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
    CreateSnapshotCommand
} from '@aws-sdk/client-ec2';

import { 
    RDSClient, 
    CreateDBInstanceCommand, 
    DeleteDBInstanceCommand 
} from '@aws-sdk/client-rds';

import { 
    S3Client, 
    CreateBucketCommand, 
    DeleteBucketCommand 
} from '@aws-sdk/client-s3';

export class AwsNativeClient implements IAwsClient {
    private ec2: EC2Client;
    private rds: RDSClient;
    private s3: S3Client;

    constructor(region: string, credentials: { accessKeyId: string, secretAccessKey: string }) {
        this.ec2 = new EC2Client({ region, credentials });
        this.rds = new RDSClient({ region, credentials });
        this.s3 = new S3Client({ region, credentials });
        Logger.info(`AwsNativeClient natively instantiated for region: ${region}`);
    }

    public async resolveInstanceType(cpuCores: number, memoryMb: number): Promise<string> {
        if (cpuCores <= 2 && memoryMb <= 4096) return 't3.medium';
        if (cpuCores <= 4 && memoryMb <= 16384) return 'm5.xlarge';
        return 'm5.2xlarge';
    }

    public async runInstances(type: string, image: string, subnetId?: string): Promise<{ id: string; ip: string; state: 'running' | 'failed' }> {
        const cmd = new RunInstancesCommand({
            ImageId: image,
            InstanceType: type as any,
            MinCount: 1,
            MaxCount: 1,
            NetworkInterfaces: vpcId ? [{ DeviceIndex: 0, SubnetId: subnetId }] : undefined
        });
        const res = await this.ec2.send(cmd);
        const instance = res.Instances?.[0];
        if (!instance || !instance.InstanceId) throw new Error('AWS EC2 creation failed: No instance returned');
        
        return { 
            id: instance.InstanceId, 
            ip: instance.PrivateIpAddress || 'pending', 
            state: 'running' 
        };
    }

    public async terminateInstances(id: string): Promise<void> {
        const cmd = new TerminateInstancesCommand({ InstanceIds: [id] });
        await this.ec2.send(cmd);
    }

    public async createVpc(cidr: string, name: string): Promise<string> {
        const cmd = new CreateVpcCommand({ CidrBlock: cidr });
        const res = await this.ec2.send(cmd);
        if (!res.Vpc || !res.Vpc.VpcId) throw new Error('AWS VPC creation failed');
        return res.Vpc.VpcId;
    }

    public async deleteVpc(id: string): Promise<void> {
        const cmd = new DeleteVpcCommand({ VpcId: id });
        await this.ec2.send(cmd);
    }

    public async createSubnet(vpcId: string, cidr: string): Promise<SubnetResult> {
        const cmd = new CreateSubnetCommand({ VpcId: vpcId, CidrBlock: cidr });
        const res = await this.ec2.send(cmd);
        if (!res.Subnet || !res.Subnet.SubnetId) throw new Error('AWS Subnet creation failed');
        return { id: res.Subnet.SubnetId, cidr: cidr };
    }

    public async createRds(name: string, engine: string, capacity: number, securityGroupId?: string, credentialsRef?: string): Promise<{ id: string; endpoint: string }> {
        // Map abstract capacity to DB instance class
        const dbInstanceClass = capacity > 100 ? 'db.m5.large' : 'db.t3.micro';
        
        if (!credentialsRef || !credentialsRef.startsWith('secret:')) {
            throw new Error('Security Audit: Physical AWS RDS deployment requires a secure credentialsRef mapping.');
        }
        
        // Resolve physically from Vault
        const password = await resolveSecret(credentialsRef);
        
        const cmd = new CreateDBInstanceCommand({
            DBInstanceIdentifier: name,
            AllocatedStorage: capacity,
            DBInstanceClass: dbInstanceClass,
            Engine: engine,
            MasterUsername: 'admin',
            MasterUserPassword: password,
            VpcSecurityGroupIds: securityGroupId ? [securityGroupId] : undefined
        });
        
        const res = await this.rds.send(cmd);
        if (!res.DBInstance || !res.DBInstance.DBInstanceIdentifier) throw new Error('AWS RDS creation failed');
        
        return { 
            id: res.DBInstance.DBInstanceIdentifier, 
            endpoint: res.DBInstance.Endpoint?.Address || 'pending' 
        };
    }

    public async deleteRds(id: string): Promise<void> {
        const cmd = new DeleteDBInstanceCommand({ DBInstanceIdentifier: id, SkipFinalSnapshot: true });
        await this.rds.send(cmd);
    }

    public async createS3Bucket(name: string, isPublic: boolean): Promise<{ id: string; endpoint: string }> {
        const cmd = new CreateBucketCommand({ Bucket: name });
        const res = await this.s3.send(cmd);
        return { 
            id: name, 
            endpoint: `https://${name}.s3.amazonaws.com` 
        };
    }

    public async deleteS3Bucket(id: string): Promise<void> {
        const cmd = new DeleteBucketCommand({ Bucket: id });
        await this.s3.send(cmd);
    }

    public async getInstanceStatus(id: string): Promise<ComputeStatus> {
        const cmd = new DescribeInstancesCommand({ InstanceIds: [id] });
        const res = await this.ec2.send(cmd);
        const stateName = res.Reservations?.[0]?.Instances?.[0]?.State?.Name;
        
        return {
            id,
            state: stateName === 'running' ? 'running' : 'failed',
            health: stateName === 'running' ? 'healthy' : 'unhealthy'
        };
    }

    public async createSnapshot(id: string): Promise<string> {
        const cmd = new CreateSnapshotCommand({ VolumeId: id });
        const res = await this.ec2.send(cmd);
        if (!res.SnapshotId) throw new Error('AWS Snapshot failed');
        return res.SnapshotId;
    }
}
