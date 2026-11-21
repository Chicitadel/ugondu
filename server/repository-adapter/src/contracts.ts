/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Contracts & URL Security
 * File           : contracts.ts
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
import * as net from 'net';
import { NetworkDestinationPolicy } from '@ugondu/shared';

export type RepositoryProviderId =
    | 'github'
    | 'gitlab'
    | 'bitbucket'
    | 'azure-devops'
    | 'aws-codecommit'
    | 'gitea'
    | 'gogs'
    | 'generic-git'
    | 'generic-https'
    | 'generic-ssh';

export type CapabilitySupportLevel =
    | 'supported'
    | 'implemented'
    | 'tested'
    | 'experimental'
    | 'unavailable';

export type RepositoryCapabilityName =
    | 'detect'
    | 'authenticate'
    | 'metadata'
    | 'refs'
    | 'fetch'
    | 'webhook'
    | 'deployment';

export type ProviderCapabilityMatrix = Record<RepositoryCapabilityName, CapabilitySupportLevel>;

export type RepositoryAuthMode = 'token' | 'ssh-key' | 'iam-role-oidc' | 'none';

export interface AwsCodeCommitCredentialContract {
    strategy: 'aws-iam-role-oidc-sigv4';
    roleArnEnvKey: 'AWS_ROLE_ARN';
    webIdentityTokenFileEnvKey: 'AWS_WEB_IDENTITY_TOKEN_FILE';
    regionEnvKey: 'AWS_REGION';
    sessionTokenEnvKey: 'AWS_SESSION_TOKEN';
    accessKeyIdEnvKey: 'AWS_ACCESS_KEY_ID';
    credentialHelper: 'git-remote-codecommit';
    sigv4Service: 'codecommit';
    staticSecretKeyAllowed: false;
}

export interface NormalizedRepository {
    providerId: string;
    provider: RepositoryProviderId;
    legacyProvider: RepositoryProviderId;
    host: string;
    owner: string;
    repository: string;
    fullName: string;
    normalizedUrl: string;
    cloneUrl: string;
    httpsCloneUrl: string | null;
    sshCloneUrl: string | null;
    apiUrl: string | null;
    protocol: 'https' | 'ssh';
    authMode: RepositoryAuthMode;
    credentialEnvKey: string;
    verifiedSshHttpsMapping: boolean;
    credentialContract?: AwsCodeCommitCredentialContract;
    region?: string;
}

export interface CredentialContext {
    providerId?: string;
    authMode?: RepositoryAuthMode;
    token?: string;
    sshPrivateKeyPath?: string;
    awsRoleArn?: string;
    awsWebIdentityTokenFile?: string;
    awsRegion?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsSessionToken?: string;
    env?: Record<string, string | undefined>;
}

export interface CredentialValidation {
    valid: boolean;
    providerId: string;
    authMode: RepositoryAuthMode;
    credentialEnvKey: string;
    code?: string;
    reason?: string;
    identityArn?: string;
    region?: string;
    expiresAt?: string;
}

export interface RequestContext {
    correlationId?: string;
    traceparent?: string;
    tenantId?: string;
    timeoutMs?: number;
    authMode?: RepositoryAuthMode;
    credentials?: CredentialContext;
    env?: Record<string, string | undefined>;
}

export interface RepositoryMetadata {
    provider: RepositoryProviderId;
    providerId: string;
    normalizedUrl: string;
    cloneUrl: string;
    httpsCloneUrl: string | null;
    sshCloneUrl: string | null;
    apiUrl: string | null;
    credentialEnvKey: string;
    host: string;
    owner: string;
    repository: string;
    fullName: string;
    defaultBranch: string;
    private: boolean;
    protocol: 'https' | 'ssh';
    authMode: RepositoryAuthMode;
    verifiedSshHttpsMapping: boolean;
    capabilities: ProviderCapabilityMatrix;
    credentialContract?: AwsCodeCommitCredentialContract;
    region?: string;
}

export interface RepositoryRef {
    name: string;
    ref: string;
    type: 'branch' | 'tag' | 'commit';
    sha: string;
    isDefault?: boolean;
}

