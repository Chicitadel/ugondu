import { EC2 } from '@aws-sdk/client-ec2';
import { RDS } from '@aws-sdk/client-rds';
import { S3 } from '@aws-sdk/client-s3';
import { ResidualScanner } from '../fault-injector';

export class AwsResidualScanner {
    private ec2: EC2;
    private rds: RDS;
    private s3: S3;

    constructor(region: string) {
        this.ec2 = new EC2({ region });
        this.rds = new RDS({ region });
        this.s3 = new S3({ region });
    }

    public async scanForLeakedResources(params: {
        vpcId: string;
        sub1Id: string;
        ec2Id: string;
        rdsId: string;
        bucketName: string;
    }): Promise<boolean> {
        const vpcDesc = await this.ec2.describeVpcs({ VpcIds: [params.vpcId] }).catch(() => null);
        const subDesc = await this.ec2.describeSubnets({ SubnetIds: [params.sub1Id] }).catch(() => null);
        const instDesc = await this.ec2.describeInstances({ InstanceIds: [params.ec2Id] }).catch(() => null);
        const rdsDesc = await this.rds.describeDBInstances({ DBInstanceIdentifier: params.rdsId }).catch(() => null);
        const s3Desc = await this.s3.headBucket({ Bucket: params.bucketName }).catch(() => null);

        const vpcLeaked = (vpcDesc?.Vpcs?.length || 0) > 0;
        const subLeaked = (subDesc?.Subnets?.length || 0) > 0;
        const instLeaked = (instDesc?.Reservations?.length || 0) > 0;
        const rdsLeaked = (rdsDesc?.DBInstances?.length || 0) > 0;
        const s3Leaked = s3Desc !== null;

        return vpcLeaked || subLeaked || instLeaked || rdsLeaked || s3Leaked;
    }
}
