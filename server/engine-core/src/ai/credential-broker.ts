/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / AI / Credential Broker
 * File           : credential-broker.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
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
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import { __t } from '@ugondu/shared';
import { AiGatewayError } from './contracts';

export type CredentialScheme = 'env' | 'aws-secrets' | 'kms';

export interface CredentialHandle {
    readonly credentialRef: string;
    readonly scheme: CredentialScheme;
    readonly keyId: string;
    readonly fingerprintSha256: string;
    readonly expiresAt?: string;
}

interface StoredSecretRecord {
    rawSecret: string;
    expiresAt?: string;
}

const ALLOWED_SCHEMES: ReadonlySet<string> = new Set(['env', 'aws-secrets', 'kms']);

const SENSITIVE_KEY_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /api[-_]?key/i,
    /authorization/i,
    /credential/i,
    /private[-_]?key/i,
    /x-api-key/i,
];

const INLINE_SECRET_REGEXES: RegExp[] = [
    /-----BEGIN (?:RSA |EC |OPENSSH |PRIVATE )?KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |PRIVATE )?KEY-----/g,
    /\bsk-[A-Za-z0-9_-]{12,}\b/g,
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\bASIA[0-9A-Z]{16}\b/g,
    /\bAIza[0-9A-Za-z_-]{20,}\b/g,
    /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi,
];

export class CredentialBroker {
    private readonly secretVault = new Map<string, StoredSecretRecord>();
    private readonly knownSecretValues = new Set<string>();

    public static isValidCredentialRef(ref: string): boolean {
        if (typeof ref !== 'string' || ref.trim().length === 0) {
            return false;
        }
        const match = /^([a-z-]+):\/\/(.+)$/.exec(ref.trim());
        if (!match) {
            return false;
        }
        const [, scheme, target] = match;
        if (!ALLOWED_SCHEMES.has(scheme) || target.trim().length < 2) {
            return false;
        }
        // Reject raw secret patterns masquerading as a ref
        if (/^(sk-|AKIA|ASIA|Bearer\s|-----BEGIN)/i.test(target)) {
            return false;
        }
        return true;
    }

    public parseCredentialRef(credentialRef: string): { scheme: CredentialScheme; keyId: string } {
        if (!CredentialBroker.isValidCredentialRef(credentialRef)) {
            throw new AiGatewayError(
                'CREDENTIALS_INVALID',
                __t('ai.error.credentials_invalid_ref'),
                400,
                { credentialRef: this.redactString(String(credentialRef)) }
            );
        }
        const match = /^([a-z-]+):\/\/(.+)$/.exec(credentialRef.trim())!;
        return {
            scheme: match[1] as CredentialScheme,
            keyId: match[2].trim(),
        };
    }

    /**
     * Registers a workload secret in the isolated in-memory vault (for workload identity hydration or sandbox tests).
     * Never exposes the raw secret value via public getters.
     */
    public registerWorkloadSecret(credentialRef: string, rawSecret: string, expiresAt?: string): void {
        this.parseCredentialRef(credentialRef);
        if (typeof rawSecret !== 'string' || rawSecret.trim().length === 0) {
            throw new AiGatewayError('CREDENTIALS_MISSING', __t('ai.error.credentials_empty_value'), 503);
        }
        this.secretVault.set(credentialRef, { rawSecret, expiresAt });
        if (rawSecret.length >= 6) {
            this.knownSecretValues.add(rawSecret);
        }
    }

    public revokeWorkloadSecret(credentialRef: string): void {
        this.secretVault.delete(credentialRef);
    }

    public clearVault(): void {
        this.secretVault.clear();
    }

    /**
     * Resolves a credential reference into a safe metadata handle without returning the secret value.
     * Fails closed with CREDENTIALS_MISSING or CREDENTIALS_EXPIRED.
     */
    public resolveHandle(credentialRef: string): CredentialHandle {
        const { scheme, keyId } = this.parseCredentialRef(credentialRef);
        const record = this.lookupRawRecord(credentialRef, scheme, keyId);

        if (!record || !record.rawSecret || record.rawSecret.trim().length === 0) {
            throw new AiGatewayError(
                'CREDENTIALS_MISSING',
                __t('ai.error.credentials_missing'),
                503,
                { credentialRef, scheme }
            );
        }

        if (record.rawSecret.length >= 6) {
            this.knownSecretValues.add(record.rawSecret);
        }

        if (this.isRecordExpired(record)) {
            throw new AiGatewayError(
                'CREDENTIALS_EXPIRED',
                __t('ai.error.credentials_expired'),
                503,
                { credentialRef, scheme, expiresAt: record.expiresAt }
            );
        }

        const fingerprintSha256 = crypto
            .createHash('sha256')
            .update(record.rawSecret, 'utf8')
            .digest('hex')
            .slice(0, 16);

        return Object.freeze({
            credentialRef,
            scheme,
            keyId,
            fingerprintSha256,
            expiresAt: record.expiresAt,
        });
    }

