/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Language Packs
 * File           : packs.ts
 * Version        : 2.3.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-01, LP-05, LP-08)
 * - Cryptographic Supply-Chain Assurance (OWASP ASVS 5.0 V9.1 / V9.2)
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from './i18n';

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import canonicalize from 'canonicalize';
import { globalTrustRegistry } from './trust_registry';

export interface LanguagePack {
    packId: string;
    locale: string;
    language: string;
    region: string;
    version: string;
    platformVersion: string;
    minCoreVersion: string;
    maxCoreVersion: string;
    schemaVersion: string;
    publisher: string;
    fallbackLocale: string;
    direction: 'ltr' | 'rtl';
    artifactDigest: string;
    signature: string;
    tokens: Record<string, string>;
}

export const CriticalTokens = [
    'err_not_repo',
    'auth_missing',
    'plugin_sig_invalid',
    'path_traversal_err',
    'locked_error',
    'prompt_destructive',
    'aborting',
    'exec_failed',
    'dep_complete',
    'persistence_failure_error'
];

export function computePackArtifactDigest(tokens: Record<string, string>): string {
    const sortedKeys = Object.keys(tokens).sort();
    const canonicalObj: Record<string, string> = {};
    for (const k of sortedKeys) {
        canonicalObj[k] = tokens[k];
    }
    const data = JSON.stringify(canonicalObj);
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    return `sha256:${hash}`;
}

export function computePackManifestPayload(pack: Partial<LanguagePack>): string {
    const canonicalManifest = {
        artifactDigest: pack.artifactDigest || '',
        direction: pack.direction || 'ltr',
        fallbackLocale: pack.fallbackLocale || '',
        language: pack.language || '',
        locale: pack.locale || '',
        maxCoreVersion: pack.maxCoreVersion || '',
        minCoreVersion: pack.minCoreVersion || '',
        packId: pack.packId || '',
        platformVersion: pack.platformVersion || '',
        publisher: pack.publisher || '',
        region: pack.region || '',
        schemaVersion: pack.schemaVersion || '1',
        version: pack.version || ''
    };
    return (canonicalize as any)(canonicalManifest) || JSON.stringify(canonicalManifest);
}

export function signLanguagePackManifest(pack: Partial<LanguagePack>, privateKeyPem?: string): string {
    const payload = computePackManifestPayload(pack);
    const pem = privateKeyPem || process.env.UGONDU_LANGPACK_PRIVATE_KEY;
    if (!pem) throw new Error(__t('messages.error.ugondu_langpack_private_key_is_required_for_l'));
    const privKey = crypto.createPrivateKey(pem);
    return crypto.sign(null, Buffer.from(payload, 'utf8'), privKey).toString('base64');
}

export function verifyLanguagePackSignature(pack: LanguagePack, publicKeyPem?: string): boolean {
    if (!pack.signature || !pack.artifactDigest) return false;
    try {
        const payload = computePackManifestPayload(pack);
        const pubKey = publicKeyPem
            ? crypto.createPublicKey(publicKeyPem)
            : (() => {
                const key = globalTrustRegistry.getActiveKeyByPurpose('language-pack');
                if (!key) throw new Error(__t('messages.error.no_active_language_pack_key_found'));
                return globalTrustRegistry.getPublicKeyObject(key.keyId);
            })();

        const sigBuffer = Buffer.from(pack.signature, 'base64');
        return crypto.verify(null, Buffer.from(payload, 'utf8'), pubKey, sigBuffer);
    } catch {
        return false;
    }
}

