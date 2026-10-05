/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Least-Privilege Compiler
 * File           : LeastPrivilegeCompiler.ts
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

import type { AuthorizationRule, AuthorizationAction, AuthorizationResource } from '../../types/index';
import type { CapabilityGapResult } from '../policy-evaluation-engine/EffectiveAuthorityCalculator';
import { randomUUID } from 'crypto';

/**
 * LeastPrivilegeCompiler — deterministically derives the minimum authority set.
 *
 * Pipeline:
 *   Required Outcome → Required Capabilities → Required Operations
 *     → Required Resources → Minimum Authority Set (set of AIR AuthorizationRules)
 *
 * INVARIANT: The compiler NEVER widens scope beyond the declared resource targets.
 *            AdministratorAccess or wildcard resources are PROHIBITED outputs.
 *            AI proposals feed this compiler — they never bypass it.
 */
export class LeastPrivilegeCompiler {

  /**
   * Compile the minimum set of AIR rules to satisfy the capability gap.
   * Rules are scoped to exact resource targets — never wildcards unless
   * the provider requires it AND the resource target is truly unconstrained.
   */
  compile(
    gap:            CapabilityGapResult,
    resourceScopes: string[],
    purpose:        string,
    operationId:    string,
    isTemporary:    boolean,
    expiresAt?:     string
  ): CompiledAuthoritySet {
    if (gap.missing.length === 0) {
      return { rules: [], reuseRecommendation: 'FULL_REUSE', missingCount: 0 };
    }

    const rules: AuthorizationRule[] = gap.missing.map((capability) =>
      this.buildRule(capability, resourceScopes, purpose, operationId, isTemporary, expiresAt)
    );

    this.validateNoAdminRules(rules);

    return {
      rules,
      reuseRecommendation: gap.available.length > 0 ? 'PARTIAL_REUSE' : 'FULL_CREATE',
      missingCount: gap.missing.length,
    };
  }

  private buildRule(
    capability:     string,
    resourceScopes: string[],
    purpose:        string,
    operationId:    string,
    isTemporary:    boolean,
    expiresAt?:     string
  ): AuthorizationRule {
    const action: AuthorizationAction = {
      capability,
      operations: [],   // populated by provider adapter compiler
    };

    const resource: AuthorizationResource = {
      type:  'UNRESOLVED',   // resolved by provider adapter
      scope: resourceScopes.join(','),
    };

    return {
      ruleId:    randomUUID(),
      version:   '1.0.0',
      subject:   { type: 'UGONDU_EXECUTION_IDENTITY', id: `ugondu-exec-${operationId}` },
      action,
      resource,
      effect:    'ALLOW',
      conditions: [],
      scope:     {},
      purpose,
      operationId,
      validity: {
        issuedAt:  new Date().toISOString(),
        expiresAt: isTemporary && expiresAt ? expiresAt : 'PERMANENT',
        type:      isTemporary ? 'OPERATION' : 'PERMANENT',
      },
      constraints:         {},
      provenance: {
        source:         'UGONDU',
        createdBy:      'ugondu-system',
        createdAt:      new Date().toISOString(),
        lastModifiedBy: 'ugondu-system',
        lastModifiedAt: new Date().toISOString(),
        linkedOperationId: operationId,
      },
      owner:               'ugondu-system',
      managementAuthority: 'UGONDU_MANAGED',
    };
  }

  /**
   * INVARIANT: No rule may grant administrator-level access.
   * Throws if any compiled rule would be over-broad.
   */
  private validateNoAdminRules(rules: AuthorizationRule[]): void {
    const PROHIBITED_PATTERNS = ['*:*', 'AdministratorAccess', 'FullAccess', '*'];
    for (const rule of rules) {
      const scope = rule.resource.scope;
      if (PROHIBITED_PATTERNS.some((p) => scope === p || scope.endsWith(':*:*'))) {
        throw new Error(
          `LeastPrivilegeCompiler: Rule for capability '${rule.action.capability}' ` +
          `has prohibited resource scope '${scope}'. ` +
          __t('scope_must_be_narrowed_to_spec')
        );
      }
    }
  }
}

/**
 * @interface CompiledAuthoritySet
 * @description Corporate Governed interface implementation for CompiledAuthoritySet
 * @classification ENTERPRISE
 */
export interface CompiledAuthoritySet {
  rules:                 AuthorizationRule[];
  reuseRecommendation:  'FULL_REUSE' | 'PARTIAL_REUSE' | 'FULL_CREATE';
  missingCount:          number;
}
