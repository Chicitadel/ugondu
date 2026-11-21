/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Marketplace Registry
 * File           : registry.ts
 * Version        : 2.0.0
 * Author         : Marketplace & Ecosystem Governance Authority
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

export type PackageStatus = 'PENDING_REVIEW' | 'VERIFIED' | 'REVOKED';

export interface MarketplacePublisher {
    publisherId: string;
    organization: string;
    publicKeyPem: string;
    status: 'ACTIVE' | 'REVOKED';
}

export interface MarketplacePackageManifest {
    packageId: string;
    name: string;
    version: string;
    publisherId: string;
    bundleDigest: string; // sha256:...
    requiredCapabilities: string[];
    createdAt: number;
    signature: string;
}

export interface PackageValidationResult {
    valid: boolean;
    reason?: string;
    status: PackageStatus;
}

export class GovernedMarketplaceRegistry {
    private publishers: Map<string, MarketplacePublisher> = new Map();
    private packages: Map<string, { manifest: MarketplacePackageManifest; status: PackageStatus }> = new Map();

    public registerPublisher(publisher: MarketplacePublisher): void {
        this.publishers.set(publisher.publisherId, publisher);
    }

    public revokePublisher(publisherId: string): void {
        const pub = this.publishers.get(publisherId);
        if (pub) {
            pub.status = 'REVOKED';
            // Revoke all packages by this publisher
            for (const [pkgId, entry] of this.packages.entries()) {
                if (entry.manifest.publisherId === publisherId) {
                    entry.status = 'REVOKED';
                }
            }
        }
    }

    public registerPackage(manifest: MarketplacePackageManifest): PackageValidationResult {
        const publisher = this.publishers.get(manifest.publisherId);
        if (!publisher) {
            return { valid: false, reason: __t('ui.responses.unknown_publisher'), status: 'REVOKED' };
        }
        if (publisher.status === 'REVOKED') {
            return { valid: false, reason: __t('ui.responses.revoked_publisher'), status: 'REVOKED' };
        }

        // Verify signature over canonical manifest payload without signature field
        const { signature, ...canonicalData } = manifest;
        const canonicalString = canonicalize(canonicalData);
        if (!canonicalString) {
            return { valid: false, reason: __t('ui.responses.canonicalization_failed'), status: 'PENDING_REVIEW' };
        }

        try {
            const pubKey = crypto.createPublicKey(publisher.publicKeyPem);
            const verified = crypto.verify(
                null,
                Buffer.from(canonicalString),
                pubKey,
                Buffer.from(signature, 'base64')
            );

            if (!verified) {
                return { valid: false, reason: __t('ui.responses.invalid_signature'), status: 'PENDING_REVIEW' };
            }
        } catch (err: any) {
            return { valid: false, reason: __t('ui.responses.cryptographic_verification_error'), status: 'PENDING_REVIEW' };
        }

        // Zero-trust check: Reject packages demanding forbidden shell capabilities
        if (manifest.requiredCapabilities.includes('SHELL_EXEC') || manifest.requiredCapabilities.includes('EXEC_RAW')) {
            return { valid: false, reason: __t('ui.responses.forbidden_capability_requested'), status: 'REVOKED' };
        }

        this.packages.set(manifest.packageId, {
            manifest,
            status: 'VERIFIED'
        });

        return { valid: true, status: 'VERIFIED' };
    }

    public getPackage(packageId: string): { manifest: MarketplacePackageManifest; status: PackageStatus } | undefined {
        return this.packages.get(packageId);
    }

    public verifyAdmission(packageId: string, allowedCapabilities: string[]): boolean {
        const pkg = this.packages.get(packageId);
        if (!pkg || pkg.status !== 'VERIFIED') return false;

        const allowedSet = new Set(allowedCapabilities);
        return pkg.manifest.requiredCapabilities.every(cap => allowedSet.has(cap));
    }
}
