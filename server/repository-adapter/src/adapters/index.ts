/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Adapter Registry
 * File           : index.ts
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
import {
    AdapterHealth,
    ProviderCapabilityMatrix,
    RepositoryAdapter,
    RepositoryProviderId,
    RepositoryUrlValidationError
} from '../contracts';
import { GitHubAdapter } from './github-adapter';
import { GitLabAdapter } from './gitlab-adapter';
import { BitbucketAdapter } from './bitbucket-adapter';
import { AzureDevOpsAdapter } from './azure-devops-adapter';
import { AwsCodeCommitAdapter } from './aws-codecommit-adapter';
import { GiteaAdapter } from './gitea-adapter';
import { GogsAdapter } from './gogs-adapter';
import { GenericGitAdapter } from './generic-git-adapter';

export * from './base-adapter';
export * from './github-adapter';
export * from './gitlab-adapter';
export * from './bitbucket-adapter';
export * from './azure-devops-adapter';
export * from './aws-codecommit-adapter';
export * from './gitea-adapter';
export * from './gogs-adapter';
export * from './generic-git-adapter';

export interface ProviderSummary {
    providerId: string;
    capabilities: ProviderCapabilityMatrix;
}

export class RepositoryAdapterRegistry {
    private readonly adapters: RepositoryAdapter[];
    private readonly fallbackAdapter: GenericGitAdapter;

    constructor(customAdapters?: RepositoryAdapter[]) {
        this.fallbackAdapter = new GenericGitAdapter();
        this.adapters = customAdapters ?? [
            new GitHubAdapter(),
            new GitLabAdapter(),
            new BitbucketAdapter(),
            new AzureDevOpsAdapter(),
            new AwsCodeCommitAdapter(),
            new GiteaAdapter(),
            new GogsAdapter(),
            this.fallbackAdapter
        ];
    }

    public resolveAdapter(input: URL): RepositoryAdapter {
        for (const adapter of this.adapters) {
            if (adapter.providerId !== 'generic-git' && adapter.canHandle(input)) {
                return adapter;
            }
        }

        if (this.fallbackAdapter.canHandle(input)) {
            return this.fallbackAdapter;
        }

        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_URL',
            `No repository adapter can handle '${input.toString()}'.`
        );
    }

    public getAdapterById(providerId: string): RepositoryAdapter | undefined {
        const normalizedId = providerId.toLowerCase().trim();
        if (normalizedId === 'generic-https' || normalizedId === 'generic-ssh') {
            return this.fallbackAdapter;
        }
        return this.adapters.find((a) => a.providerId === normalizedId);
    }

    public listAdapters(): RepositoryAdapter[] {
        return [...this.adapters];
    }

    public listProviderIds(): RepositoryProviderId[] {
        return [
            'github',
            'gitlab',
            'bitbucket',
            'gitea',
            'gogs',
            'azure-devops',
            'aws-codecommit',
            'generic-git',
            'generic-https',
            'generic-ssh'
        ];
    }

    public listProviderSummaries(): ProviderSummary[] {
        return this.adapters.map((adapter) => ({
            providerId: adapter.providerId,
            capabilities: { ...adapter.capabilities }
        }));
    }

    public async checkAllHealth(): Promise<AdapterHealth[]> {
        return Promise.all(this.adapters.map((adapter) => adapter.healthCheck()));
    }
}
