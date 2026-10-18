/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / AWS CodeCommit Adapter
 * File           : aws-codecommit-adapter.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd / Ujomor Systems
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd / Ujomor Systems. All Rights Reserved.
 ******************************************************************************/

import { URL } from 'url';
import { BaseRepositoryAdapter } from './base-adapter';
import {
    AwsCodeCommitCredentialContract,
    CredentialContext,
    CredentialValidation,
    extractPathSegments,
    getRawInputUrl,
    NormalizedRepository,
    ProviderCapabilityMatrix,
    RepositoryUrlValidationError
} from '../contracts';

const CODECOMMIT_HOST_RE = /^git-codecommit\.([a-z]{2}(?:-gov)?-[a-z]+-\d+)\.amazonaws\.com(?:\.cn)?$/;
const AWS_REGION_RE = /^[a-z]{2}(?:-gov)?-[a-z]+-\d+$/;
const IAM_ROLE_ARN_RE = /^arn:aws(?:-cn|-us-gov)?:iam::\d{12}:role\/[\w+=,.@/-]+$/;

export const AWS_CODECOMMIT_CREDENTIAL_CONTRACT: AwsCodeCommitCredentialContract = {
    strategy: 'aws-iam-role-oidc-sigv4',
    roleArnEnvKey: 'AWS_ROLE_ARN',
    webIdentityTokenFileEnvKey: 'AWS_WEB_IDENTITY_TOKEN_FILE',
    regionEnvKey: 'AWS_REGION',
    sessionTokenEnvKey: 'AWS_SESSION_TOKEN',
    accessKeyIdEnvKey: 'AWS_ACCESS_KEY_ID',
    credentialHelper: 'git-remote-codecommit',
    sigv4Service: 'codecommit',
    staticSecretKeyAllowed: false
};

