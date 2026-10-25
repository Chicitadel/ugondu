/******************************************************************************
 * Project        : Ugondu
 * Module         : tenant/policy
 * File           : digest.ts
 * Version        : 1.1.0
 * Author         : Ugondu Engineer
 * Organization   : Ujomor Platform
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-26
 * Classification : ENTERPRISE
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
 * - NIST
 *
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';

/**
 * Computes a deterministic SHA-256 digest for policy content.
 * JSON strings and object values use RFC 8785 canonical JSON so property order
 * and insignificant whitespace do not change the digest. Non-JSON text strings
 * and Buffers are hashed as their exact UTF-8 / byte content.
 *
 * Unsupported JavaScript values fail closed instead of receiving a placeholder
 * digest that could make distinct policies appear equivalent.
 */
export class PolicyDigest {
  public generate(policyContent: unknown): string {
    if (Buffer.isBuffer(policyContent)) {
      return createHash('sha256').update(policyContent).digest('hex');
    }

    let canonicalContent: string;
    if (typeof policyContent === 'string') {
      try {
        const parsed: unknown = JSON.parse(policyContent);
        canonicalContent = this.canonicalizeJsonValue(parsed);
      } catch (error) {
        // A parse failure means the input is literal text, not a JSON policy.
        // Do not silently normalize or discard its bytes.
        if (error instanceof SyntaxError) {
          return createHash('sha256').update(policyContent, 'utf8').digest('hex');
        }
        throw error;
      }
    } else {
      canonicalContent = this.canonicalizeJsonValue(policyContent);
    }

    return createHash('sha256').update(canonicalContent, 'utf8').digest('hex');
  }

  private canonicalizeJsonValue(value: unknown): string {
    const canonical = canonicalize(value as never);
    if (typeof canonical !== 'string') {
      throw new TypeError('Policy content must be a JSON-compatible value.');
    }
    return canonical;
  }
}
