import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@ugondu/shared';
import { CredentialNormalizer, AuthenticationVerifier, AuthorizationPreflight } from './core';
import { AwsCredentialNormalizer, AwsAuthenticationVerifier } from './providers/aws/aws-normalization';
import { AwsAuthorizationPreflight } from './providers/aws/aws-authorization';

export class CredentialIntakeOrchestrator {
    private normalizers: CredentialNormalizer[] = [new AwsCredentialNormalizer()];

    private getVerifier(provider: string): AuthenticationVerifier {
        if (provider === 'aws') return new AwsAuthenticationVerifier();
        throw new Error(`No AuthenticationVerifier registered for provider: ${provider}`);
    }

    private getPreflight(provider: string): AuthorizationPreflight {
        if (provider === 'aws') return new AwsAuthorizationPreflight();
        throw new Error(`No AuthorizationPreflight registered for provider: ${provider}`);
    }

    public async processImport(filePath: string, capabilities: string[]) {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Credential file not found at: ${absolutePath}`);
        }

        const rawContent = fs.readFileSync(absolutePath, 'utf8');
        let matchedNormalizer: CredentialNormalizer | undefined;

        for (const normalizer of this.normalizers) {
            if (normalizer.supports(rawContent)) {
                matchedNormalizer = normalizer;
                break;
            }
        }

        if (!matchedNormalizer) {
            throw new Error(__t('msg_credential_format_not_recognized_by_any'));
        }

        // 1. Normalize
        Logger.info(__t('msg_normalizing_credential'));
        const normalized = await matchedNormalizer.normalize(rawContent);

        // 2. Authenticate
        Logger.info(`Authenticating ${normalized.provider} credential...`);
        const verifier = this.getVerifier(normalized.provider);
        const identity = await verifier.verify(normalized);

        // 3. Authorize
        Logger.info(__t('msg_running_capability_authorization_preflig'));
        const preflight = this.getPreflight(normalized.provider);
        const authResults = await preflight.preflight(normalized, identity, capabilities);

        return {
            normalized,
            identity,
            authResults
        };
    }
}
