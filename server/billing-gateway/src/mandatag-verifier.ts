/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Mandatag Token Verifier & Audit
 * File           : mandatag-verifier.ts
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

import { createPublicKey, verify as cryptoVerify } from 'crypto';
import { __t, Logger, globalTrustRegistry } from '@ugondu/shared';
import { computeTokenFingerprint, TenantInfo } from './db';
import { resolveEditionEntitlements, EditionCapabilities } from './edition-catalog';

export type LicenseOutcome =
    | 'authorized'
    | 'invalid'
    | 'expired'
    | 'revoked'
    | 'suspended'
    | 'insufficient_entitlement'
    | 'upstream_unavailable'
    | 'replay_detected'
    | 'license_store_unavailable';

export function verifyMandatagEntitlementToken(
    token: string
): { valid: boolean; record?: TenantInfo; error?: string } {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { valid: false, error: 'Token is not a three-part compact JWT' };
        }
        const [headerB64, payloadB64, signatureB64] = parts;
        const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
        if (header.alg !== 'EdDSA') {
            return { valid: false, error: 'Mandatag tokens must use EdDSA (Ed25519) algorithm' };
        }

        const keyId = header.kid;
        let publicKeyPem: string | undefined;

        if (keyId) {
            const keyRecord = globalTrustRegistry.getKey(keyId);
            if (keyRecord && keyRecord.status === 'ACTIVE' && keyRecord.algorithm === 'ed25519') {
                publicKeyPem = keyRecord.publicKey;
            }
        }
        if (!publicKeyPem) {
            const activeKey = globalTrustRegistry.getActiveKeyByPurpose('service-identity');
            if (activeKey && activeKey.algorithm === 'ed25519') {
                publicKeyPem = activeKey.publicKey;
            }
        }
        if (!publicKeyPem && process.env.MANDATAG_PUBLIC_KEY) {
            publicKeyPem = process.env.MANDATAG_PUBLIC_KEY;
        }

        if (!publicKeyPem) {
            return { valid: false, error: 'No active Mandatag Ed25519 verification key found in Trust Registry' };
        }

        const publicKeyObj = createPublicKey(publicKeyPem);
        const signedData = Buffer.from(`${headerB64}.${payloadB64}`);
        const signatureBytes = Buffer.from(signatureB64, 'base64url');

        const isSignatureValid = cryptoVerify(null, signedData, publicKeyObj, signatureBytes);
        if (!isSignatureValid) {
            return { valid: false, error: 'Mandatag Ed25519 signature verification failed' };
        }

        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);

        const validOrgClasses = ['GOVERNMENT', 'EDUCATION', 'ENTERPRISE', 'COMMERCIAL', 'INDIVIDUAL'];
        const orgId = typeof payload.organizationId === 'string' ? payload.organizationId :
                      typeof payload.orgId === 'string' ? payload.orgId :
                      typeof payload.organization_id === 'string' ? payload.organization_id : undefined;
        const rawOrgClass = typeof payload.organizationClass === 'string' ? payload.organizationClass.toUpperCase() :
                            typeof payload.orgClass === 'string' ? payload.orgClass.toUpperCase() :
                            typeof payload.organization_class === 'string' ? payload.organization_class.toUpperCase() : undefined;
        const orgClass = rawOrgClass && validOrgClasses.includes(rawOrgClass) ? rawOrgClass as TenantInfo['organization_class'] : undefined;

        if (typeof payload.exp === 'number' && payload.exp <= now) {
            return {
                valid: false,
                error: 'Mandatag entitlement token has expired',
                record: {
                    token,
                    token_fingerprint: computeTokenFingerprint(token),
                    tenant_id: String(payload.tenantId || payload.tenant_id || payload.sub || 'unknown'),
                    edition: String(payload.edition || payload.tier || payload.subscriptionTier || 'unspecified'),
                    status: 'expired',
                    created_at: new Date((payload.iat || now) * 1000).toISOString(),
                    expires_at: new Date(payload.exp * 1000).toISOString(),
                    organization_id: orgId,
                    organization_class: orgClass,
                }
            };
        }

        const tenantId = String(payload.tenantId || payload.tenant_id || payload.sub || 'tenant_unknown');
        const edition = String(payload.edition || payload.tier || payload.subscriptionTier || '');
        if (!edition) {
            return { valid: false, error: 'Mandatag entitlement token missing edition claim' };
        }

        const rawStatus = String(payload.status || 'active').toLowerCase();
        const status = (['active', 'expired', 'revoked', 'suspended', 'invalid'].includes(rawStatus)
            ? rawStatus
            : 'active') as TenantInfo['status'];

        const record: TenantInfo = {
            token,
            token_fingerprint: computeTokenFingerprint(token),
            tenant_id: tenantId,
            edition,
            status,
            created_at: new Date((payload.iat || now) * 1000).toISOString(),
            ...(payload.exp ? { expires_at: new Date(payload.exp * 1000).toISOString() } : {}),
            entitlements: Array.isArray(payload.entitlements) ? payload.entitlements : undefined,
            organization_id: orgId,
            organization_class: orgClass,
        };

        return { valid: true, record };
    } catch (err: any) {
        return { valid: false, error: err?.message || 'Token parsing or cryptographic error' };
    }
}

export function emitAuditDecision(
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

export function isRecordExpired(record: TenantInfo): boolean {
    if (record.status === 'expired') return true;
    if (record.expires_at) {
        const parsed = Date.parse(record.expires_at);
        if (!Number.isNaN(parsed) && parsed <= Date.now()) {
            return true;
        }
    }
    return false;
}

export function checkInsufficientEntitlement(
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

    if (typeof reqBody.requiredConcurrentPipelines === 'number') {
        if (capabilities.maxConcurrentPipelines !== null && reqBody.requiredConcurrentPipelines > capabilities.maxConcurrentPipelines) {
            return `Requested concurrent pipeline count (${reqBody.requiredConcurrentPipelines}) exceeds edition limit (${capabilities.maxConcurrentPipelines})`;
        }
    }

    if (typeof reqBody.requiredWorkers === 'number') {
        if (capabilities.maxWorkers !== null && reqBody.requiredWorkers > capabilities.maxWorkers) {
            return `Requested worker count (${reqBody.requiredWorkers}) exceeds edition limit (${capabilities.maxWorkers})`;
        }
    }

    return null;
}
