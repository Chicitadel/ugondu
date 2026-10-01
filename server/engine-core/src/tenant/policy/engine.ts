/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : engine.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

import { PolicyDocument, PolicyContext, EvaluationResult, Effect } from './types';

export class PolicyEngine {
  constructor() {}

  public evaluate(policy: PolicyDocument, context: PolicyContext): EvaluationResult {
    const applicableStatements = policy.statements.filter(stmt => {
      const resourceMatch = stmt.resources.some(r => this.matchPattern(r, context.resource));
      const actionMatch = stmt.actions.some(a => this.matchPattern(a, context.action));
      return resourceMatch && actionMatch;
    });

    if (applicableStatements.length === 0) {
      return { effect: Effect.DENY, reason: 'Implicit deny: No matching policy statements found' };
    }

    const explicitDeny = applicableStatements.find(stmt => stmt.effect === Effect.DENY);
    if (explicitDeny) {
      return { effect: Effect.DENY, reason: 'Explicit deny encountered in policy statements' };
    }

    return { effect: Effect.ALLOW, reason: 'Allowed by policy' };
  }

  private matchPattern(pattern: string, value: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      return value.startsWith(prefix);
    }
    return pattern === value;
  }
}
