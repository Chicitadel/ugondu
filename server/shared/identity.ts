/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Identity
 * File           : identity.ts
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { randomBytes, sign, verify } from 'crypto';
import { __t } from './i18n';
import { globalTrustRegistry } from './trust_registry';

// In-memory nonce cache to reject replayed service tokens
const nonceCache = new Set<string>();

export interface ServiceTokenPayload {
    iss: string;
    sub: string;
    aud: string;
    scope: string;
    iat: number;
    nbf: number;
    exp: number;
    jti: string;
    keyId: string;
    tokenVersion: string;
}

export function signServiceIdentity(issuer: string, audience: string, scope: string = 'execute'): string {
    const activeKey = globalTrustRegistry.getActiveKeyByPurpose('service-identity');
    if (!activeKey) {
        throw new Error(__t('error_service_key_missing'));
    }

    const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT', kid: activeKey.keyId })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const jti = randomBytes(16).toString('hex');
    
    const payloadObj: ServiceTokenPayload = {
        iss: issuer,
        sub: issuer,
        aud: audience,
        scope: scope,
        iat: now,
        nbf: now,
        exp: now + 60, // 60 seconds
        jti: jti,
        keyId: activeKey.keyId,
        tokenVersion: '1.0'
    };
    
    const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const privateKeyObj = globalTrustRegistry.getPrivateKeyObject(activeKey.keyId);
    
    const signature = sign(null, Buffer.from(`${header}.${payload}`), privateKeyObj).toString('base64url');
    return `${header}.${payload}.${signature}`;
}

export function requireServiceIdentity(expectedAudience: string, requiredScope?: string) {
    return (req: any, res: any, next: any) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'MISSING_SERVICE_TOKEN', message: __t('auth_service_token_missing') });
        }
        
        try {
            const token = auth.substring(7);
            const [headerB64, payloadB64, signatureB64] = token.split('.');
            
            if (!headerB64 || !payloadB64 || !signatureB64) {
                return res.status(401).json({ error: 'MALFORMED_SERVICE_TOKEN', message: __t('auth_service_malformed') });
            }

            const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
            if (header.alg !== 'EdDSA') {
                return res.status(401).json({ error: 'INVALID_ALGORITHM', message: __t('auth_service_alg_invalid') });
            }

            const keyId = header.kid;
            if (!keyId) {
                return res.status(401).json({ error: 'MISSING_KEY_ID', message: __t('auth_service_kid_missing') });
            }

            globalTrustRegistry.validateKeyStatus(keyId);
            globalTrustRegistry.verifyPurpose(keyId, 'service-identity');

            const publicKeyObj = globalTrustRegistry.getPublicKeyObject(keyId);
            
            const isValid = verify(
                null,
                Buffer.from(`${headerB64}.${payloadB64}`),
                publicKeyObj,
                Buffer.from(signatureB64, 'base64url')
            );
            
            if (!isValid) {
                return res.status(401).json({ error: 'INVALID_SERVICE_SIGNATURE', message: __t('auth_service_sig_invalid') });
            }
            
            const decodedPayload: ServiceTokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
            
            if (decodedPayload.aud !== expectedAudience) {
                return res.status(403).json({ error: 'AUDIENCE_MISMATCH', message: __t('auth_service_aud_mismatch', expectedAudience) });
            }
            
            if (requiredScope && decodedPayload.scope !== requiredScope) {
                return res.status(403).json({ error: 'SCOPE_MISMATCH', message: __t('auth_service_scope_mismatch') });
            }

            const now = Math.floor(Date.now() / 1000);
            if (now < decodedPayload.nbf) {
                return res.status(401).json({ error: 'TOKEN_NOT_YET_VALID', message: __t('auth_service_token_not_yet_valid') });
            }

            if (now > decodedPayload.exp) {
                return res.status(401).json({ error: 'TOKEN_EXPIRED', message: __t('auth_service_token_expired') });
            }

            if (nonceCache.has(decodedPayload.jti)) {
                return res.status(401).json({ error: 'TOKEN_REPLAYED', message: __t('auth_service_token_replayed') });
            }

            nonceCache.add(decodedPayload.jti);
            
            // Cleanup cache periodically to avoid memory leak (simplified for this exercise)
            setTimeout(() => nonceCache.delete(decodedPayload.jti), 65000);
            
            (req as any).serviceIdentity = decodedPayload;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'MALFORMED_SERVICE_TOKEN', message: __t('auth_service_malformed') });
        }
    };
}