export interface SourceArtifact {
    providerId: string;
    repositoryUrl: string;
    cloneUrl: string;
    ref: RepositoryRef;
    commitSha: string;
    archiveFormat: 'tar.gz' | 'git-pack' | 'bundle';
    archiveUrl: string;
    integrityHash: string;
    fetchedAt: string;
    verified: boolean;
}

export interface AdapterHealth {
    providerId: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs: number;
    capabilities: ProviderCapabilityMatrix;
    checkedAt: string;
    details?: Record<string, unknown>;
}

export interface RepositoryAdapter {
    readonly providerId: string;
    readonly capabilities: ProviderCapabilityMatrix;
    canHandle(input: URL): boolean;
    normalize(input: URL): NormalizedRepository;
    validateCredentials(context: CredentialContext): Promise<CredentialValidation>;
    getMetadata(repo: NormalizedRepository, context: RequestContext): Promise<RepositoryMetadata>;
    listRefs(repo: NormalizedRepository, context: RequestContext): Promise<RepositoryRef[]>;
    fetchSource(repo: NormalizedRepository, ref: RepositoryRef, context: RequestContext): Promise<SourceArtifact>;
    healthCheck(): Promise<AdapterHealth>;
}

export type RepositoryUrlErrorCode =
    | 'MISSING_REPOSITORY_URL'
    | 'INVALID_REPOSITORY_URL'
    | 'INVALID_PROTOCOL'
    | 'INSECURE_PROTOCOL'
    | 'EMBEDDED_CREDENTIALS_FORBIDDEN'
    | 'UNEXPECTED_PORT_FORBIDDEN'
    | 'QUERY_OR_FRAGMENT_FORBIDDEN'
    | 'PATH_TRAVERSAL_FORBIDDEN'
    | 'SSRF_BLOCKED'
    | 'LOOKALIKE_URL_FORBIDDEN'
    | 'INVALID_REPOSITORY_PATH';

export class RepositoryUrlValidationError extends Error {
    public readonly code: RepositoryUrlErrorCode;
    public readonly statusCode: number;

    constructor(code: RepositoryUrlErrorCode, message: string, statusCode = 400) {
        super(message);
        this.name = 'RepositoryUrlValidationError';
        this.code = code;
        this.statusCode = statusCode;
    }
}

const RAW_INPUT_SYMBOL = Symbol.for('ugondu.repository.rawInput');
const SCP_SSH_SYMBOL = Symbol.for('ugondu.repository.isScpSsh');
const AUTH_MODE_OVERRIDE_SYMBOL = Symbol.for('ugondu.repository.authModeOverride');

export interface AnnotatedRepositoryUrl extends URL {
    [RAW_INPUT_SYMBOL]?: string;
    [SCP_SSH_SYMBOL]?: boolean;
    [AUTH_MODE_OVERRIDE_SYMBOL]?: RepositoryAuthMode;
}

export function getRawInputUrl(url: URL): string {
    return (url as AnnotatedRepositoryUrl)[RAW_INPUT_SYMBOL] ?? url.toString();
}

export function isScpSshUrl(url: URL): boolean {
    return Boolean((url as AnnotatedRepositoryUrl)[SCP_SSH_SYMBOL]);
}

export function getAuthModeOverride(url: URL): RepositoryAuthMode | undefined {
    return (url as AnnotatedRepositoryUrl)[AUTH_MODE_OVERRIDE_SYMBOL];
}

export function setAuthModeOverride(url: URL, authMode?: RepositoryAuthMode): void {
    if (authMode) {
        Object.defineProperty(url, AUTH_MODE_OVERRIDE_SYMBOL, {
            value: authMode,
            enumerable: false,
            configurable: true
        });
    }
}

export function parseAllowedHosts(envKey: string, env: Record<string, string | undefined> = process.env): string[] {
    const raw = env[envKey];
    if (!raw) return [];
    return raw
        .split(',')
        .map((h) => h.trim().toLowerCase())
        .filter((h) => h.length > 0 && /^[a-z0-9.-]+$/.test(h));
}

