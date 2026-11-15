/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Commercial & Federation Routes
 * File           : commercial-routes.ts
 * Version        : 2026.4.0-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-11-14
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { Router, Request, Response } from 'express';
import { __t } from '@ugondu/shared';
import { tokenStore } from './db';
import { CENTRAL_EDITION_TABLE } from './edition-catalog';
import { billingServiceIdentityGuard } from './service-identity-guard';
import { AeroBillAuthorityError, defaultAeroBillClient, resolveAeroBillBaseUrl } from './aerobill-client';
import { MandatagAuthorityError, defaultMandatagClient } from './mandatag-client';
import { usageLedger } from './usage-ledger';
import { CommercialLifecycleInput } from './entitlement/EntitlementEventProcessor';
import { defaultEntitlementProcessor, verifyAeroBillWebhookSignature } from './webhook-verifier';

export const commercialRouter = Router();

export const BillingHealthErrorCode = {
    UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
    LICENSE_STORE_UNAVAILABLE: 'LICENSE_STORE_UNAVAILABLE',
} as const;

const seenAeroBillWebhookEvents = new Set<string>();

function handleAuthorityError(err: unknown, res: Response, correlationId?: string): Response {
    if (err instanceof AeroBillAuthorityError || err instanceof MandatagAuthorityError) {
        return res.status(err.statusCode).json({
            error: __t('auth_rejected'),
            code: err.code,
            correlationId,
        });
    }
    return res.status(503).json({
        error: __t('auth_rejected'),
        code: BillingHealthErrorCode.UPSTREAM_UNAVAILABLE,
        correlationId,
    });
}

commercialRouter.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'billing-gateway', timestamp: new Date().toISOString() });
});

commercialRouter.get('/health/live', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'live', service: 'billing-gateway', timestamp: new Date().toISOString() });
});

commercialRouter.get('/health/ready', (_req: Request, res: Response) => {
    const production = process.env.NODE_ENV === 'production';
    const storeReady = tokenStore.isReady();
    const mandatagConfigured = Boolean(
        (process.env.MANDATAG_AUTHORITY_URL || process.env.MANDATAG_URL || process.env.BILLING_AUTHORITY_URL || process.env.IDENTITY_AUTHORITY_URL || '').trim()
    );
    const aerobillConfigured = Boolean(
        (process.env.AEROBILL_URL || process.env.BILLING_AUTHORITY_URL || process.env.IDENTITY_AUTHORITY_URL || '').trim()
    );
    const authorityConfigured = mandatagConfigured || aerobillConfigured;

    if ((production && !authorityConfigured) || (!production && !storeReady)) {
        return res.status(503).json({
            status: 'not_ready',
            service: 'billing-gateway',
            code: production && !authorityConfigured
                ? BillingHealthErrorCode.UPSTREAM_UNAVAILABLE
                : BillingHealthErrorCode.LICENSE_STORE_UNAVAILABLE,
            checks: {
                tokenStore: production ? 'not_authoritative' : (storeReady ? 'ok' : 'failed'),
                billingAuthority: aerobillConfigured ? 'configured' : 'missing',
                mandatagAuthority: mandatagConfigured ? 'configured' : 'missing',
            },
        });
    }

    return res.status(200).json({
        status: 'ready',
        service: 'billing-gateway',
        checks: {
            tokenStore: production ? 'bypassed_in_production' : 'ok',
            billingAuthority: aerobillConfigured ? 'configured' : 'offline_dev_mode',
            mandatagAuthority: mandatagConfigured ? 'configured' : 'offline_dev_mode',
        },
        timestamp: new Date().toISOString(),
    });
});

commercialRouter.get('/v1/metadata', (_req: Request, res: Response) => {
    res.status(200).json({
        service: 'billing-gateway',
        version: '2026.4.0-LTS',
        editions: Object.keys(CENTRAL_EDITION_TABLE),
        endpoints: [
            '/health', '/health/live', '/health/ready', '/v1/metadata',
            '/v1/authorize', '/v1/checkout', '/v1/checkout/session',
            '/v1/upgrade', '/v1/upgrade/session',
            '/v1/subscriptions/:tenantId', '/v1/invoices/:tenantId',
            '/v1/metering/usage', '/v1/metering/flush',
            '/v1/webhooks/aerobill', '/v1/webhooks/mandatag', '/v1/keys/mandatag/sync',
        ],
        commercialAuthority: resolveAeroBillBaseUrl(),
        pricingModel: 'AeroBill APR (Central Commercial Authority)',
        licensingAuthority: 'https://license.airroofers.eu (Mandatag)',
        shadowBilling: 'eliminated',
        timestamp: new Date().toISOString(),
    });
});

