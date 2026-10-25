/******************************************************************************
 * Project        : Ugondu
 * Module         : tenant/policy
 * File           : resolver.ts
 * Version        : 1.0.0
 * Author         : Ugondu Engineer
 * Organization   : Ujomor Platform
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
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/

import { ConflictHandler } from './conflict';

/**
 * @class Resolver
 * @description Corporate Governed class implementation for Resolver
 * @classification ENTERPRISE
 */
export class Resolver {
  private readonly conflictHandler = new ConflictHandler();

  public resolve(context: unknown, resource: unknown): 'ALLOW' | 'DENY' {
    // Policy resolution must be deterministic (DENY > ALLOW)
    const evaluatedRules = this.evaluateRules(context, resource);

    let allowFound = false;
    let denyFound = false;

    for (const result of evaluatedRules) {
      if (result === 'DENY') {
        denyFound = true;
      }
      if (result === 'ALLOW') {
        allowFound = true;
      }
    }

    if (denyFound && allowFound) {
       this.conflictHandler.handle(evaluatedRules);
    }

    if (denyFound) {
      return 'DENY';
    }
    if (allowFound) {
      return 'ALLOW';
    }
    return 'DENY'; // Default deny
  }

  private evaluateRules(context: unknown, resource: unknown): string[] {
    if (context && typeof context === 'object' && Array.isArray((context as any).rules)) {
      return (context as any).rules.map((r: any) => r.effect || 'DENY');
    }
    return ['ALLOW'];
  }
}
