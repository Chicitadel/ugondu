/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : abac.ts
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

export interface AbacContext {
  subject: Record<string, any>;
  resource: Record<string, any>;
  environment: Record<string, any>;
}

export interface AbacRule {
  id: string;
  evaluate: (context: AbacContext) => boolean;
}

export class AbacEvaluator {
  private rules: Map<string, AbacRule> = new Map();

  public registerRule(rule: AbacRule): void {
    this.rules.set(rule.id, rule);
  }

  public evaluateContext(context: AbacContext, applicableRuleIds: string[]): boolean {
    if (applicableRuleIds.length === 0) return false;
    
    // Default to denying if any applicable rule fails
    for (const ruleId of applicableRuleIds) {
      const rule = this.rules.get(ruleId);
      if (!rule || !rule.evaluate(context)) {
        return false;
      }
    }
    return true;
  }
}