commercialRouter.all('/v1/checkout', async (req: Request, res: Response) => {
    const aerobillBase = resolveAeroBillBaseUrl();
    const edition = String(req.query.edition || req.body?.edition || 'professional');
    if (req.body?.executeSession === true || req.query.mode === 'session') {
        try {
            const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined;
            const session = await defaultAeroBillClient.createCheckoutSession({
                tenantId: req.body?.tenantId ? String(req.body.tenantId) : undefined,
                edition,
                successUrl: req.body?.successUrl ? String(req.body.successUrl) : undefined,
                cancelUrl: req.body?.cancelUrl ? String(req.body.cancelUrl) : undefined,
                idempotencyKey,
                correlationId: (req as any).correlationId,
            });
            return res.status(200).json({ delegatedTo: 'AeroBill APR', commercialAuthority: aerobillBase, ...session });
        } catch (err) {
            return handleAuthorityError(err, res, (req as any).correlationId);
        }
    }
    const redirectUrl = `${aerobillBase}/products/ugondu/checkout?edition=${encodeURIComponent(edition)}`;
    return res.status(200).json({
        delegatedTo: 'AeroBill APR',
        commercialAuthority: aerobillBase,
        checkoutUrl: redirectUrl,
        message: 'Commercial checkout delegated to AeroBill APR (AeroBill Commercial Authority).',
    });
});

commercialRouter.post('/v1/checkout/session', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const edition = typeof body.edition === 'string' ? body.edition.trim() : '';
    if (!edition) {
        return res.status(400).json({ error: __t('auth_rejected'), code: 'INVALID_CHECKOUT_REQUEST' });
    }
    try {
        const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined;
        const session = await defaultAeroBillClient.createCheckoutSession({
            tenantId: typeof body.tenantId === 'string' ? body.tenantId : undefined,
            edition,
            successUrl: typeof body.successUrl === 'string' ? body.successUrl : undefined,
            cancelUrl: typeof body.cancelUrl === 'string' ? body.cancelUrl : undefined,
            idempotencyKey,
            correlationId: (req as any).correlationId,
        });
        return res.status(200).json({
            delegatedTo: 'AeroBill APR',
            commercialAuthority: resolveAeroBillBaseUrl(),
            ...session,
        });
    } catch (err) {
        return handleAuthorityError(err, res, (req as any).correlationId);
    }
});

commercialRouter.all('/v1/upgrade', async (req: Request, res: Response) => {
    const aerobillBase = resolveAeroBillBaseUrl();
    const tenantId = String(req.query.tenantId || req.body?.tenantId || '');
    const targetEdition = String(req.query.edition || req.body?.edition || 'enterprise');
    if (req.body?.executeSession === true || req.query.mode === 'session') {
        try {
            const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined;
            const session = await defaultAeroBillClient.createUpgradeSession({
                tenantId,
                targetEdition,
                subscriptionId: req.body?.subscriptionId ? String(req.body.subscriptionId) : undefined,
                idempotencyKey,
                correlationId: (req as any).correlationId,
            });
            return res.status(200).json({ delegatedTo: 'AeroBill APR', commercialAuthority: aerobillBase, ...session });
        } catch (err) {
            return handleAuthorityError(err, res, (req as any).correlationId);
        }
    }
    const redirectUrl = `${aerobillBase}/products/ugondu/upgrade?tenantId=${encodeURIComponent(tenantId)}&targetEdition=${encodeURIComponent(targetEdition)}`;
    return res.status(200).json({
        delegatedTo: 'AeroBill APR',
        commercialAuthority: aerobillBase,
        upgradeUrl: redirectUrl,
        message: 'Plan upgrade flows delegated to AeroBill APR.',
    });
});

commercialRouter.post('/v1/upgrade/session', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const targetEdition = typeof body.targetEdition === 'string' ? body.targetEdition.trim() : (typeof body.edition === 'string' ? body.edition.trim() : '');
    if (!tenantId || !targetEdition) {
        return res.status(400).json({ error: __t('auth_rejected'), code: 'INVALID_UPGRADE_REQUEST' });
    }
    try {
        const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : undefined;
        const session = await defaultAeroBillClient.createUpgradeSession({
            tenantId,
            targetEdition,
            subscriptionId: typeof body.subscriptionId === 'string' ? body.subscriptionId : undefined,
            idempotencyKey,
            correlationId: (req as any).correlationId,
        });
        return res.status(200).json({ delegatedTo: 'AeroBill APR', commercialAuthority: resolveAeroBillBaseUrl(), ...session });
    } catch (err) {
        return handleAuthorityError(err, res, (req as any).correlationId);
    }
});

commercialRouter.get('/v1/subscriptions/:tenantId', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    try {
        const data = await defaultAeroBillClient.getSubscription(String(req.params.tenantId), (req as any).correlationId);
        return res.status(200).json(data);
    } catch (err) {
        return handleAuthorityError(err, res, (req as any).correlationId);
    }
});

commercialRouter.get('/v1/invoices/:tenantId', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    try {
        const data = await defaultAeroBillClient.listInvoices(String(req.params.tenantId), (req as any).correlationId);
        return res.status(200).json(data);
    } catch (err) {
        return handleAuthorityError(err, res, (req as any).correlationId);
    }
});

