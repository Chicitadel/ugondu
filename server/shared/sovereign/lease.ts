/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Sovereign Lease & Air-Gap
 * File           : lease.ts
 * Version        : 2.0.0
 * Author         : Sovereign Security & Cryptography Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import crypto from 'crypto';
import canonicalize from 'canonicalize';
import { __t } from '../i18n';

export interface SovereignCryptographicLease {
    leaseId: string;
    customerOrg: string;
    tier: 'SOVEREIGN_AIRGAP' | 'SOVEREIGN_GOVERNMENT';
    issuedAt: number;
    expiresAt: number;
    maxNodes: number;
    allowedFeatures: string[];
    signature: string;
}

export interface AirGapUpdateBundleManifest {
    bundleId: string;
    version: string;
    releaseDate: number;
    tarSha256: string;
    detachedSignature: string;
}

export class SovereignLeaseValidator {
    public static verifyOfflineLease(
        lease: SovereignCryptographicLease,
        rootAnchorPublicKeyPem: string,
        currentTime: number = Date.now()
    ): { valid: boolean; reason?: string } {
        // 1. Time boundary check
        if (currentTime > lease.expiresAt) {
            return { valid: false, reason: __t('ui.responses.lease_expired') };
        }
        if (currentTime < lease.issuedAt - 60000) { // 1 min clock skew allowance
            return { valid: false, reason: __t('ui.responses.lease_not_yet_valid') };
        }

        // 2. Cryptographic signature check over canonical payload
        const { signature, ...payload } = lease;
        const canonical = canonicalize(payload);
        if (!canonical) {
            return { valid: false, reason: __t('ui.responses.canonicalization_failed') };
        }

        try {
            const pubKey = crypto.createPublicKey(rootAnchorPublicKeyPem);
            const verified = crypto.verify(
                null,
                Buffer.from(canonical),
                pubKey,
                Buffer.from(signature, 'base64')
            );

            if (!verified) {
                return { valid: false, reason: __t('ui.responses.invalid_cryptographic_signature') };
            }
        } catch {
            return { valid: false, reason: __t('ui.responses.signature_verification_exception') };
        }

        return { valid: true };
    }

    public static verifyUpdateBundle(
        bundle: AirGapUpdateBundleManifest,
        computedTarDigest: string,
        rootAnchorPublicKeyPem: string
    ): boolean {
        if (computedTarDigest !== bundle.tarSha256) {
            return false;
        }

        try {
            const pubKey = crypto.createPublicKey(rootAnchorPublicKeyPem);
            return crypto.verify(
                null,
                Buffer.from(bundle.tarSha256),
                pubKey,
                Buffer.from(bundle.detachedSignature, 'base64')
            );
        } catch {
            return false;
        }
    }
}
