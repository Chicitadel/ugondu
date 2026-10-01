/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core
 * File           : transition-rules.ts
 * Version        : 1.0.0
 * Author         : Antigravity AI
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

import { ResourceState } from '../model/resource-state';

export const ALLOWED_TRANSITIONS: Record<ResourceState, ResourceState[]> = {
  [ResourceState.DISCOVERED]: [ResourceState.MODELLED],
  [ResourceState.MODELLED]: [ResourceState.PLANNED, ResourceState.DISCOVERED],
  [ResourceState.PLANNED]: [ResourceState.PROVISIONED, ResourceState.MODELLED],
  [ResourceState.PROVISIONED]: [ResourceState.DEPLOYED, ResourceState.PLANNED],
  [ResourceState.DEPLOYED]: [ResourceState.VERIFIED, ResourceState.PROVISIONED],
  [ResourceState.VERIFIED]: [ResourceState.HEALTHY, ResourceState.DEPLOYED],
  [ResourceState.HEALTHY]: [ResourceState.DEGRADED, ResourceState.VERIFIED],
  [ResourceState.DEGRADED]: [ResourceState.RECOVERING, ResourceState.HEALTHY],
  [ResourceState.RECOVERING]: [ResourceState.HEALTHY, ResourceState.DEGRADED, ResourceState.PROVISIONED],
};
