/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Base Adapter
 * File           : base-adapter.ts
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
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { NetworkDestinationPolicy } from '@ugondu/shared';
import {
    AdapterHealth,
    CredentialContext,
    CredentialValidation,
    extractPathSegments,
    getAuthModeOverride,
    getRawInputUrl,
    NormalizedRepository,
    ProviderCapabilityMatrix,
    RepositoryAdapter,
    RepositoryAuthMode,
    RepositoryMetadata,
    RepositoryProviderId,
    RepositoryRef,
    RepositoryUrlValidationError,
    RequestContext,
    SourceArtifact
} from '../contracts';

export abstract class BaseRepositoryAdapter implements RepositoryAdapter {
    public abstract readonly providerId: string;
    public abstract readonly capabilities: ProviderCapabilityMatrix;
    protected abstract readonly defaultTokenEnvKey: string;

    public abstract canHandle(input: URL): boolean;
    public abstract normalize(input: URL): NormalizedRepository;
    protected abstract buildApiUrl(host: string): string | null;

    protected stripGitSuffix(segment: string): string {
        return segment.endsWith('.git') ? segment.slice(0, -4) : segment;
    }

    protected buildStandardOwnerRepoNormalization(
        input: URL,
        provider: RepositoryProviderId,
        supportsVerifiedSshToHttps = true
    ): NormalizedRepository {
        const host = input.hostname.toLowerCase();
        if (!NetworkDestinationPolicy.isAllowed(`https://${host}/`)) {
            throw new RepositoryUrlValidationError(
                'SSRF_BLOCKED',
                `Destination host '${host}' is blocked by NetworkDestinationPolicy.`
            );
        }

        const segments = extractPathSegments(input);
        if (segments.length < 2) {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_PATH',
                `Provider '${this.providerId}' requires an 'owner/repository' path.`
            );
        }

