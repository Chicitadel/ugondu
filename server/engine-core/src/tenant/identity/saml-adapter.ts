/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tenant Identity — SAML Adapter
 * File           : saml-adapter.ts
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { createHash, createHmac, createPublicKey, KeyObject, sign, timingSafeEqual, verify } from 'crypto';
import { __t } from '@ugondu/shared';
import { SubjectContext, SubjectContextFactory } from './subject-context';

export interface SAMLVerificationConfig {
  trustedIssuers?: string[];
  publicKey?: string | KeyObject;
  hmacSecret?: string;
  audience?: string;
  clockSkewMs?: number;
}

/**
 * @class SAMLAdapter
 * @description Corporate Policy Governed SAML 2.0 Assertion Verifier.
 * Enforces cryptographic signature verification (HMAC-SHA256 / RSA-SHA256 / Ed25519),
 * canonical XML digest validation, issuer allowlisting, and temporal bounds.
 * Fails closed when signature, digest, issuer, or subject NameID is missing or invalid.
 * @classification ENTERPRISE
 */
export class SAMLAdapter {
  private readonly config: SAMLVerificationConfig;

  constructor(config: SAMLVerificationConfig = {}) {
    this.config = config;
  }

  public static canonicalizeUnsignedAssertion(assertionXml: string): string {
    return assertionXml
      .replace(/<(?:ds:)?Signature[\s\S]*?<\/(?:ds:)?Signature>/gi, '')
      .replace(/>\s+</g, '><')
      .trim();
  }

  public static computeDigestBase64(assertionXml: string): string {
    const canonical = SAMLAdapter.canonicalizeUnsignedAssertion(assertionXml);
    return createHash('sha256').update(canonical, 'utf8').digest('base64');
  }

  public static signAssertion(
    unsignedAssertionXml: string,
    signer: { hmacSecret?: string; privateKey?: string | KeyObject; algorithm?: 'hmac-sha256' | 'rsa-sha256' | 'ed25519' }
  ): string {
    const digestBase64 = SAMLAdapter.computeDigestBase64(unsignedAssertionXml);
    const canonical = SAMLAdapter.canonicalizeUnsignedAssertion(unsignedAssertionXml);
    const payloadToSign = `${digestBase64}:${canonical}`;

    let signatureBase64: string;
    const alg = signer.algorithm ?? (signer.hmacSecret ? 'hmac-sha256' : 'ed25519');

    if (alg === 'hmac-sha256') {
      if (!signer.hmacSecret) {
        throw new Error('SAML_SIGNING_SECRET_REQUIRED');
      }
      signatureBase64 = createHmac('sha256', signer.hmacSecret).update(payloadToSign, 'utf8').digest('base64');
    } else if (alg === 'rsa-sha256') {
      if (!signer.privateKey) {
        throw new Error('SAML_SIGNING_PRIVATE_KEY_REQUIRED');
      }
      signatureBase64 = sign('RSA-SHA256', Buffer.from(payloadToSign, 'utf8'), signer.privateKey).toString('base64');
    } else {
      if (!signer.privateKey) {
        throw new Error('SAML_SIGNING_PRIVATE_KEY_REQUIRED');
      }
      signatureBase64 = sign(null, Buffer.from(payloadToSign, 'utf8'), signer.privateKey).toString('base64');
    }

    const signatureBlock =
      `<Signature>` +
      `<SignedInfo><SignatureMethod Algorithm="${alg}"/><Reference><DigestValue>${digestBase64}</DigestValue></Reference></SignedInfo>` +
      `<SignatureValue>${signatureBase64}</SignatureValue>` +
      `</Signature>`;

    if (unsignedAssertionXml.includes('</Assertion>')) {
      return unsignedAssertionXml.replace('</Assertion>', `${signatureBlock}</Assertion>`);
    }
    return `${unsignedAssertionXml}${signatureBlock}`;
  }