const KNOWN_CLOUD_PROVIDER_DOMAINS = [
    'github.com',
    'gitlab.com',
    'bitbucket.org',
    'dev.azure.com',
    'visualstudio.com',
    'amazonaws.com',
    'gitea.com',
    'gogs.io'
];

function isOfficialOrConfiguredProviderHost(hostname: string): boolean {
    const lower = hostname.toLowerCase();
    if (
        lower === 'github.com' ||
        lower === 'gitlab.com' ||
        lower === 'bitbucket.org' ||
        lower === 'dev.azure.com' ||
        lower === 'ssh.dev.azure.com' ||
        lower === 'gitea.com' ||
        lower === 'try.gitea.io' ||
        lower === 'try.gogs.io' ||
        /^[a-z0-9-]+\.visualstudio\.com$/.test(lower) ||
        /^git-codecommit\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(lower)
    ) {
        return true;
    }

    const configuredAllowlists = [
        ...parseAllowedHosts('UGONDU_GITHUB_ENTERPRISE_HOSTS'),
        ...parseAllowedHosts('UGONDU_GITLAB_ENTERPRISE_HOSTS'),
        ...parseAllowedHosts('UGONDU_BITBUCKET_ENTERPRISE_HOSTS'),
        ...parseAllowedHosts('UGONDU_GITEA_HOSTS'),
        ...parseAllowedHosts('UGONDU_GOGS_HOSTS'),
        ...parseAllowedHosts('UGONDU_ALLOWED_GIT_HOSTS')
    ];

    return configuredAllowlists.includes(lower);
}

function isLookalikeOrDeceptiveUrl(hostname: string, pathname: string): boolean {
    const lowerHost = hostname.toLowerCase();
    const lowerPath = pathname.toLowerCase();

    if (!isOfficialOrConfiguredProviderHost(lowerHost)) {
        for (const domain of KNOWN_CLOUD_PROVIDER_DOMAINS) {
            if (lowerHost !== domain) {
                if (
                    lowerHost.includes(`${domain}.`) ||
                    lowerHost.endsWith(`-${domain}`) ||
                    lowerHost.startsWith(`${domain}-`)
                ) {
                    return true;
                }
            }
            const pathSegments = lowerPath.split('/').filter(Boolean);
            if (pathSegments.includes(domain)) {
                return true;
            }
        }
    }

    return false;
}

function validateHostnameSafety(rawHostname: string): string {
    let hostname = rawHostname.trim().toLowerCase();
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
        hostname = hostname.slice(1, -1);
    }

    if (!hostname) {
        throw new RepositoryUrlValidationError('INVALID_REPOSITORY_URL', 'Repository URL is missing a valid hostname.');
    }

    if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.arpa') ||
        hostname === '0.0.0.0'
    ) {
        throw new RepositoryUrlValidationError(
            'SSRF_BLOCKED',
            `Repository host '${rawHostname}' is blocked by SSRF destination policy.`
        );
    }

    if (
        NetworkDestinationPolicy.isDisallowedIP(hostname) ||
        net.isIP(hostname) !== 0 ||
        /^(0x[0-9a-f]+|\d+)$/i.test(hostname) ||
        /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
    ) {
        throw new RepositoryUrlValidationError(
            'SSRF_BLOCKED',
            `Repository IP literal or restricted address '${rawHostname}' is blocked by SSRF destination policy.`
        );
    }

    if (!hostname.includes('.') || hostname.startsWith('.') || hostname.endsWith('.') || hostname.includes('..')) {
        throw new RepositoryUrlValidationError(
            'SSRF_BLOCKED',
            `Repository hostname '${rawHostname}' must be a valid fully-qualified domain name.`
        );
    }

    if (!/^[a-z0-9.-]+$/.test(hostname)) {
        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_URL',
            `Repository hostname '${rawHostname}' contains invalid characters.`
        );
    }

    if (!NetworkDestinationPolicy.isAllowed(`https://${hostname}/`)) {
        throw new RepositoryUrlValidationError(
            'SSRF_BLOCKED',
            `Repository destination '${rawHostname}' is prohibited by NetworkDestinationPolicy.`
        );
    }

    return hostname;
}

