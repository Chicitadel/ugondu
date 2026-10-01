/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Authorization
 * File           : decision.ts
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

export interface AuthorizationDecision {
  readonly isAllowed: boolean;
  readonly reason?: string;
  readonly evaluatedPolicies: ReadonlyArray<string>;
  readonly context: Readonly<Record<string, any>>;
}

export class DecisionBuilder {
  public static allow(reason: string, evaluatedPolicies: string[] = [], context: Record<string, any> = {}): AuthorizationDecision {
    return Object.freeze({
      isAllowed: true,
      reason,
      evaluatedPolicies: Object.freeze([...evaluatedPolicies]),
      context: Object.freeze({ ...context })
    });
  }

  public static deny(reason: string, evaluatedPolicies: string[] = [], context: Record<string, any> = {}): AuthorizationDecision {
    return Object.freeze({
      isAllowed: false,
      reason,
      evaluatedPolicies: Object.freeze([...evaluatedPolicies]),
      context: Object.freeze({ ...context })
    });
  }
}
