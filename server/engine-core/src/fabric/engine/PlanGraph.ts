/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : PlanGraph.ts
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
import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

import type { ArchitectureIR, ProvisioningNode } from './ProvisioningTypes';

export const REF_PREFIX = 'ref:';

/** Rejects plans the engine could not execute faithfully, before anything is changed. */
export function assertWellFormed(ir: ArchitectureIR): void {
  const ids = new Set<string>();
  for (const node of ir.nodes) {
    if (typeof node.id !== 'string' || node.id === '' || ids.has(node.id)) throw new Error(__t('fabric.engine.duplicate_node', { node: String(node.id) }));
    ids.add(node.id);
  }
  for (const edge of ir.edges) {
    for (const end of [edge.from, edge.to]) {
      if (!ids.has(end)) throw new Error(__t('fabric.engine.unknown_edge_node', { node: String(end) }));
    }
  }
}

/** Layers of nodes that can be provisioned together: every node comes after everything it depends on. */
export function provisioningWaves(ir: ArchitectureIR): ProvisioningNode[][] {
  const remaining = new Map<string, number>(ir.nodes.map((n) => [n.id, 0]));
  for (const edge of ir.edges) remaining.set(edge.to, (remaining.get(edge.to) as number) + 1);
  const waves: ProvisioningNode[][] = [];
  let placed = 0;
  let frontier = ir.nodes.filter((n) => remaining.get(n.id) === 0);
  while (frontier.length > 0) {
    waves.push(frontier);
    placed += frontier.length;
    const ready = new Set<string>();
    for (const node of frontier) {
      for (const edge of ir.edges) {
        if (edge.from !== node.id) continue;
        const left = (remaining.get(edge.to) as number) - 1;
        remaining.set(edge.to, left);
        if (left === 0) ready.add(edge.to);
      }
    }
    frontier = ir.nodes.filter((n) => ready.has(n.id));
  }
  if (placed !== ir.nodes.length) throw new Error(__t('messages.error.cycle_detected_in_architecture_ir_dag'));
  return waves;
}

/** Ids of everything a node depends on, directly or through other nodes. */
export function ancestorsOf(ir: ArchitectureIR, nodeId: string): Set<string> {
  const found = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.pop() as string;
    for (const edge of ir.edges) {
      if (edge.to === current && !found.has(edge.from)) {
        found.add(edge.from);
        queue.push(edge.from);
      }
    }
  }
  return found;
}

/** Node ids referenced by `ref:<id>` values of a configuration. */
export const referencesOf = (config: Record<string, unknown>): string[] =>
  Object.values(config).filter((v): v is string => typeof v === 'string' && v.startsWith(REF_PREFIX)).map((v) => v.slice(REF_PREFIX.length));

/** Replaces every `ref:<id>` value by the resource id of that node. */
export function resolveReferences(node: ProvisioningNode, resources: Map<string, string>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node.config)) {
    if (typeof value === 'string' && value.startsWith(REF_PREFIX)) {
      const target = value.slice(REF_PREFIX.length);
      const resourceId = resources.get(target);
      if (resourceId === undefined) throw new Error(__t('fabric.engine.unresolved_reference', { node: node.id, ref: target }));
      resolved[key] = resourceId;
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

const canonical = (value: unknown): unknown =>
  Array.isArray(value) ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value as object).sort().map((k) => [k, canonical((value as Record<string, unknown>)[k])]))
      : value;

/** Stable fingerprint of what a node asks for, provider extension included; key order does not matter. */
export const digestOf = (kind: string, provider: string, config: Record<string, unknown>, options: Record<string, unknown> = {}): string =>
  createHash('sha256').update(JSON.stringify(canonical({ kind, provider, config, options }))).digest('hex');
