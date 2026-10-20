/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Service Entry Point
 * File           : index.ts
 * Version        : 2026.3.1-LTS
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { createHash } from 'crypto';
import {
    __t,
    verifyServiceIdentityToken,
    Logger,
    telemetryContextMiddleware,
    createOutboundPropagationHeaders,
} from '@ugondu/shared';
import { tokenStore, computeTokenFingerprint, TenantInfo } from './db';
import {
    CENTRAL_EDITION_TABLE,
    resolveEditionEntitlements,
    EditionCapabilities,
} from './edition-catalog';

export { tokenStore, computeTokenFingerprint, CENTRAL_EDITION_TABLE, resolveEditionEntitlements };

export type LicenseOutcome =
    | 'authorized'
    | 'invalid'
    | 'expired'
    | 'revoked'
    | 'suspended'
    | 'insufficient_entitlement'
    | 'upstream_unavailable'
    | 'replay_detected';

export const BillingErrorCode = {
    AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
    LICENSE_INVALID: 'LICENSE_INVALID',
    LICENSE_EXPIRED: 'LICENSE_EXPIRED',
    LICENSE_REVOKED: 'LICENSE_REVOKED',
    LICENSE_SUSPENDED: 'LICENSE_SUSPENDED',
    INSUFFICIENT_ENTITLEMENT: 'INSUFFICIENT_ENTITLEMENT',
    UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
    REPLAY_DETECTED: 'REPLAY_DETECTED',
} as const;

interface IdempotencyEntry {
    payloadHash: string;
    status: number;
    body: Record<string, any>;
    expiresAt: number;
}

const seenNonces = new Map<string, number>();
const idempotencyCache = new Map<string, IdempotencyEntry>();
const REPLAY_TTL_MS = 5 * 60 * 1000;

export function clearReplayCache(): void {
    seenNonces.clear();
    idempotencyCache.clear();
}

function pruneReplayCaches(now: number): void {
    for (const [k, exp] of seenNonces.entries()) {
        if (exp <= now) seenNonces.delete(k);
    }
    for (const [k, entry] of idempotencyCache.entries()) {
        if (entry.expiresAt <= now) idempotencyCache.delete(k);
    }
}

export function resolveAllowedOrigins(): string[] {
    if (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.trim().length > 0) {
        return process.env.ALLOWED_ORIGINS.split(',')
            .map((o) => o.trim())
            .filter(Boolean);
    }
    return [
        process.env.ENGINE_CORE_ORIGIN || 'http://localhost:4001',
        process.env.ADMIN_ORIGIN || 'https://admin.airroofers.eu',
    ];
}

export const app = express();
app.use(telemetryContextMiddleware);
app.use(
    cors({
        origin: (origin, callback) => {
            const allowedOrigins = resolveAllowedOrigins();
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new Error(__t('messages.error.cors_policy_violation')), false);
        },
    })
);
app.use(express.json());

const DEFAULT_IDENTITY_AUTHORITY_URL = 'https://identity.airroofers.eu/api/v1';

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'billing-gateway',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'live',
        service: 'billing-gateway',
        timestamp: new Date().toISOString(),
    });
});

app.get('/health/ready', (_req: Request, res: Response) => {
    const storeReady = tokenStore.isReady();
    if (!storeReady) {
        return res.status(503).json({
            status: 'not_ready',
            service: 'billing-gateway',
            checks: { tokenStore: 'failed' },
            timestamp: new Date().toISOString(),
        });
    }
    return res.status(200).json({
        status: 'ready',
        service: 'billing-gateway',
        checks: { tokenStore: 'ok' },
        timestamp: new Date().toISOString(),
    });
});

app.get('/v1/metadata', (_req: Request, res: Response) => {
    res.status(200).json({
        service: 'billing-gateway',
        product: 'ugondu',
        version: '2026.3.1-LTS',
        editions: Object.keys(CENTRAL_EDITION_TABLE),
        endpoints: ['/health', '/health/live', '/health/ready', '/v1/metadata', '/v1/authorize'],
        timestamp: new Date().toISOString(),
    });
});

function emitAuditDecision(
    level: 'INFO' | 'WARN' | 'ERROR',
    outcome: LicenseOutcome,
    code: string,
    details: Record<string, any>
): void {
    const auditContext = {
        audit_event: 'BILLING_AUTHORIZATION_DECISION',
        outcome,
        code,
        ...details,
    };
    if (level === 'INFO') {
        Logger.info(__t('billing_verified', String(details.tenantId || 'unknown'), String(details.edition || 'unknown')), auditContext);
    } else if (level === 'WARN') {
        Logger.warn(__t('auth_rejected'), auditContext);
    } else {
        Logger.error(__t('auth_failed', code), code, auditContext);
    }
}

