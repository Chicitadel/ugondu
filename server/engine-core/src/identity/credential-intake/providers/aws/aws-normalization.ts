import { CredentialNormalizer, NormalizedCredential, AuthenticatedIdentity, AuthenticationVerifier } from '../../core';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { Logger } from '@ugondu/shared';

export class AwsAuthenticationVerifier implements AuthenticationVerifier {
    public async verify(credential: NormalizedCredential, region: string = 'eu-west-3'): Promise<AuthenticatedIdentity> {
        if (credential.provider !== 'aws' || credential.authType !== 'access_key') {
            throw new Error('AwsAuthenticationVerifier requires an AWS access_key credential.');
        }

        const sts = new STSClient({
            region,
            credentials: {
                accessKeyId: credential.payload.accessKeyId,
                secretAccessKey: credential.payload.secretAccessKey
            }
        });

        try {
            const res = await sts.send(new GetCallerIdentityCommand({}));
            return {
                provider: 'aws',
                accountId: res.Account!,
                principal: res.Arn!,
                userId: res.UserId!,
                region
            };
        } catch (error: any) {
            Logger.error(__t('aws_sts_authentication_verific'));
            throw new Error('AWS Authentication failed: Check credentials or network.');
        }
    }
}

export class AwsCredentialNormalizer implements CredentialNormalizer {
    private verifier = new AwsAuthenticationVerifier();

    public supports(rawContent: string): boolean {
        // Broadly detect if it looks like an AWS CSV or INI
        const content = rawContent.toLowerCase();
        return content.includes(__t('access_key_id')) && content.includes(__t('secret_access_key'));
    }

    public async normalize(rawContent: string): Promise<NormalizedCredential> {
        const lines = rawContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            throw new Error(__t('invalid_aws_csv_format'));
        }

        // Handle quoted CSV fields safely
        const parseCsvLine = (line: string) => line.split(',').map(v => v.replace(/^"|"$/g, '').trim());

        const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());

        let accessKeyIdx = -1;
        let secretKeyIdx = -1;
        let userNameIdx = -1;

        headers.forEach((h, idx) => {
            if (h.includes(__t('access_key_id'))) accessKeyIdx = idx;
            if (h.includes(__t('secret_access_key'))) secretKeyIdx = idx;
            if (h.includes(__t('user_name'))) userNameIdx = idx;
        });

        if (accessKeyIdx === -1 || secretKeyIdx === -1) {
            throw new Error('AWS CSV missing essential access key columns.');
        }

        const values = parseCsvLine(lines[1]);
        const accessKeyId = values[accessKeyIdx];
        const secretAccessKey = values[secretKeyIdx];
        let userName = userNameIdx !== -1 ? values[userNameIdx] : undefined;

        if (!userName) {
            Logger.info('AWS CSV missing User Name. Attempting safe recovery via STS...');

            // Temporary credential object to authenticate and discover identity
            const tempCred = {
                provider: 'aws',
                authType: 'access_key',
                payload: { accessKeyId, secretAccessKey }
            };

            let identity: AuthenticatedIdentity;
            try {
                identity = await this.verifier.verify(tempCred);
            } catch (e: any) {
                Logger.error('Cannot safely reconstruct AWS CSV: Identity authentication failed.');
                throw new Error('Normalization blocked: Missing User Name and credentials failed STS authentication.');
            }

            if (identity.principal.includes(':user/')) {
                userName = identity.principal.split(':user/')[1].split('/')[0];
                Logger.info(`Safely reconstructed User Name: ${userName}`);
            } else {
                throw new Error('Normalization blocked: Identity authenticated but is not a standard IAM User (e.g. Assumed Role). Cannot inject User Name.');
            }
        }

        return {
            provider: 'aws',
            authType: 'access_key',
            payload: {
                userName,
                accessKeyId,
                secretAccessKey
            }
        };
    }
}
