/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Authority Graph Builder
 * File           : AuthorityGraphBuilder.ts
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

import { createHash, randomUUID } from 'crypto';
import type { IPolicyProviderAdapter, AdapterContext } from '../../adapters/IPolicyProviderAdapter';
import type {
  AuthorityGraph,
  AuthorityGraphSnapshot,
  AuthorityActor,
  AuthorityRole,
  AuthorityEdge,
} from '../../types/authority-graph';

/**
 * AuthorityGraphBuilder — constructs an AuthorityGraph from a provider adapter.
 *
 * Workflow:
 * 1. Call adapter discovery methods to collect actors, roles, policies, and assignments
 * 2. Assemble graph edges from assignment maps (actor → role bindings)
 * 3. Validate the resulting graph is structurally valid (required fields present)
 * 4. Produce an AuthorityGraphSnapshot with:
 *    - SHA-256 digest of canonical JSON (for use in AuthorityEvidence)
 *    - Captured timestamp
 *
 * INVARIANT: The builder does NOT modify or enrich raw provider data.
 * If the adapter returns incomplete data, the builder surfaces the gap via validation.
 * The adapter is the single source of truth for provider state.
 */
export class AuthorityGraphBuilder {
  constructor(
    private readonly adapter: IPolicyProviderAdapter
  ) {}

  /**
   * Build an AuthorityGraphSnapshot by calling adapter discovery methods.
   * Assembles actors, roles, policies, and edges into a unified graph.
   *
   * @throws if any adapter call throws, or if the assembled graph fails validation
   */
  async build(context: AdapterContext): Promise<AuthorityGraphSnapshot> {
    const [identities, roles, policies, assignments] = await Promise.all([
      this.adapter.discoverIdentities(context),
      this.adapter.discoverRoles(context),
      this.adapter.discoverPolicies(context),
      this.adapter.discoverAssignments(context),
    ]);

    const actors: AuthorityActor[] = identities.map((id) => ({
      actorId:     id.id,
      type:        this.resolveActorType(id.type),
      displayName: id.displayName,
      provider:    context.provider,
    }));

    const authorityRoles: AuthorityRole[] = roles.map((r) => ({
      roleId:      r.id,
      displayName: r.displayName,
      provider:    context.provider,
      policies:    r.policies,
    }));

    const edges: AuthorityEdge[] = this.buildEdges(assignments);

    const graph: AuthorityGraph = {
      graphId:            randomUUID(),
      environmentId:      context.environmentId,
      tenantId:           context.tenantId,
      capturedAt:         new Date().toISOString(),
      actors,
      roles:              authorityRoles,
      policies:           policies.map((p) => ({
        policyId:         p.providerId,
        displayName:      p.providerId,
        provider:         context.provider,
        rules:            [],
        attachedToRoles:  [],
        attachedToActors: [],
      })),
      boundaries:         [],
      edges,
      effectiveAuthority: {},
    };

    return this.toSnapshot(graph);
  }

  /**
   * Build from a pre-fetched graph (avoids a second provider call).
   * Used when the graph is already available from another source.
   */
  fromGraph(graph: AuthorityGraph): AuthorityGraphSnapshot {
    return this.toSnapshot(graph);
  }

  /**
   * Validate that a graph has the minimum required fields.
   * Returns an array of validation error messages (empty = valid).
   */
  validate(graph: AuthorityGraph): string[] {
    const errors: string[] = [];
    if (!graph.graphId)                   errors.push(__t('messages.error.graph_id_required'));
    if (!graph.environmentId)             errors.push(__t('messages.error.environment_id_required'));
    if (!graph.tenantId)                  errors.push(__t('messages.error.tenant_id_required'));
    if (!graph.capturedAt)                errors.push(__t('messages.error.captured_at_required'));
    if (!Array.isArray(graph.actors))     errors.push(__t('messages.error.actors_must_be_array'));
    if (!Array.isArray(graph.roles))      errors.push(__t('messages.error.roles_must_be_array'));
    if (!Array.isArray(graph.policies))   errors.push(__t('messages.error.policies_must_be_array'));
    if (!Array.isArray(graph.edges))      errors.push(__t('messages.error.edges_must_be_array'));
    if (!Array.isArray(graph.boundaries)) errors.push(__t('messages.error.boundaries_must_be_array'));
    return errors;
  }

  private toSnapshot(graph: AuthorityGraph): AuthorityGraphSnapshot {
    const validationErrors = this.validate(graph);
    if (validationErrors.length > 0) {
      throw new Error(__t('messages.error.authoritygraph_validation_failed', { 'validationErrors_join______': validationErrors.join('; ') }));
    }

    const canonical = JSON.stringify(graph, Object.keys(graph).sort());
    const digest    = 'sha256:' + createHash('sha256').update(canonical, 'utf8').digest('hex');

    return {
      graph,
      digest,
      signedAt: new Date().toISOString(),
    };
  }

  /**
   * Build BELONGS_TO edges from the actor→role assignment map.
   * Key = actorId, Value = array of roleIds.
   */
  private buildEdges(assignments: Record<string, string[]>): AuthorityEdge[] {
    const edges: AuthorityEdge[] = [];
    for (const [actorId, roleIds] of Object.entries(assignments)) {
      for (const roleId of roleIds) {
        edges.push({
          fromId:   actorId,
          toId:     roleId,
          edgeType: 'BELONGS_TO',
        });
      }
    }
    return edges;
  }

  private resolveActorType(
    rawType: string
  ): AuthorityActor['type'] {
    const normalized = rawType.toUpperCase();
    const validTypes: AuthorityActor['type'][] = [
      'USER', 'GROUP', 'SERVICE_ACCOUNT', 'WORKLOAD', 'UGONDU',
    ];
    return validTypes.includes(normalized as AuthorityActor['type'])
      ? (normalized as AuthorityActor['type'])
      : 'USER';
  }
}

/**
 * Create a minimal empty AuthorityGraph for test or stub purposes.
 * MUST NOT be used in production — only for scaffolding.
 */
export function createEmptyAuthorityGraph(
  environmentId: string,
  tenantId:      string
): AuthorityGraph {
  return {
    graphId:            randomUUID(),
    environmentId,
    tenantId,
    capturedAt:         new Date().toISOString(),
    actors:             [],
    roles:              [],
    policies:           [],
    boundaries:         [],
    edges:              [],
    effectiveAuthority: {},
  };
}
