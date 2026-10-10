import { Logger } from '@ugondu/shared';
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : provisioning-engine.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
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

import { FabricRegistry } from './registry';
import { NODE_HANDLERS } from './engine/NodeHandlers';
import { preflight } from './engine/Preflight';
import type { PreflightNode } from './engine/Preflight';
import { digestOf, provisioningWaves, resolveReferences } from './engine/PlanGraph';
import { InMemoryProvisioningState, PlanRejectedError, ProvisioningError } from './engine/ProvisioningTypes';
import type { ArchitectureIR, EnginePolicy, ExecutionPlan, ExecutionPlanNode, IJournal, PlanRejection, ProvisionedRecord, ProvisioningReport, ProvisioningStateStore, RollbackFailure } from './engine/ProvisioningTypes';
import type { ComputeConfig } from './capabilities/compute';

import { ExecutionAuthorization, UpmExecutionGate } from '../upm/policy-gate';
export * from './engine/ProvisioningTypes';

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));
const now = (): string => new Date().toISOString();

/**
 * @class ProvisioningEngine
 * @description Executes an Architecture IR through the provider fabric. A plan the providers cannot faithfully
 * implement is rejected before anything is changed; an accepted plan runs layer by layer in dependency order
 * (independent nodes of a layer run concurrently), skips nodes that already exist unchanged, records evidence of
 * what was requested and resolved, and rolls back everything a failed run created, in reverse order.
 * @classification ENTERPRISE
 */
export class ProvisioningEngine {
  constructor(
    private registry: FabricRegistry,
    private journal: IJournal,
    private state: ProvisioningStateStore,
    private policy: EnginePolicy = {},
  ) {}

  /** Shows how the plan would run, or why it would be rejected. Nothing is changed and nothing is journalled. */
  public async preview(ir: ArchitectureIR): Promise<ExecutionPlan> {
    const checked = preflight(ir, this.registry, this.policy);
    const rejected = new Set(checked.rejections.map((r) => r.nodeId));
    const nodes: ExecutionPlanNode[] = [];
    for (const n of checked.nodes) {
      if (!rejected.has(n.node.id)) nodes.push(await this.describe(n));
    }
    return { accepted: checked.rejections.length === 0, nodes, rejections: checked.rejections };
  }

  public async executePlan(ir: ArchitectureIR, auth?: ExecutionAuthorization): Promise<ProvisioningReport> {
    if (!auth) {
      throw new Error(__t('messages.error.missing_execution_authorization'));
    }
    UpmExecutionGate.verifyAuthorization(auth!, ir);
    const checked = preflight(ir, this.registry, this.policy);
    if (checked.rejections.length > 0) await this.reject(checked.rejections);
    const waves = provisioningWaves(ir);
    const checkedById = new Map(checked.nodes.map((n) => [n.node.id, n]));
    const resources = new Map<string, string>();
    const report: ProvisioningReport = { provisioned: [], created: [], unchanged: [] };
    const createdRecords: ProvisionedRecord[] = [];

    try {
      for (const wave of waves) {
        const outcomes = await Promise.allSettled(wave.map((node) => this.provisionNode(checkedById.get(node.id) as PreflightNode, resources)));
        let failure: { error: unknown } | undefined;
        outcomes.forEach((outcome, i) => {
          const id = (wave[i] as { id: string }).id;
          if (outcome.status === 'rejected') { failure ??= { error: outcome.reason }; return; }
          const { record, isNew } = outcome.value;
          resources.set(id, record.resourceId);
          report.provisioned.push(record);
          (isNew ? report.created : report.unchanged).push(id);
          if (isNew) createdRecords.push(record);
        });
        if (failure) throw failure.error;
      }
    } catch (error) {
      const { rolledBack, failures } = await this.rollback(createdRecords.reverse());
      const message = failures.length === 0
        ? __t('fabric.engine.plan_failed', { error: messageOf(error) })
        : __t('fabric.engine.plan_failed_rollback_incomplete', { error: messageOf(error), count: failures.length });
      throw new ProvisioningError(message, error, rolledBack, failures);
    }
    return report;
  }

  /** Journals every rejection, then refuses the plan. No provider has been called. */
  private async reject(rejections: PlanRejection[]): Promise<never> {
    for (const r of rejections) {
      await this.journal.log({ nodeId: r.nodeId, action: 'provision', status: 'rejected', timestamp: now(), detail: `${r.code}: ${r.reason}` });
    }
    const resources = new Set(rejections.map((r) => r.nodeId)).size;
    throw new PlanRejectedError(__t('fabric.engine.plan_rejected', { count: resources }), rejections);
  }

