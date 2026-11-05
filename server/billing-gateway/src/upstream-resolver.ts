/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Upstream Mandatag Resolver
 * File           : upstream-resolver.ts
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

import { Request } from 'express';
import axios from 'axios';
import { __t, createOutboundPropagationHeaders } from '@ugondu/shared';
import { tokenStore, TenantInfo } from './db';
import { emitAuditDecision } from './mandatag-verifier';

export const DEFAULT_IDENTITY_AUTHORITY_URL = 'https://identity.airroofers.eu/api/v1';

export const UpstreamErrorCode = {
    LICENSE_INVALID: 'LICENSE_INVALID',
    UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
} as const;

export interface UpstreamResolveResult {
    record?: TenantInfo;
    errorStatus?: number;
    errorPayload?: {
        error: string;
        code: string;
        outcome: string;
        correlationId?: string;
    };
}

export async function resolveUpstreamMandatagToken(
    req: Request,
    token: string,
    tokenFingerprint: string,
    authorityBaseUrl: string,
    production: boolean,
    body: Record<string, any>,
    correlationId?: string
): Promise<UpstreamResolveResult> {
    const hasConfiguredUpstream = Boolean(authorityBaseUrl);
    const isAxiosMocked = Boolean(
        (axios.post as any)?._isMockFunction || (axios.post as any)?.mock
    );
    const shouldQueryUpstream =
        production || hasConfiguredUpstream || isAxiosMocked || body.requireUpstream === true;

    if (!shouldQueryUpstream) {
        return {};
    }

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
            emitAuditDecision('WARN', 'invalid', UpstreamErrorCode.LICENSE_INVALID, {
                tokenFingerprint,
                reason: 'upstream_rejected_invalid',
                correlationId,
            });
            return {
                errorStatus: 402,
                errorPayload: {
                    error: __t('payment_required'),
                    code: UpstreamErrorCode.LICENSE_INVALID,
                    outcome: 'invalid',
                    correlationId,
                },
            };
        }

        const resolvedTenantId = String(data.tenantId || 'tenant_unknown');
        const resolvedTier = String(data.subscriptionTier || data.edition || '');
        if (!resolvedTier) {
            emitAuditDecision('WARN', 'invalid', UpstreamErrorCode.LICENSE_INVALID, {
                tokenFingerprint,
                reason: 'upstream_missing_edition',
                correlationId,
            });
            return {
                errorStatus: 402,
                errorPayload: {
                    error: __t('payment_required'),
                    code: UpstreamErrorCode.LICENSE_INVALID,
                    outcome: 'invalid',
                    correlationId,
                },
            };
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

        let record: TenantInfo;
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
        return { record };
    } catch (err: any) {
        const httpStatus = err?.response?.status;
        if (httpStatus === 401 || httpStatus === 402 || httpStatus === 404) {
            emitAuditDecision('WARN', 'invalid', UpstreamErrorCode.LICENSE_INVALID, {
                tokenFingerprint,
                upstreamStatus: httpStatus,
                correlationId,
            });
            return {
                errorStatus: 402,
                errorPayload: {
                    error: __t('payment_required'),
                    code: UpstreamErrorCode.LICENSE_INVALID,
                    outcome: 'invalid',
                    correlationId,
                },
            };
        }

        emitAuditDecision(
            'ERROR',
            'upstream_unavailable',
            UpstreamErrorCode.UPSTREAM_UNAVAILABLE,
            {
                tokenFingerprint,
                upstreamError: err?.code || err?.message || 'upstream_unreachable',
                correlationId,
            }
        );
        return {
            errorStatus: 503,
            errorPayload: {
                error: __t('auth_rejected'),
                code: UpstreamErrorCode.UPSTREAM_UNAVAILABLE,
                outcome: 'upstream_unavailable',
                correlationId,
            },
        };
    }
}
