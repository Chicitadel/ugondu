/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core
 * File           : twin-resource.ts
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

import { ResourceState } from './resource-state';

export interface TwinResource {
  id: string;
  type: string;
  name: string;
  provider: string;
  state: ResourceState;
  observedAt: Date;
  metadata: Record<string, unknown>;
  stateHistory: Array<{ from: ResourceState; to: ResourceState; at: Date }>;
}