    /**
     * Executes an adapter callback with ephemeral access to the resolved credential material.
     * Any thrown error is automatically scrubbed of secret values before propagating.
     */
    public async withCredential<T>(
        credentialRef: string,
        callback: (ephemeralSecret: string, handle: CredentialHandle) => Promise<T>
    ): Promise<T> {
        const handle = this.resolveHandle(credentialRef);
        const record = this.lookupRawRecord(credentialRef, handle.scheme, handle.keyId)!;
        try {
            return await callback(record.rawSecret, handle);
        } catch (err: any) {
            if (err instanceof AiGatewayError) {
                throw new AiGatewayError(
                    err.errorCode,
                    this.redactString(err.message),
                    err.statusCode,
                    this.redactObject(err.details) as Record<string, unknown>
                );
            }
            const safeMessage = this.redactString(err?.message || 'Upstream provider invocation failed');
            throw new AiGatewayError('UPSTREAM_UNAVAILABLE', safeMessage, 502, {
                credentialRef,
            });
        }
    }

    public redactString(input: string): string {
        if (typeof input !== 'string' || input.length === 0) {
            return input;
        }
        let sanitized = input;
        for (const secret of this.knownSecretValues) {
            if (secret && sanitized.includes(secret)) {
                sanitized = sanitized.split(secret).join('[REDACTED_SECRET]');
            }
        }
        for (const regex of INLINE_SECRET_REGEXES) {
            sanitized = sanitized.replace(regex, '[REDACTED_SECRET]');
        }
        return sanitized;
    }

    public redactObject(value: unknown): unknown {
        if (value === null || value === undefined) {
            return value;
        }
        if (typeof value === 'string') {
            return this.redactString(value);
        }
        if (typeof value !== 'object') {
            return value;
        }
        if (Array.isArray(value)) {
            return value.map(item => this.redactObject(item));
        }
        const output: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
            if (key === 'credentialRef' || key === 'providerModelIdRef' || key === 'accountRef') {
                output[key] = typeof val === 'string' ? this.redactString(val) : val;
                continue;
            }
            if (SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key))) {
                output[key] = '[REDACTED]';
            } else {
                output[key] = this.redactObject(val);
            }
        }
        return output;
    }

    private isRecordExpired(record: StoredSecretRecord): boolean {
        if (record.rawSecret.startsWith('EXPIRED:')) {
            return true;
        }
        if (record.expiresAt) {
            const expiryTime = Date.parse(record.expiresAt);
            if (!Number.isNaN(expiryTime) && expiryTime <= Date.now()) {
                return true;
            }
        }
        return false;
    }

    private lookupRawRecord(
        credentialRef: string,
        scheme: CredentialScheme,
        keyId: string
    ): StoredSecretRecord | undefined {
        const vaulted = this.secretVault.get(credentialRef);
        if (vaulted) {
            return vaulted;
        }

        if (scheme === 'env') {
            const envVal = process.env[keyId];
            if (envVal) {
                const expEnv = process.env[`${keyId}_EXPIRES_AT`];
                return { rawSecret: envVal, expiresAt: expEnv };
            }
            return undefined;
        }

        if (scheme === 'aws-secrets') {
            const normalizedEnvKey = 'UGONDU_AWS_SECRET_' + keyId.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
            const envVal = process.env[normalizedEnvKey] || process.env['UGONDU_BEDROCK_WORKLOAD_TOKEN'];
            if (envVal) {
                return {
                    rawSecret: envVal,
                    expiresAt: process.env[`${normalizedEnvKey}_EXPIRES_AT`],
                };
            }
            return undefined;
        }

        if (scheme === 'kms') {
            const normalizedEnvKey = 'UGONDU_KMS_SECRET_' + keyId.replace(/[^A-Za-z0-9]/g, '_').toUpperCase();
            const envVal = process.env[normalizedEnvKey];
            if (envVal) {
                return {
                    rawSecret: envVal,
                    expiresAt: process.env[`${normalizedEnvKey}_EXPIRES_AT`],
                };
            }
            return undefined;
        }

        return undefined;
    }
}