export class AwsCodeCommitAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'aws-codecommit';
    protected readonly defaultTokenEnvKey = 'AWS_ROLE_ARN';

    public readonly capabilities: ProviderCapabilityMatrix = {
        detect: 'supported',
        authenticate: 'supported',
        metadata: 'supported',
        refs: 'supported',
        fetch: 'supported',
        webhook: 'supported',
        deployment: 'supported'
    };

    public canHandle(input: URL): boolean {
        if (input.protocol !== 'https:' && input.protocol !== 'ssh:') {
            return false;
        }

        const host = input.hostname.toLowerCase();
        if (!CODECOMMIT_HOST_RE.test(host)) {
            return false;
        }

        try {
            const segments = extractPathSegments(input);
            return segments.length === 3 && segments[0] === 'v1' && segments[1] === 'repos' && Boolean(segments[2]);
        } catch {
            return false;
        }
    }

    public normalize(input: URL): NormalizedRepository {
        const host = input.hostname.toLowerCase();
        const hostMatch = CODECOMMIT_HOST_RE.exec(host);
        if (!hostMatch) {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_URL',
                `Invalid AWS CodeCommit hostname '${host}'.`
            );
        }

        const region = hostMatch[1];
        const segments = extractPathSegments(input);
        if (segments.length !== 3 || segments[0] !== 'v1' || segments[1] !== 'repos') {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_PATH',
                'AWS CodeCommit URLs must match /v1/repos/{repository}.'
            );
        }

        const repository = this.stripGitSuffix(segments[2]);
        if (!repository) {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_PATH',
                'AWS CodeCommit repository name cannot be empty.'
            );
        }

        const rawInput = getRawInputUrl(input);
        const httpsCloneUrl = `https://${host}/v1/repos/${repository}`;
        const sshCloneUrl = `ssh://${host}/v1/repos/${repository}`;
        const isSsh = input.protocol === 'ssh:';

        return {
            providerId: this.providerId,
            provider: 'aws-codecommit',
            legacyProvider: 'aws-codecommit',
            host,
            owner: region,
            repository,
            fullName: `${region}/${repository}`,
            normalizedUrl: rawInput,
            cloneUrl: httpsCloneUrl,
            httpsCloneUrl,
            sshCloneUrl,
            apiUrl: this.buildApiUrl(host),
            protocol: isSsh ? 'ssh' : 'https',
            authMode: 'iam-role-oidc',
            credentialEnvKey: 'AWS_ROLE_ARN',
            verifiedSshHttpsMapping: true,
            credentialContract: { ...AWS_CODECOMMIT_CREDENTIAL_CONTRACT },
            region
        };
    }

    protected buildApiUrl(host: string): string {
        const match = CODECOMMIT_HOST_RE.exec(host);
        const region = match ? match[1] : 'us-east-1';
        return `https://codecommit.${region}.amazonaws.com`;
    }

    public override async validateCredentials(context: CredentialContext): Promise<CredentialValidation> {
        const env = context.env ?? process.env;
        const roleArn = (context.awsRoleArn ?? env['AWS_ROLE_ARN'] ?? '').trim();
        const webIdentityTokenFile = (
            context.awsWebIdentityTokenFile ??
            env['AWS_WEB_IDENTITY_TOKEN_FILE'] ??
            ''
        ).trim();
        const region = (context.awsRegion ?? env['AWS_REGION'] ?? env['AWS_DEFAULT_REGION'] ?? '').trim();
        const accessKeyId = (context.awsAccessKeyId ?? env['AWS_ACCESS_KEY_ID'] ?? '').trim();
        const secretAccessKey = (context.awsSecretAccessKey ?? env['AWS_SECRET_ACCESS_KEY'] ?? '').trim();
        const sessionToken = (context.awsSessionToken ?? env['AWS_SESSION_TOKEN'] ?? '').trim();

        // COR-009: Reject bare static secret keys without IAM role assumption or STS session context
        const hasBareStaticSecret =
            (Boolean(secretAccessKey) && !sessionToken && !roleArn) ||
            (accessKeyId.startsWith('AKIA') && !roleArn);

        if (hasBareStaticSecret) {
            return {
                valid: false,
                providerId: this.providerId,
                authMode: 'iam-role-oidc',
                credentialEnvKey: 'AWS_ROLE_ARN',
                code: 'STATIC_IAM_CREDENTIALS_FORBIDDEN',
                reason:
                    'Bare static AWS secret access keys are prohibited for AWS CodeCommit (COR-009). Configure IAM Role Assumption (AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE) or STS temporary credentials (AWS_SESSION_TOKEN) with AWS_REGION.'
            };
        }

        if (!region || !AWS_REGION_RE.test(region)) {
            return {
                valid: false,
                providerId: this.providerId,
                authMode: 'iam-role-oidc',
                credentialEnvKey: 'AWS_ROLE_ARN',
                code: 'AWS_REGION_REQUIRED',
                reason: 'Explicit valid AWS_REGION is required for AWS CodeCommit SigV4 authentication.'
            };
        }

        // Strategy A: IAM Role Assumption via OIDC Web Identity Token or Role ARN
        if (roleArn) {
            if (!IAM_ROLE_ARN_RE.test(roleArn)) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'iam-role-oidc',
                    credentialEnvKey: 'AWS_ROLE_ARN',
                    code: 'INVALID_AWS_ROLE_ARN',
                    reason: `Provided AWS_ROLE_ARN '${roleArn}' is not a valid IAM Role ARN.`
                };
            }

            if (!webIdentityTokenFile && !sessionToken) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'iam-role-oidc',
                    credentialEnvKey: 'AWS_ROLE_ARN',
                    code: 'OIDC_OR_STS_SESSION_REQUIRED',
                    reason:
                        'AWS_ROLE_ARN requires AWS_WEB_IDENTITY_TOKEN_FILE (OIDC) or an active STS AWS_SESSION_TOKEN.'
                };
            }

            if (webIdentityTokenFile && (webIdentityTokenFile.includes('..') || webIdentityTokenFile.includes('\0'))) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'iam-role-oidc',
                    credentialEnvKey: 'AWS_ROLE_ARN',
                    code: 'INVALID_WEB_IDENTITY_TOKEN_PATH',
                    reason: 'AWS_WEB_IDENTITY_TOKEN_FILE contains prohibited path traversal sequences.'
                };
            }

            return {
                valid: true,
                providerId: this.providerId,
                authMode: 'iam-role-oidc',
                credentialEnvKey: 'AWS_ROLE_ARN',
                identityArn: roleArn,
                region
            };
        }

        // Strategy B: Temporary STS session credentials (ASIA... + secret + sessionToken)
        if (accessKeyId && secretAccessKey && sessionToken) {
            if (!accessKeyId.startsWith('ASIA')) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'iam-role-oidc',
                    credentialEnvKey: 'AWS_ROLE_ARN',
                    code: 'STS_TEMPORARY_KEY_REQUIRED',
                    reason: 'STS session credentials must use a temporary ASIA access key identifier.'
                };
            }

            return {
                valid: true,
                providerId: this.providerId,
                authMode: 'iam-role-oidc',
                credentialEnvKey: 'AWS_ROLE_ARN',
                region
            };
        }

        return {
            valid: false,
            providerId: this.providerId,
            authMode: 'iam-role-oidc',
            credentialEnvKey: 'AWS_ROLE_ARN',
            code: 'AWS_IAM_ROLE_CREDENTIALS_MISSING',
            reason:
                'AWS CodeCommit requires AWS_ROLE_ARN + AWS_WEB_IDENTITY_TOKEN_FILE (or temporary STS session credentials) and AWS_REGION.'
        };
    }
}
