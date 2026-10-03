/******************************************************************************
 * Project        : UAIGOS
 * Module         : Engine Core - Discovery
 * File           : capability-registry.ts
 * Version        : 1.0.0
 * Author         : Lead Systems Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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

export enum ProviderCapability {
  HOST_METRICS = 'HOST_METRICS',
  APPLICATION_DISCOVERY = 'APPLICATION_DISCOVERY',
  CLOUD_RESOURCES = 'CLOUD_RESOURCES',
  CONTAINER_ORCHESTRATION = 'CONTAINER_ORCHESTRATION',
  PANEL_MANAGEMENT = 'PANEL_MANAGEMENT',
}

/**
 * @interface ICapabilityRegistry
 * @description Corporate Governed interface implementation for ICapabilityRegistry
 * @classification ENTERPRISE
 */
export interface ICapabilityRegistry {
  registerCapability(providerId: string, capability: ProviderCapability): void;
  hasCapability(providerId: string, capability: ProviderCapability): boolean;
  getCapabilities(providerId: string): ProviderCapability[];
}

/**
 * @class CapabilityRegistry
 * @description Corporate Governed class implementation for CapabilityRegistry
 * @classification ENTERPRISE
 */
export class CapabilityRegistry implements ICapabilityRegistry {
  private registry: Map<string, Set<ProviderCapability>> = new Map();

  public registerCapability(providerId: string, capability: ProviderCapability): void {
    if (!this.registry.has(providerId)) {
      this.registry.set(providerId, new Set<ProviderCapability>());
    }
    this.registry.get(providerId)!.add(capability);
  }

  public hasCapability(providerId: string, capability: ProviderCapability): boolean {
    const capabilities = this.registry.get(providerId);
    return capabilities ? capabilities.has(capability) : false;
  }

  public getCapabilities(providerId: string): ProviderCapability[] {
    const capabilities = this.registry.get(providerId);
    return capabilities ? Array.from(capabilities) : [];
  }
}