  public parseAssertion(assertionXml: string, overrideConfig?: SAMLVerificationConfig): SubjectContext {
    if (!assertionXml || typeof assertionXml !== 'string' || !assertionXml.trim()) {
      throw new Error('SAML_ASSERTION_EMPTY');
    }

    const effectiveConfig: SAMLVerificationConfig = {
      ...this.config,
      ...overrideConfig,
    };

    // 1. Extract and validate Issuer
    const issuerMatch = assertionXml.match(/<(?:saml2?:)?Issuer[^>]*>([^<]+)<\/(?:saml2?:)?Issuer>/i);
    const issuer = issuerMatch?.[1]?.trim();
    if (!issuer) {
      throw new Error('SAML_ISSUER_MISSING');
    }

    const trustedIssuers = effectiveConfig.trustedIssuers ?? (
      process.env['UGONDU_SAML_TRUSTED_ISSUERS']
        ? process.env['UGONDU_SAML_TRUSTED_ISSUERS'].split(',').map((s) => s.trim()).filter(Boolean)
        : undefined
    );
    if (trustedIssuers && trustedIssuers.length > 0 && !trustedIssuers.includes(issuer)) {
      throw new Error(`SAML_UNTRUSTED_ISSUER:${issuer}`);
    }

    // 2. Extract and validate NameID
    const nameIdMatch = assertionXml.match(/<(?:saml2?:)?NameID[^>]*>([^<]+)<\/(?:saml2?:)?NameID>/i);
    const subjectId = nameIdMatch?.[1]?.trim();
    if (!subjectId) {
      throw new Error('SAML_NAMEID_MISSING');
    }

    // 3. Validate temporal conditions if present
    const clockSkewMs = effectiveConfig.clockSkewMs ?? 5000;
    const nowMs = Date.now();
    const notBeforeMatch = assertionXml.match(/NotBefore="([^"]+)"/i);
    if (notBeforeMatch?.[1]) {
      const notBeforeMs = Date.parse(notBeforeMatch[1]);
      if (!Number.isNaN(notBeforeMs) && nowMs + clockSkewMs < notBeforeMs) {
        throw new Error('SAML_ASSERTION_NOT_YET_VALID');
      }
    }
    const notOnOrAfterMatch = assertionXml.match(/NotOnOrAfter="([^"]+)"/i);
    if (notOnOrAfterMatch?.[1]) {
      const notOnOrAfterMs = Date.parse(notOnOrAfterMatch[1]);
      if (!Number.isNaN(notOnOrAfterMs) && nowMs - clockSkewMs >= notOnOrAfterMs) {
        throw new Error('SAML_ASSERTION_EXPIRED');
      }
    }

    // 4. Extract and verify DigestValue & SignatureValue (fail closed if missing)
    const sigMatch = assertionXml.match(/<(?:ds:)?SignatureValue[^>]*>([^<]+)<\/(?:ds:)?SignatureValue>/i);
    const signatureBase64 = sigMatch?.[1]?.trim();
    if (!signatureBase64) {
      throw new Error('SAML_SIGNATURE_MISSING');
    }

    const digestMatch = assertionXml.match(/<(?:ds:)?DigestValue[^>]*>([^<]+)<\/(?:ds:)?DigestValue>/i);
    const providedDigest = digestMatch?.[1]?.trim();
    if (!providedDigest) {
      throw new Error('SAML_DIGEST_MISSING');
    }

    const computedDigest = SAMLAdapter.computeDigestBase64(assertionXml);
    const providedDigestBuf = Buffer.from(providedDigest, 'utf8');
    const computedDigestBuf = Buffer.from(computedDigest, 'utf8');
    if (
      providedDigestBuf.length !== computedDigestBuf.length ||
      !timingSafeEqual(providedDigestBuf, computedDigestBuf)
    ) {
      throw new Error('SAML_DIGEST_MISMATCH');
    }

    // 5. Verify cryptographic signature over digest + canonical assertion
    const canonical = SAMLAdapter.canonicalizeUnsignedAssertion(assertionXml);
    const signedPayload = `${computedDigest}:${canonical}`;
    const algMatch = assertionXml.match(/SignatureMethod[^>]*Algorithm="([^"]+)"/i);
    const declaredAlg = (algMatch?.[1] ?? '').toLowerCase();

    const hmacSecret = effectiveConfig.hmacSecret ?? process.env['UGONDU_SAML_HMAC_SECRET'];
    const rawPublicKey = effectiveConfig.publicKey ?? process.env['UGONDU_SAML_PUBLIC_KEY'];

    let signatureVerified = false;

    if (hmacSecret && (declaredAlg.includes('hmac') || !rawPublicKey)) {
      const expectedMac = createHmac('sha256', hmacSecret).update(signedPayload, 'utf8').digest('base64');
      const sigBuf = Buffer.from(signatureBase64, 'utf8');
      const expBuf = Buffer.from(expectedMac, 'utf8');
      if (sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)) {
        signatureVerified = true;
      }
    }

    if (!signatureVerified && rawPublicKey) {
      const pubKeyObj = typeof rawPublicKey === 'string' ? createPublicKey(rawPublicKey) : rawPublicKey;
      const sigBytes = Buffer.from(signatureBase64, 'base64');
      const dataBytes = Buffer.from(signedPayload, 'utf8');

      if (declaredAlg.includes('rsa') || pubKeyObj.asymmetricKeyType === 'rsa') {
        signatureVerified = verify('RSA-SHA256', dataBytes, pubKeyObj, sigBytes);
      } else {
        signatureVerified = verify(null, dataBytes, pubKeyObj, sigBytes);
      }
    }

    if (!hmacSecret && !rawPublicKey) {
      throw new Error('SAML_VERIFICATION_KEY_MISSING');
    }

    if (!signatureVerified) {
      throw new Error(__t('token_verification_failed'));
    }

    // 6. Extract verified tenantId from attribute statement or derive from verified issuer
    const tenantAttrMatch =
      assertionXml.match(/Name="(?:tenantId|tenant_id|tid)"[^>]*>\s*<(?:saml2?:)?AttributeValue[^>]*>([^<]+)<\/(?:saml2?:)?AttributeValue>/i) ??
      assertionXml.match(/<(?:saml2?:)?TenantId[^>]*>([^<]+)<\/(?:saml2?:)?TenantId>/i);

    let tenantId = tenantAttrMatch?.[1]?.trim();
    if (!tenantId) {
      const normalizedIssuer = issuer.replace(/^https?:\/\//i, '').replace(/[^a-zA-Z0-9._-]/g, '-');
      if (!normalizedIssuer) {
        throw new Error('SAML_TENANT_UNRESOLVABLE');
      }
      tenantId = `tenant-${normalizedIssuer}`;
    }

    return SubjectContextFactory.create(
      subjectId,
      tenantId,
      ['saml', issuer],
      { source: 'saml', issuer, digestVerified: true, signatureVerified: true },
      true
    );
  }
}
