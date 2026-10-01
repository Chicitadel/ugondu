/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core
 * File           : resource-state.ts
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

export enum ResourceState {
  DISCOVERED   = 'DISCOVERED',
  MODELLED     = 'MODELLED',
  PLANNED      = 'PLANNED',
  PROVISIONED  = 'PROVISIONED',
  DEPLOYED     = 'DEPLOYED',
  VERIFIED     = 'VERIFIED',
  HEALTHY      = 'HEALTHY',
  DEGRADED     = 'DEGRADED',
  RECOVERING   = 'RECOVERING',
}

export class InvalidTransitionError extends Error {
  constructor(from: ResourceState, to: ResourceState) {
    super(`Invalid state transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}
