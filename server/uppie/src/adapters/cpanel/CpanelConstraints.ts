import { __t } from '@ugondu/shared';
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
    maxPoliciesPerRole:  { status: 'SUPPORTED',   value: 1,            note: __t('a_package_references_exactly_o') },
    maxRolesPerIdentity: { status: 'SUPPORTED',   value: 1,            note: __t('an_account_belongs_to_exactly_') },
    maxAssignments:      { status: 'NOT_OBSERVABLE',                   note: __t('whm_documents_no_cap_on_accoun') },
    maxPolicySize:       { status: 'UNSUPPORTED',                      note: __t('a_feature_list_is_bounded_by_t') },
    maxStatements:       { status: 'SUPPORTED',   value: featureCount, note: __t('features_offered_by_this_serve') },
    maxGroups:           { status: 'UNSUPPORTED',                      note: __t('whm_has_no_groups') },
    maxGroupMemberships: { status: 'UNSUPPORTED',                      note: __t('whm_has_no_groups') },
    maxInheritanceDepth: { status: 'SUPPORTED',   value: 2,            note: 'WHM (root or reseller) > cPanel account' },
    maxBindings:         { status: 'SUPPORTED',   value: 1,            note: __t('an_account_has_one_package_so_') },
    maxServiceAccounts:  { status: 'UNSUPPORTED',                      note: 'WHM has no service accounts; API tokens belong to WHM users' },
    maxRules:            { status: 'UNSUPPORTED',                      note: __t('whm_does_not_use_rule_based_ac') },
    maxACLEntries:       { status: 'UNSUPPORTED',                      note: __t('whm_does_not_use_acls') },
  };
}
