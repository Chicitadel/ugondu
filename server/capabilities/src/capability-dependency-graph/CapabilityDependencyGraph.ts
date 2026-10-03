// @ts-ignore
import { __t } from '../../../shared/i18n';
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Capability Dependency Graph
 * File           : CapabilityDependencyGraph.ts
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

export type DeactivationValidationResult =
  | 'SAFE'
  | 'SAFE_WITH_GRACE'
  | 'BLOCKED_BY_DEPENDENTS'
  | 'BLOCKED_BY_ACTIVE_OPERATION';

/**
 * @interface DeactivationReport
 * @description Corporate Governed interface implementation for DeactivationReport
 * @classification ENTERPRISE
 */
export interface DeactivationReport {
  capabilityId:    string;
  result:          DeactivationValidationResult;
  blockedBy:       string[];  // capability IDs blocking deactivation
  affectedActors?: string[];  // actors that would lose access
  recommendation?: string;
}

/**
 * CapabilityDependencyGraph — tracks which capabilities depend on which others.
 *
 * INVARIANT: A capability MUST NOT be deactivated if any currently-active
 * capability depends on it. Doing so would silently break a higher-tier feature.
 *
 * Example:
 *   AI_PLANNING depends on: DISCOVERY, ARCHITECTURE_ENGINE, POLICY_ENGINE, AI_GATEWAY
 *   Deactivating DISCOVERY while AI_PLANNING is active → BLOCKED_BY_DEPENDENTS
 *
 * This is the CEG enforcement layer for the Safety Preservation Invariant:
 * "No downgrade, billing failure, or capability revocation may disable a safety
 *  mechanism in a way that leaves an existing managed environment unsafe."
 */
export class CapabilityDependencyGraph {
  /** capabilityId → set of capabilities it directly depends on */
  private readonly dependencies = new Map<string, Set<string>>();
  /** capabilityId → set of capabilities that depend ON it (reverse index) */
  private readonly reverseDependents = new Map<string, Set<string>>();

  /**
   * Register a capability and its direct dependencies.
   * Safe to call multiple times — subsequent calls merge (do not replace).
   */
  register(capabilityId: string, deps: string[]): void {
    if (!this.dependencies.has(capabilityId)) {
      this.dependencies.set(capabilityId, new Set());
    }
    for (const dep of deps) {
      this.dependencies.get(capabilityId)!.add(dep);
      if (!this.reverseDependents.has(dep)) {
        this.reverseDependents.set(dep, new Set());
      }
      this.reverseDependents.get(dep)!.add(capabilityId);
    }
  }

  /** Return direct dependencies of a capability. */
  getDependencies(capabilityId: string): string[] {
    return Array.from(this.dependencies.get(capabilityId) ?? []);
  }

  /** Return all capabilities that directly depend ON this capability. */
  getReverseDependents(capabilityId: string): string[] {
    return Array.from(this.reverseDependents.get(capabilityId) ?? []);
  }

  /**
   * Compute full transitive closure of dependencies.
   * Detects and breaks cycles via visited set.
   */
  getTransitiveDependencies(capabilityId: string): string[] {
    const visited = new Set<string>();
    const queue   = [capabilityId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const dep of (this.dependencies.get(current) ?? [])) {
        queue.push(dep);
      }
    }
    visited.delete(capabilityId); // exclude self
    return Array.from(visited);
  }

  /**
   * Validate whether a capability can be safely deactivated.
   *
   * @param capabilityId      - capability to deactivate
   * @param activeCapabilities - set of currently-active capability IDs
   * @returns DeactivationReport with SAFE | SAFE_WITH_GRACE | BLOCKED_BY_DEPENDENTS
   */
  validateDeactivation(
    capabilityId:       string,
    activeCapabilities: string[]
  ): DeactivationReport {
    const activeSet   = new Set(activeCapabilities);
    const reverseDeps = this.getReverseDependents(capabilityId);

    // Find reverse dependents that are currently active
    const blockedBy = reverseDeps.filter((dep) => activeSet.has(dep));

    if (blockedBy.length > 0) {
      return {
        capabilityId,
        result:  'BLOCKED_BY_DEPENDENTS',
        blockedBy,
        recommendation: __t('messages.error.deactivate_blocked', { blockedBy: blockedBy.join(', '), capabilityId }),
      };
    }

    return {
      capabilityId,
      result:   'SAFE',
      blockedBy: [],
    };
  }

  /**
   * Build a pre-populated dependency graph from the canonical Ugondu capability set.
   * Sourced from CEG Blueprint §24.
   */
  static buildCanonical(): CapabilityDependencyGraph {
    const graph = new CapabilityDependencyGraph();

    // Intelligence tier dependencies
    graph.register('AI_PLANNING', [
      'DISCOVERY', 'ARCHITECTURE_ENGINE', 'POLICY_ENGINE', 'AI_GATEWAY',
    ]);
    graph.register('AI_RECOMMENDATIONS',     ['DISCOVERY', 'AI_GATEWAY']);
    graph.register('AI_EXPLAIN',             ['DISCOVERY', 'AI_GATEWAY']);
    graph.register('AI_POLICY_OPTIMIZATION', ['POLICY_ENGINE', 'AI_GATEWAY', 'UPPIE_FULL']);
    graph.register('GOVERNED_AUTOPILOT',     ['AI_PLANNING', 'RBAC', 'ADVANCED_POLICY']);

    // Delivery tier dependencies
    graph.register('ROLLBACK',         ['DEPLOYMENT_HISTORY', 'VERIFICATION_BASIC']);
    graph.register('ATOMIC_DEPLOY',    ['DEPLOY_BASIC']);
    graph.register('PREVIEW_ADVANCED', ['DISCOVERY', 'DEPLOY_BASIC']);

    // Collaboration tier dependencies
    graph.register('FLEET',          ['WORKSPACES', 'RBAC']);
    graph.register('ADVANCED_POLICY', ['RBAC']);
    graph.register('SSO',             ['RBAC']);
    graph.register('SCIM',            ['SSO', 'RBAC']);

    // Governance tier dependencies
    graph.register('COMPLIANCE',    ['ADVANCED_AUDIT', 'RBAC']);
    graph.register('PRIVATE_CLOUD', ['ENTERPRISE_SLA']);
    graph.register('UPPIE_FULL',    ['UPPIE_BASIC', 'POLICY_ENGINE']);

    // Sovereign tier dependencies
    graph.register('OFFLINE_AI',         ['AIR_GAPPED', 'AI_GATEWAY']);
    graph.register('SOVEREIGN_EVIDENCE', ['AIR_GAPPED', 'ADVANCED_AUDIT']);
    graph.register('FIPS_OPERATIONS',    ['AIR_GAPPED', 'HSM']);

    return graph;
  }
}
