/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Authorization
 * File           : context-guard.ts
 * Version        : 1.0.0
 * Author         : Phase 14 AI Engineer
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

import { SubjectContext } from '../identity/subject-context';
import { Authority } from './authority';
import { AuthorizationDecision, DecisionBuilder } from './decision';

/**
 * @class TenantContextGuard
 * @description Corporate Governed class implementation for TenantContextGuard
 * @classification ENTERPRISE
 */
export class TenantContextGuard {
  private authority: Authority;

  constructor(authority: Authority) {
    this.authority = authority;
  }

  /**
   * Central TenantContextGuard used by all subsystems
   */
  public guard(subject: SubjectContext, action: string, resource: any): AuthorizationDecision {
    if (!subject) {
      return DecisionBuilder.deny(__t('unauthenticated_subject'));
    }

    // Cross-tenant protection
    if (resource && resource.tenantId && resource.tenantId !== subject.tenantId) {
      return DecisionBuilder.deny(__t('cross_tenant_access_violation_'));
    }

    return this.authority.authorize(subject, action, resource);
  }
}
