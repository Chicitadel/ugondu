/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Gitea Adapter
 * File           : gitea-adapter.ts
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

export class GiteaAdapter extends BaseRepositoryAdapter {
    public readonly providerId = 'gitea';
    protected readonly defaultTokenEnvKey = 'UGONDU_GITEA_TOKEN';

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
        const allowedGiteaHosts = parseAllowedHosts('UGONDU_GITEA_HOSTS');
        const isGiteaHost =
            host === 'gitea.com' ||
            host === 'try.gitea.io' ||
            allowedGiteaHosts.includes(host) ||
            /^(?:gitea|mygitea)\.[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(host);

        if (!isGiteaHost) {
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
        return this.buildStandardOwnerRepoNormalization(input, 'gitea', true);
    }

    protected buildApiUrl(host: string): string {
        return `https://${host}/api/v1`;
    }
}
