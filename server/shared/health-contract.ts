/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Canonical Health & Metadata Contract
 * File           : health-contract.ts
 * Version        : 4.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : GOVERNMENT | ENTERPRISE | INTERNAL
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
 * - SOC 2 Type II
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

export interface DependencyCheckOutcome {
    healthy: boolean;
    status?: 'ready' | 'not_ready' | 'degraded';
    latencyMs?: number;
    detail?: string;
}

export type DependencyCheckResult = boolean | DependencyCheckOutcome;

export type DependencyCheckFn = () => Promise<DependencyCheckResult> | DependencyCheckResult;

export interface NamedDependencyCheck {
    name: string;
    check: DependencyCheckFn;
    required?: boolean;
    timeoutMs?: number;
}

export type DependencyChecksInput =
    | Record<string, DependencyCheckFn>
    | ReadonlyArray<NamedDependencyCheck>;

export interface HealthAndMetadataOptions {
    service: string;
    version?: string;
    buildSha?: string;
    schemaVersion?: string;
    capabilities?: ReadonlyArray<string> | (() => ReadonlyArray<string> | Promise<ReadonlyArray<string>>);
    dependencies?: DependencyChecksInput;
    timeoutMs?: number;
}

export interface EvaluatedDependencyStatus {
    name: string;
    status: 'ready' | 'not_ready';
    required: boolean;
    latencyMs: number;
    detail?: string;
}

export interface LivenessPayload {
    status: 'alive';
    service: string;
    version: string;
    checkedAt: string;
}

export interface ReadinessPayload {
    status: 'ready' | 'not_ready';
    service: string;
    version: string;
    buildSha: string;
    checkedAt: string;
    dependencies: Record<string, EvaluatedDependencyStatus>;
}

export interface HealthSummaryPayload {
    status: 'ok' | 'ready' | 'not_ready';
    readiness: 'ready' | 'not_ready';
    service: string;
    version: string;
    buildSha: string;
    checkedAt: string;
    dependencies: Record<string, EvaluatedDependencyStatus>;
}

export interface ServiceMetadataPayload {
    service: string;
    version: string;
    buildSha: string;
    schemaVersion: string;
    capabilities: string[];
}

const DEFAULT_CHECK_TIMEOUT_MS = 2500;

function normalizeDependencyChecks(input?: DependencyChecksInput, defaultTimeoutMs: number = DEFAULT_CHECK_TIMEOUT_MS): NamedDependencyCheck[] {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input.map((item) => ({
            name: item.name,
            check: item.check,
            required: item.required !== false,
            timeoutMs: item.timeoutMs ?? defaultTimeoutMs
        }));
    }
    const entries = Object.entries(input as Record<string, DependencyCheckFn>);
    return entries.map(([name, check]) => ({
        name,
        check,
        required: true,
        timeoutMs: defaultTimeoutMs
    }));
}

