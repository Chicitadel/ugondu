/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / Unit & Contract Tests
 * File           : repository-adapter.spec.ts
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

import * as http from 'http';
import { URL } from 'url';
import {
    AwsCodeCommitAdapter,
    AzureDevOpsAdapter,
    BitbucketAdapter,
    createRepositoryAdapterApp,
    GenericGitAdapter,
    GiteaAdapter,
    GitHubAdapter,
    GitLabAdapter,
    GogsAdapter,
    parseAndValidateRepositoryUrl,
    RepositoryAdapterRegistry,
    RepositoryUrlValidationError
} from '../index';

interface HttpTestResponse {
    status: number;
    headers: http.IncomingHttpHeaders;
    body: any;
}

function requestJson(
    server: http.Server,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
    headers: Record<string, string> = {}
): Promise<HttpTestResponse> {
    return new Promise((resolve, reject) => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
            return reject(new Error('Test server is not listening on a TCP port.'));
        }

        const payload = body !== undefined ? JSON.stringify(body) : undefined;
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: addr.port,
                path,
                method,
                headers: {
                    ...(payload
                        ? {
                              'Content-Type': 'application/json',
                              'Content-Length': String(Buffer.byteLength(payload))
                          }
                        : {}),
                    ...headers
                }
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve({
                            status: res.statusCode ?? 0,
                            headers: res.headers,
                            body: raw ? JSON.parse(raw) : {}
                        });
                    } catch {
                        resolve({
                            status: res.statusCode ?? 0,
                            headers: res.headers,
                            body: raw
                        });
                    }
                });
            }
        );

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

