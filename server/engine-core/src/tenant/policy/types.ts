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

export enum Effect {
  ALLOW = 'ALLOW',
  DENY = 'DENY'
}

/**
 * @interface PolicyStatement
 * @description Corporate Governed interface implementation for PolicyStatement
 * @classification ENTERPRISE
 */
export interface PolicyStatement {
  effect: Effect;
  actions: string[];
  resources: string[];
}

/**
 * @interface PolicyDocument
 * @description Corporate Governed interface implementation for PolicyDocument
 * @classification ENTERPRISE
 */
export interface PolicyDocument {
  id: string;
  version: string;
  statements: PolicyStatement[];
}

/**
 * @interface PolicyContext
 * @description Corporate Governed interface implementation for PolicyContext
 * @classification ENTERPRISE
 */
export interface PolicyContext {
  action: string;
  resource: string;
  principal: string;
  attributes: Record<string, any>;
}

/**
 * @interface EvaluationResult
 * @description Corporate Governed interface implementation for EvaluationResult
 * @classification ENTERPRISE
 */
export interface EvaluationResult {
  effect: Effect;
  reason: string;
}
