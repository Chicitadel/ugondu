/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Public API
 * File           : index.ts
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

// Types (full public API)
export * from './types/index';

// Adapter interface + registry
export type { IPolicyProviderAdapter, ProviderType, AdapterContext } from './adapters/IPolicyProviderAdapter';
export type {
  PolicySimulationResult,
  PolicyConflict,
  DependencyReport,
  ConflictReport,
  ReconciliationPlan,
  RetirementPlan,
  RetirementResult,
  AttachResult,
  DetachResult,
} from './adapters/IPolicyProviderAdapter';
export { AdapterRegistry, adapterRegistry } from './adapters/AdapterRegistry';

// Core engines
export { EffectiveAuthorityCalculator } from './core/policy-evaluation-engine/EffectiveAuthorityCalculator';
export type { CapabilityGapResult } from './core/policy-evaluation-engine/EffectiveAuthorityCalculator';
export { LeastPrivilegeCompiler } from './core/least-privilege-compiler/LeastPrivilegeCompiler';
export type { CompiledAuthoritySet } from './core/least-privilege-compiler/LeastPrivilegeCompiler';
export { TemporaryAuthorizationManager } from './core/lifecycle/TemporaryAuthorizationManager';
export type { IssueTemporaryAuthorizationParams } from './core/lifecycle/TemporaryAuthorizationManager';
export { evaluateAuthorizationReadiness } from './core/preflight/AuthorizationReadinessPreflight';
export type {
  UppiePreflightContext,
  AuthorizationReadinessReport,
  PreflightDecision,
  PreflightCheckResult,
} from './core/preflight/AuthorizationReadinessPreflight';

// Authority Graph Builder (Stream D)
export { AuthorityGraphBuilder } from './core/authority-graph/AuthorityGraphBuilder';

// Policy Simulation Engine (Stream E)
export { PolicySimulationEngine } from './core/policy-simulation/PolicySimulationEngine';
export type {
  SimulationDecision,
  SimulationValidationError,
  PolicySimulationReport,
} from './core/policy-simulation/PolicySimulationEngine';

// UPPIE Orchestration Service
export { UppieService } from './UppieService';

// Default adapter registration
export { registerDefaultAdapters } from './adapters/adapter-defaults';
