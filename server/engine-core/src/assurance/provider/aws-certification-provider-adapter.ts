import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { AwsNativeClient } from '../../fabric/providers/aws-native-client';
import { AwsCertificationFaultInjector } from '../fault/aws-fault-injector';
import { AwsPhysicalRepairExecutor } from '../../deise/engine/aws-physical-repair-executor';
import { AwsResidualScanner } from '../fault/aws-residual-scanner';

export class AwsCertificationProviderAdapter {
    constructor(private region: string) {}

    async resolveDefaultAmi() {
        const ssm = new SSMClient({ region: this.region });
        const res = await ssm.send(new GetParameterCommand({ Name: '/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64' }));
        return res.Parameter?.Value || '';
    }

    getNativeClient() {
        return new AwsNativeClient(this.region);
    }

    getFaultInjector() {
        return new AwsCertificationFaultInjector(this.region);
    }

    getRepairExecutor() {
        return new AwsPhysicalRepairExecutor(this.region);
    }

    getResidualScanner() {
        return new AwsResidualScanner(this.region);
    }
}
