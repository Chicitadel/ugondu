/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Discovery
 * File           : scope-enforcer.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

import { DiscoveryScope } from '../model/scope';

/**
 * @class ScopeEnforcer
 * @description Corporate Governed class implementation for ScopeEnforcer
 * @classification ENTERPRISE
 */
export class ScopeEnforcer {
  private readonly MAX_CONCURRENCY_HARD_LIMIT = 50;
  private readonly MAX_TIMEOUT_MS_HARD_LIMIT = 300000; // 5 minutes

  /**
   * Enforces resource limits and scope boundaries for discovery.
   */
  public enforce(scope: DiscoveryScope): void {
    if (scope.maxConcurrency > this.MAX_CONCURRENCY_HARD_LIMIT) {
      throw new Error(__t('messages.error.scope_violation_requested_concurrency_exceeds', { 'scope_maxConcurrency': scope.maxConcurrency, 'this_MAX_CONCURRENCY_HARD_LIMIT': this.MAX_CONCURRENCY_HARD_LIMIT }));
    }

    if (scope.timeoutMs > this.MAX_TIMEOUT_MS_HARD_LIMIT) {
      throw new Error(__t('messages.error.scope_violation_requested_timeout_ms_exceeds_', { 'scope_timeoutMs': scope.timeoutMs, 'this_MAX_TIMEOUT_MS_HARD_LIMIT': this.MAX_TIMEOUT_MS_HARD_LIMIT }));
    }

    if (!scope.targets || scope.targets.length === 0) {
      throw new Error(__t('messages.error.scope_violation_discovery_scope_must_specify_'));
    }

    // Additional checks on depth and exclusion patterns can be added here
  }

  public validateTarget(target: string, scope: DiscoveryScope): boolean {
    if (!scope.targets.includes(target)) {
      return false;
    }

    for (const pattern of scope.excludePatterns) {
      const regex = new RegExp(pattern);
      if (regex.test(target)) {
        return false;
      }
    }

    return true;
  }
}