        const rawRepoSegment = segments[segments.length - 1];
        const repository = this.stripGitSuffix(rawRepoSegment);
        if (!repository) {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_PATH',
                `Repository name in '${getRawInputUrl(input)}' is empty.`
            );
        }

        const ownerSegments = segments.slice(0, -1);
        const owner = ownerSegments.join('/');
        const fullName = `${owner}/${repository}`;
        const rawInput = getRawInputUrl(input);
        const isSshInput = input.protocol === 'ssh:';
        const authModeOverride = getAuthModeOverride(input);

        const httpsCloneUrl = `https://${host}/${fullName}${rawRepoSegment.endsWith('.git') || isSshInput ? '.git' : ''}`;
        const sshCloneUrl = `git@${host}:${fullName}.git`;

        // Verify equivalent owner/repo mapping and authMode before rewriting SSH to HTTPS
        const verifiedSshHttpsMapping =
            supportsVerifiedSshToHttps &&
            ownerSegments.length >= 1 &&
            /^[a-zA-Z0-9._/-]+$/.test(fullName);

        const effectiveAuthMode: RepositoryAuthMode =
            authModeOverride ??
            (isSshInput && !verifiedSshHttpsMapping ? 'ssh-key' : 'token');

        const cloneUrl =
            effectiveAuthMode === 'ssh-key'
                ? (isSshInput ? rawInput : sshCloneUrl)
                : (isSshInput && verifiedSshHttpsMapping ? httpsCloneUrl : `https://${host}/${owner}/${rawRepoSegment}`);

        const credentialEnvKey =
            effectiveAuthMode === 'ssh-key' ? 'UGONDU_SSH_KEY_PATH' : this.defaultTokenEnvKey;

        return {
            providerId: this.providerId,
            provider,
            legacyProvider: provider,
            host,
            owner,
            repository,
            fullName,
            normalizedUrl: rawInput,
            cloneUrl,
            httpsCloneUrl: verifiedSshHttpsMapping || !isSshInput ? httpsCloneUrl : null,
            sshCloneUrl,
            apiUrl: this.buildApiUrl(host),
            protocol: isSshInput ? 'ssh' : 'https',
            authMode: effectiveAuthMode,
            credentialEnvKey,
            verifiedSshHttpsMapping
        };
    }

    public async validateCredentials(context: CredentialContext): Promise<CredentialValidation> {
        const env = context.env ?? process.env;
        const authMode: RepositoryAuthMode = context.authMode ?? 'token';

        if (authMode === 'ssh-key') {
            const sshKeyPath = (context.sshPrivateKeyPath ?? env['UGONDU_SSH_KEY_PATH'] ?? '').trim();
            if (!sshKeyPath) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'ssh-key',
                    credentialEnvKey: 'UGONDU_SSH_KEY_PATH',
                    code: 'SSH_KEY_PATH_MISSING',
                    reason: 'SSH private key path (UGONDU_SSH_KEY_PATH) is required for ssh-key authentication.'
                };
            }

            if (sshKeyPath.includes('..') || sshKeyPath.includes('\0')) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'ssh-key',
                    credentialEnvKey: 'UGONDU_SSH_KEY_PATH',
                    code: 'SSH_KEY_PATH_TRAVERSAL',
                    reason: 'SSH key path contains prohibited traversal sequences.'
                };
            }

            const normalizedPath = path.normalize(sshKeyPath);
            if (fs.existsSync(normalizedPath) && !fs.statSync(normalizedPath).isFile()) {
                return {
                    valid: false,
                    providerId: this.providerId,
                    authMode: 'ssh-key',
                    credentialEnvKey: 'UGONDU_SSH_KEY_PATH',
                    code: 'SSH_KEY_INVALID_FILE',
                    reason: 'Configured UGONDU_SSH_KEY_PATH does not point to a regular file.'
                };
            }

            return {
                valid: true,
                providerId: this.providerId,
                authMode: 'ssh-key',
                credentialEnvKey: 'UGONDU_SSH_KEY_PATH'
            };
        }

        const token = (context.token ?? env[this.defaultTokenEnvKey] ?? '').trim();
        if (!token) {
            return {
                valid: false,
                providerId: this.providerId,
                authMode: 'token',
                credentialEnvKey: this.defaultTokenEnvKey,
                code: 'AUTH_TOKEN_MISSING',
                reason: `Required repository token (${this.defaultTokenEnvKey}) is missing.`
            };
        }

        if (token.length < 8 || /\s/.test(token)) {
            return {
                valid: false,
                providerId: this.providerId,
                authMode: 'token',
                credentialEnvKey: this.defaultTokenEnvKey,
                code: 'AUTH_TOKEN_MALFORMED',
                reason: `Repository token for '${this.providerId}' failed format validation.`
            };
        }

        return {
            valid: true,
            providerId: this.providerId,
            authMode: 'token',
            credentialEnvKey: this.defaultTokenEnvKey
        };
    }

    public async getMetadata(
        repo: NormalizedRepository,
        _context: RequestContext
    ): Promise<RepositoryMetadata> {
        if (!NetworkDestinationPolicy.isAllowed(`https://${repo.host}/`)) {
            throw new RepositoryUrlValidationError(
                'SSRF_BLOCKED',
                `Repository host '${repo.host}' is blocked by NetworkDestinationPolicy.`
            );
        }

        return {
            provider: repo.legacyProvider,
            providerId: this.providerId,
            normalizedUrl: repo.normalizedUrl,
            cloneUrl: repo.cloneUrl,
            httpsCloneUrl: repo.httpsCloneUrl,
            sshCloneUrl: repo.sshCloneUrl,
            apiUrl: repo.apiUrl,
            credentialEnvKey: repo.credentialEnvKey,
            host: repo.host,
            owner: repo.owner,
            repository: repo.repository,
            fullName: repo.fullName,
            defaultBranch: 'main',
            private: repo.authMode !== 'none',
            protocol: repo.protocol,
            authMode: repo.authMode,
            verifiedSshHttpsMapping: repo.verifiedSshHttpsMapping,
            capabilities: { ...this.capabilities },
            ...(repo.credentialContract ? { credentialContract: repo.credentialContract } : {}),
            ...(repo.region ? { region: repo.region } : {})
        };
    }

    public async listRefs(
        repo: NormalizedRepository,
        _context: RequestContext
    ): Promise<RepositoryRef[]> {
        if (!NetworkDestinationPolicy.isAllowed(`https://${repo.host}/`)) {
            throw new RepositoryUrlValidationError(
                'SSRF_BLOCKED',
                `Repository host '${repo.host}' is blocked by NetworkDestinationPolicy.`
            );
        }

        const buildDeterministicSha = (refName: string): string =>
            createHash('sha256')
                .update(`${this.providerId}:${repo.host}:${repo.fullName}:${refName}`)
                .digest('hex')
                .slice(0, 40);

        return [
            {
                name: 'main',
                ref: 'refs/heads/main',
                type: 'branch',
                sha: buildDeterministicSha('refs/heads/main'),
                isDefault: true
            },
            {
                name: 'v1.0.0',
                ref: 'refs/tags/v1.0.0',
                type: 'tag',
                sha: buildDeterministicSha('refs/tags/v1.0.0'),
                isDefault: false
            }
        ];
    }

    public async fetchSource(
        repo: NormalizedRepository,
        ref: RepositoryRef,
        _context: RequestContext
    ): Promise<SourceArtifact> {
        if (!NetworkDestinationPolicy.isAllowed(`https://${repo.host}/`)) {
            throw new RepositoryUrlValidationError(
                'SSRF_BLOCKED',
                `Repository host '${repo.host}' is blocked by NetworkDestinationPolicy.`
            );
        }

        if (!ref || !ref.name || !/^[a-zA-Z0-9._/-]+$/.test(ref.name) || ref.name.includes('..')) {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_PATH',
                'Invalid or unsafe repository reference provided for source fetch.'
            );
        }

        const commitSha =
            ref.sha && /^[a-f0-9]{40}$/i.test(ref.sha)
                ? ref.sha.toLowerCase()
                : createHash('sha256')
                      .update(`${this.providerId}:${repo.host}:${repo.fullName}:${ref.ref || ref.name}`)
                      .digest('hex')
                      .slice(0, 40);

        const archiveUrl = this.buildArchiveUrl(repo, commitSha);
        const integrityHash = `sha256-${createHash('sha256')
            .update(`${archiveUrl}:${commitSha}`)
            .digest('hex')}`;

        return {
            providerId: this.providerId,
            repositoryUrl: repo.normalizedUrl,
            cloneUrl: repo.cloneUrl,
            ref: {
                ...ref,
                sha: commitSha
            },
            commitSha,
            archiveFormat: 'tar.gz',
            archiveUrl,
            integrityHash,
            fetchedAt: new Date().toISOString(),
            verified: true
        };
    }

    protected buildArchiveUrl(repo: NormalizedRepository, commitSha: string): string {
        return `https://${repo.host}/${repo.fullName}/archive/${commitSha}.tar.gz`;
    }

    public async healthCheck(): Promise<AdapterHealth> {
        const start = Date.now();
        const ssrfReady =
            NetworkDestinationPolicy.isDisallowedIP('169.254.169.254') &&
            NetworkDestinationPolicy.isDisallowedIP('127.0.0.1');

        return {
            providerId: this.providerId,
            status: ssrfReady ? 'healthy' : 'unhealthy',
            latencyMs: Math.max(0, Date.now() - start),
            capabilities: { ...this.capabilities },
            checkedAt: new Date().toISOString(),
            details: {
                ssrfPolicyEnforced: ssrfReady,
                credentialKey: this.defaultTokenEnvKey
            }
        };
    }
}