  private async describe(n: PreflightNode): Promise<ExecutionPlanNode> {
    const entry: ExecutionPlanNode = { nodeId: n.node.id, kind: n.kind, provider: n.node.provider, capability: n.capability as 'NATIVE' | 'CONDITIONAL', requested: { ...(n.typed as Record<string, unknown>) } };
    if (n.mode !== undefined) entry.mode = n.mode;
    if (n.kind === 'COMPUTE' && this.registry.contractOf(n.node.provider).supportsDryRun) {
      const adapter = this.registry.resolveCompute(n.node.provider);
      if (adapter.resolveSizing) entry.resolved = await adapter.resolveSizing(n.typed as ComputeConfig, n.options);
    }
    return entry;
  }

  private async provisionNode(checked: PreflightNode, resources: Map<string, string>): Promise<{ record: ProvisionedRecord; isNew: boolean }> {
    const { node, kind, options } = checked;
    const handler = NODE_HANDLERS[kind];
    const config = resolveReferences(node, resources);
    const digest = digestOf(kind, node.provider, config, options);
    const existing = await this.state.get(node.id);
    if (existing) {
      if (existing.digest !== digest) throw new Error(__t('fabric.engine.state_conflict', { node: node.id }));
      await this.journal.log({ nodeId: node.id, action: 'provision', status: 'skipped', timestamp: now(), resourceId: existing.resourceId, evidence: existing.evidence });
      return { record: existing, isNew: false };
    }

    const typed = handler.validate(node.id, config);
    await this.journal.log({ nodeId: node.id, action: 'provision', status: 'pending', timestamp: now() });
    let outcome: { resourceId: string; resolved: Record<string, string | number | boolean> };
    try {
      outcome = await handler.provision(this.registry, node.provider, typed, options);
    } catch (error) {
      await this.journal.log({ nodeId: node.id, action: 'provision', status: 'failed', timestamp: now(), detail: messageOf(error) });
      throw error;
    }

    const evidence = { requested: { ...(typed as Record<string, unknown>) }, resolved: outcome.resolved };
    const record: ProvisionedRecord = { nodeId: node.id, kind, provider: node.provider, digest, resourceId: outcome.resourceId, evidence };
    try {
      await this.state.put(record);
      await this.journal.log({ nodeId: node.id, action: 'provision', status: 'success', timestamp: now(), resourceId: outcome.resourceId, evidence });
    } catch (error) {
      // The resource exists but is not recorded: remove it now, or it would be orphaned.
      await handler.deprovision(this.registry, node.provider, outcome.resourceId).catch((e) => Logger.warn(__t('suppressed_error_during_operation') + String(e)));
      await this.state.remove(node.id).catch((e) => Logger.warn(__t('suppressed_error_during_operation') + String(e)));
      throw error;
    }
    return { record, isNew: true };
  }

  /** Removes what this run created, newest first. A resource that cannot be removed is reported and never hidden. */
  private async rollback(records: ProvisionedRecord[]): Promise<{ rolledBack: string[]; failures: RollbackFailure[] }> {
    const rolledBack: string[] = [];
    const failures: RollbackFailure[] = [];
    for (const record of records) {
      try {
        await this.journal.log({ nodeId: record.nodeId, action: 'deprovision', status: 'pending', timestamp: now(), resourceId: record.resourceId });
        await NODE_HANDLERS[record.kind].deprovision(this.registry, record.provider, record.resourceId);
        await this.state.remove(record.nodeId);
        await this.journal.log({ nodeId: record.nodeId, action: 'deprovision', status: 'success', timestamp: now(), resourceId: record.resourceId });
        rolledBack.push(record.nodeId);
      } catch (error) {
        failures.push({ nodeId: record.nodeId, resourceId: record.resourceId, error: messageOf(error) });
        await this.journal.log({ nodeId: record.nodeId, action: 'deprovision', status: 'failed', timestamp: now(), resourceId: record.resourceId, detail: messageOf(error) }).catch((e) => Logger.warn(__t('suppressed_error_during_operation') + String(e)));
      }
    }
    return { rolledBack, failures };
  }
}
