/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Repository Adapter / HTTP Service Entrypoint
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

import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { randomBytes, randomUUID } from 'crypto';
import { __t, NetworkDestinationPolicy, Logger } from '@ugondu/shared';
import {
    CredentialContext,
    parseAndValidateRepositoryUrl,
    RepositoryAuthMode,
    RepositoryRef,
    RepositoryUrlValidationError,
    RequestContext
} from './contracts';
import { RepositoryAdapterRegistry } from './adapters';

export * from './contracts';
export * from './adapters';

interface TraceRequest extends Request {
    correlationId?: string;
    traceparent?: string;
}

const W3C_TRACEPARENT_RE = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i;

function resolveTraceparent(incoming?: string): string {
    if (incoming && W3C_TRACEPARENT_RE.test(incoming.trim())) {
        return incoming.trim().toLowerCase();
    }
    const traceId = randomBytes(16).toString('hex');
    const spanId = randomBytes(8).toString('hex');
    return `00-${traceId}-${spanId}-01`;
}

function resolveCorrelationId(incoming?: string, traceparent?: string): string {
    if (incoming && incoming.trim().length > 0 && /^[a-zA-Z0-9._:-]{1,128}$/.test(incoming.trim())) {
        return incoming.trim();
    }
    if (traceparent && W3C_TRACEPARENT_RE.test(traceparent)) {
        return traceparent.split('-')[1];
    }
    return randomUUID();
}

function loadAllowedCorsOrigins(): string[] {
    const origins = new Set<string>();

    const envOrigins = process.env['CORS_ALLOWED_ORIGINS'];
    if (envOrigins) {
        for (const item of envOrigins.split(',')) {
            const trimmed = item.trim();
            if (trimmed) origins.add(trimmed);
        }
    }

    const candidatePaths = [
        path.resolve(process.cwd(), '.governance/standards/product-registry.json'),
        path.resolve(__dirname, '../../../.governance/standards/product-registry.json'),
        path.resolve(__dirname, '../../../../.governance/standards/product-registry.json')
    ];

    for (const registryPath of candidatePaths) {
        try {
            if (fs.existsSync(registryPath)) {
                const parsed = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
                const products = Array.isArray(parsed.products) ? parsed.products : [];
                const ugondu = products.find(
                    (p: Record<string, unknown>) => p['productId'] === 'UGONDU' || p['id'] === 'ugondu'
                );
                const regOrigins = (ugondu?.cors as Record<string, unknown> | undefined)?.['allowedOrigins'];
                if (Array.isArray(regOrigins)) {
                    for (const origin of regOrigins) {
                        if (typeof origin === 'string' && origin.trim()) {
                            origins.add(origin.trim());
                        }
                    }
                }
                break;
            }
        } catch {
            // Continue searching candidate registry paths
        }
    }

    return Array.from(origins);
}

function buildRequestContext(req: TraceRequest, body: Record<string, unknown>): RequestContext {
    const authMode = body['authMode'] as RepositoryAuthMode | undefined;
    const rawCreds = (body['credentials'] as Record<string, unknown> | undefined) ?? body;

    const credentials: CredentialContext = {
        providerId: typeof rawCreds['providerId'] === 'string' ? rawCreds['providerId'] : undefined,
        authMode: (rawCreds['authMode'] as RepositoryAuthMode | undefined) ?? authMode,
        token: typeof rawCreds['token'] === 'string' ? rawCreds['token'] : undefined,
        sshPrivateKeyPath:
            typeof rawCreds['sshPrivateKeyPath'] === 'string' ? rawCreds['sshPrivateKeyPath'] : undefined,
        awsRoleArn: typeof rawCreds['awsRoleArn'] === 'string' ? rawCreds['awsRoleArn'] : undefined,
        awsWebIdentityTokenFile:
            typeof rawCreds['awsWebIdentityTokenFile'] === 'string'
                ? rawCreds['awsWebIdentityTokenFile']
                : undefined,
        awsRegion: typeof rawCreds['awsRegion'] === 'string' ? rawCreds['awsRegion'] : undefined,
        awsAccessKeyId:
            typeof rawCreds['awsAccessKeyId'] === 'string' ? rawCreds['awsAccessKeyId'] : undefined,
        awsSecretAccessKey:
            typeof rawCreds['awsSecretAccessKey'] === 'string'
                ? rawCreds['awsSecretAccessKey']
                : undefined,
        awsSessionToken:
            typeof rawCreds['awsSessionToken'] === 'string' ? rawCreds['awsSessionToken'] : undefined
    };

    return {
        correlationId: req.correlationId,
        traceparent: req.traceparent,
        tenantId: typeof req.headers['x-tenant-id'] === 'string' ? req.headers['x-tenant-id'] : undefined,
        authMode,
        credentials
    };
}

