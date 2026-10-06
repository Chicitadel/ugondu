import { AwsCertificationProviderAdapter } from './aws-certification-provider-adapter';

export function getProviderAdapter(platform: string, region: string) {
    if (platform === 'aws') return new AwsCertificationProviderAdapter(region);
    throw new Error(__t('unsupported_platform_for_physi') + platform);
}
