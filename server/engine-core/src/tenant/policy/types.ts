/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : types.ts
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

export enum Effect {
  ALLOW = 'ALLOW',
  DENY = 'DENY'
}

export interface PolicyStatement {
  effect: Effect;
  actions: string[];
  resources: string[];
}

export interface PolicyDocument {
  id: string;
  version: string;
  statements: PolicyStatement[];
}

export interface PolicyContext {
  action: string;
  resource: string;
  principal: string;
  attributes: Record<string, any>;
}

export interface EvaluationResult {
  effect: Effect;
  reason: string;
}
