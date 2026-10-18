/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Cryptographic Key Loader
 * File           : key-loader.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
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
 * - ISO 27001
 * - SOC 2 Type II
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { createPrivateKey, createPublicKey, KeyObject, createHash } from 'crypto';
import { __t } from '@ugondu/shared';

export type KeyMaterialSource =
    | 'UGONDU_KEY_REF'
    | 'UGONDU_RECIPE_PRIVATE_KEY'
    | 'UGONDU_PRIVATE_KEY'
    | 'EPHEMERAL_MEMORY';

export interface KeyState {
    privateKey: KeyObject;
    publicKey: KeyObject;
    keyId: string;
    publicKeyPem: string;
    source?: KeyMaterialSource;
    keyRef?: string;
    ephemeral?: boolean;
}

export type KeyLoadErrorCode =
    | 'INSECURE_KEY_LITERAL'
    | 'INVALID_KEY_REF'
    | 'KEY_REF_RESOLUTION_FAILED'
    | 'INVALID_KEY_MATERIAL'
    | 'NO_KEY_CONFIGURED';

export class KeyLoadError extends Error {
    public readonly code: KeyLoadErrorCode;

    constructor(message: string, code: KeyLoadErrorCode = 'NO_KEY_CONFIGURED') {
        super(message);
        this.name = 'KeyLoadError';
        this.code = code;
    }
}

export const FORBIDDEN_INSECURE_KEY_LITERALS: ReadonlyArray<string> = Object.freeze([
    'ci-test-key-not-for-production',
    'ci-key',
    'test-key',
    '<placeholder>',
    'placeholder',
    'changeme',
    'default',
    'dummy-key',
    'insecure-key'
]);

const SUPPORTED_KEY_REF_SCHEMES: ReadonlyArray<string> = Object.freeze([
    'kms://',
    'aws-secrets://',
    'secretless-registry://',
    'hsm://',
    'vault://',
    'env://'
]);

export function isForbiddenKeyLiteral(raw?: string | null): boolean {
    if (!raw || typeof raw !== 'string') return false;
    const normalized = raw.trim().toLowerCase();
    if (!normalized) return false;
    return (
        FORBIDDEN_INSECURE_KEY_LITERALS.includes(normalized) ||
        normalized.includes('ci-test-key-not-for-production') ||
        normalized === 'ci-key' ||
        normalized === 'test-key'
    );
}

export function isManagedKeyReference(raw?: string | null): boolean {
    if (!raw || typeof raw !== 'string') return false;
    const trimmed = raw.trim();
    return SUPPORTED_KEY_REF_SCHEMES.some((scheme) => trimmed.startsWith(scheme));
}

export class KeyLoader {
    private readonly env: NodeJS.ProcessEnv;
    private readonly secretVault: ReadonlyMap<string, string>;

    constructor(env?: NodeJS.ProcessEnv, secretStore?: Record<string, string>) {
        this.env = env ?? process.env;
        this.secretVault = new Map(Object.entries(secretStore ?? {}));
    }

