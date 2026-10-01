/******************************************************************************
 * Project        : Ugondu
 * Module         : tenant/model
 * File           : tenant.ts
 * Version        : 1.0.0
 * Author         : Ugondu Engineer
 * Organization   : Ujomor Platform
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/

import { TenantStatus } from './tenant-status';

export interface Tenant {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly status: TenantStatus;
  readonly tier: string;
  readonly createdAt: Date;
}
