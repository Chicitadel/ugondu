/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Discovery
 * File           : secret-redaction.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export interface SecretFinding {
  type: string;
  source: string;
  location: string;
  detectedAt: Date;
  redactedLength: number;
}

/**
 * @class SecretRedactionEngine
 * @description Corporate Governed class implementation for SecretRedactionEngine
 * @classification ENTERPRISE
 */
export class SecretRedactionEngine {
  // Common patterns for high-entropy secrets (AWS keys, JWTs, private keys)
  private readonly secretPatterns: Array<{ type: string; regex: RegExp }> = [
    { type: 'AWS_ACCESS_KEY', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/g },
    { type: 'JWT_TOKEN', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
    { type: 'PRIVATE_KEY', regex: /-----BEGIN (RSA|EC|DSA|OPENSSH) PRIVATE KEY-----[\s\S]+?-----END \1 PRIVATE KEY-----/g },
    { type: 'GENERIC_BEARER', regex: /[Bb]earer [a-zA-Z0-9_.-]{20,}/g }
  ];

  /**
   * Scans content for secrets, redacts them from the output,
   * and returns metadata about the findings without exposing the secrets.
   */
  public process(content: string, source: string, location: string): { cleanContent: string; findings: SecretFinding[] } {
    let cleanContent = content;
    const findings: SecretFinding[] = [];

    for (const pattern of this.secretPatterns) {
      let match;
      // We must reset lastIndex if we reuse regexes, but these are newly created via the getter?
      // Wait, in JS the 'g' flag makes it stateful, let's clone the regex to avoid state issues
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      
      while ((match = regex.exec(content)) !== null) {
        findings.push({
          type: pattern.type,
          source: source,
          location: location,
          detectedAt: new Date(),
          redactedLength: match[0].length
        });
      }
      
      // Replace in clean content
      cleanContent = cleanContent.replace(regex, '[REDACTED_SECRET]');
    }

    return { cleanContent, findings };
  }
}