    public load(): KeyState {
        const rawKeyRef = this.env['UGONDU_KEY_REF'];
        const rawRecipeKey = this.env['UGONDU_RECIPE_PRIVATE_KEY'];
        const rawPrivateKey = this.env['UGONDU_PRIVATE_KEY'];

        // 1. Fail closed immediately if any configured key or reference is a known insecure literal
        if (
            isForbiddenKeyLiteral(rawKeyRef) ||
            isForbiddenKeyLiteral(rawRecipeKey) ||
            isForbiddenKeyLiteral(rawPrivateKey)
        ) {
            throw new KeyLoadError(
                __t('err_insecure_key_literal'),
                'INSECURE_KEY_LITERAL'
            );
        }

        // 2. Resolve managed KMS / HSM / Secrets Manager reference if UGONDU_KEY_REF is provided
        if (rawKeyRef && rawKeyRef.trim().length > 0) {
            const trimmedRef = rawKeyRef.trim();
            if (!isManagedKeyReference(trimmedRef)) {
                throw new KeyLoadError(
                    __t('err_invalid_key_reference_scheme'),
                    'INVALID_KEY_REF'
                );
            }

            const resolvedMaterial = this.resolveKeyReference(trimmedRef);
            if (isForbiddenKeyLiteral(resolvedMaterial)) {
                throw new KeyLoadError(
                    __t('err_insecure_key_literal'),
                    'INSECURE_KEY_LITERAL'
                );
            }

            return this.parseKeyMaterial(resolvedMaterial, 'UGONDU_KEY_REF', trimmedRef);
        }

        // 3. Support both UGONDU_RECIPE_PRIVATE_KEY and UGONDU_PRIVATE_KEY
        const rawEnvKey =
            rawRecipeKey && rawRecipeKey.trim().length > 0
                ? rawRecipeKey.trim()
                : rawPrivateKey && rawPrivateKey.trim().length > 0
                  ? rawPrivateKey.trim()
                  : undefined;

        const sourceName: KeyMaterialSource =
            rawRecipeKey && rawRecipeKey.trim().length > 0
                ? 'UGONDU_RECIPE_PRIVATE_KEY'
                : 'UGONDU_PRIVATE_KEY';

        if (rawEnvKey) {
            if (isManagedKeyReference(rawEnvKey)) {
                const resolvedFromRef = this.resolveKeyReference(rawEnvKey);
                if (isForbiddenKeyLiteral(resolvedFromRef)) {
                    throw new KeyLoadError(
                        __t('err_insecure_key_literal'),
                        'INSECURE_KEY_LITERAL'
                    );
                }
                return this.parseKeyMaterial(resolvedFromRef, sourceName, rawEnvKey);
            }

            return this.parseKeyMaterial(rawEnvKey, sourceName);
        }

        // 4. Never silently read unverified local private key files; fail closed when no key is configured
        throw new KeyLoadError(
            __t('msg_no_private_key_available_ugondu_recipe_p'),
            'NO_KEY_CONFIGURED'
        );
    }

    private resolveKeyReference(reference: string): string {
        if (this.secretVault.has(reference)) {
            return this.secretVault.get(reference)!;
        }

        const matchedScheme = SUPPORTED_KEY_REF_SCHEMES.find((scheme) => reference.startsWith(scheme));
        if (!matchedScheme) {
            throw new KeyLoadError(__t('err_invalid_key_reference_scheme'), 'INVALID_KEY_REF');
        }

        const identifier = reference.slice(matchedScheme.length).trim();
        if (!identifier || identifier.includes('..') || identifier.includes('\\') || /\s/.test(identifier)) {
            throw new KeyLoadError(__t('err_invalid_key_reference_scheme'), 'INVALID_KEY_REF');
        }

        if (this.secretVault.has(identifier)) {
            return this.secretVault.get(identifier)!;
        }

        if (matchedScheme === 'env://') {
            const envVal = this.env[identifier];
            if (!envVal || !envVal.trim()) {
                throw new KeyLoadError(__t('err_key_reference_unresolved'), 'KEY_REF_RESOLUTION_FAILED');
            }
            return envVal.trim();
        }

        const normalizedId = identifier.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
        const prefixMap: Record<string, string> = {
            'kms://': 'KMS_',
            'aws-secrets://': 'AWS_SECRETS_',
            'secretless-registry://': 'SECRETLESS_REGISTRY_',
            'hsm://': 'HSM_',
            'vault://': 'VAULT_'
        };
        const prefix = prefixMap[matchedScheme] || 'KMS_';

        const candidate =
            this.env[`${prefix}${normalizedId}`] ||
            this.env[normalizedId] ||
            this.env['UGONDU_HSM_PRIVATE_KEY_PEM'] ||
            this.env['UGONDU_RECIPE_PRIVATE_KEY'] ||
            this.env['UGONDU_PRIVATE_KEY'];

        if (!candidate || !candidate.trim()) {
            throw new KeyLoadError(__t('err_key_reference_unresolved'), 'KEY_REF_RESOLUTION_FAILED');
        }

        return candidate.trim();
    }

    private parseKeyMaterial(
        rawMaterial: string,
        source: KeyMaterialSource,
        keyRef?: string
    ): KeyState {
        try {
            const normalizedPem = rawMaterial.replace(/\\n/g, '\n').trim();
            const privateKey = createPrivateKey(normalizedPem);
            const publicKey = createPublicKey(privateKey);
            const pubPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
            const keyId = 'key_' + createHash('sha256').update(pubPem).digest('hex').substring(0, 16);

            return {
                privateKey,
                publicKey,
                keyId,
                publicKeyPem: pubPem,
                source,
                ...(keyRef ? { keyRef } : {}),
                ephemeral: false
            };
        } catch {
            throw new KeyLoadError(
                __t('msg_failed_to_parse_ugondu_recipe_private_ke'),
                'INVALID_KEY_MATERIAL'
            );
        }
    }
}
