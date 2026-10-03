/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Capability Contract
 * File           : ProviderContract.ts
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
import { __t } from '../../../../shared/i18n';

import type { NodeKind } from '../engine/ProvisioningTypes';
import type { DatabaseEngine } from '../capabilities/database';
import type { StorageClass } from '../capabilities/storage';

/**
 * NATIVE: the provider has a resource that corresponds directly to the canonical semantics.
 * CONDITIONAL: supported only for a declared mode of the provider.
 * UNSUPPORTED: no faithful mapping exists; plans that use the kind are rejected before any mutation.
 */
export type CapabilityStatus = 'NATIVE' | 'CONDITIONAL' | 'UNSUPPORTED';

export const NODE_KINDS: ReadonlyArray<NodeKind> = ['COMPUTE', 'NETWORK', 'DATABASE', 'STORAGE'];

export interface KindCapability {
  status: CapabilityStatus;
  /**
   * Provider-specific implementations of the kind (for example `DEPLOYMENT`, `VPC`). A CONDITIONAL kind needs the
   * node to name one in `providerOptions.mode`; a NATIVE kind accepts one optionally.
   */
  modes: ReadonlyArray<string>;
  /** Locale key explaining why the kind is unsupported or conditional; a generic explanation is used when absent. */
  reasonKey?: string;
  /** Locale keys of the actionable alternatives shown with a rejection. */
  alternativeKeys?: ReadonlyArray<string>;
}

/** What a provider can faithfully do. Every provider declares all four kinds; silence is a registration error. */
export interface ProviderCapabilities {
  provider: string;
  kinds: Record<NodeKind, KindCapability>;
  databaseEngines: ReadonlyArray<DatabaseEngine>;
  storageClasses: ReadonlyArray<StorageClass>;
  /** Storage classes for which the provider can serve anonymous read access. */
  publicStorageClasses: ReadonlyArray<StorageClass>;
  supportsDryRun: boolean;
  supportsRollback: boolean;
  supportsIdempotency: boolean;
  supportsImport: boolean;
  supportsUpdate: boolean;
  supportsDelete: boolean;
}

/** Thrown at registration when a provider's declaration or adapters are incomplete or contradict each other. */
export class ProviderRegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderRegistrationError';
  }
}

/** Checks a declaration against the adapters supplied with it. */
export function assertContractConsistent(contract: ProviderCapabilities, adapters: Partial<Record<NodeKind, unknown>>): void {
  if (!contract.provider) throw new ProviderRegistrationError(__t('fabric.contract.provider_name_missing'));
  for (const kind of NODE_KINDS) {
    const declared = contract.kinds?.[kind];
    if (!declared) throw new ProviderRegistrationError(__t('fabric.contract.kind_undeclared', { provider: contract.provider, kind }));
    const bound = adapters[kind] !== undefined;
    if (declared.status === 'UNSUPPORTED' && bound) throw new ProviderRegistrationError(__t('fabric.contract.adapter_for_unsupported', { provider: contract.provider, kind }));
    if (declared.status !== 'UNSUPPORTED' && !bound) throw new ProviderRegistrationError(__t('fabric.contract.adapter_missing', { provider: contract.provider, kind }));
    if (declared.status === 'CONDITIONAL' && declared.modes.length === 0) throw new ProviderRegistrationError(__t('fabric.contract.conditional_without_modes', { provider: contract.provider, kind }));
  }
}
