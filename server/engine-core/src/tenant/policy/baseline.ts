/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : baseline.ts
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

import { PolicyDocument, Effect } from './types';

export const BaselineOrganizationPolicy: PolicyDocument = {
  id: 'baseline-org-001',
  version: '1.0',
  statements: [
    {
      effect: Effect.DENY,
      actions: ['admin:deleteOrganization'],
      resources: ['*']
    }
  ]
};

export const BaselineTenantPolicy: PolicyDocument = {
  id: 'baseline-tenant-001',
  version: '1.0',
  statements: [
    {
      effect: Effect.ALLOW,
      actions: ['resource:read'],
      resources: ['tenant::*']
    }
  ]
};

export const BaselineEnvironmentPolicy: PolicyDocument = {
  id: 'baseline-env-001',
  version: '1.0',
  statements: [
    {
      effect: Effect.ALLOW,
      actions: ['env:read', 'env:write'],
      resources: ['env::current']
    }
  ]
};
