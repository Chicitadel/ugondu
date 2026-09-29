/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter
 * File           : index.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Supported Providers: GitHub, GitLab, Bitbucket, Gitea, Gogs, Azure DevOps,
 *                      AWS CodeCommit, Self-hosted Git (SSH/HTTPS)
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'repository-adapter' });
});

// [en] Supported repository provider enum
type RepositoryProvider =
    | 'github'
    | 'gitlab'
    | 'bitbucket'
    | 'gitea'
    | 'gogs'
    | 'azure-devops'
    | 'aws-codecommit'
    | 'generic-https'
    | 'generic-ssh';

interface RepositoryMetadata {
    provider: RepositoryProvider;
    normalizedUrl: string;
    cloneUrl: string;
    apiUrl: string | null;
    credentialEnvKey: string;
}

// [en] Detect repository provider from URL
function detectProvider(url: string): RepositoryProvider {
    const lower = url.toLowerCase();
    if (lower.includes('github.com')) return 'github';
    if (lower.includes('gitlab.com') || lower.includes('/gitlab/')) return 'gitlab';
    if (lower.includes('bitbucket.org')) return 'bitbucket';
    if (lower.includes('gitea')) return 'gitea';
    if (lower.includes('gogs')) return 'gogs';
    if (lower.includes('dev.azure.com') || lower.includes('visualstudio.com')) return 'azure-devops';
    if (lower.includes('codecommit') || lower.includes('amazonaws.com/v1/repos')) return 'aws-codecommit';
    if (lower.startsWith('git@') || lower.startsWith('ssh://')) return 'generic-ssh';
    return 'generic-https';
}

// [en] Normalize a repository URL to HTTPS clone format
function normalizeCloneUrl(url: string, provider: RepositoryProvider): string {
    // [en] Convert SSH git@ URLs to HTTPS for environments without SSH keys configured
    if (url.startsWith('git@')) {
        // git@github.com:user/repo.git -> https://github.com/user/repo.git
        const sshPattern = /^git@([^:]+):(.+)$/;
        const match = url.match(sshPattern);
        if (match) {
            return `https://${match[1]}/${match[2]}`;
        }
    }
    return url;
}

// [en] Build provider-specific API base URL for webhook/branch verification
function buildApiUrl(url: string, provider: RepositoryProvider): string | null {
    switch (provider) {
        case 'github':
            return 'https://api.github.com';
        case 'gitlab': {
            // [en] Support self-hosted GitLab instances
            const match = url.match(/https?:\/\/([^/]+)/);
            const host = match ? match[1] : 'gitlab.com';
            return `https://${host}/api/v4`;
        }
        case 'bitbucket':
            return 'https://api.bitbucket.org/2.0';
        case 'azure-devops':
            return 'https://dev.azure.com';
        case 'gitea':
        case 'gogs': {
            const match = url.match(/https?:\/\/([^/]+)/);
            const host = match ? match[1] : null;
            return host ? `https://${host}/api/v1` : null;
        }
        default:
            return null;
    }
}

// [en] Build the environment variable key that should contain the provider token
function buildCredentialEnvKey(provider: RepositoryProvider): string {
    const keyMap: Record<RepositoryProvider, string> = {
        'github': 'UGONDU_GITHUB_TOKEN',
        'gitlab': 'UGONDU_GITLAB_TOKEN',
        'bitbucket': 'UGONDU_BITBUCKET_TOKEN',
        'gitea': 'UGONDU_GITEA_TOKEN',
        'gogs': 'UGONDU_GOGS_TOKEN',
        'azure-devops': 'UGONDU_AZURE_DEVOPS_TOKEN',
        'aws-codecommit': 'AWS_SECRET_ACCESS_KEY',
        'generic-https': 'UGONDU_GIT_TOKEN',
        'generic-ssh': 'UGONDU_SSH_KEY_PATH'
    };
    return keyMap[provider];
}

// [en] POST /v1/repository/resolve — Detect provider and return normalized metadata
app.post('/v1/repository/resolve', (req: Request, res: Response): any => {
    const { repositoryUrl } = req.body;

    if (!repositoryUrl) {
        return res.status(400).json({ error: '[en] repositoryUrl is required.' });
    }

    const provider = detectProvider(repositoryUrl);
    const cloneUrl = normalizeCloneUrl(repositoryUrl, provider);
    const apiUrl = buildApiUrl(repositoryUrl, provider);
    const credentialEnvKey = buildCredentialEnvKey(provider);

    const metadata: RepositoryMetadata = {
        provider,
        normalizedUrl: repositoryUrl,
        cloneUrl,
        apiUrl,
        credentialEnvKey
    };

    console.log(`[en] Repository resolved: ${repositoryUrl} -> Provider: ${provider.toUpperCase()}`);

    return res.status(200).json({
        metadata,
        message: `[en] Provider detected: ${provider.toUpperCase()}. Credential env: ${credentialEnvKey}`
    });
});

// [en] GET /v1/repository/providers — List all supported providers
app.get('/v1/repository/providers', (req: Request, res: Response): any => {
    const supported: RepositoryProvider[] = [
        'github', 'gitlab', 'bitbucket', 'gitea', 'gogs',
        'azure-devops', 'aws-codecommit', 'generic-https', 'generic-ssh'
    ];
    return res.status(200).json({
        providers: supported,
        count: supported.length,
        message: '[en] All supported repository providers.'
    });
});

const PORT = process.env.PORT || 4005;
app.listen(PORT, () => {
    console.log(`[en] Ugondu Repository Adapter listening on port ${PORT}`);
    console.log('[en] Supported providers: GitHub, GitLab, Bitbucket, Gitea, Gogs, Azure DevOps, AWS CodeCommit, Generic Git');
});
