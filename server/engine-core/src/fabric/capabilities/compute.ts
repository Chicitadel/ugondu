/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : compute.ts
 * Version        : 2.0.0
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

/** Values a provider reports back about what it actually did; shown as evidence, never trusted as input. */
export type ResolvedValues = Record<string, string | number | boolean>;

/** The provider extension block of a node. `mode` selects the provider-specific implementation of the kind. */
export type ProviderOptions = Readonly<Record<string, unknown>> & { readonly mode?: string };

export interface ComputeCapability {
  provisionInstance(config: ComputeConfig, options: ProviderOptions): Promise<ComputeResult>;
  terminateInstance(id: string): Promise<void>;
  getInstanceStatus(id: string): Promise<ComputeStatus>;
  /**
   * Optional dry run: how the provider would satisfy the requirements, without creating anything
   * (for example the instance type chosen for the requested vCPU and memory).
   */
  resolveSizing?(config: ComputeConfig, options: ProviderOptions): Promise<ResolvedValues>;
}

/**
 * @interface ComputeConfig
 * @description `cpuCores` and `memoryMb` are requirements, not a promise of a machine; each provider resolves
 * them according to its real semantics (instance type, resource request, resource control).
 * @classification ENTERPRISE
 */
export interface ComputeConfig {
  instanceName: string;
  cpuCores: number;
  memoryMb: number;
  osImage: string;
  networkRefId?: string;
  workloadType?: 'stateless' | 'stateful';
}

/**
 * @interface ComputeResult
 * @description `resolved` records what the provider decided (for example an instance type).
 * @classification ENTERPRISE
 */
export interface ComputeResult {
  id: string;
  ipAddress?: string;
  state: 'provisioning' | 'running' | 'failed';
  resolved?: ResolvedValues;
}

/**
 * @interface ComputeStatus
 * @description Corporate Governed interface implementation for ComputeStatus
 * @classification ENTERPRISE
 */
export interface ComputeStatus {
  id: string;
  state: 'provisioning' | 'running' | 'failed' | 'terminated';
  health: 'healthy' | 'unhealthy' | 'unknown';
}