async function runWithTimeout<T>(fn: () => Promise<T> | T, timeoutMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error(`Dependency check timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            if (timer && typeof (timer as any).unref === 'function') {
                (timer as any).unref();
            }
        });
        return await Promise.race([Promise.resolve().then(fn), timeoutPromise]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

export async function evaluateReadinessChecks(
    options: HealthAndMetadataOptions
): Promise<{ ready: boolean; dependencies: Record<string, EvaluatedDependencyStatus> }> {
    const defaultTimeout =
        typeof options.timeoutMs === 'number' && options.timeoutMs > 0
            ? options.timeoutMs
            : DEFAULT_CHECK_TIMEOUT_MS;
    const checks = normalizeDependencyChecks(options.dependencies, defaultTimeout);
    const dependencies: Record<string, EvaluatedDependencyStatus> = {};
    let allRequiredReady = true;

    await Promise.all(
        checks.map(async (entry) => {
            const started = Date.now();
            try {
                const rawResult = await runWithTimeout(entry.check, entry.timeoutMs ?? defaultTimeout);
                const latencyMs = Math.max(0, Date.now() - started);
                const healthy = typeof rawResult === 'boolean' ? rawResult : Boolean(rawResult?.healthy);
                const detail = typeof rawResult === 'object' && rawResult !== null ? rawResult.detail : undefined;

                dependencies[entry.name] = {
                    name: entry.name,
                    status: healthy ? 'ready' : 'not_ready',
                    required: entry.required !== false,
                    latencyMs,
                    ...(detail ? { detail } : {})
                };

                if (!healthy && entry.required !== false) {
                    allRequiredReady = false;
                }
            } catch (err: unknown) {
                const latencyMs = Math.max(0, Date.now() - started);
                const message = err instanceof Error ? err.message : String(err);
                dependencies[entry.name] = {
                    name: entry.name,
                    status: 'not_ready',
                    required: entry.required !== false,
                    latencyMs,
                    detail: message
                };
                if (entry.required !== false) {
                    allRequiredReady = false;
                }
            }
        })
    );

    return {
        ready: allRequiredReady,
        dependencies
    };
}

export function createHealthAndMetadataRouter(options: HealthAndMetadataOptions): any {
    if (!options || !options.service || typeof options.service !== 'string') {
        throw new Error('createHealthAndMetadataRouter requires a non-empty service name.');
    }

    const resolveVersion = (): string =>
        options.version || process.env.SERVICE_VERSION || process.env.npm_package_version || '1.0.0';

    const resolveBuildSha = (): string =>
        options.buildSha || process.env.BUILD_SHA || process.env.GIT_COMMIT_SHA || 'local-dev';

    const resolveSchemaVersion = (): string => options.schemaVersion || '1.0.0';

    const resolveCapabilities = async (): Promise<string[]> => {
        if (!options.capabilities) return [];
        if (typeof options.capabilities === 'function') {
            const resolved = await options.capabilities();
            return Array.isArray(resolved) ? [...resolved] : [];
        }
        return Array.isArray(options.capabilities) ? [...options.capabilities] : [];
    };

    const handleLive = (_req: any, res: any): void => {
        const payload: LivenessPayload = {
            status: 'alive',
            service: options.service,
            version: resolveVersion(),
            checkedAt: new Date().toISOString()
        };
        res.status(200).json(payload);
    };

    const handleReady = async (_req: any, res: any): Promise<void> => {
        const { ready, dependencies } = await evaluateReadinessChecks(options);
        const payload: ReadinessPayload = {
            status: ready ? 'ready' : 'not_ready',
            service: options.service,
            version: resolveVersion(),
            buildSha: resolveBuildSha(),
            checkedAt: new Date().toISOString(),
            dependencies
        };
        res.status(ready ? 200 : 503).json(payload);
    };

    const handleHealth = async (_req: any, res: any): Promise<void> => {
        const { ready, dependencies } = await evaluateReadinessChecks(options);
        const payload: HealthSummaryPayload = {
            status: ready ? 'ok' : 'not_ready',
            readiness: ready ? 'ready' : 'not_ready',
            service: options.service,
            version: resolveVersion(),
            buildSha: resolveBuildSha(),
            checkedAt: new Date().toISOString(),
            dependencies
        };
        res.status(ready ? 200 : 503).json(payload);
    };

    const handleMetadata = async (_req: any, res: any): Promise<void> => {
        const capabilities = await resolveCapabilities();
        const payload: ServiceMetadataPayload = {
            service: options.service,
            version: resolveVersion(),
            buildSha: resolveBuildSha(),
            schemaVersion: resolveSchemaVersion(),
            capabilities
        };
        res.status(200).json(payload);
    };

    const middleware = (req: any, res: any, next: any): any => {
        const method = String(req?.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            return typeof next === 'function' ? next() : undefined;
        }

        const rawPath = String(req?.path || req?.url || '').split('?')[0].replace(/\/+$/, '') || '/';

        if (rawPath === '/health/live') {
            return handleLive(req, res);
        }
        if (rawPath === '/health/ready') {
            return handleReady(req, res).catch((err) => (typeof next === 'function' ? next(err) : undefined));
        }
        if (rawPath === '/health') {
            return handleHealth(req, res).catch((err) => (typeof next === 'function' ? next(err) : undefined));
        }
        if (rawPath === '/v1/metadata') {
            return handleMetadata(req, res).catch((err) => (typeof next === 'function' ? next(err) : undefined));
        }

        return typeof next === 'function' ? next() : undefined;
    };

    middleware.handleLive = handleLive;
    middleware.handleReady = handleReady;
    middleware.handleHealth = handleHealth;
    middleware.handleMetadata = handleMetadata;

    return middleware;
}
