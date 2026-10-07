/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : uppie
 * File           : ExcessivePermissionAnalyzer.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { z } from 'zod';

// @ts-ignore
import { __t } from '../../../../shared/i18n';

export const PolicyRuleSchema = z.object({
  id: z.string(),
  effect: z.enum(['allow', 'deny']),
  actions: z.array(z.string()),
  resources: z.array(z.string()),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const RiskScoreSchema = z.object({
  ruleId: z.string(),
  score: z.number().min(0).max(100),
  findings: z.array(z.string()),
});

export type RiskScore = z.infer<typeof RiskScoreSchema>;

/**
 * @interface PermissionAnalyzer
 * @description Corporate Governed interface implementation for PermissionAnalyzer
 * @classification ENTERPRISE
 */
export interface PermissionAnalyzer {
  analyze(rules: PolicyRule[]): RiskScore[];
}

/**
 * @class ExcessivePermissionAnalyzer
 * @description Corporate Governed class implementation for ExcessivePermissionAnalyzer
 * @classification ENTERPRISE
 */
export class ExcessivePermissionAnalyzer implements PermissionAnalyzer {
  private readonly WILDCARD = '*';
  private readonly HIGH_RISK_SCORE = 80;
  private readonly CRITICAL_RISK_SCORE = 100;
  
  public analyze(rules: PolicyRule[]): RiskScore[] {
    if (!rules || rules.length === 0) {
      return [];
    }

    return rules
      .filter((rule) => rule.effect === 'allow')
      .map((rule) => this.evaluateRule(rule))
      .filter((score) => score.score > 0);
  }

  private evaluateRule(rule: PolicyRule): RiskScore {
    let score = 0;
    const findings: string[] = [];

    const hasWildcardAction = rule.actions.some((action) => action === this.WILDCARD);
    const hasWildcardResource = rule.resources.some((resource) => resource === this.WILDCARD);

    if (hasWildcardAction && hasWildcardResource) {
      score = this.CRITICAL_RISK_SCORE;
      findings.push(__t('messages.warning.wildcard_action_and_resource'));
    } else if (hasWildcardAction) {
      score = this.HIGH_RISK_SCORE;
      findings.push(__t('messages.warning.wildcard_action'));
    } else if (hasWildcardResource) {
      score = this.HIGH_RISK_SCORE;
      findings.push(__t('messages.warning.wildcard_resource'));
    }

    return {
      ruleId: rule.id,
      score,
      findings,
    };
  }
}
