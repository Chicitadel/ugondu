/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : authority-graph.ts
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

import { AuthorizationRule } from './authorization-rule';
import { EffectivePermission } from './effective-authority';

export type AuthorityTopologyPattern =
  | 'GROUP_INHERITANCE'       // Actor → Group → Role → Policy → Permission → Resource
  | 'DIRECT_ASSIGNMENT'       // Actor → Direct Permission → Resource
  | 'SERVICE_IDENTITY'        // Service Identity → Role → Policy → Resource
  | 'WORKLOAD_IDENTITY'       // Application → Workload Identity → Service Account → Role → Permission
  | 'UGONDU_EXECUTION'        // Ugondu Control Plane → Execution Identity → Delegated Authority
  | 'RESOURCE_POLICY'         // Resource → Resource Policy → Actor allow/deny
  | 'BOUNDARY_RESTRICTION';   // Environment/Tenant → Permission Boundary → limits authority

/**
 * @interface AuthorityActor
 * @description Corporate Governed interface implementation for AuthorityActor
 * @classification ENTERPRISE
 */
export interface AuthorityActor {
  actorId:      string;
  type:         'USER' | 'GROUP' | 'SERVICE_ACCOUNT' | 'WORKLOAD' | 'UGONDU';
  displayName:  string;
  provider:     string;
}

/**
 * @interface AuthorityRole
 * @description Corporate Governed interface implementation for AuthorityRole
 * @classification ENTERPRISE
 */
export interface AuthorityRole {
  roleId:        string;
  displayName:   string;
  provider:      string;
  policies:      string[];   // policy IDs attached to this role
}

/**
 * @interface AuthorityPolicy
 * @description Corporate Governed interface implementation for AuthorityPolicy
 * @classification ENTERPRISE
 */
export interface AuthorityPolicy {
  policyId:            string;
  displayName:         string;
  provider:            string;
  rules:               AuthorizationRule[];
  attachedToRoles:     string[];
  attachedToActors:    string[];
}

/**
 * @interface AuthorityEdge
 * @description Corporate Governed interface implementation for AuthorityEdge
 * @classification ENTERPRISE
 */
export interface AuthorityEdge {
  fromId:    string;
  toId:      string;
  edgeType:  'BELONGS_TO' | 'ASSUMES' | 'ATTACHED_TO' | 'GRANTS' | 'RESTRICTS' | 'OWNS';
  metadata?: Record<string, string>;
}

/**
 * @interface PermissionBoundary
 * @description Corporate Governed interface implementation for PermissionBoundary
 * @classification ENTERPRISE
 */
export interface PermissionBoundary {
  boundaryId:   string;
  appliesTo:    string[];  // actor/role IDs
  maxGrantable: string[];  // capability IDs
}

/**
 * @interface AuthorityGraph
 * @description Corporate Governed interface implementation for AuthorityGraph
 * @classification ENTERPRISE
 */
export interface AuthorityGraph {
  graphId:       string;
  environmentId: string;
  tenantId:      string;
  capturedAt:    string;     // ISO-8601
  actors:        AuthorityActor[];
  roles:         AuthorityRole[];
  policies:      AuthorityPolicy[];
  boundaries:    PermissionBoundary[];
  edges:         AuthorityEdge[];
  // Derived: actor ID → resource ID → effective permissions
  effectiveAuthority: Record<string, Record<string, EffectivePermission[]>>;
}

/**
 * @interface AuthorityGraphSnapshot
 * @description Corporate Governed interface implementation for AuthorityGraphSnapshot
 * @classification ENTERPRISE
 */
export interface AuthorityGraphSnapshot {
  graph:       AuthorityGraph;
  digest:      string;   // SHA-256 of canonical JSON
  signedAt?:   string;   // ISO-8601
}
