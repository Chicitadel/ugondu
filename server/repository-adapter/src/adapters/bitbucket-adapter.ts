/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Bitbucket Adapter
 * File           : bitbucket-adapter.ts
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

export class BitbucketAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'bitbucket';
    protected readonly defaultTokenEnvKey = 'UGONDU_BITBUCKET_TOKEN';

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
        const enterpriseHosts = parseAllowedHosts('UGONDU_BITBUCKET_ENTERPRISE_HOSTS');
        const isBitbucketHost = host === 'bitbucket.org' || enterpriseHosts.includes(host);

        if (!isBitbucketHost) {
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
        return this.buildStandardOwnerRepoNormalization(input, 'bitbucket', true);
    }

    protected buildApiUrl(host: string): string {
        return host === 'bitbucket.org'
            ? 'https://api.bitbucket.org/2.0'
            : `https://${host}/rest/api/1.0`;
    }

    protected override buildArchiveUrl(repo: NormalizedRepository, commitSha: string): string {
        return `https://${repo.host}/${repo.fullName}/get/${commitSha}.tar.gz`;
    }
}
