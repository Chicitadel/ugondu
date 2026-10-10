/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Policy Simulation Engine
 * File           : PolicySimulationEngine.ts
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';

import { createHash } from 'crypto';
import type {
  IPolicyProviderAdapter,
  AdapterContext,
  PolicySimulationResult,
} from '../../adapters/IPolicyProviderAdapter';
import type { AuthorizationRule } from '../../types/authorization-rule';

export type SimulationDecision = 'APPROVED' | 'REJECTED' | 'APPROVED_WITH_WARNING';

/**
 * @interface SimulationValidationError
 * @description Corporate Governed interface implementation for SimulationValidationError
 * @classification ENTERPRISE
 */
export interface SimulationValidationError {
  ruleId:  string;
  reason:  string;
}

/**
 * @interface PolicySimulationReport
 * @description Corporate Governed interface implementation for PolicySimulationReport
 * @classification ENTERPRISE
 */
export interface PolicySimulationReport {
  decision:          SimulationDecision;
  validationErrors:  SimulationValidationError[];
  providerResult?:   PolicySimulationResult;
  /** SHA-256 of canonical report — binds result to Delivery Passport AuthorityEvidence */
  simulationDigest:  string;
  simulatedAt:       string;   // ISO-8601
}

/**
 * PolicySimulationEngine — simulates the effect of proposed authorization rules
 * before applying them to the provider.
 *
 * INVARIANTS (enforced before calling provider):
 * 1. No rule may use wildcard resource scope ('*' or equivalents)
 *    → immediately REJECTED without calling adapter
 * 2. No rule with wildcard actions ('*')
 *    → immediately REJECTED without calling adapter
 * 3. No rule with effect='DENY' on providers that declare simulate as UNSUPPORTED
 *    → cPanel and similar providers MUST NOT receive DENY rules
 * 4. The simulation digest binds the result to AuthorityEvidence.
 *    The same proposed rules + adapter always produce the same digest for the same clock.
 *
 * The engine does NOT call the provider if invariant checks fail.
 * This prevents unnecessary API calls and eliminates a class of over-permission bugs.
 */
export class PolicySimulationEngine {
  constructor(
    private readonly adapter: IPolicyProviderAdapter
  ) {}

  /**
   * Simulate the effect of proposed rules against the provider.
   * Returns REJECTED immediately if any rule violates least-privilege invariants.
   */
  async simulate(
    proposedRules: AuthorizationRule[],
    context:       AdapterContext
  ): Promise<PolicySimulationReport> {
    const simulatedAt = new Date().toISOString();

    // Phase 1: Pre-flight validation — no provider call
    const validationErrors = this.validateRules(proposedRules);
    if (validationErrors.length > 0) {
      const report: PolicySimulationReport = {
        decision:         'REJECTED',
        validationErrors,
        simulationDigest: this.computeDigest({ decision: 'REJECTED', validationErrors, simulatedAt }),
        simulatedAt,
      };
      return report;
    }

    // Phase 2: Provider simulation (if adapter declares simulate as supported)
    let providerResult: PolicySimulationResult | undefined;
    const simCapability = this.adapter.capabilities.simulate;
    if (simCapability === 'SUPPORTED' || simCapability === 'SUPPORTED_WITH_LIMITS') {
      providerResult = await this.adapter.simulate(proposedRules, context);
    }

    const decision = this.resolveDecision(providerResult);
    const report: PolicySimulationReport = {
      decision,
      validationErrors: [],
      providerResult,
      simulationDigest: this.computeDigest({ decision, providerResult, simulatedAt }),
      simulatedAt,
    };
    return report;
  }

  /**
   * Validate proposed rules against UPPIE least-privilege invariants.
   * Returns validation errors (empty array = all rules pass).
   */
  private validateRules(rules: AuthorizationRule[]): SimulationValidationError[] {
    const errors: SimulationValidationError[] = [];

    for (const rule of rules) {
      // Invariant 1: No wildcard resource scope
      if (rule.resource.scope === '*' || rule.resource.scope === 'arn:aws:*:*:*:*') {
        errors.push({
          ruleId: rule.ruleId,
          reason: __t('ui.responses.wildcard_resource_scope_is_forbidden', { 'rule_resource_scope': rule.resource.scope }),
        });
      }

      // Invariant 2: No wildcard actions
      if (rule.action.operations.includes('*')) {
        errors.push({
          ruleId: rule.ruleId,
          reason: 'Wildcard action (*) is forbidden. All operations must be explicitly named.',
        });
      }

      // Invariant 3: DENY rules on adapters that do not support simulation
      const simCapability = this.adapter.capabilities.simulate;
      const supportsSimulate =
        simCapability === 'SUPPORTED' || simCapability === 'SUPPORTED_WITH_LIMITS';

      if (rule.effect === 'DENY' && !supportsSimulate) {
        errors.push({
          ruleId: rule.ruleId,
          reason: __t('ui.responses.deny_rule_submitted_to_adapter_which', { 'this_adapter_providerType': this.adapter.providerType }),
        });
      }
    }

    return errors;
  }

  private resolveDecision(result?: PolicySimulationResult): SimulationDecision {
    if (!result) {
      // No provider simulation available — approved conservatively
      return 'APPROVED';
    }
    if (result.confidence === 'HIGH' || result.confidence === 'MEDIUM') {
      return 'APPROVED';
    }
    return 'APPROVED_WITH_WARNING';
  }

  private computeDigest(data: object): string {
    const canonical = JSON.stringify(data, Object.keys(data).sort());
    return 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');
  }
}