export function validateLanguagePackIntegrity(pack: LanguagePack, publicKeyPem?: string): { valid: boolean; error?: string } {
    if (!pack.packId || !pack.locale || !pack.version) {
        return { valid: false, error: __t('ui.responses.incomplete_pack_manifest') };
    }

    if (pack.schemaVersion !== '1') {
        return { valid: false, error: __t('messages.error.unsupported_schema_version', { schemaVersion: pack.schemaVersion }) };
    }

    // 1. Digest check over tokens
    const calculatedDigest = computePackArtifactDigest(pack.tokens || {});
    if (calculatedDigest !== pack.artifactDigest) {
        return { valid: false, error: __t('messages.error.digest_mismatch', { expected: pack.artifactDigest, got: calculatedDigest }) };
    }

    // 2. ED25519 signature check over complete canonical manifest
    if (!verifyLanguagePackSignature(pack, publicKeyPem)) {
        return { valid: false, error: __t('ui.responses.cryptographic_signature_verification_failed') };
    }

    // 3. Completeness check on critical security tokens
    for (const key of CriticalTokens) {
        if (!pack.tokens || !pack.tokens[key]) {
            return { valid: false, error: __t('messages.error.critical_token_missing', { key }) };
        }
    }

    return { valid: true };
}

export class LanguagePackRegistry {
    private packs = new Map<string, LanguagePack>();

    constructor() {
        this.discoverPacks();
    }

    public discoverPacks(): void {
        const searchDirs = [
            path.resolve(__dirname, '../../../packs'),
            path.resolve(__dirname, '../../packs'),
            path.resolve(process.cwd(), 'packs')
        ];

        for (const dir of searchDirs) {
            if (!fs.existsSync(dir)) continue;
            const entries = fs.readdirSync(dir);
            for (const entry of entries) {
                if (!entry.endsWith('.upl.json')) continue;
                const filePath = path.join(dir, entry);
                try {
                    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    const validation = validateLanguagePackIntegrity(content);
                    if (validation.valid) {
                        this.packs.set(content.locale.toLowerCase(), content);
                    }
                } catch {
                    // Ignore unreadable or corrupt packs in search path
                }
            }
        }
    }

    public getInstalledPacks(): LanguagePack[] {
        return Array.from(this.packs.values());
    }

    public getPack(locale: string): LanguagePack | undefined {
        return this.packs.get(locale.toLowerCase());
    }

    // Resolves best locale matching LP-03 & LP-08 negotiation rules
    public resolveLocale(acceptLanguage?: string, tenantDefault?: string, userPreference?: string): string {
        // 1. User Preference
        if (userPreference && this.packs.has(userPreference.toLowerCase())) {
            return userPreference;
        }

        // 2. Tenant Default
        if (tenantDefault && this.packs.has(tenantDefault.toLowerCase())) {
            return tenantDefault;
        }

        // 3. HTTP Accept-Language Header negotiation
        if (acceptLanguage) {
            const preferences = acceptLanguage
                .split(',')
                .map(item => {
                    const [code, qVal] = item.trim().split(';q=');
                    return {
                        code: code.trim(),
                        q: qVal ? parseFloat(qVal) : 1.0
                    };
                })
                .sort((a, b) => b.q - a.q);

            for (const pref of preferences) {
                const norm = pref.code.toLowerCase();
                if (this.packs.has(norm)) {
                    return this.packs.get(norm)!.locale;
                }
                // Try language prefix (e.g. "fr" matching "fr-FR")
                for (const [key, pack] of this.packs.entries()) {
                    if (key.startsWith(norm + '-') || key === norm) {
                        return pack.locale;
                    }
                }
            }
        }

        return 'en-US';
    }
}

export const globalPackRegistry = new LanguagePackRegistry();

// Express middleware for Server-Side Locale Negotiation (LP-08)
export function localeNegotiationMiddleware(req: any, res: any, next: any) {
    const acceptHeader = req.headers['accept-language'];
    const tenantLocale = req.headers['x-tenant-locale'] || (req as any).tenantLocale;
    const userLocale = req.headers['x-user-locale'] || (req as any).userLocale;

    const resolved = globalPackRegistry.resolveLocale(acceptHeader, tenantLocale, userLocale);
    req.locale = resolved;
    res.setHeader('Content-Language', resolved);
    next();
}
