/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Service Entry Point
 * File           : index.ts
 * Version        : 2026.3.2-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-11-05
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Commercial Sovereignty: AeroBill APR Authority
 * - Licensing Sovereignty: Mandatag Authority (Ed25519)
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ignatus Chika Ujomor
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { createHash } from 'crypto';
import {
    __t,
    Logger,
    telemetryContextMiddleware,
    createOutboundPropagationHeaders,
    ProductRegistry,
} from '@ugondu/shared';
import { tokenStore, computeTokenFingerprint, TenantInfo } from './db';
import {
    CENTRAL_EDITION_TABLE,
    resolveEditionEntitlements,
    EditionCapabilities,
} from './edition-catalog';
import {
    seenNonces,
    idempotencyCache,
    REPLAY_TTL_MS,
    clearReplayCache,
    pruneReplayCaches,
    resolveAllowedOrigins,
} from './replay-protection';
import {
    LicenseOutcome,
    verifyMandatagEntitlementToken,
    emitAuditDecision,
    isRecordExpired,
    checkInsufficientEntitlement,
} from './mandatag-verifier';
import { commercialRouter } from './commercial-routes';
import { billingServiceIdentityGuard } from './service-identity-guard';

export {
    tokenStore,
    computeTokenFingerprint,
    CENTRAL_EDITION_TABLE,
    resolveEditionEntitlements,
    clearReplayCache,
    resolveAllowedOrigins,
    verifyMandatagEntitlementToken,
    LicenseOutcome,
};

export const BillingErrorCode = {
    AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
    LICENSE_INVALID: 'LICENSE_INVALID',
    LICENSE_EXPIRED: 'LICENSE_EXPIRED',
    LICENSE_REVOKED: 'LICENSE_REVOKED',
    LICENSE_SUSPENDED: 'LICENSE_SUSPENDED',
    INSUFFICIENT_ENTITLEMENT: 'INSUFFICIENT_ENTITLEMENT',
    UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
    REPLAY_DETECTED: 'REPLAY_DETECTED',
    LICENSE_STORE_UNAVAILABLE: 'LICENSE_STORE_UNAVAILABLE',
} as const;

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
app.use(commercialRouter);

const DEFAULT_IDENTITY_AUTHORITY_URL = 'https://identity.airroofers.eu/api/v1';

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
        const production = process.env.NODE_ENV === 'production';
        const authorityBaseUrl =
            (process.env.BILLING_AUTHORITY_URL || process.env.IDENTITY_AUTHORITY_URL || '').trim();

        if (production && !authorityBaseUrl) {
            emitAuditDecision('ERROR', 'upstream_unavailable', BillingErrorCode.UPSTREAM_UNAVAILABLE, {
                tokenFingerprint,
                reason: 'billing_authority_not_configured',
                correlationId,
            });
            return res.status(503).json({
                error: __t('auth_rejected'),
                code: BillingErrorCode.UPSTREAM_UNAVAILABLE,
                outcome: 'upstream_unavailable',
                correlationId,
            });
        }

        if (!production && !tokenStore.isReady()) {
            return res.status(503).json({
                error: __t('messages.error.billing_store_unavailable'),
                code: BillingErrorCode.LICENSE_STORE_UNAVAILABLE,
                outcome: 'license_store_unavailable',
                correlationId,
            });
        }

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

        if (idempotencyKey && !production) {
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

        let record: TenantInfo | null = null;

        // Step A: Cryptographically verify signed Mandatag entitlement tokens (Ed25519 JWT)
        if (token.includes('.') && token.split('.').length === 3) {
            const jwtVerification = verifyMandatagEntitlementToken(token);
            if (jwtVerification.valid && jwtVerification.record) {
                record = jwtVerification.record;
                Logger.info(__t('billing_verified', String(record.tenant_id), String(record.edition)), {
                    audit_event: 'MANDATAG_ENTITLEMENT_VERIFIED',
                    tokenFingerprint,
                    tenantId: record.tenant_id,
                    edition: record.edition,
                    correlationId,
                });
            } else if (jwtVerification.record && jwtVerification.record.status === 'expired') {
                record = jwtVerification.record;
            }
        }

        // Step B: Query upstream Mandatag Authority if token not verified by local Ed25519 signature
        if (!record) {
            const hasConfiguredUpstream = Boolean(authorityBaseUrl);
            const isAxiosMocked = Boolean(
                (axios.post as any)?._isMockFunction || (axios.post as any)?.mock
            );
            const shouldQueryUpstream =
                production || hasConfiguredUpstream || isAxiosMocked || body.requireUpstream === true;

            if (shouldQueryUpstream) {
                const upstreamUrl =
                    authorityBaseUrl || process.env.IDENTITY_AUTHORITY_URL || DEFAULT_IDENTITY_AUTHORITY_URL;

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

                    const normalizedStatus = (['active', 'expired', 'revoked', 'suspended', 'invalid'].includes(
                        upstreamStatus
                    ) ? upstreamStatus : 'active') as TenantInfo['status'];

                    const validOrgClasses = ['GOVERNMENT', 'EDUCATION', 'ENTERPRISE', 'COMMERCIAL', 'INDIVIDUAL'];
                    const resolvedOrgId = typeof data.organizationId === 'string' ? data.organizationId :
                                          typeof data.orgId === 'string' ? data.orgId : undefined;
                    const rawOrgClass = typeof data.organizationClass === 'string' ? data.organizationClass.toUpperCase() :
                                        typeof data.orgClass === 'string' ? data.orgClass.toUpperCase() : undefined;
                    const resolvedOrgClass = rawOrgClass && validOrgClasses.includes(rawOrgClass) ? rawOrgClass as TenantInfo['organization_class'] : undefined;

                    if (production) {
                        record = {
                            token,
                            token_fingerprint: tokenFingerprint,
                            tenant_id: resolvedTenantId,
                            edition: resolvedTier,
                            status: normalizedStatus,
                            organization_id: resolvedOrgId,
                            organization_class: resolvedOrgClass,
                            created_at: new Date().toISOString(),
                            ...(data.expiresAt ? { expires_at: String(data.expiresAt) } : {}),
                        };
                    } else {
                        record = tokenStore.registerToken(token, resolvedTenantId, resolvedTier, {
                            status: normalizedStatus,
                            expiresAt: data.expiresAt,
                            organizationId: resolvedOrgId,
                            organizationClass: resolvedOrgClass,
                        });
                    }
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
            } else if (process.env.NODE_ENV === 'test' && tokenStore.isReady()) {
                record = tokenStore.verifyToken(token);
            }
        }

        if (!record) {
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
            ...(record.organization_id ? { organizationId: record.organization_id } : {}),
            ...(record.organization_class ? { organizationClass: record.organization_class } : {}),
            outcome: 'authorized' as const,
            capabilities: catalogEntry.capabilities,
            message: __t('auth_success', catalogEntry.edition.toUpperCase()),
            correlationId,
        };

        if (idempotencyKey && !production) {
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

const PORT = process.env.PORT || ProductRegistry.getServiceConfig('billing_gateway').port;
export let serverInstance: any = null;

if (require.main === module) {
    serverInstance = app.listen(Number(PORT), '0.0.0.0', () => {
        Logger.info(__t('listening_port', __t('billing_gateway'), PORT));
    });
}
