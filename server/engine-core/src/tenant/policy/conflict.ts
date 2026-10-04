/******************************************************************************
 * Project        : Ugondu
 * Module         : tenant/policy
 * File           : conflict.ts
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

// @ts-ignore
import { __t } from '@ugondu/shared';

/**
 * @class ConflictError
 * @description Corporate Governed class implementation for ConflictError
 * @classification ENTERPRISE
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/**
 * @class ConflictHandler
 * @description Corporate Governed class implementation for ConflictHandler
 * @classification ENTERPRISE
 */
export class ConflictHandler {
  public handle(rules: string[]): never {
    throw new ConflictError(__t('messages.error.policy_conflict_detected_resolution_requires_'));
  }
}