function validatePathnameSafety(rawPathname: string): string[] {
    if (!rawPathname || rawPathname === '/') {
        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_PATH',
            'Repository URL must include a valid repository path.'
        );
    }

    let decoded: string;
    try {
        decoded = decodeURIComponent(rawPathname);
    } catch {
        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_PATH',
            'Repository URL path contains malformed percent-encoding.'
        );
    }

    if (
        rawPathname.includes('..') ||
        decoded.includes('..') ||
        rawPathname.includes('//') ||
        decoded.includes('//') ||
        rawPathname.includes('\\') ||
        decoded.includes('\\') ||
        decoded.includes('\0')
    ) {
        throw new RepositoryUrlValidationError(
            'PATH_TRAVERSAL_FORBIDDEN',
            'Repository URL path contains prohibited traversal or separator sequences.'
        );
    }

    const segments = decoded.split('/').filter((s) => s.length > 0);
    if (segments.length === 0) {
        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_PATH',
            'Repository URL must contain at least one repository path segment.'
        );
    }

    for (const seg of segments) {
        if (seg === '.' || seg === '..' || !/^[a-zA-Z0-9._-]+$/.test(seg)) {
            throw new RepositoryUrlValidationError(
                'PATH_TRAVERSAL_FORBIDDEN',
                `Repository path segment '${seg}' is invalid or prohibited.`
            );
        }
    }

    return segments;
}

/**
 * Strictly parses and validates a repository URL (HTTPS, SSH, or canonical SCP-like git@host:owner/repo.git).
 * Enforces NetworkDestinationPolicy SSRF protection, credential/port/traversal/query rejection,
 * and deceptive lookalike URL detection.
 */
