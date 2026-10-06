import { EC2 } from '@aws-sdk/client-ec2';
import { CertificationFaultInjector } from '../fault-injector';

export class AwsCertificationFaultInjector implements CertificationFaultInjector {
    private ec2: EC2;

    constructor(region: string) {
        this.ec2 = new EC2({ region });
    }

    public async injectTagDrift(resourceId: string, expectedKey: string, driftedValue: string): Promise<void> {
        await this.ec2.createTags({
            Resources: [resourceId],
            Tags: [{ Key: expectedKey, Value: driftedValue }]
        });
    }
}
