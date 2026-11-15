/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Generic Git Adapter
 * File           : generic-git-adapter.ts
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
import { NetworkDestinationPolicy } from '@ugondu/shared';
import { BaseRepositoryAdapter } from './base-adapter';
import {
    extractPathSegments,
    getRawInputUrl,
    NormalizedRepository,
    ProviderCapabilityMatrix,
    RepositoryProviderId,
    RepositoryUrlValidationError
} from '../contracts';

export class GenericGitAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'generic-git';
    protected readonly defaultTokenEnvKey = 'UGONDU_GIT_TOKEN';

    public readonly capabilities: ProviderCapabilityMatrix = {
        detect: 'tested',
        authenticate: 'tested',
        metadata: 'tested',
        refs: 'tested',
        fetch: 'tested',
        webhook: 'unavailable',
        deployment: 'implemented'
    };

    public canHandle(input: URL): boolean {
        if (input.protocol !== 'https:' && input.protocol !== 'ssh:') {
            return false;
        }

        const host = input.hostname.toLowerCase();
        if (!NetworkDestinationPolicy.isAllowed(`https://${host}/`)) {
            return false;
        }

        try {
            const segments = extractPathSegments(input);
            return segments.length >= 1;
        } catch {
            return false;
        }
    }

    public normalize(input: URL): NormalizedRepository {
        const host = input.hostname.toLowerCase();
        if (!NetworkDestinationPolicy.isAllowed(`https://${host}/`)) {
            throw new RepositoryUrlValidationError(
                'SSRF_BLOCKED',
                `Generic Git destination '${host}' is prohibited by NetworkDestinationPolicy.`
            );
        }

        const segments = extractPathSegments(input);
        const rawInput = getRawInputUrl(input);
        const isSshInput = input.protocol === 'ssh:';

        const rawRepoSegment = segments[segments.length - 1];
        const repository = this.stripGitSuffix(rawRepoSegment);
        const owner = segments.length > 1 ? segments.slice(0, -1).join('/') : 'default';
        const fullName = segments.length > 1 ? `${owner}/${repository}` : repository;

        const legacyProvider: RepositoryProviderId = isSshInput ? 'generic-ssh' : 'generic-https';

        // Generic Git does NOT blindly rewrite SSH URLs to HTTPS because generic servers
        // have no guaranteed equivalent HTTPS path mapping.
        return {
            providerId: this.providerId,
            provider: 'generic-git',
            legacyProvider,
            host,
            owner,
            repository,
            fullName,
            normalizedUrl: rawInput,
            cloneUrl: isSshInput ? rawInput : `https://${host}/${segments.join('/')}`,
            httpsCloneUrl: isSshInput ? null : `https://${host}/${segments.join('/')}`,
            sshCloneUrl: isSshInput ? rawInput : null,
            apiUrl: null,
            protocol: isSshInput ? 'ssh' : 'https',
            authMode: isSshInput ? 'ssh-key' : 'token',
            credentialEnvKey: isSshInput ? 'UGONDU_SSH_KEY_PATH' : 'UGONDU_GIT_TOKEN',
            verifiedSshHttpsMapping: false
        };
    }

    protected buildApiUrl(_host: string): null {
        return null;
    }
}
