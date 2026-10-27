/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / Capability Model
 * File           : capability-model.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export enum CapabilityKind {
  Compute       = 'Compute',
  Network       = 'Network',
  Database      = 'Database',
  Storage       = 'Storage',
  DNS           = 'DNS',
  TLS           = 'TLS',
  Secrets       = 'Secrets',
  Identity      = 'Identity',
  Registry      = 'Registry',
  Observability = 'Observability',
  Backup        = 'Backup',
  Recovery      = 'Recovery'
}

export interface CapabilityAction {
  actionId: string;
  kind: CapabilityKind;
  name: string;
  reversible: boolean;
  requiresApproval: boolean;
}

export interface ProviderCapabilityDeclaration {
  provider: string;
  supportedCapabilities: CapabilityKind[];
  supportedRegions: string[];
  authMethods: string[];
  limits: Record<string, number>;
  pricingModel: string;
}

export interface CapabilityGraph {
  capabilities: CapabilityAction[];
  providers: ProviderCapabilityDeclaration[];
  resolvedAt: number;
}