commercialRouter.post('/v1/metering/usage', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, any>;
    const eventId = typeof body.eventId === 'string' ? body.eventId.trim() : '';
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const metric = typeof body.metric === 'string' ? body.metric.trim() : '';
    const quantity = typeof body.quantity === 'number' ? body.quantity : Number(body.quantity);
    const timestamp = typeof body.timestamp === 'string' && !Number.isNaN(Date.parse(body.timestamp))
        ? body.timestamp
        : new Date().toISOString();

    if (!eventId || !tenantId || !metric || !Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: __t('auth_rejected'), code: 'INVALID_USAGE_METER_EVENT' });
    }

    const result = await usageLedger.recordAndDispatch(
        { eventId, tenantId, metric, quantity, timestamp, metadata: body.metadata },
        defaultAeroBillClient,
        (req as any).correlationId
    );
    if (result.outcome === 'CONFLICT') {
        return res.status(409).json({ error: __t('auth_rejected'), code: 'REPLAY_DETECTED', entry: result.entry });
    }
    const status = result.outcome === 'QUEUED_RETRY' ? 202 : 200;
    return res.status(status).json(result);
});

commercialRouter.post('/v1/metering/flush', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    const summary = await usageLedger.flushPending(defaultAeroBillClient, (req as any).correlationId);
    return res.status(200).json(summary);
});

commercialRouter.post('/v1/keys/mandatag/sync', billingServiceIdentityGuard, async (req: Request, res: Response) => {
    try {
        const registeredKeys = await defaultMandatagClient.discoverAndSyncPublicKeys((req as any).correlationId);
        return res.status(200).json({ synced: true, registeredKeys });
    } catch (err) {
        return handleAuthorityError(err, res, (req as any).correlationId);
    }
});

commercialRouter.post('/v1/webhooks/aerobill', async (req: Request, res: Response) => {
    const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : null) as Record<string, any> | null;
    if (!body || typeof body.eventId !== 'string' || typeof body.eventType !== 'string' || typeof body.tenantId !== 'string') {
        return res.status(400).json({ error: __t('auth_rejected'), code: 'INVALID_WEBHOOK_PAYLOAD' });
    }

    const sig = typeof req.headers['x-aerobill-signature'] === 'string' ? req.headers['x-aerobill-signature'] : undefined;
    const keyId = typeof req.headers['x-aerobill-key-id'] === 'string' ? req.headers['x-aerobill-key-id'] : undefined;
    const ts = typeof req.headers['x-aerobill-timestamp'] === 'string' ? req.headers['x-aerobill-timestamp'] : undefined;
    if (!verifyAeroBillWebhookSignature(body, sig, keyId, ts)) {
        return res.status(401).json({ error: __t('auth_rejected'), code: 'INVALID_WEBHOOK_SIGNATURE' });
    }

    if (seenAeroBillWebhookEvents.has(body.eventId)) {
        return res.status(200).json({ processed: true, deduplicated: true, eventId: body.eventId });
    }

    try {
        if (body.eventType === 'payment.succeeded' || body.eventType === 'invoice.paid') {
            const invoiceId = String(body.invoiceId || body.eventId);
            const syncRes = await defaultEntitlementProcessor.onAeroBillPaymentConfirmed(body.tenantId, invoiceId, {
                subscriptionId: typeof body.subscriptionId === 'string' ? body.subscriptionId : undefined,
                edition: typeof body.edition === 'string' ? body.edition : undefined,
                correlationId: (req as any).correlationId,
            });
            seenAeroBillWebhookEvents.add(body.eventId);
            return res.status(200).json({ processed: true, eventId: body.eventId, ...syncRes });
        }

        const lifecycleTypes = new Set(['payment.failed', 'invoice.payment_failed', 'subscription.canceled', 'charge.refunded', 'subscription.expired']);
        if (lifecycleTypes.has(body.eventType)) {
            const lifecycleRes = await defaultEntitlementProcessor.onAeroBillCommercialLifecycleEvent({
                eventId: body.eventId,
                eventType: body.eventType as CommercialLifecycleInput['eventType'],
                tenantId: body.tenantId,
                invoiceId: typeof body.invoiceId === 'string' ? body.invoiceId : undefined,
                subscriptionId: typeof body.subscriptionId === 'string' ? body.subscriptionId : undefined,
                reason: typeof body.reason === 'string' ? body.reason : undefined,
                correlationId: (req as any).correlationId,
            });
            seenAeroBillWebhookEvents.add(body.eventId);
            return res.status(200).json({ eventId: body.eventId, ...lifecycleRes });
        }

        return res.status(400).json({ error: __t('auth_rejected'), code: 'UNSUPPORTED_WEBHOOK_EVENT' });
    } catch (err) {
        return handleAuthorityError(err, res, (req as any).correlationId);
    }
});

commercialRouter.post('/v1/webhooks/mandatag', (req: Request, res: Response) => {
    const processed = defaultEntitlementProcessor.process(req.body);
    if (!processed) {
        return res.status(401).json({ error: __t('messages.error.entitlement_signature_failed'), code: 'ENTITLEMENT_EVENT_REJECTED' });
    }
    return res.status(200).json({ processed: true, eventId: req.body.eventId });
});
