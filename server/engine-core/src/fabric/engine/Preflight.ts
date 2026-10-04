/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : Preflight.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
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

import { FabricRegistry } from '../registry';
import { evaluateCapabilities, modeOf } from '../contract/CapabilityEvaluation';
import type { ProviderOptions } from '../capabilities/compute';
import { NODE_HANDLERS, isNodeKind } from './NodeHandlers';
import { ancestorsOf, assertWellFormed, referencesOf } from './PlanGraph';
import { assertNoSecretValues } from './SecretGuard';
import type { ArchitectureIR, EnginePolicy, NodeKind, PlanRejection, ProvisioningNode } from './ProvisioningTypes';

/** A node that passed structural validation, with its typed configuration and the capability that serves it. */
export interface PreflightNode {
  node: ProvisioningNode;
  kind: NodeKind;
  typed: unknown;
  capability: 'NATIVE' | 'CONDITIONAL' | 'UNSUPPORTED';
  mode?: string;
  options: ProviderOptions;
}

export interface PreflightResult {
  nodes: PreflightNode[];
  rejections: PlanRejection[];
}

/**
 * Everything that can be decided without touching a provider. Structural problems (malformed plan, unknown or
 * unregistered provider, invalid configuration, secret values, undeclared references) throw at once; capability
 * problems are collected across the whole plan so the user sees every reason together. Nothing is ever mutated.
 */
export function preflight(ir: ArchitectureIR, registry: FabricRegistry, policy: EnginePolicy): PreflightResult {
  assertWellFormed(ir);
  const nodes: PreflightNode[] = [];
  for (const node of ir.nodes) {
    if (!isNodeKind(node.type)) throw new Error(__t('fabric.engine.unsupported_type', { node: node.id, type: String(node.type) }));
    const contract = registry.contractOf(node.provider);
    const ancestors = ancestorsOf(ir, node.id);
    for (const ref of referencesOf(node.config)) {
      if (!ancestors.has(ref)) throw new Error(__t('fabric.engine.reference_not_declared', { node: node.id, ref }));
    }
    const typed = NODE_HANDLERS[node.type].validate(node.id, node.config);
    assertNoSecretValues(node.id, node.config);
    assertNoSecretValues(node.id, node.providerOptions ?? {});
    nodes.push({ node, kind: node.type, typed, capability: contract.kinds[node.type].status, mode: modeOf(node), options: { ...(node.providerOptions ?? {}) } });
  }
  const rejections = nodes.flatMap((n) => evaluateCapabilities(n.node, n.kind, n.typed, registry.contractOf(n.node.provider), policy));
  return { nodes, rejections };
}
