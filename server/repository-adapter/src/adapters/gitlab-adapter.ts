/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / GitLab Adapter
 * File           : gitlab-adapter.ts
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

export class GitLabAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'gitlab';
    protected readonly defaultTokenEnvKey = 'UGONDU_GITLAB_TOKEN';

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
        const enterpriseHosts = parseAllowedHosts('UGONDU_GITLAB_ENTERPRISE_HOSTS');
        const isGitLabHost =
            host === 'gitlab.com' ||
            enterpriseHosts.includes(host) ||
            /^gitlab\.[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host);

        if (!isGitLabHost) {
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
        return this.buildStandardOwnerRepoNormalization(input, 'gitlab', true);
    }

    protected buildApiUrl(host: string): string {
        return `https://${host}/api/v4`;
    }

    protected override buildArchiveUrl(repo: NormalizedRepository, commitSha: string): string {
        const encodedProject = encodeURIComponent(repo.fullName);
        return `https://${repo.host}/api/v4/projects/${encodedProject}/repository/archive.tar.gz?sha=${commitSha}`;
    }
}
