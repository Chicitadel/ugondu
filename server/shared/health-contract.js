"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateReadinessChecks = evaluateReadinessChecks;
exports.createHealthAndMetadataRouter = createHealthAndMetadataRouter;
const { __t } = require('./i18n');
const DEFAULT_CHECK_TIMEOUT_MS = 2500;
function normalizeDependencyChecks(input, defaultTimeoutMs = DEFAULT_CHECK_TIMEOUT_MS) {
    if (!input)
        return [];
    if (Array.isArray(input)) {
        return input.map((item) => ({
            name: item.name,
            check: item.check,
            required: item.required !== false,
            timeoutMs: item.timeoutMs ?? defaultTimeoutMs
        }));
    }
    const entries = Object.entries(input);
    return entries.map(([name, check]) => ({
        name,
        check,
        required: true,
        timeoutMs: defaultTimeoutMs
    }));
}
async function runWithTimeout(fn, timeoutMs) {
    let timer;
    try {
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error(`Dependency check timed out after ${timeoutMs}ms`));
            }, timeoutMs);
            if (timer && typeof timer.unref === 'function') {
                timer.unref();
            }
        });
        return await Promise.race([Promise.resolve().then(fn), timeoutPromise]);
    }
    finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}
async function evaluateReadinessChecks(options) {
    const defaultTimeout = typeof options.timeoutMs === 'number' && options.timeoutMs > 0
        ? options.timeoutMs
        : DEFAULT_CHECK_TIMEOUT_MS;
    const checks = normalizeDependencyChecks(options.dependencies, defaultTimeout);
    const dependencies = {};
    let allRequiredReady = true;
    await Promise.all(checks.map(async (entry) => {
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
        }
        catch (err) {
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
    }));
    return {
        ready: allRequiredReady,
        dependencies
    };
}
function createHealthAndMetadataRouter(options) {
    if (!options || !options.service || typeof options.service !== 'string') {
        throw new Error(__t('err_health_service_name_required'));
    }
    const resolveVersion = () => options.version || process.env.SERVICE_VERSION || process.env.npm_package_version || '1.0.0';
    const resolveBuildSha = () => options.buildSha || process.env.BUILD_SHA || process.env.GIT_COMMIT_SHA || 'local-dev';
    const resolveSchemaVersion = () => options.schemaVersion || '1.0.0';
    const resolveCapabilities = async () => {
        if (!options.capabilities)
            return [];
        if (typeof options.capabilities === 'function') {
            const resolved = await options.capabilities();
            return Array.isArray(resolved) ? [...resolved] : [];
        }
        return Array.isArray(options.capabilities) ? [...options.capabilities] : [];
    };
    const handleLive = (_req, res) => {
        const payload = {
            status: 'alive',
            service: options.service,
            version: resolveVersion(),
            checkedAt: new Date().toISOString()
        };
        res.status(200).json(payload);
    };
    const handleReady = async (_req, res) => {
        const { ready, dependencies } = await evaluateReadinessChecks(options);
        const payload = {
            status: ready ? 'ready' : 'not_ready',
            service: options.service,
            version: resolveVersion(),
            buildSha: resolveBuildSha(),
            checkedAt: new Date().toISOString(),
            dependencies
        };
        res.status(ready ? 200 : 503).json(payload);
    };
    const handleHealth = async (_req, res) => {
        const { ready, dependencies } = await evaluateReadinessChecks(options);
        const payload = {
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
    const handleMetadata = async (_req, res) => {
        const capabilities = await resolveCapabilities();
        const payload = {
            service: options.service,
            version: resolveVersion(),
            buildSha: resolveBuildSha(),
            schemaVersion: resolveSchemaVersion(),
            capabilities
        };
        res.status(200).json(payload);
    };
    const middleware = (req, res, next) => {
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
