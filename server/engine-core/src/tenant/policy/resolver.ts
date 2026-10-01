/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : resolver.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

import { PolicyDocument } from './types';
import { PolicyInheritanceManager } from './inheritance';

export interface PolicyStore {
  getOrganizationPolicy(orgId: string): Promise<PolicyDocument>;
  getTenantPolicy(tenantId: string): Promise<PolicyDocument>;
  getEnvironmentPolicy(envId: string): Promise<PolicyDocument>;
}

export class PolicyResolver {
  private inheritanceManager: PolicyInheritanceManager;

  constructor(private policyStore: PolicyStore) {
    this.inheritanceManager = new PolicyInheritanceManager();
  }

  public async resolveEffectivePolicy(orgId: string, tenantId: string, envId: string): Promise<PolicyDocument> {
    const [orgPolicy, tenantPolicy, envPolicy] = await Promise.all([
      this.policyStore.getOrganizationPolicy(orgId),
      this.policyStore.getTenantPolicy(tenantId),
      this.policyStore.getEnvironmentPolicy(envId)
    ]);

    return this.inheritanceManager.resolveHierarchy(orgPolicy, tenantPolicy, envPolicy);
  }
}
