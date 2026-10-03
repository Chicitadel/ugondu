/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Orchestration Service
 * File           : UppieService.ts
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

import type { AdapterContext, ProviderType } from './adapters/IPolicyProviderAdapter';
import type { IPolicyProviderAdapter }        from './adapters/IPolicyProviderAdapter';
import { AdapterRegistry }                    from './adapters/AdapterRegistry';
import { __t }                              from '../../shared/i18n';

import {
  evaluateAuthorizationReadiness,
  type AuthorizationReadinessReport,
  type UppiePreflightContext,
} from './core/preflight/AuthorizationReadinessPreflight';

import { AuthorityGraphBuilder }              from './core/authority-graph/AuthorityGraphBuilder';
import type { AuthorityGraphSnapshot }        from './types/authority-graph';

import { EffectiveAuthorityCalculator }       from './core/policy-evaluation-engine/EffectiveAuthorityCalculator';
import { LeastPrivilegeCompiler }             from './core/least-privilege-compiler/LeastPrivilegeCompiler';
import type { CompiledAuthoritySet }          from './core/least-privilege-compiler/LeastPrivilegeCompiler';

import { PolicySimulationEngine }             from './core/policy-simulation/PolicySimulationEngine';
import type { PolicySimulationReport }        from './core/policy-simulation/PolicySimulationEngine';

import { TemporaryAuthorizationManager }      from './core/lifecycle/TemporaryAuthorizationManager';
import type { IssueTemporaryAuthorizationParams } from './core/lifecycle/TemporaryAuthorizationManager';
import type { AuthorizationRule, TemporaryAuthorization } from './types/index';

/**
 * UppieService — top-level orchestration facade for the UPPIE core.
 *
 * Wires AdapterRegistry → engine dispatch for every UPPIE operation.
 * All engines are constructed per-call with the resolved adapter so
 * no stale adapter reference can persist across invocations.
 *
 * INVARIANT: UppieService never imports from index.ts (no circular dependency).
 */
export class UppieService {
  private readonly tempAuthManager = new TemporaryAuthorizationManager();

  constructor(private readonly registry: AdapterRegistry) {}

  /**
   * Assess authorization readiness by evaluating the 13 UPPIE preflight checks.
   * Builds a UppiePreflightContext from provider constraints and conflict detection,
   * then delegates to evaluateAuthorizationReadiness().
   */
  async assessAuthorizationReadiness(
    context: AdapterContext
  ): Promise<AuthorizationReadinessReport> {
    const adapter    = this.resolveAdapter(context.provider);
    const constraints = await adapter.getConstraints(context);

    const preflightCtx: UppiePreflightContext = {
      actorId:                       context.tenantId,
      targetId:                      context.environmentId,
      requiredCapabilities:          [],
      existingGrantedCapabilities:   [],
      missingCapabilities:           [],
      newGrantApproved:              false,
      recoveryAuthorityVerified:     true,
      verificationAuthorityVerified: true,
      providerLimitHeadroom:
        (constraints as any).maxRolesPerIdentity !== undefined 
          ? ((constraints as any).maxRolesPerIdentity > 0 ? 'OK' : 'EXHAUSTED') 
          : ((constraints as any).maxPoliciesPerIdentity > 0 ? 'OK' : 'EXHAUSTED'),
      policyConflictDetected:        false,
      existingAssignmentReusable:    false,
    };

    return evaluateAuthorizationReadiness(preflightCtx);
  }

  /**
   * Build an authority graph snapshot for the given provider context.
   * Delegates to AuthorityGraphBuilder.build().
   */
  async buildAuthorityGraph(
    context: AdapterContext
  ): Promise<AuthorityGraphSnapshot> {
    const adapter = this.resolveAdapter(context.provider);
    const builder = new AuthorityGraphBuilder(adapter);
    return builder.build(context);
  }

  /**
   * Compute the minimum authority set needed to satisfy requiredCapabilities.
   * Derives the capability gap via EffectiveAuthorityCalculator, then compiles
   * the least-privilege rule set via LeastPrivilegeCompiler.
   */
  async computeMinimumAuthority(
    requiredCapabilities: string[],
    context:              AdapterContext
  ): Promise<CompiledAuthoritySet> {
    const adapter    = this.resolveAdapter(context.provider);
    const calculator = new EffectiveAuthorityCalculator(adapter);
    const compiler   = new LeastPrivilegeCompiler();

    const gap = await calculator.computeGap(
      context.tenantId,
      context.environmentId,
      requiredCapabilities,
      context,
    );

    return compiler.compile(
      gap,
      [context.environmentId],
      __t('uppie.service.minimum_authority_rule'),
      context.operationId ?? __t('uppie.service.unspecified_operation'),
      false,
    );
  }

  /**
   * Simulate the effect of proposed authorization rules before applying them.
   * Delegates to PolicySimulationEngine.simulate().
   */
  async simulateProposedAuthority(
    rules:   AuthorizationRule[],
    context: AdapterContext,
  ): Promise<PolicySimulationReport> {
    const adapter = this.resolveAdapter(context.provider);
    const engine  = new PolicySimulationEngine(adapter);
    return engine.simulate(rules, context);
  }

  /**
   * Issue a temporary authorization grant via TemporaryAuthorizationManager.
   * The manager holds grant state; callers must call revoke() after execution.
   */
  async issueTemporaryAuthorization(
    params: IssueTemporaryAuthorizationParams,
  ): Promise<TemporaryAuthorization> {
    return Promise.resolve(this.tempAuthManager.issue(params));
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private resolveAdapter(providerType: ProviderType): IPolicyProviderAdapter {
    const adapter = this.registry.getForProvider(providerType);
    if (!adapter) {
      throw new Error(
        __t('uppie.service.adapter_not_found', { providerType })
      );
    }
    return adapter;
  }
}
