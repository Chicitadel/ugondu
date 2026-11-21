/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : ProvisioningTypes.ts
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

/** Resource kinds the engine can provision through the provider fabric. */
export type NodeKind = 'COMPUTE' | 'NETWORK' | 'DATABASE' | 'STORAGE';

/** What was asked for and what the provider actually resolved; the user-facing explanation is derived from this. */
export interface ProvisioningEvidence {
  requested: Record<string, unknown>;
  resolved: Record<string, string | number | boolean>;
}

/** A resource in the Architecture IR. A string config value of the form `ref:<nodeId>` is replaced by that node's resource id; `secret:<name>` is a credential reference. */
export interface ProvisioningNode {
  id: string;
  type: string;
  provider: string;
  config: Record<string, unknown>;
  /** Provider extension block; `mode` selects the provider-specific implementation of a CONDITIONAL kind. */
  providerOptions?: Record<string, unknown>;
}

/** `from` must be provisioned before `to`. */
export interface ProvisioningEdge {
  from: string;
  to: string;
}

export interface ArchitectureIR {
  nodes: ProvisioningNode[];
  edges: ProvisioningEdge[];
}

export interface UrreJournalEntry {
  transactionId: string;
  nodeId: string;
  action: 'provision' | 'deprovision';
  status: 'pending' | 'success' | 'failed' | 'skipped' | 'rejected';
  timestamp: string;
  resourceId?: string;
  detail?: string;
  evidence?: ProvisioningEvidence;
}

export interface IJournal {
  log(entry: Omit<UrreJournalEntry, 'transactionId'>): Promise<void>;
}

/** What the engine remembers about a node it has provisioned. The digest covers kind, provider and resolved config. */
export interface ProvisionedRecord {
  nodeId: string;
  kind: NodeKind;
  provider: string;
  digest: string;
  resourceId: string;
  evidence: ProvisioningEvidence;
}

/** Durable memory of provisioned resources; it is what makes a second run of the same plan a no-op. */
export interface ProvisioningStateStore {
  get(nodeId: string): Promise<ProvisionedRecord | undefined>;
  put(record: ProvisionedRecord): Promise<void>;
  remove(nodeId: string): Promise<void>;
}

export interface ProvisioningReport {
  /** Every node of the plan, in provisioning order, with the resource that backs it. */
  provisioned: ProvisionedRecord[];
  /** Node ids created by this run. */
  created: string[];
  /** Node ids that already existed with an identical configuration; no provider call was made for them. */
  unchanged: string[];
}

export interface RollbackFailure {
  nodeId: string;
  resourceId: string;
  error: string;
}

/** Thrown when a plan fails after it started changing things. Everything created by the run has been rolled back unless `rollbackFailures` says otherwise. */
export class ProvisioningError extends Error {
  constructor(
    message: string,
    public readonly cause: unknown,
    public readonly rolledBack: string[],
    public readonly rollbackFailures: RollbackFailure[],
  ) {
    super(message);
    this.name = 'ProvisioningError';
  }
}

const copyOf = (record: ProvisionedRecord): ProvisionedRecord => ({
  ...record,
  evidence: { requested: { ...record.evidence.requested }, resolved: { ...record.evidence.resolved } },
});

/** In-process state store. Use a durable store when plans must stay idempotent across restarts. */
export class InMemoryProvisioningState implements ProvisioningStateStore {
  private readonly records = new Map<string, ProvisionedRecord>();

  public async get(nodeId: string): Promise<ProvisionedRecord | undefined> {
    const record = this.records.get(nodeId);
    return record ? copyOf(record) : undefined;
  }

  public async put(record: ProvisionedRecord): Promise<void> {
    this.records.set(record.nodeId, copyOf(record));
  }

  public async remove(nodeId: string): Promise<void> {
    this.records.delete(nodeId);
  }
}

export type RejectionCode =
  | 'KIND_UNSUPPORTED'
  | 'MODE_REQUIRED'
  | 'MODE_UNSUPPORTED'
  | 'STORAGE_CLASS_UNSUPPORTED'
  | 'DATABASE_ENGINE_UNSUPPORTED'
  | 'PUBLIC_STORAGE_UNSUPPORTED'
  | 'PUBLIC_STORAGE_PROHIBITED'
  | 'PUBLIC_STORAGE_UNCONFIRMED';

/** Why one node cannot be provisioned on its provider, in terms the user can act on. */
export interface PlanRejection {
  nodeId: string;
  provider: string;
  kind: NodeKind;
  code: RejectionCode;
  /** Localized explanation. */
  reason: string;
  /** Localized, actionable alternatives. */
  alternatives: string[];
}

/** Thrown by preflight when the plan uses something its providers cannot faithfully do. Nothing was changed. */
export class PlanRejectedError extends Error {
  constructor(message: string, public readonly rejections: PlanRejection[]) {
    super(message);
    this.name = 'PlanRejectedError';
  }
}

/** Organisation or edition policy the engine enforces; the safe value is the default. */
export interface EnginePolicy {
  /** Public storage is refused unless this is true (default false). */
  allowPublicStorage?: boolean;
}

export interface ExecutionPlanNode {
  nodeId: string;
  kind: NodeKind;
  provider: string;
  capability: 'NATIVE' | 'CONDITIONAL';
  mode?: string;
  requested: Record<string, unknown>;
  /** Present only when the provider can dry-run the resolution. */
  resolved?: Record<string, string | number | boolean>;
}

/** What `preview` returns: the plan as it would run, or why it would be rejected. */
export interface ExecutionPlan {
  accepted: boolean;
  nodes: ExecutionPlanNode[];
  rejections: PlanRejection[];
}
