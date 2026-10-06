import { AwsCertificationProviderAdapter } from './aws-certification-provider-adapter';

export function getProviderAdapter(platform: string, region: string) {
    if (platform === 'aws') return new AwsCertificationProviderAdapter(region);
    throw new Error('Unsupported platform for physical certification: ' + platform);
}