describe('BOUNDARY-05: Repository Adapter & SSRF Hardening', () => {
    let server: http.Server;

    beforeAll((done) => {
        const testApp = createRepositoryAdapterApp(new RepositoryAdapterRegistry());
        server = testApp.listen(0, '127.0.0.1', () => done());
    });

    afterAll((done) => {
        server.close(() => done());
    });

    describe('COR-007: Strict URL Parsing, Exact Hostname Boundary & SSRF Protection', () => {
        it('rejects adversarial lookalike URLs spoofing provider domains in path or hostname', () => {
            const lookalikes = [
                'https://evil.com/github.com/org/repo',
                'https://evil.com/gitlab.com/org/repo',
                'https://github.com.evil.com/org/repo',
                'https://evil-github.com/org/repo',
                'https://bitbucket.org.attacker.net/workspace/repo'
            ];

            for (const url of lookalikes) {
                expect(() => parseAndValidateRepositoryUrl(url)).toThrow(RepositoryUrlValidationError);
                try {
                    parseAndValidateRepositoryUrl(url);
                } catch (err) {
                    expect(err).toBeInstanceOf(RepositoryUrlValidationError);
                    expect((err as RepositoryUrlValidationError).code).toBe('LOOKALIKE_URL_FORBIDDEN');
                }
            }

            const github = new GitHubAdapter();
            expect(github.canHandle(new URL('https://evil.com/github.com/org/repo'))).toBe(false);
            expect(github.canHandle(new URL('https://github.com.evil.com/org/repo'))).toBe(false);
            expect(github.canHandle(new URL('https://github.com/org/repo'))).toBe(true);

            const gitea = new GiteaAdapter();
            expect(gitea.canHandle(new URL('https://evil.com/gitea/repo'))).toBe(false);
            expect(gitea.canHandle(new URL('https://mygitea.example.com/user/repo'))).toBe(true);
        });

        it('rejects SSRF targets including cloud metadata, loopback, localhost, and RFC1918 private IPs', () => {
            const ssrfTargets = [
                'http://169.254.169.254/gitea/repo',
                'https://169.254.169.254/latest/meta-data',
                'https://127.0.0.1/org/repo.git',
                'https://localhost/org/repo.git',
                'https://internal.localhost/org/repo.git',
                'https://10.0.0.1/org/repo.git',
                'https://172.16.10.5/org/repo.git',
                'https://192.168.1.100/org/repo.git',
                'https://[::1]/org/repo.git',
                'git@169.254.169.254:org/repo.git',
                'git@127.0.0.1:org/repo.git'
            ];

            for (const target of ssrfTargets) {
                expect(() => parseAndValidateRepositoryUrl(target)).toThrow(RepositoryUrlValidationError);
                try {
                    parseAndValidateRepositoryUrl(target);
                } catch (err) {
                    expect((err as RepositoryUrlValidationError).code).toBe('SSRF_BLOCKED');
                }
            }
        });

        it('rejects embedded credentials, custom ports, path traversal, and query/fragment strings', () => {
            expect(() => parseAndValidateRepositoryUrl('https://user:pass@github.com/org/repo')).toThrow(
                expect.objectContaining({ code: 'EMBEDDED_CREDENTIALS_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('https://token@github.com/org/repo')).toThrow(
                expect.objectContaining({ code: 'EMBEDDED_CREDENTIALS_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('ssh://git:secret@github.com/org/repo.git')).toThrow(
                expect.objectContaining({ code: 'EMBEDDED_CREDENTIALS_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('https://github.com:8443/org/repo')).toThrow(
                expect.objectContaining({ code: 'UNEXPECTED_PORT_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('https://github.com/org/../etc/passwd')).toThrow(
                expect.objectContaining({ code: 'PATH_TRAVERSAL_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('https://github.com/org/%2e%2e/repo')).toThrow(
                expect.objectContaining({ code: 'PATH_TRAVERSAL_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('https://github.com/org/repo?ref=main')).toThrow(
                expect.objectContaining({ code: 'QUERY_OR_FRAGMENT_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('https://github.com/org/repo#readme')).toThrow(
                expect.objectContaining({ code: 'QUERY_OR_FRAGMENT_FORBIDDEN' })
            );
            expect(() => parseAndValidateRepositoryUrl('http://github.com/org/repo')).toThrow(
                expect.objectContaining({ code: 'INSECURE_PROTOCOL' })
            );
        });

        it('normalizes SSH URLs to HTTPS only when adapter verifies equivalent mapping and auth mode', () => {
            const registry = new RepositoryAdapterRegistry();

            // Hosted provider with verified owner/repo mapping and default token authMode
            const ghSsh = parseAndValidateRepositoryUrl('git@github.com:example/repo.git');
            const ghAdapter = registry.resolveAdapter(ghSsh);
            const ghNormalized = ghAdapter.normalize(ghSsh);
            expect(ghNormalized.providerId).toBe('github');
            expect(ghNormalized.verifiedSshHttpsMapping).toBe(true);
            expect(ghNormalized.cloneUrl).toBe('https://github.com/example/repo.git');
            expect(ghNormalized.sshCloneUrl).toBe('git@github.com:example/repo.git');

            // Hosted provider when explicit ssh-key authMode is requested preserves SSH cloneUrl
            const ghSshExplicit = parseAndValidateRepositoryUrl('git@github.com:example/repo.git', 'ssh-key');
            const ghSshNormalized = ghAdapter.normalize(ghSshExplicit);
            expect(ghSshNormalized.authMode).toBe('ssh-key');
            expect(ghSshNormalized.cloneUrl).toBe('git@github.com:example/repo.git');
            expect(ghSshNormalized.credentialEnvKey).toBe('UGONDU_SSH_KEY_PATH');

            // Generic SSH repository is NOT blindly rewritten to HTTPS
            const genericSsh = parseAndValidateRepositoryUrl('git@git.example.org:team/service.git');
            const genericAdapter = registry.resolveAdapter(genericSsh);
            const genericNormalized = genericAdapter.normalize(genericSsh);
            expect(genericNormalized.providerId).toBe('generic-git');
            expect(genericNormalized.legacyProvider).toBe('generic-ssh');
            expect(genericNormalized.verifiedSshHttpsMapping).toBe(false);
            expect(genericNormalized.cloneUrl).toBe('git@git.example.org:team/service.git');
            expect(genericNormalized.httpsCloneUrl).toBeNull();
            expect(genericNormalized.credentialEnvKey).toBe('UGONDU_SSH_KEY_PATH');
        });
    });

    describe('COR-008: Full RepositoryAdapter Capability Contracts', () => {
        const adapters = [
            { adapter: new GitHubAdapter(), sampleUrl: 'https://github.com/airroofers/ugondu' },
            { adapter: new GitLabAdapter(), sampleUrl: 'https://gitlab.com/airroofers/platform/ugondu' },
            { adapter: new BitbucketAdapter(), sampleUrl: 'https://bitbucket.org/airroofers/ugondu' },
            { adapter: new AzureDevOpsAdapter(), sampleUrl: 'https://dev.azure.com/airroofers/ugondu/_git/core' },
            {
                adapter: new AwsCodeCommitAdapter(),
                sampleUrl: 'https://git-codecommit.eu-west-1.amazonaws.com/v1/repos/ugondu-core'
            },
            { adapter: new GiteaAdapter(), sampleUrl: 'https://mygitea.example.com/airroofers/ugondu' },
            { adapter: new GogsAdapter(), sampleUrl: 'https://mygogs.example.com/airroofers/ugondu' },
            { adapter: new GenericGitAdapter(), sampleUrl: 'https://git.example.com/airroofers/ugondu.git' }
        ];

        it.each(adapters)(
            'implements full Section 8.3 contract for $adapter.providerId',
            async ({ adapter, sampleUrl }) => {
                expect(adapter.capabilities).toEqual(
                    expect.objectContaining({
                        detect: expect.any(String),
                        authenticate: expect.any(String),
                        metadata: expect.any(String),
                        refs: expect.any(String),
                        fetch: expect.any(String),
                        webhook: expect.any(String),
                        deployment: expect.any(String)
                    })
                );

                const parsed = parseAndValidateRepositoryUrl(sampleUrl);
                expect(adapter.canHandle(parsed)).toBe(true);

                const normalized = adapter.normalize(parsed);
                expect(normalized.providerId).toBe(adapter.providerId);
                expect(normalized.repository).toBeTruthy();

                const metadata = await adapter.getMetadata(normalized, {});
                expect(metadata.providerId).toBe(adapter.providerId);
                expect(metadata.capabilities).toEqual(adapter.capabilities);

                const refs = await adapter.listRefs(normalized, {});
                expect(refs.length).toBeGreaterThan(0);
                expect(refs[0]).toEqual(
                    expect.objectContaining({
                        name: 'main',
                        ref: 'refs/heads/main',
                        type: 'branch',
                        sha: expect.stringMatching(/^[a-f0-9]{40}$/)
                    })
                );

                const artifact = await adapter.fetchSource(normalized, refs[0], {});
                expect(artifact.providerId).toBe(adapter.providerId);
                expect(artifact.commitSha).toBe(refs[0].sha);
                expect(artifact.integrityHash).toMatch(/^sha256-[a-f0-9]{64}$/);
                expect(artifact.verified).toBe(true);

                const health = await adapter.healthCheck();
                expect(health.providerId).toBe(adapter.providerId);
                expect(health.status).toBe('healthy');
            }
        );
    });

    describe('COR-009: AWS CodeCommit OIDC / IAM Role Assumption & Static Secret Rejection', () => {
        const codeCommit = new AwsCodeCommitAdapter();

        it('never uses AWS_SECRET_ACCESS_KEY as credentialEnvKey and exposes IAM/OIDC contract', () => {
            const parsed = parseAndValidateRepositoryUrl(
                'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/production-service'
            );
            const normalized = codeCommit.normalize(parsed);

            expect(normalized.credentialEnvKey).toBe('AWS_ROLE_ARN');
            expect(normalized.credentialEnvKey).not.toBe('AWS_SECRET_ACCESS_KEY');
            expect(normalized.authMode).toBe('iam-role-oidc');
            expect(normalized.region).toBe('us-east-1');
            expect(normalized.credentialContract).toEqual(
                expect.objectContaining({
                    strategy: 'aws-iam-role-oidc-sigv4',
                    roleArnEnvKey: 'AWS_ROLE_ARN',
                    webIdentityTokenFileEnvKey: 'AWS_WEB_IDENTITY_TOKEN_FILE',
                    regionEnvKey: 'AWS_REGION',
                    credentialHelper: 'git-remote-codecommit',
                    staticSecretKeyAllowed: false
                })
            );
        });

        it('rejects bare static AWS_SECRET_ACCESS_KEY or AKIA access keys without role/session context', async () => {
            const bareStaticResult = await codeCommit.validateCredentials({
                awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
                awsRegion: 'us-east-1',
                env: {}
            });

            expect(bareStaticResult.valid).toBe(false);
            expect(bareStaticResult.code).toBe('STATIC_IAM_CREDENTIALS_FORBIDDEN');
        });

        it('accepts valid IAM Role ARN + OIDC web identity token file + AWS_REGION', async () => {
            const oidcResult = await codeCommit.validateCredentials({
                awsRoleArn: 'arn:aws:iam::123456789012:role/UgonduCodeCommitDeployRole',
                awsWebIdentityTokenFile: '/var/run/secrets/eks.amazonaws.com/serviceaccount/token',
                awsRegion: 'eu-west-1',
                env: {}
            });

            expect(oidcResult.valid).toBe(true);
            expect(oidcResult.authMode).toBe('iam-role-oidc');
            expect(oidcResult.credentialEnvKey).toBe('AWS_ROLE_ARN');
            expect(oidcResult.identityArn).toBe('arn:aws:iam::123456789012:role/UgonduCodeCommitDeployRole');
            expect(oidcResult.region).toBe('eu-west-1');
        });
    });

    describe('COR-005, COR-013 & COR-018: Health, Readiness, Metadata & W3C Traceparent HTTP Endpoints', () => {
        it('exposes /health, /health/live, /health/ready, and /v1/metadata without cor_level and propagates traceparent', async () => {
            const customTrace = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
            const customCorr = 'corr-repo-adapter-001';

            const healthRes = await requestJson(server, 'GET', '/health', undefined, {
                traceparent: customTrace,
                'x-correlation-id': customCorr
            });
            expect(healthRes.status).toBe(200);
            expect(healthRes.body.status).toBe('ok');
            expect(healthRes.body.cor_level).toBeUndefined();
            expect(healthRes.headers['traceparent']).toBe(customTrace);
            expect(healthRes.headers['x-correlation-id']).toBe(customCorr);

            const liveRes = await requestJson(server, 'GET', '/health/live');
            expect(liveRes.status).toBe(200);
            expect(liveRes.body.status).toBe('alive');
            expect(liveRes.body.cor_level).toBeUndefined();
            expect(liveRes.headers['traceparent']).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

            const readyRes = await requestJson(server, 'GET', '/health/ready');
            expect(readyRes.status).toBe(200);
            expect(readyRes.body.status).toBe('ready');
            expect(readyRes.body.ready).toBe(true);
            expect(readyRes.body.cor_level).toBeUndefined();
            expect(readyRes.body.checks.adapters.length).toBeGreaterThanOrEqual(8);

            const metaRes = await requestJson(server, 'GET', '/v1/metadata');
            expect(metaRes.status).toBe(200);
            expect(metaRes.body.service).toBe('repository-adapter');
            expect(metaRes.body.cor_level).toBeUndefined();
            expect(metaRes.body.security.awsCodeCommitAuth).toBe('aws-iam-role-oidc-sigv4');
        });

        it('handles POST /v1/repository/resolve, /validate-credentials, /metadata, /refs, and /fetch', async () => {
            const blockedLookalike = await requestJson(server, 'POST', '/v1/repository/resolve', {
                repositoryUrl: 'https://evil.com/github.com/org/repo'
            });
            expect(blockedLookalike.status).toBe(400);
            expect(blockedLookalike.body.code).toBe('LOOKALIKE_URL_FORBIDDEN');

            const blockedSsrf = await requestJson(server, 'POST', '/v1/repository/resolve', {
                repositoryUrl: 'http://169.254.169.254/gitea/repo'
            });
            expect(blockedSsrf.status).toBe(400);
            expect(blockedSsrf.body.code).toBe('SSRF_BLOCKED');

            const validResolve = await requestJson(server, 'POST', '/v1/repository/resolve', {
                repositoryUrl: 'https://github.com/airroofers/ugondu'
            });
            expect(validResolve.status).toBe(200);
            expect(validResolve.body.metadata.provider).toBe('github');
            expect(validResolve.body.metadata.credentialEnvKey).toBe('UGONDU_GITHUB_TOKEN');

            const refsRes = await requestJson(server, 'POST', '/v1/repository/refs', {
                repositoryUrl: 'https://github.com/airroofers/ugondu'
            });
            expect(refsRes.status).toBe(200);
            expect(refsRes.body.refs.length).toBeGreaterThan(0);

            const fetchRes = await requestJson(server, 'POST', '/v1/repository/fetch', {
                repositoryUrl: 'https://github.com/airroofers/ugondu',
                branch: 'main'
            });
            expect(fetchRes.status).toBe(200);
            expect(fetchRes.body.artifact.providerId).toBe('github');
            expect(fetchRes.body.artifact.verified).toBe(true);
        });
    });
});
