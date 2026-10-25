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
    const ancestors = new Set<object>();
    const validate = (current: unknown): void => {
      if (current === null || typeof current === 'string' || typeof current === 'boolean') return;
      if (typeof current === 'number') {
        if (!Number.isFinite(current)) {
          throw new TypeError('Policy content cannot contain non-finite numbers.');
        }
        return;
      }
      if (Array.isArray(current)) {
        if (ancestors.has(current)) throw new TypeError('Policy content cannot contain circular references.');
        ancestors.add(current);
        for (const item of current) validate(item);
        ancestors.delete(current);
        return;
      }
      if (typeof current === 'object') {
        const object = current as Record<string, unknown>;
        const prototype = Object.getPrototypeOf(object);
        if (prototype !== Object.prototype && prototype !== null) {
          throw new TypeError('Policy content must contain only plain JSON objects.');
        }
        if (ancestors.has(object)) throw new TypeError('Policy content cannot contain circular references.');
        ancestors.add(object);
        for (const item of Object.values(object)) validate(item);
        ancestors.delete(object);
        return;
      }
      throw new TypeError('Policy content must be a JSON-compatible value.');
    };

    validate(value);
    const canonical = canonicalize(value as never);
    if (typeof canonical !== 'string') {
      throw new TypeError('Policy content must be a JSON-compatible value.');
    }
    return canonical;
  }
}
