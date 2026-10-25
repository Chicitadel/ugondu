/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tenant Identity — OIDC Adapter
 * File           : oidc-adapter.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
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
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { createHmac, createPublicKey, KeyObject, timingSafeEqual, verify } from 'crypto';
import { __t } from '@ugondu/shared';
import { SubjectContext, SubjectContextFactory } from './subject-context';

export interface OIDCVerificationConfig {
  publicKey?: string | KeyObject;
  secret?: string;
  expectedIssuer?: string | string[];
  expectedAudience?: string | string[];
  clockSkewSec?: number;
}

export class OIDCAdapter {
  private readonly config: OIDCVerificationConfig;

  constructor(config: OIDCVerificationConfig = {}) {
    this.config = config;
  }

  public verifyIdToken(token: string, overrideConfig?: OIDCVerificationConfig): SubjectContext {
    if (!token || typeof token !== 'string') {
      throw new Error(__t('invalid_token'));
    }

    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new Error(__t('invalid_jwt_structure'));
    }

    const effectiveConfig: OIDCVerificationConfig = {
      ...this.config,
      ...overrideConfig,
    };

    try {
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Record<string, unknown>;
      const alg = typeof header['alg'] === 'string' ? header['alg'] : '';
      if (!alg || alg.toLowerCase() === 'none') {
        throw new Error('OIDC_UNSIGNED_ALG_PROHIBITED');
      }

      const signingInput = `${parts[0]}.${parts[1]}`;
      const signatureBytes = Buffer.from(parts[2], 'base64url');
      if (signatureBytes.length === 0) {
        throw new Error('OIDC_EMPTY_SIGNATURE');
      }

      const secret = effectiveConfig.secret ?? process.env['UGONDU_OIDC_SECRET'];
      const rawPublicKey = effectiveConfig.publicKey ?? process.env['UGONDU_OIDC_PUBLIC_KEY'];

      if (!secret && !rawPublicKey) {
        throw new Error('OIDC_VERIFICATION_KEY_MISSING');
      }

      let signatureValid = false;
      const upperAlg = alg.toUpperCase();

      if (upperAlg === 'HS256' || upperAlg === 'HS384' || upperAlg === 'HS512') {
        if (!secret) {
          throw new Error('OIDC_HMAC_SECRET_MISSING');
        }
        const hashAlg = upperAlg === 'HS384' ? 'sha384' : upperAlg === 'HS512' ? 'sha512' : 'sha256';
        const expectedSig = createHmac(hashAlg, secret).update(signingInput, 'utf8').digest();
        if (signatureBytes.length === expectedSig.length && timingSafeEqual(signatureBytes, expectedSig)) {
          signatureValid = true;
        }
      } else if (upperAlg === 'RS256' || upperAlg === 'RS384' || upperAlg === 'RS512' || upperAlg === 'ES256') {
        if (!rawPublicKey) {
          throw new Error('OIDC_PUBLIC_KEY_MISSING');
        }
        const pubKeyObj = typeof rawPublicKey === 'string' ? createPublicKey(rawPublicKey) : rawPublicKey;
        const digestAlg = upperAlg === 'RS384' ? 'RSA-SHA384' : upperAlg === 'RS512' ? 'RSA-SHA512' : 'RSA-SHA256';
        signatureValid = verify(digestAlg, Buffer.from(signingInput, 'utf8'), pubKeyObj, signatureBytes);
      } else if (upperAlg === 'EDDSA' || upperAlg === 'ED25519') {
        if (!rawPublicKey) {
          throw new Error('OIDC_PUBLIC_KEY_MISSING');
        }
        const pubKeyObj = typeof rawPublicKey === 'string' ? createPublicKey(rawPublicKey) : rawPublicKey;
        signatureValid = verify(null, Buffer.from(signingInput, 'utf8'), pubKeyObj, signatureBytes);
      } else {
        throw new Error(__t('oidc_unsupported_alg', { alg }));
      }

      if (!signatureValid) {
        throw new Error('OIDC_SIGNATURE_INVALID');
      }

      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;

      if (typeof payload['sub'] !== 'string' || !payload['sub'].trim()) {
        throw new Error(__t('missing_sub_claim'));
      }

      if (typeof payload['exp'] !== 'number') {
        throw new Error('OIDC_MISSING_EXP_CLAIM');
      }

      const clockSkewMs = (effectiveConfig.clockSkewSec ?? 0) * 1000;
      if (payload['exp'] * 1000 + clockSkewMs < Date.now()) {
        throw new Error(__t('token_expired'));
      }

      if (typeof payload['iss'] !== 'string' || !payload['iss'].trim()) {
        throw new Error('OIDC_MISSING_ISS_CLAIM');
      }

      const expectedIss = effectiveConfig.expectedIssuer ?? process.env['UGONDU_OIDC_ISSUER'];
      if (expectedIss) {
        const allowedIssuers = Array.isArray(expectedIss) ? expectedIss : [expectedIss];
        if (!allowedIssuers.includes(payload['iss'])) {
          throw new Error(`OIDC_ISSUER_MISMATCH: ${payload['iss']}`);
        }
      }

      const rawAud = payload['aud'];
      const tokenAudiences = Array.isArray(rawAud)
        ? rawAud.map((a) => String(a))
        : typeof rawAud === 'string' && rawAud.trim()
          ? [rawAud.trim()]
          : [];

      if (tokenAudiences.length === 0) {
        throw new Error('OIDC_MISSING_AUD_CLAIM');
      }

      const expectedAud = effectiveConfig.expectedAudience ?? process.env['UGONDU_OIDC_AUDIENCE'];
      if (expectedAud) {
        const allowedAudiences = Array.isArray(expectedAud) ? expectedAud : [expectedAud];
        const hasMatchingAud = tokenAudiences.some((aud) => allowedAudiences.includes(aud));
        if (!hasMatchingAud) {
          throw new Error(`OIDC_AUDIENCE_MISMATCH: ${tokenAudiences.join(',')}`);
        }
      }

      const resolvedTenantId =
        (typeof payload['tenant_id'] === 'string' && payload['tenant_id'].trim()) ||
        (typeof payload['tid'] === 'string' && payload['tid'].trim()) ||
        `tenant-${payload['iss'].replace(/^https?:\/\//i, '').replace(/[^a-zA-Z0-9._-]/g, '-')}`;

      const emails = Array.isArray(payload['emails'])
        ? (payload['emails'] as string[])
        : typeof payload['email'] === 'string'
          ? [payload['email']]
          : [];

      return SubjectContextFactory.create(
        payload['sub'],
        resolvedTenantId,
        emails,
        {
          issuer: payload['iss'],
          audience: tokenAudiences.join(','),
          alg,
          signatureVerified: true,
        },
        true
      );
    } catch (error) {
      throw new Error(__t('token_verification_failed', { error: String(error) }));
    }
  }
}
