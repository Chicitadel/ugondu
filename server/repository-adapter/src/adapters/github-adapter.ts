/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / GitHub Adapter
 * File           : github-adapter.ts
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
    NormalizedRepository,
    parseAllowedHosts,
    ProviderCapabilityMatrix
} from '../contracts';

export class GitHubAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'github';
    protected readonly defaultTokenEnvKey = 'UGONDU_GITHUB_TOKEN';

    public readonly capabilities: ProviderCapabilityMatrix = {
        detect: 'tested',
        authenticate: 'tested',
        metadata: 'tested',
        refs: 'tested',
        fetch: 'tested',
        webhook: 'implemented',
        deployment: 'implemented'
    };

    public canHandle(input: URL): boolean {
        if (input.protocol !== 'https:' && input.protocol !== 'ssh:') {
            return false;
        }

        const host = input.hostname.toLowerCase();
        const enterpriseHosts = parseAllowedHosts('UGONDU_GITHUB_ENTERPRISE_HOSTS');
        const isGitHubHost = host === 'github.com' || enterpriseHosts.includes(host);

        if (!isGitHubHost) {
            return false;
        }

        try {
            const segments = extractPathSegments(input);
            return segments.length === 2;
        } catch {
            return false;
        }
    }

    public normalize(input: URL): NormalizedRepository {
        return this.buildStandardOwnerRepoNormalization(input, 'github', true);
    }

    protected buildApiUrl(host: string): string {
        return host === 'github.com' ? 'https://api.github.com' : `https://${host}/api/v3`;
    }
}
