/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : authorization-rule.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ManagementAuthority } from './management-authority';
import { AuthorizationProvenance } from './policy-provenance';

export type AuthorizationEffect = 'ALLOW' | 'DENY';

export type AuthorizationSubjectType =
  | 'USER'
  | 'GROUP'
  | 'ROLE'
  | 'SERVICE_IDENTITY'
  | 'WORKLOAD_IDENTITY'
  | 'APPLICATION'
  | 'UGONDU_EXECUTION_IDENTITY';

export type AuthorizationValidityType =
  | 'TEMPORARY'
  | 'PERMANENT'
  | 'SESSION'
  | 'OPERATION';

/**
 * @interface AuthorizationSubject
 * @description Corporate Governed interface implementation for AuthorizationSubject
 * @classification ENTERPRISE
 */
export interface AuthorizationSubject {
  type: AuthorizationSubjectType;
  id:   string;     // provider-native or universal identifier
  displayName?: string;
}

/**
 * @interface AuthorizationAction
 * @description Corporate Governed interface implementation for AuthorizationAction
 * @classification ENTERPRISE
 */
export interface AuthorizationAction {
  capability:  string;    // e.g. 'Database.Read'
  operations:  string[];  // provider-native ops, compiled by adapter
}

/**
 * @interface AuthorizationResource
 * @description Corporate Governed interface implementation for AuthorizationResource
 * @classification ENTERPRISE
 */
export interface AuthorizationResource {
  type:       string;   // e.g. 'aws::rds::DBInstance'
  scope:      string;   // ARN, resource group, cluster namespace, etc.
  conditions?: Record<string, string>;
}

/**
 * @interface AuthorizationCondition
 * @description Corporate Governed interface implementation for AuthorizationCondition
 * @classification ENTERPRISE
 */
export interface AuthorizationCondition {
  type:  'TIME_BOUND' | 'IP_BOUND' | 'MFA_REQUIRED' | 'TAG_MATCH' | 'CUSTOM';
  value: Record<string, unknown>;
}

/**
 * @interface AuthorizationScope
 * @description Corporate Governed interface implementation for AuthorizationScope
 * @classification ENTERPRISE
 */
export interface AuthorizationScope {
  environment?: string;
  tenant?:      string;
  region?:      string;
}

/**
 * @interface AuthorizationValidity
 * @description Corporate Governed interface implementation for AuthorizationValidity
 * @classification ENTERPRISE
 */
export interface AuthorizationValidity {
  issuedAt:   string;            // ISO-8601
  expiresAt:  string | 'PERMANENT';
  type:       AuthorizationValidityType;
}

/**
 * @interface AuthorizationRuleConstraints
 * @description Corporate Governed interface implementation for AuthorizationRuleConstraints
 * @classification ENTERPRISE
 */
export interface AuthorizationRuleConstraints {
  maxCallsPerHour?: number;
  ipRange?:         string;
  requireMfa?:      boolean;
}

/**
 * AIR — Authorization Intermediate Representation.
 * Provider-neutral. Compiled to provider-native syntax by adapter layer.
 */
export interface AuthorizationRule {
  ruleId:              string;    // stable UUID
  version:             string;    // semver
  subject:             AuthorizationSubject;
  action:              AuthorizationAction;
  resource:            AuthorizationResource;
  effect:              AuthorizationEffect;
  conditions:          AuthorizationCondition[];
  scope:               AuthorizationScope;
  purpose:             string;
  operationId?:        string;
  executionId?:        string;
  validity:            AuthorizationValidity;
  constraints:         AuthorizationRuleConstraints;
  provenance:          AuthorizationProvenance;
  owner:               string;
  managementAuthority: ManagementAuthority;
}