export function createRepositoryAdapterApp(
    registry: RepositoryAdapterRegistry = new RepositoryAdapterRegistry()
): express.Express {
    const app = express();
    const allowedOrigins = loadAllowedCorsOrigins();

    app.use((req: TraceRequest, res: Response, next: NextFunction) => {
        const incomingTrace =
            typeof req.headers['traceparent'] === 'string' ? req.headers['traceparent'] : undefined;
        const incomingCorr =
            typeof req.headers['x-correlation-id'] === 'string'
                ? req.headers['x-correlation-id']
                : typeof req.headers['x-request-id'] === 'string'
                  ? req.headers['x-request-id']
                  : undefined;

        const traceparent = resolveTraceparent(incomingTrace);
        const correlationId = resolveCorrelationId(incomingCorr, traceparent);

        req.traceparent = traceparent;
        req.correlationId = correlationId;

        res.setHeader('traceparent', traceparent);
        res.setHeader('x-correlation-id', correlationId);
        next();
    });

    app.use(
        cors({
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);
                if (allowedOrigins.includes(origin)) return callback(null, true);
                return callback(new Error(__t('messages.error.cors_policy_violation')), false);
            },
            credentials: true
        })
    );

    app.use(express.json({ limit: '1mb' }));

    app.get('/health', (req: TraceRequest, res: Response) => {
        res.status(200).json({
            status: 'ok',
            service: 'repository-adapter',
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId
        });
    });

    app.get('/health/live', (req: TraceRequest, res: Response) => {
        res.status(200).json({
            status: 'alive',
            service: 'repository-adapter',
            version: '2.0.0',
            uptimeSeconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId
        });
    });

    app.get('/health/ready', async (req: TraceRequest, res: Response) => {
        try {
            const adapterChecks = await registry.checkAllHealth();
            const ssrfEnforced =
                NetworkDestinationPolicy.isDisallowedIP('169.254.169.254') &&
                NetworkDestinationPolicy.isDisallowedIP('127.0.0.1');
            const allHealthy = ssrfEnforced && adapterChecks.every((c) => c.status === 'healthy');

            res.status(allHealthy ? 200 : 503).json({
                status: allHealthy ? 'ready' : 'not_ready',
                service: 'repository-adapter',
                version: '2.0.0',
                ready: allHealthy,
                checks: {
                    ssrfPolicy: ssrfEnforced ? 'operational' : 'degraded',
                    adapters: adapterChecks
                },
                timestamp: new Date().toISOString(),
                correlationId: req.correlationId
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            res.status(503).json({
                status: 'not_ready',
                service: 'repository-adapter',
                ready: false,
                error: msg,
                correlationId: req.correlationId
            });
        }
    });

    app.get('/v1/metadata', (req: TraceRequest, res: Response) => {
        res.status(200).json({
            service: 'repository-adapter',
            serviceId: 'repository_adapter',
            displayName: 'Ugondu Repository Adapter',
            version: '2.0.0',
            apiVersion: 'v1',
            port: Number(process.env['PORT'] || 4005),
            endpoints: {
                liveness: '/health/live',
                readiness: '/health/ready',
                health: '/health',
                metadata: '/v1/metadata',
                resolve: '/v1/repository/resolve',
                providers: '/v1/repository/providers',
                validateCredentials: '/v1/repository/validate-credentials',
                repositoryMetadata: '/v1/repository/metadata',
                refs: '/v1/repository/refs',
                fetch: '/v1/repository/fetch'
            },
            providers: registry.listProviderSummaries(),
            security: {
                ssrfProtection: 'NetworkDestinationPolicy',
                strictUrlParsing: true,
                awsCodeCommitAuth: 'aws-iam-role-oidc-sigv4'
            },
            timestamp: new Date().toISOString(),
            correlationId: req.correlationId
        });
    });

    app.post('/v1/repository/resolve', (req: TraceRequest, res: Response): void => {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const repositoryUrl = body['repositoryUrl'];
        const authMode = body['authMode'] as RepositoryAuthMode | undefined;

        if (!repositoryUrl || typeof repositoryUrl !== 'string') {
            res.status(400).json({
                error: __t('missing_repo'),
                code: 'MISSING_REPOSITORY_URL',
                correlationId: req.correlationId
            });
            return;
        }

        try {
            const parsedUrl = parseAndValidateRepositoryUrl(repositoryUrl, authMode);
            const adapter = registry.resolveAdapter(parsedUrl);
            const normalized = adapter.normalize(parsedUrl);

            const metadata = {
                provider: normalized.legacyProvider,
                providerId: normalized.providerId,
                normalizedUrl: normalized.normalizedUrl,
                cloneUrl: normalized.cloneUrl,
                httpsCloneUrl: normalized.httpsCloneUrl,
                sshCloneUrl: normalized.sshCloneUrl,
                apiUrl: normalized.apiUrl,
                credentialEnvKey: normalized.credentialEnvKey,
                authMode: normalized.authMode,
                protocol: normalized.protocol,
                host: normalized.host,
                owner: normalized.owner,
                repository: normalized.repository,
                fullName: normalized.fullName,
                verifiedSshHttpsMapping: normalized.verifiedSshHttpsMapping,
                capabilities: { ...adapter.capabilities },
                ...(normalized.credentialContract ? { credentialContract: normalized.credentialContract } : {}),
                ...(normalized.region ? { region: normalized.region } : {})
            };

            Logger.info(__t('repo_resolved', repositoryUrl, normalized.legacyProvider.toUpperCase()), {
                correlationId: req.correlationId,
                providerId: normalized.providerId
            });

            res.status(200).json({
                metadata,
                message: __t('repo_detected', normalized.legacyProvider.toUpperCase(), normalized.credentialEnvKey),
                correlationId: req.correlationId
            });
        } catch (err: unknown) {
            if (err instanceof RepositoryUrlValidationError) {
                Logger.warn(err.message, { code: err.code, correlationId: req.correlationId });
                res.status(err.statusCode).json({
                    error: err.message,
                    code: err.code,
                    correlationId: req.correlationId
                });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            res.status(400).json({
                error: msg,
                code: 'INVALID_REPOSITORY_URL',
                correlationId: req.correlationId
            });
        }
    });

    app.get('/v1/repository/providers', (req: TraceRequest, res: Response): void => {
        const supported = registry.listProviderIds();
        res.status(200).json({
            providers: supported,
            adapters: registry.listProviderSummaries(),
            count: supported.length,
            message: __t('repo_all_providers'),
            correlationId: req.correlationId
        });
    });

    app.post('/v1/repository/validate-credentials', async (req: TraceRequest, res: Response): Promise<void> => {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const repositoryUrl = typeof body['repositoryUrl'] === 'string' ? body['repositoryUrl'] : undefined;
        const providerId = typeof body['providerId'] === 'string' ? body['providerId'] : undefined;
        const context = buildRequestContext(req, body);

        try {
            const adapter = repositoryUrl
                ? registry.resolveAdapter(parseAndValidateRepositoryUrl(repositoryUrl, context.authMode))
                : providerId
                  ? registry.getAdapterById(providerId)
                  : undefined;

            if (!adapter) {
                res.status(400).json({
                    error: 'A valid repositoryUrl or providerId is required to validate credentials.',
                    code: 'INVALID_PROVIDER',
                    correlationId: req.correlationId
                });
                return;
            }

            const validation = await adapter.validateCredentials(context.credentials ?? {});
            res.status(validation.valid ? 200 : 400).json({
                valid: validation.valid,
                validation,
                ...(validation.valid ? {} : { error: validation.reason, code: validation.code }),
                correlationId: req.correlationId
            });
        } catch (err: unknown) {
            if (err instanceof RepositoryUrlValidationError) {
                res.status(err.statusCode).json({
                    valid: false,
                    error: err.message,
                    code: err.code,
                    correlationId: req.correlationId
                });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            res.status(400).json({
                valid: false,
                error: msg,
                code: 'CREDENTIAL_VALIDATION_FAILED',
                correlationId: req.correlationId
            });
        }
    });

    app.post('/v1/repository/metadata', async (req: TraceRequest, res: Response): Promise<void> => {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const repositoryUrl = body['repositoryUrl'];

        if (!repositoryUrl || typeof repositoryUrl !== 'string') {
            res.status(400).json({
                error: __t('missing_repo'),
                code: 'MISSING_REPOSITORY_URL',
                correlationId: req.correlationId
            });
            return;
        }

        try {
            const context = buildRequestContext(req, body);
            const parsedUrl = parseAndValidateRepositoryUrl(repositoryUrl, context.authMode);
            const adapter = registry.resolveAdapter(parsedUrl);
            const normalized = adapter.normalize(parsedUrl);
            const metadata = await adapter.getMetadata(normalized, context);

            res.status(200).json({
                metadata,
                correlationId: req.correlationId
            });
        } catch (err: unknown) {
            if (err instanceof RepositoryUrlValidationError) {
                res.status(err.statusCode).json({
                    error: err.message,
                    code: err.code,
                    correlationId: req.correlationId
                });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            res.status(400).json({
                error: msg,
                code: 'METADATA_RESOLUTION_FAILED',
                correlationId: req.correlationId
            });
        }
    });

    app.post('/v1/repository/refs', async (req: TraceRequest, res: Response): Promise<void> => {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const repositoryUrl = body['repositoryUrl'];

        if (!repositoryUrl || typeof repositoryUrl !== 'string') {
            res.status(400).json({
                error: __t('missing_repo'),
                code: 'MISSING_REPOSITORY_URL',
                correlationId: req.correlationId
            });
            return;
        }

        try {
            const context = buildRequestContext(req, body);
            const parsedUrl = parseAndValidateRepositoryUrl(repositoryUrl, context.authMode);
            const adapter = registry.resolveAdapter(parsedUrl);
            const normalized = adapter.normalize(parsedUrl);
            const refs = await adapter.listRefs(normalized, context);

            res.status(200).json({
                refs,
                count: refs.length,
                repository: normalized,
                correlationId: req.correlationId
            });
        } catch (err: unknown) {
            if (err instanceof RepositoryUrlValidationError) {
                res.status(err.statusCode).json({
                    error: err.message,
                    code: err.code,
                    correlationId: req.correlationId
                });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            res.status(400).json({
                error: msg,
                code: 'REFS_LISTING_FAILED',
                correlationId: req.correlationId
            });
        }
    });

    app.post('/v1/repository/fetch', async (req: TraceRequest, res: Response): Promise<void> => {
        const body = (req.body ?? {}) as Record<string, unknown>;
        const repositoryUrl = body['repositoryUrl'];

        if (!repositoryUrl || typeof repositoryUrl !== 'string') {
            res.status(400).json({
                error: __t('missing_repo'),
                code: 'MISSING_REPOSITORY_URL',
                correlationId: req.correlationId
            });
            return;
        }

        try {
            const context = buildRequestContext(req, body);
            const parsedUrl = parseAndValidateRepositoryUrl(repositoryUrl, context.authMode);
            const adapter = registry.resolveAdapter(parsedUrl);
            const normalized = adapter.normalize(parsedUrl);

            const rawRef = body['ref'] as Partial<RepositoryRef> | string | undefined;
            const branchName = typeof body['branch'] === 'string' ? body['branch'] : 'main';
            const targetRef: RepositoryRef =
                typeof rawRef === 'object' && rawRef !== null && typeof rawRef.name === 'string'
                    ? {
                          name: rawRef.name,
                          ref: rawRef.ref ?? `refs/heads/${rawRef.name}`,
                          type: rawRef.type ?? 'branch',
                          sha: rawRef.sha ?? ''
                      }
                    : {
                          name: typeof rawRef === 'string' ? rawRef : branchName,
                          ref: `refs/heads/${typeof rawRef === 'string' ? rawRef : branchName}`,
                          type: 'branch',
                          sha: typeof body['sha'] === 'string' ? body['sha'] : ''
                      };

            const artifact = await adapter.fetchSource(normalized, targetRef, context);
            res.status(200).json({
                artifact,
                correlationId: req.correlationId
            });
        } catch (err: unknown) {
            if (err instanceof RepositoryUrlValidationError) {
                res.status(err.statusCode).json({
                    error: err.message,
                    code: err.code,
                    correlationId: req.correlationId
                });
                return;
            }
            const msg = err instanceof Error ? err.message : String(err);
            res.status(400).json({
                error: msg,
                code: 'SOURCE_FETCH_FAILED',
                correlationId: req.correlationId
            });
        }
    });

    return app;
}

export const defaultRegistry = new RepositoryAdapterRegistry();
export const app = createRepositoryAdapterApp(defaultRegistry);

if (require.main === module) {
    const PORT = process.env['PORT'] || 4005;
    app.listen(Number(PORT), '0.0.0.0', () => {
        Logger.info(__t('listening_port', __t('repository_adapter'), PORT));
        Logger.info(__t('repo_supported'));
    });
}