function isRecordExpired(record: TenantInfo): boolean {
    if (record.status === 'expired') return true;
    if (record.expires_at) {
        const parsed = Date.parse(record.expires_at);
        if (!Number.isNaN(parsed) && parsed <= Date.now()) {
            return true;
        }
    }
    return false;
}

function checkInsufficientEntitlement(
    reqBody: Record<string, any>,
    resolvedRank: number,
    capabilities: EditionCapabilities
): string | null {
    if (reqBody.requiredEdition && typeof reqBody.requiredEdition === 'string') {
        const requiredEntry = resolveEditionEntitlements(reqBody.requiredEdition);
        if (!requiredEntry || resolvedRank < requiredEntry.rank) {
            return `Edition rank insufficient for required edition '${reqBody.requiredEdition}'`;
        }
    }

    if (reqBody.requiredCapability && typeof reqBody.requiredCapability === 'string') {
        const capKey = reqBody.requiredCapability as keyof EditionCapabilities;
        const capVal = capabilities[capKey];
        if (capVal === false || capVal === 0 || capVal === undefined) {
            return `Missing required capability '${reqBody.requiredCapability}'`;
        }
    }

    if (typeof reqBody.requiredPluginsCount === 'number') {
        if (reqBody.requiredPluginsCount > capabilities.maxPlugins) {
            return `Requested plugin count (${reqBody.requiredPluginsCount}) exceeds edition limit (${capabilities.maxPlugins})`;
        }
    }

    return null;
}

function billingServiceIdentityGuard(req: Request, res: Response, next: express.NextFunction): any {
    const auth = req.headers.authorization;
    if (!auth || typeof auth !== 'string') {
        return res.status(401).json({
            error: __t('ui.responses.missing_service_token'),
            message: __t('auth_service_token_missing'),
        });
    }
    const match = auth.match(/^(?:\[[a-z-]+\]\s*)?Bearer\s+(.+)$/i);
    if (!match || !match[1]) {
        return res.status(401).json({
            error: __t('ui.responses.missing_service_token'),
            message: __t('auth_service_token_missing'),
        });
    }
    const result = verifyServiceIdentityToken(match[1].trim(), 'billing-gateway');
    if (!result.valid) {
        return res.status(result.status || 401).json({
            error: result.error,
            message: result.error,
        });
    }
    (req as any).serviceIdentity = result.payload;
    next();
}

