/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Webhook Signature & Replay Verifier
 * File           : webhook-verifier.ts
 * Version        : 2026.4.0-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-11-14
 * Last Modified  : 2026-11-14
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { createHmac, createPublicKey, timingSafeEqual, verify as cryptoVerify } from 'crypto';
import { globalTrustRegistry, Logger, __t } from '@ugondu/shared';
import { EntitlementEvent, EntitlementEventProcessor } from './entitlement/EntitlementEventProcessor';
import { defaultMandatagClient } from './mandatag-client';

const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000;

export function verifyAeroBillWebhookSignature(
    payload: Record<string, unknown>,
    signatureHeader?: string,
    keyIdHeader?: string,
    timestampHeader?: string
): boolean {
    if (!signatureHeader || typeof signatureHeader !== 'string') {
        return false;
    }

    if (timestampHeader) {
        const tsMs = /^\d+$/.test(timestampHeader)
            ? Number(timestampHeader) * (timestampHeader.length <= 10 ? 1000 : 1)
            : Date.parse(timestampHeader);
        if (!Number.isFinite(tsMs) || Math.abs(Date.now() - tsMs) > MAX_WEBHOOK_AGE_MS) {
            return false;
        }
    }

    const canonical = JSON.stringify(payload);

    // 1. HMAC-SHA256 verification (sha256=<hex>)
    const secret = (process.env.AEROBILL_WEBHOOK_SECRET || '').trim();
    if (secret && signatureHeader.startsWith('sha256=')) {
        const providedHex = signatureHeader.slice('sha256='.length).trim();
        const expectedHex = createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
        const a = Buffer.from(providedHex, 'hex');
        const b = Buffer.from(expectedHex, 'hex');
        if (a.length > 0 && a.length === b.length && timingSafeEqual(a, b)) {
            return true;
        }
        return false;
    }

    // 2. Ed25519 signature verification (base64url)
    let publicKeyPem: string | undefined;
    if (keyIdHeader) {
        const rec = globalTrustRegistry.getKey(keyIdHeader);
        if (rec && rec.status === 'ACTIVE' && rec.algorithm === 'ed25519') {
            publicKeyPem = rec.publicKey;
        }
    }
    if (!publicKeyPem && process.env.AEROBILL_WEBHOOK_PUBLIC_KEY) {
        publicKeyPem = process.env.AEROBILL_WEBHOOK_PUBLIC_KEY;
    }
    if (!publicKeyPem) {
        return false;
    }

    try {
        const pubKey = createPublicKey(publicKeyPem);
        return cryptoVerify(null, Buffer.from(canonical, 'utf8'), pubKey, Buffer.from(signatureHeader, 'base64url'));
    } catch {
        return false;
    }
}

export function verifyMandatagEventSignature(event: EntitlementEvent): boolean {
    let publicKeyPem: string | undefined;
    const keyRec = globalTrustRegistry.getKey(event.signatureKeyId);
    if (keyRec && keyRec.status === 'ACTIVE' && keyRec.algorithm === 'ed25519') {
        publicKeyPem = keyRec.publicKey;
    }
    if (!publicKeyPem) {
        const active = globalTrustRegistry.getActiveKeyByPurpose('service-identity');
        if (active && active.algorithm === 'ed25519') {
            publicKeyPem = active.publicKey;
        }
    }
    if (!publicKeyPem && process.env.MANDATAG_PUBLIC_KEY) {
        publicKeyPem = process.env.MANDATAG_PUBLIC_KEY;
    }
    if (!publicKeyPem) {
        return false;
    }

    try {
        const canonical = JSON.stringify({
            eventId: event.eventId,
            eventType: event.eventType,
            tenantId: event.tenantId,
            subjectId: event.subjectId,
            entitlementVersion: event.entitlementVersion,
            sequence: event.sequence,
            effectiveAt: event.effectiveAt,
            issuedAt: event.issuedAt,
            payload: event.payload,
        });
        const pubKey = createPublicKey(publicKeyPem);
        return cryptoVerify(null, Buffer.from(canonical, 'utf8'), pubKey, Buffer.from(event.signature, 'base64url'));
    } catch {
        return false;
    }
}

export const defaultEntitlementProcessor = new EntitlementEventProcessor(
    verifyMandatagEventSignature,
    (tenantId, capabilityId) => {
        Logger.info(__t('billing_verified', tenantId, capabilityId), { audit_event: 'CAPABILITY_ACTIVATED', tenantId, capabilityId });
    },
    (tenantId, capabilityId) => {
        Logger.warn(__t('auth_rejected'), { audit_event: 'CAPABILITY_DEACTIVATED', tenantId, capabilityId });
    },
    (tenantId, from, to) => {
        Logger.info(__t('billing_verified', tenantId, to), { audit_event: 'EDITION_CHANGED', tenantId, from, to });
    },
    (reason, eventId) => {
        Logger.warn(reason, { audit_event: 'ENTITLEMENT_SECURITY_ALERT', eventId });
    },
    defaultMandatagClient
);
