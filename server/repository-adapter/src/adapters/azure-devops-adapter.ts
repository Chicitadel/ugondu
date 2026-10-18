/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Azure DevOps Adapter
 * File           : azure-devops-adapter.ts
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
    extractPathSegments,
    getAuthModeOverride,
    getRawInputUrl,
    NormalizedRepository,
    ProviderCapabilityMatrix,
    RepositoryAuthMode,
    RepositoryUrlValidationError
} from '../contracts';

export class AzureDevOpsAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'azure-devops';
    protected readonly defaultTokenEnvKey = 'UGONDU_AZURE_DEVOPS_TOKEN';

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
        const isAzureHost =
            host === 'dev.azure.com' ||
            host === 'ssh.dev.azure.com' ||
            /^[a-z0-9-]+\.visualstudio\.com$/.test(host);

        if (!isAzureHost) {
            return false;
        }

        try {
            const segments = extractPathSegments(input);
            return segments.length >= 2;
        } catch {
            return false;
        }
    }

    public normalize(input: URL): NormalizedRepository {
        const host = input.hostname.toLowerCase();
        const segments = extractPathSegments(input);
        const rawInput = getRawInputUrl(input);
        const isSshInput = input.protocol === 'ssh:';

        let owner = '';
        let repository = '';

        // Format 1: https://dev.azure.com/{org}/{project}/_git/{repo}
        const gitIdx = segments.indexOf('_git');
        if (gitIdx !== -1 && gitIdx + 1 < segments.length) {
            owner = segments.slice(0, gitIdx).join('/');
            repository = this.stripGitSuffix(segments[gitIdx + 1]);
        } else if (segments[0] === 'v3' && segments.length >= 4) {
            // Format 2: ssh://git@ssh.dev.azure.com/v3/{org}/{project}/{repo}
            owner = `${segments[1]}/${segments[2]}`;
            repository = this.stripGitSuffix(segments[3]);
        } else if (segments.length >= 2) {
            owner = segments.slice(0, -1).join('/');
            repository = this.stripGitSuffix(segments[segments.length - 1]);
        }

        if (!owner || !repository) {
            throw new RepositoryUrlValidationError(
                'INVALID_REPOSITORY_PATH',
                `Azure DevOps URL '${rawInput}' is missing organization/project or repository segment.`
            );
        }

        const fullName = `${owner}/${repository}`;
        const httpsCloneUrl = `https://dev.azure.com/${owner}/_git/${repository}`;
        const sshCloneUrl = `git@ssh.dev.azure.com:v3/${owner}/${repository}`;
        const verifiedSshHttpsMapping = owner.includes('/');

        const authModeOverride = getAuthModeOverride(input);
        const effectiveAuthMode: RepositoryAuthMode =
            authModeOverride ?? (isSshInput && !verifiedSshHttpsMapping ? 'ssh-key' : 'token');

        const cloneUrl =
            effectiveAuthMode === 'ssh-key'
                ? (isSshInput ? rawInput : sshCloneUrl)
                : (isSshInput && verifiedSshHttpsMapping ? httpsCloneUrl : rawInput);

        return {
            providerId: this.providerId,
            provider: 'azure-devops',
            legacyProvider: 'azure-devops',
            host,
            owner,
            repository,
            fullName,
            normalizedUrl: rawInput,
            cloneUrl,
            httpsCloneUrl,
            sshCloneUrl,
            apiUrl: this.buildApiUrl(host),
            protocol: isSshInput ? 'ssh' : 'https',
            authMode: effectiveAuthMode,
            credentialEnvKey: effectiveAuthMode === 'ssh-key' ? 'UGONDU_SSH_KEY_PATH' : this.defaultTokenEnvKey,
            verifiedSshHttpsMapping
        };
    }

    protected buildApiUrl(_host: string): string {
        return 'https://dev.azure.com';
    }
}
