/******************************************************************************
 * Project        : UAIGOS
 * Module         : Engine Core - Discovery
 * File           : provider-discovery.ts
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';

import { ICapabilityRegistry } from './capability-registry';

/**
 * @interface IProviderAdapter
 * @description Corporate Governed interface implementation for IProviderAdapter
 * @classification ENTERPRISE
 */
export interface IProviderAdapter {
  id: string;
  discover(): Promise<any>;
}

/**
 * @class ProviderDiscovery
 * @description Corporate Governed class implementation for ProviderDiscovery
 * @classification ENTERPRISE
 */
export class ProviderDiscovery {
  private adapters: Map<string, IProviderAdapter> = new Map();
  private capabilityRegistry: ICapabilityRegistry;

  constructor(capabilityRegistry: ICapabilityRegistry) {
    this.capabilityRegistry = capabilityRegistry;
  }

  public registerAdapter(adapter: IProviderAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  public async runDiscovery(providerId: string): Promise<any> {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new Error(__t('messages.error.provider_adapter_not_found', { 'providerId': providerId }));
    }
    return adapter.discover();
  }
}