export function parseAndValidateRepositoryUrl(rawUrl: string, authModeOverride?: RepositoryAuthMode): URL {
    if (typeof rawUrl !== 'string' || rawUrl.trim().length === 0) {
        throw new RepositoryUrlValidationError('MISSING_REPOSITORY_URL', 'repositoryUrl is required.');
    }

    const trimmed = rawUrl.trim();

    if (/[\s\r\n\t\0\\]/.test(trimmed)) {
        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_URL',
            'Repository URL contains prohibited whitespace, control, or backslash characters.'
        );
    }

    if (trimmed.includes('?') || trimmed.includes('#')) {
        throw new RepositoryUrlValidationError(
            'QUERY_OR_FRAGMENT_FORBIDDEN',
            'Repository URLs must not contain query strings or URL fragments.'
        );
    }

    // Handle canonical SCP-like SSH syntax: git@host:owner/repo.git
    if (!trimmed.includes('://')) {
        if (/^[^@/:]+:[^@]+@/.test(trimmed)) {
            throw new RepositoryUrlValidationError(
                'EMBEDDED_CREDENTIALS_FORBIDDEN',
                'Embedded credentials in SCP-like repository URLs are prohibited.'
            );
        }

        if (trimmed.startsWith('git@')) {
            const scpMatch = /^git@([^:]+):(.+)$/.exec(trimmed);
            if (!scpMatch) {
                throw new RepositoryUrlValidationError(
                    'INVALID_REPOSITORY_URL',
                    'Malformed SCP-like SSH repository URL.'
                );
            }

            const [, rawHost, rawRepoPath] = scpMatch;
            if (rawRepoPath.startsWith('/')) {
                throw new RepositoryUrlValidationError(
                    'INVALID_REPOSITORY_PATH',
                    'SCP-like SSH repository path must be relative to the git user home/root.'
                );
            }

            const hostname = validateHostnameSafety(rawHost);
            const normalizedPath = `/${rawRepoPath}`;
            validatePathnameSafety(normalizedPath);

            if (isLookalikeOrDeceptiveUrl(hostname, normalizedPath)) {
                throw new RepositoryUrlValidationError(
                    'LOOKALIKE_URL_FORBIDDEN',
                    `Deceptive or lookalike repository URL '${trimmed}' is rejected.`
                );
            }

            const syntheticUrl = new URL(`ssh://git@${hostname}${normalizedPath}`) as AnnotatedRepositoryUrl;
            Object.defineProperty(syntheticUrl, RAW_INPUT_SYMBOL, {
                value: trimmed,
                enumerable: false,
                configurable: true
            });
            Object.defineProperty(syntheticUrl, SCP_SSH_SYMBOL, {
                value: true,
                enumerable: false,
                configurable: true
            });
            setAuthModeOverride(syntheticUrl, authModeOverride);
            return syntheticUrl;
        }

        throw new RepositoryUrlValidationError(
            'INVALID_REPOSITORY_URL',
            'Repository URL must use an explicit https://, ssh://, or git@host:owner/repo.git scheme.'
        );
    }

    let parsed: AnnotatedRepositoryUrl;
    try {
        parsed = new URL(trimmed) as AnnotatedRepositoryUrl;
    } catch {
        throw new RepositoryUrlValidationError('INVALID_REPOSITORY_URL', `Invalid repository URL '${trimmed}'.`);
    }

    // Always validate hostname SSRF first so http://169.254.169.254/... is classified as SSRF_BLOCKED
    if (parsed.hostname) {
        validateHostnameSafety(parsed.hostname);
    }

    if (parsed.protocol === 'http:') {
        throw new RepositoryUrlValidationError(
            'INSECURE_PROTOCOL',
            'Plaintext HTTP repository URLs are prohibited; use https:// or ssh://.'
        );
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'ssh:') {
        throw new RepositoryUrlValidationError(
            'INVALID_PROTOCOL',
            `Unsupported repository protocol '${parsed.protocol}'. Only https: and ssh: are allowed.`
        );
    }

    if (parsed.protocol === 'https:' && (parsed.username !== '' || parsed.password !== '')) {
        throw new RepositoryUrlValidationError(
            'EMBEDDED_CREDENTIALS_FORBIDDEN',
            'Embedded user credentials in HTTPS repository URLs are prohibited.'
        );
    }

    if (
        parsed.protocol === 'ssh:' &&
        (parsed.password !== '' || (parsed.username !== '' && parsed.username !== 'git'))
    ) {
        throw new RepositoryUrlValidationError(
            'EMBEDDED_CREDENTIALS_FORBIDDEN',
            'SSH repository URLs may only specify user "git" without embedded passwords.'
        );
    }

    if (parsed.port !== '') {
        throw new RepositoryUrlValidationError(
            'UNEXPECTED_PORT_FORBIDDEN',
            `Unexpected custom port '${parsed.port}' in repository URL is prohibited.`
        );
    }

    if (parsed.search !== '' || parsed.hash !== '') {
        throw new RepositoryUrlValidationError(
            'QUERY_OR_FRAGMENT_FORBIDDEN',
            'Repository URLs must not contain query strings or fragments.'
        );
    }

    // Check raw path before URL normalization collapses `..` segments!
    const schemeEndIdx = trimmed.indexOf('://');
    const afterScheme = trimmed.slice(schemeEndIdx + 3);
    const firstSlashIdx = afterScheme.indexOf('/');
    const rawPathUnnormalized = firstSlashIdx === -1 ? '' : afterScheme.slice(firstSlashIdx);
    validatePathnameSafety(rawPathUnnormalized);
    validatePathnameSafety(parsed.pathname);

    if (isLookalikeOrDeceptiveUrl(parsed.hostname, parsed.pathname)) {
        throw new RepositoryUrlValidationError(
            'LOOKALIKE_URL_FORBIDDEN',
            `Deceptive or lookalike repository URL '${trimmed}' is rejected.`
        );
    }

    Object.defineProperty(parsed, RAW_INPUT_SYMBOL, {
        value: trimmed,
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(parsed, SCP_SSH_SYMBOL, {
        value: false,
        enumerable: false,
        configurable: true
    });
    setAuthModeOverride(parsed, authModeOverride);

    return parsed;
}

export function extractPathSegments(input: URL): string[] {
    return validatePathnameSafety(input.pathname);
}
