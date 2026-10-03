/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — cPanel Provider Constraints
 * File           : CpanelConstraints.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
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

import type { AuthorizationConstraints } from '../../types/index';

/**
 * cPanel/WHM constraints.
 * - An account has exactly one package and a package exactly one feature list; there are no groups, rules, ACLs or Deny.
 * - A feature list can hold as many features as the server offers, so that limit is read from the server.
 * - Hierarchy is WHM (root or reseller) > cPanel account.
 */
export function cpanelConstraints(featureCount: number): AuthorizationConstraints {
  return {
    maxPoliciesPerRole:  { status: 'SUPPORTED',   value: 1,            note: 'A package references exactly one feature list' },
    maxRolesPerIdentity: { status: 'SUPPORTED',   value: 1,            note: 'An account belongs to exactly one package' },
    maxAssignments:      { status: 'NOT_OBSERVABLE',                   note: 'WHM documents no cap on accounts per package' },
    maxPolicySize:       { status: 'UNSUPPORTED',                      note: 'A feature list is bounded by the features of the server, not by size' },
    maxStatements:       { status: 'SUPPORTED',   value: featureCount, note: 'Features offered by this server' },
    maxGroups:           { status: 'UNSUPPORTED',                      note: 'WHM has no groups' },
    maxGroupMemberships: { status: 'UNSUPPORTED',                      note: 'WHM has no groups' },
    maxInheritanceDepth: { status: 'SUPPORTED',   value: 2,            note: 'WHM (root or reseller) > cPanel account' },
    maxBindings:         { status: 'SUPPORTED',   value: 1,            note: 'An account has one package, so one feature list' },
    maxServiceAccounts:  { status: 'UNSUPPORTED',                      note: 'WHM has no service accounts; API tokens belong to WHM users' },
    maxRules:            { status: 'UNSUPPORTED',                      note: 'WHM does not use rule-based access control' },
    maxACLEntries:       { status: 'UNSUPPORTED',                      note: 'WHM does not use ACLs' },
  };
}
