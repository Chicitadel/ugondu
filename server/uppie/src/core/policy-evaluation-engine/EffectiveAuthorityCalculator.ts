/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Effective Authority Calculator
 * File           : EffectiveAuthorityCalculator.ts
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

import type { EffectiveAuthorityResult, EffectivePermission, SimulationConfidence } from '../../types/index';
import type { IPolicyProviderAdapter, AdapterContext } from '../../adapters/IPolicyProviderAdapter';

/**
 * EffectiveAuthorityCalculator — computes actual effective authority for an actor.
 *
 * INVARIANT: Declared permission ≠ Effective permission.
 * A policy may be attached but denied, scoped differently, expired,
 * restricted by a permission boundary, or subject to an unmet condition.
 *
 * Formula:
 *   EffectiveAuthority = Union(GrantedAuthorities)
 *     ∩ NOT(ExplicitDenies)
 *     ∩ ResourcePolicy.allow
 *     ∩ NOT(ResourcePolicy.deny)
 *     ∩ PermissionBoundary.allow
 *     ∩ NOT(PermissionBoundary.deny)
 *     ∩ ProviderRestrictions
 *     ∩ TenantPolicy
 *     ∩ EnvironmentPolicy
 *     ∩ UgonduPolicy
 *     ∩ ActiveConditions
 *
 * The exact semantics are delegated to the provider adapter — UPPIE never
 * assumes all providers behave like AWS IAM.
 */
export class EffectiveAuthorityCalculator {
  constructor(private readonly adapter: IPolicyProviderAdapter) {}

  /**
   * Calculate effective authority for an actor on a specific resource.
   * Uses the provider adapter's native evaluation semantics.
   */
  async calculate(
    actorId:    string,
    resourceId: string,
    context:    AdapterContext
  ): Promise<EffectiveAuthorityResult> {
    return this.adapter.discoverEffectiveAuthority(actorId, resourceId, context);
  }

  /**
   * Determine which of the required capabilities are already effectively granted.
   * Returns the gap (missing capabilities) without creating any new grants.
   */
  async computeGap(
    actorId:              string,
    resourceId:           string,
    requiredCapabilities: string[],
    context:              AdapterContext
  ): Promise<CapabilityGapResult> {
    const result = await this.calculate(actorId, resourceId, context);
    const grantedSet = new Set(
      result.permissions
        .filter((p) => p.state === 'GRANTED')
        .map((p) => p.capability)
    );

    const available = requiredCapabilities.filter((c) => grantedSet.has(c));
    const missing   = requiredCapabilities.filter((c) => !grantedSet.has(c));

    const confidence = this.deriveConfidence(result);

    return { actorId, resourceId, required: requiredCapabilities, available, missing, confidence };
  }

  private deriveConfidence(result: EffectiveAuthorityResult): SimulationConfidence {
    switch (result.evaluationMethod) {
      case 'PROVIDER_API':   return 'HIGH';
      case 'POLICY_MODEL':   return 'MEDIUM';
      case 'PARTIAL_MODEL':  return 'LOW';
      default:               return 'UNKNOWN';
    }
  }
}

/**
 * @interface CapabilityGapResult
 * @description Corporate Governed interface implementation for CapabilityGapResult
 * @classification ENTERPRISE
 */
export interface CapabilityGapResult {
  actorId:    string;
  resourceId: string;
  required:   string[];
  available:  string[];
  missing:    string[];
  confidence: SimulationConfidence;
}
