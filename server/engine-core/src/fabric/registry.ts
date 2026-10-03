/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : registry.ts
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

import type { ComputeCapability } from './capabilities/compute';
import type { NetworkCapability } from './capabilities/network';
import type { DatabaseCapability } from './capabilities/database';
import type { StorageCapability } from './capabilities/storage';
import { assertContractConsistent } from './contract/ProviderContract';
import type { ProviderCapabilities } from './contract/ProviderContract';
import type { NodeKind } from './engine/ProvisioningTypes';

/** The adapters a provider supplies; a kind it declares UNSUPPORTED must be absent, every other kind must be present. */
export interface ProviderAdapters {
  COMPUTE?: ComputeCapability;
  NETWORK?: NetworkCapability;
  DATABASE?: DatabaseCapability;
  STORAGE?: StorageCapability;
}

interface Registration {
  contract: ProviderCapabilities;
  adapters: ProviderAdapters;
}

/**
 * @class FabricRegistry
 * @description Providers register a capability contract together with their adapters. The contract is checked for
 * completeness at registration, so "unsupported", "not installed" and "incomplete" are three different, explicit
 * conditions rather than one missing map entry.
 * @classification ENTERPRISE
 */
export class FabricRegistry {
  private providers = new Map<string, Registration>();

  public registerProvider(contract: ProviderCapabilities, adapters: ProviderAdapters): void {
    assertContractConsistent(contract, adapters);
    if (this.providers.has(contract.provider)) throw new Error(__t('fabric.contract.provider_already_registered', { provider: contract.provider }));
    this.providers.set(contract.provider, { contract, adapters: { ...adapters } });
  }

  public isRegistered(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  public contractOf(providerId: string): ProviderCapabilities {
    const registration = this.providers.get(providerId);
    if (!registration) throw new Error(__t('fabric.contract.provider_not_registered', { provider: providerId }));
    return registration.contract;
  }

  private adapter<K extends NodeKind>(providerId: string, kind: K): NonNullable<ProviderAdapters[K]> {
    const registration = this.providers.get(providerId);
    if (!registration) throw new Error(__t('fabric.contract.provider_not_registered', { provider: providerId }));
    const adapter = registration.adapters[kind];
    if (!adapter) throw new Error(__t('fabric.contract.capability_unsupported', { provider: providerId, kind }));
    return adapter as NonNullable<ProviderAdapters[K]>;
  }

  public resolveCompute(providerId: string): ComputeCapability { return this.adapter(providerId, 'COMPUTE'); }
  public resolveNetwork(providerId: string): NetworkCapability { return this.adapter(providerId, 'NETWORK'); }
  public resolveDatabase(providerId: string): DatabaseCapability { return this.adapter(providerId, 'DATABASE'); }
  public resolveStorage(providerId: string): StorageCapability { return this.adapter(providerId, 'STORAGE'); }
}
