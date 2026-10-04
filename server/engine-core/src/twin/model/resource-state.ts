// @ts-ignore
import { __t } from '@ugondu/shared';
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

/**
 * @class InvalidTransitionError
 * @description Corporate Governed class implementation for InvalidTransitionError
 * @classification ENTERPRISE
 */
export class InvalidTransitionError extends Error {
  constructor(from: ResourceState, to: ResourceState) {
    super(__t('messages.error.invalid_state_transition', { from, to }));
    this.name = 'InvalidTransitionError';
  }
}
