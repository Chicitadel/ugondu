/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Adapter Registry
 * File           : AdapterRegistry.ts
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

import type { IPolicyProviderAdapter, ProviderType } from './IPolicyProviderAdapter';

/**
 * AdapterRegistry — plugin-style registry for UPPIE provider adapters.
 *
 * Adapters are independently activatable and deactivatable per tenant edition.
 * The registry is the single point of adapter discovery for the UPPIE core.
 */
export class AdapterRegistry {
  private readonly adapters = new Map<ProviderType, IPolicyProviderAdapter>();
  private readonly activeAdapters = new Set<ProviderType>();

  /**
   * Register an adapter. Adapters can be registered but not yet active.
   * Activation is controlled by capability entitlement (CEG).
   */
  register(adapter: IPolicyProviderAdapter): void {
    if (this.adapters.has(adapter.providerType)) {
      throw new Error(
        `Adapter for provider '${adapter.providerType}' is already registered. ` +
        'Unregister the existing adapter before registering a replacement.'
      );
    }
    this.adapters.set(adapter.providerType, adapter);
  }

  /** Unregister an adapter. Deactivates it first if active. */
  unregister(providerType: ProviderType): void {
    this.activeAdapters.delete(providerType);
    this.adapters.delete(providerType);
  }

  /** Activate an adapter (makes it available for use). Requires prior registration. */
  activate(providerType: ProviderType): void {
    if (!this.adapters.has(providerType)) {
      throw new Error(
        `Cannot activate adapter for '${providerType}': not registered. ` +
        'Register the adapter before activating it.'
      );
    }
    this.activeAdapters.add(providerType);
  }

  /** Deactivate an adapter without unregistering it. */
  deactivate(providerType: ProviderType): void {
    this.activeAdapters.delete(providerType);
  }

  /**
   * Get an active adapter for a provider type.
   * Returns undefined if no active adapter is registered for the provider.
   */
  getForProvider(providerType: ProviderType): IPolicyProviderAdapter | undefined {
    if (!this.activeAdapters.has(providerType)) {
      return undefined;
    }
    return this.adapters.get(providerType);
  }

  /** Get an active adapter or throw if not available. */
  requireForProvider(providerType: ProviderType): IPolicyProviderAdapter {
    const adapter = this.getForProvider(providerType);
    if (!adapter) {
      throw new Error(
        `No active adapter available for provider '${providerType}'. ` +
        'Ensure the adapter is registered and activated for this tenant edition.'
      );
    }
    return adapter;
  }

  /** List all registered provider types (active and inactive). */
  listRegistered(): ProviderType[] {
    return Array.from(this.adapters.keys());
  }

  /** List all currently active provider types. */
  listActive(): ProviderType[] {
    return Array.from(this.activeAdapters);
  }

  /** Check whether a specific adapter is active. */
  isActive(providerType: ProviderType): boolean {
    return this.activeAdapters.has(providerType);
  }

  /** Deactivate all adapters (e.g., on tenant edition downgrade). */
  deactivateAll(): void {
    this.activeAdapters.clear();
  }
}

/** Singleton registry instance. Use this in production code. */
export const adapterRegistry = new AdapterRegistry();
