/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Commercial & Metadata Routes
 * File           : commercial-routes.ts
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

import { Router, Request, Response } from 'express';
import { tokenStore } from './db';
import { CENTRAL_EDITION_TABLE } from './edition-catalog';

export const commercialRouter = Router();

export const BillingHealthErrorCode = {
    UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
    LICENSE_STORE_UNAVAILABLE: 'LICENSE_STORE_UNAVAILABLE',
} as const;

commercialRouter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        service: 'billing-gateway',
        timestamp: new Date().toISOString(),
    });
});

commercialRouter.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'live',
        service: 'billing-gateway',
        timestamp: new Date().toISOString(),
    });
});

commercialRouter.get('/health/ready', (_req: Request, res: Response) => {
    const production = process.env.NODE_ENV === 'production';
    const storeReady = tokenStore.isReady();
    const authorityConfigured = Boolean(
        (process.env.BILLING_AUTHORITY_URL || process.env.IDENTITY_AUTHORITY_URL || '').trim()
    );

    if ((production && !authorityConfigured) || (!production && !storeReady)) {
        return res.status(503).json({
            status: 'not_ready',
            service: 'billing-gateway',
            code: production && !authorityConfigured
                ? BillingHealthErrorCode.UPSTREAM_UNAVAILABLE
                : BillingHealthErrorCode.LICENSE_STORE_UNAVAILABLE,
            checks: {
                tokenStore: production ? 'not_authoritative' : (storeReady ? 'ok' : 'failed'),
                billingAuthority: authorityConfigured ? 'configured' : 'missing',
            },
        });
    }

    return res.status(200).json({
        status: 'ready',
        service: 'billing-gateway',
        checks: {
            tokenStore: production ? 'bypassed_in_production' : 'ok',
            billingAuthority: authorityConfigured ? 'configured' : 'offline_dev_mode',
        },
        timestamp: new Date().toISOString(),
    });
});

commercialRouter.get('/v1/metadata', (_req: Request, res: Response) => {
    res.status(200).json({
        service: 'billing-gateway',
        version: '2026.3.2-LTS',
        editions: Object.keys(CENTRAL_EDITION_TABLE),
        endpoints: ['/health', '/health/live', '/health/ready', '/v1/metadata', '/v1/authorize', '/v1/checkout', '/v1/upgrade'],
        commercialAuthority: 'https://billing.airroofers.eu',
        pricingModel: 'AeroBill APR (Central Commercial Authority)',
        licensingAuthority: 'https://license.airroofers.eu (Mandatag)',
        shadowBilling: 'eliminated',
        timestamp: new Date().toISOString(),
    });
});

commercialRouter.all('/v1/checkout', (req: Request, res: Response) => {
    const aerobillBase = process.env.AEROBILL_URL || 'https://billing.airroofers.eu';
    const edition = req.query.edition || req.body?.edition || 'professional';
    const redirectUrl = `${aerobillBase}/products/ugondu/checkout?edition=${encodeURIComponent(String(edition))}`;
    return res.status(200).json({
        delegatedTo: 'AeroBill APR',
        commercialAuthority: aerobillBase,
        checkoutUrl: redirectUrl,
        message: 'Commercial checkout delegated to AeroBill APR (AeroBill Commercial Authority).'
    });
});

commercialRouter.all('/v1/upgrade', (req: Request, res: Response) => {
    const aerobillBase = process.env.AEROBILL_URL || 'https://billing.airroofers.eu';
    const tenantId = req.query.tenantId || req.body?.tenantId || '';
    const targetEdition = req.query.edition || req.body?.edition || 'enterprise';
    const redirectUrl = `${aerobillBase}/products/ugondu/upgrade?tenantId=${encodeURIComponent(String(tenantId))}&targetEdition=${encodeURIComponent(String(targetEdition))}`;
    return res.status(200).json({
        delegatedTo: 'AeroBill APR',
        commercialAuthority: aerobillBase,
        upgradeUrl: redirectUrl,
        message: 'Plan upgrade flows delegated to AeroBill APR.'
    });
});
