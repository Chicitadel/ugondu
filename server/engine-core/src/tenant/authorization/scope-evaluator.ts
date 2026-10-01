/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Authorization
 * File           : scope-evaluator.ts
 * Version        : 1.0.0
 * Author         : Phase 14 AI Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

export class ScopeEvaluator {
  public static isScopeGranted(requestedScope: string, grantedScopes: string[]): boolean {
    return grantedScopes.some(scope => {
      // Allow exact match or wildcard prefix matches
      if (scope === requestedScope) return true;
      if (scope.endsWith('.*')) {
        const prefix = scope.slice(0, -2);
        return requestedScope.startsWith(prefix);
      }
      return false;
    });
  }
}
