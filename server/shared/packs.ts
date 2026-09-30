/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Language Packs
 * File           : packs.ts
 * Version        : 2.2.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Air Roofers Global Localization Standard (STREAM AA / LP-01, LP-05, LP-08)
 * - Cryptographic Supply-Chain Assurance
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

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export const PACK_AUTHORITY_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAUz8IM99c7+M2Bwg9bWR9BSVRI/J6L5LGu3kZ2q9701M=
-----END PUBLIC KEY-----`;

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

export function verifyLanguagePackSignature(pack: LanguagePack): boolean {
    if (!pack.signature || !pack.artifactDigest) return false;
    try {
        const payload = `${pack.packId}:${pack.locale}:${pack.version}:${pack.artifactDigest}`;
        const sigBuffer = Buffer.from(pack.signature, 'base64');
        return crypto.verify(null, Buffer.from(payload, 'utf8'), PACK_AUTHORITY_PUBLIC_KEY, sigBuffer);
    } catch {
        return false;
    }
}

export function validateLanguagePackIntegrity(pack: LanguagePack): { valid: boolean; error?: string } {
    if (!pack.packId || !pack.locale || !pack.version) {
        return { valid: false, error: 'Incomplete pack manifest' };
    }

    if (pack.schemaVersion !== '1') {
        return { valid: false, error: `Unsupported schema version: ${pack.schemaVersion}` };
    }

    // 1. Digest check
    const calculatedDigest = computePackArtifactDigest(pack.tokens || {});
    if (calculatedDigest !== pack.artifactDigest) {
        return { valid: false, error: `Digest mismatch: expected ${pack.artifactDigest}, got ${calculatedDigest}` };
    }

    // 2. ED25519 signature check
    if (!verifyLanguagePackSignature(pack)) {
        return { valid: false, error: 'Cryptographic signature verification failed' };
    }

    // 3. Completeness check on critical security tokens
    for (const key of CriticalTokens) {
        if (!pack.tokens || !pack.tokens[key]) {
            return { valid: false, error: `Critical security token missing: ${key}` };
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