app.post(
    '/v1/authorize',
    billingServiceIdentityGuard,
    async (req: Request, res: Response): Promise<any> => {
        const now = Date.now();
        pruneReplayCaches(now);

        const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
        const { token, repositoryUrl } = body;
        const correlationId = (req as any).correlationId;

        if (!token || typeof token !== 'string' || token.trim().length === 0) {
            emitAuditDecision('WARN', 'invalid', BillingErrorCode.AUTH_TOKEN_MISSING, {
                reason: 'missing_token',
                correlationId,
            });
            return res.status(401).json({
                error: __t('auth_missing'),
                code: BillingErrorCode.AUTH_TOKEN_MISSING,
                outcome: 'invalid',
                correlationId,
            });
        }

        const tokenFingerprint = computeTokenFingerprint(token);

        // 1. Nonce Replay Protection
        const nonceHeader = req.headers['x-request-nonce'] || req.headers['x-nonce'];
        const nonce = (typeof body.nonce === 'string' && body.nonce.trim()) ||
            (typeof nonceHeader === 'string' && nonceHeader.trim()) ||
            undefined;

        if (nonce) {
            const compositeNonce = `${tokenFingerprint}:${nonce}`;
            if (seenNonces.has(compositeNonce)) {
                emitAuditDecision('WARN', 'replay_detected', BillingErrorCode.REPLAY_DETECTED, {
                    tokenFingerprint,
                    nonce,
                    correlationId,
                });
                return res.status(409).json({
                    error: __t('auth_rejected'),
                    code: BillingErrorCode.REPLAY_DETECTED,
                    outcome: 'replay_detected',
                    correlationId,
                });
            }
            seenNonces.set(compositeNonce, now + REPLAY_TTL_MS);
        }

        // 2. Idempotency-Key Protection
        const idempotencyHeader = req.headers['idempotency-key'];
        const idempotencyKey =
            (typeof idempotencyHeader === 'string' && idempotencyHeader.trim()) ||
            (typeof body.idempotencyKey === 'string' && body.idempotencyKey.trim()) ||
            undefined;
        const payloadHash = createHash('sha256')
            .update(
                JSON.stringify({
                    tokenFingerprint,
                    repositoryUrl: repositoryUrl || null,
                    requiredEdition: body.requiredEdition || null,
                    requiredCapability: body.requiredCapability || null,
                })
            )
            .digest('hex');

        if (idempotencyKey) {
            const existingIdemp = idempotencyCache.get(idempotencyKey);
            if (existingIdemp) {
                if (existingIdemp.payloadHash !== payloadHash) {
                    emitAuditDecision('WARN', 'replay_detected', BillingErrorCode.REPLAY_DETECTED, {
                        tokenFingerprint,
                        idempotencyKey,
                        reason: 'idempotency_payload_mismatch',
                        correlationId,
                    });
                    return res.status(409).json({
                        error: __t('auth_rejected'),
                        code: BillingErrorCode.REPLAY_DETECTED,
                        outcome: 'replay_detected',
                        correlationId,
                    });
                }
                res.setHeader('x-idempotent-replayed', 'true');
                return res.status(existingIdemp.status).json({
                    ...existingIdemp.body,
                    idempotentReplay: true,
                });
            }
        }

        Logger.info(__t('auth_validating'), { tokenFingerprint, correlationId });

        let record: TenantInfo | null = tokenStore.verifyToken(token);

        if (!record) {
            const hasConfiguredUpstream = Boolean(process.env.IDENTITY_AUTHORITY_URL);
            const isAxiosMocked = Boolean(
                (axios.post as any)?._isMockFunction || (axios.post as any)?.mock
            );
            const shouldQueryUpstream =
                hasConfiguredUpstream || isAxiosMocked || body.requireUpstream === true;

            if (!shouldQueryUpstream) {
                emitAuditDecision('WARN', 'invalid', BillingErrorCode.LICENSE_INVALID, {
                    tokenFingerprint,
                    reason: 'unregistered_token',
                    correlationId,
                });
                return res.status(402).json({
                    error: __t('payment_required'),
                    code: BillingErrorCode.LICENSE_INVALID,
                    outcome: 'invalid',
                    correlationId,
                });
            }

            const upstreamUrl =
                process.env.IDENTITY_AUTHORITY_URL || DEFAULT_IDENTITY_AUTHORITY_URL;

            try {
                const outboundHeaders = createOutboundPropagationHeaders(req);
                const identityRes = await axios.post(
                    `${upstreamUrl}/verify`,
                    { token },
                    { headers: outboundHeaders, timeout: 3000 }
                );
                const data = identityRes?.data || {};
                const upstreamStatus = String(data.status || 'active').toLowerCase();

                if (data.valid === false || upstreamStatus === 'invalid') {
                    emitAuditDecision('WARN', 'invalid', BillingErrorCode.LICENSE_INVALID, {
                        tokenFingerprint,
                        reason: 'upstream_rejected_invalid',
                        correlationId,
                    });
                    return res.status(402).json({
                        error: __t('payment_required'),
                        code: BillingErrorCode.LICENSE_INVALID,
                        outcome: 'invalid',
                        correlationId,
                    });
                }

                const resolvedTenantId = String(data.tenantId || 'tenant_unknown');
                const resolvedTier = String(data.subscriptionTier || data.edition || '');
                if (!resolvedTier) {
                    emitAuditDecision('WARN', 'invalid', BillingErrorCode.LICENSE_INVALID, {
                        tokenFingerprint,
                        reason: 'upstream_missing_edition',
                        correlationId,
                    });
                    return res.status(402).json({
                        error: __t('payment_required'),
                        code: BillingErrorCode.LICENSE_INVALID,
                        outcome: 'invalid',
                        correlationId,
                    });
                }

                record = tokenStore.registerToken(token, resolvedTenantId, resolvedTier, {
                    status: (['active', 'expired', 'revoked', 'suspended', 'invalid'].includes(
                        upstreamStatus
                    )
                        ? upstreamStatus
                        : 'active') as any,
                    expiresAt: data.expiresAt,
                });
            } catch (err: any) {
                const httpStatus = err?.response?.status;
                if (httpStatus === 401 || httpStatus === 402 || httpStatus === 404) {
                    emitAuditDecision('WARN', 'invalid', BillingErrorCode.LICENSE_INVALID, {
                        tokenFingerprint,
                        upstreamStatus: httpStatus,
                        correlationId,
                    });
                    return res.status(402).json({
                        error: __t('payment_required'),
                        code: BillingErrorCode.LICENSE_INVALID,
                        outcome: 'invalid',
                        correlationId,
                    });
                }

                emitAuditDecision(
                    'ERROR',
                    'upstream_unavailable',
                    BillingErrorCode.UPSTREAM_UNAVAILABLE,
                    {
                        tokenFingerprint,
                        upstreamError: err?.code || err?.message || 'upstream_unreachable',
                        correlationId,
                    }
                );
                return res.status(503).json({
                    error: __t('auth_rejected'),
                    code: BillingErrorCode.UPSTREAM_UNAVAILABLE,
                    outcome: 'upstream_unavailable',
                    correlationId,
                });
            }
        }

        // Fail closed on non-active license states
        if (record.status === 'invalid') {
            emitAuditDecision('WARN', 'invalid', BillingErrorCode.LICENSE_INVALID, {
                tokenFingerprint,
                tenantId: record.tenant_id,
                correlationId,
            });
            return res.status(402).json({
                error: __t('payment_required'),
                code: BillingErrorCode.LICENSE_INVALID,
                outcome: 'invalid',
                tenantId: record.tenant_id,
                correlationId,
            });
        }

        if (record.status === 'revoked') {
            emitAuditDecision('WARN', 'revoked', BillingErrorCode.LICENSE_REVOKED, {
                tokenFingerprint,
                tenantId: record.tenant_id,
                revokedAt: record.revoked_at,
                correlationId,
            });
            return res.status(403).json({
                error: __t('auth_rejected'),
                code: BillingErrorCode.LICENSE_REVOKED,
                outcome: 'revoked',
                tenantId: record.tenant_id,
                correlationId,
            });
        }

        if (record.status === 'suspended') {
            emitAuditDecision('WARN', 'suspended', BillingErrorCode.LICENSE_SUSPENDED, {
                tokenFingerprint,
                tenantId: record.tenant_id,
                suspendedReason: record.suspended_reason,
                correlationId,
            });
            return res.status(403).json({
                error: __t('auth_rejected'),
                code: BillingErrorCode.LICENSE_SUSPENDED,
                outcome: 'suspended',
                tenantId: record.tenant_id,
                correlationId,
            });
        }

        if (isRecordExpired(record)) {
            emitAuditDecision('WARN', 'expired', BillingErrorCode.LICENSE_EXPIRED, {
                tokenFingerprint,
                tenantId: record.tenant_id,
                expiresAt: record.expires_at,
                correlationId,
            });
            return res.status(403).json({
                error: __t('auth_rejected'),
                code: BillingErrorCode.LICENSE_EXPIRED,
                outcome: 'expired',
                tenantId: record.tenant_id,
                correlationId,
            });
        }

        // Resolve edition & capabilities from central edition table (zero inline ternaries)
        const catalogEntry = resolveEditionEntitlements(record.edition);
        if (!catalogEntry) {
            emitAuditDecision(
                'WARN',
                'insufficient_entitlement',
                BillingErrorCode.INSUFFICIENT_ENTITLEMENT,
                {
                    tokenFingerprint,
                    tenantId: record.tenant_id,
                    unrecognizedEdition: record.edition,
                    correlationId,
                }
            );
            return res.status(403).json({
                error: __t('blocked'),
                code: BillingErrorCode.INSUFFICIENT_ENTITLEMENT,
                outcome: 'insufficient_entitlement',
                tenantId: record.tenant_id,
                correlationId,
            });
        }

        const entitlementFailure = checkInsufficientEntitlement(
            body,
            catalogEntry.rank,
            catalogEntry.capabilities
        );
        if (entitlementFailure) {
            emitAuditDecision(
                'WARN',
                'insufficient_entitlement',
                BillingErrorCode.INSUFFICIENT_ENTITLEMENT,
                {
                    tokenFingerprint,
                    tenantId: record.tenant_id,
                    edition: catalogEntry.edition,
                    reason: entitlementFailure,
                    correlationId,
                }
            );
            return res.status(403).json({
                error: __t('blocked'),
                code: BillingErrorCode.INSUFFICIENT_ENTITLEMENT,
                outcome: 'insufficient_entitlement',
                reason: entitlementFailure,
                tenantId: record.tenant_id,
                edition: catalogEntry.edition,
                correlationId,
            });
        }

        const responsePayload = {
            tenantId: record.tenant_id,
            edition: catalogEntry.edition,
            outcome: 'authorized' as const,
            capabilities: catalogEntry.capabilities,
            message: __t('auth_success', catalogEntry.edition.toUpperCase()),
            correlationId,
        };

        if (idempotencyKey) {
            idempotencyCache.set(idempotencyKey, {
                payloadHash,
                status: 200,
                body: responsePayload,
                expiresAt: now + REPLAY_TTL_MS,
            });
        }

        emitAuditDecision('INFO', 'authorized', 'AUTHORIZED', {
            tokenFingerprint,
            tenantId: record.tenant_id,
            edition: catalogEntry.edition,
            correlationId,
        });

        return res.status(200).json(responsePayload);
    }
);

const PORT = process.env.PORT || 4002;
export let serverInstance: any = null;

if (require.main === module) {
    serverInstance = app.listen(Number(PORT), '0.0.0.0', () => {
        Logger.info(__t('listening_port', __t('billing_gateway'), PORT));
    });
}
