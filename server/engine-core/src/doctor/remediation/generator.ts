/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Doctor — Remediation Option Generator
 * File           : generator.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed
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

import { __t, Logger } from '@ugondu/shared';
import { isAuthorizationFailure, IncidentSeverity } from '../model/incident';
import type { IncidentRecord } from '../model/incident';
import type { AuthorizationFailureIncident, AuthorizationResolutionOption } from '../model/authorization-failure';

export interface TenantRemediationPolicyConfig {
  roleId?: string;
  approver?: string;
  roleMappings?: Record<string, string>;
  tenantApprovers?: Record<string, string>;
}

/**
 * @class Generator
 * @description Corporate Policy Governed class implementation for Generator
 * @classification ENTERPRISE
 */
export class Generator {
  private generatedHistory: unknown[] = [];

  public generate(plan: unknown): { generatedAt: number; plan: unknown } {
    Logger.info(__t('ui.responses.authorization_insufficient_for_operation_on_t', { ctx_target: 'Generator' }));
    const record = { generatedAt: Date.now(), plan };
    this.generatedHistory.push(record);
    return record;
  }

  public getHistory(): unknown[] {
    return this.generatedHistory;
  }
}

function resolveRoleIdFromContext(
  ctx: AuthorizationFailureIncident & Record<string, unknown>,
  policyConfig?: TenantRemediationPolicyConfig
): string {
  if (policyConfig?.roleId && policyConfig.roleId.trim()) {
    return policyConfig.roleId.trim();
  }
  if (ctx.actor && policyConfig?.roleMappings?.[ctx.actor]) {
    return policyConfig.roleMappings[ctx.actor];
  }
  if (typeof ctx['roleId'] === 'string' && ctx['roleId'].trim()) {
    return ctx['roleId'].trim();
  }
  if (ctx.assignmentPath) {
    const roleMatch = ctx.assignmentPath.match(/(?:role\/|role:)([a-zA-Z0-9+=,.@_-]+)/i);
    if (roleMatch?.[1]) {
      return roleMatch[1];
    }
  }
  const normalizedActor = (ctx.actor || 'default-principal').replace(/[^a-zA-Z0-9_-]/g, '-');
  const providerNamespace = (ctx.provider || 'universal').toLowerCase();
  return `urn:ugondu:iam:${providerNamespace}:role/${normalizedActor}`;
}

function resolveApproverFromPolicy(
  ctx: AuthorizationFailureIncident & Record<string, unknown>,
  policyConfig?: TenantRemediationPolicyConfig
): string {
  if (policyConfig?.approver && policyConfig.approver.trim()) {
    return policyConfig.approver.trim();
  }
  const tenantId = typeof ctx['tenantId'] === 'string' ? ctx['tenantId'].trim() : '';
  if (tenantId && policyConfig?.tenantApprovers?.[tenantId]) {
    return policyConfig.tenantApprovers[tenantId];
  }
  if (typeof ctx['approver'] === 'string' && ctx['approver'].trim()) {
    return ctx['approver'].trim();
  }
  if (ctx.policyConflict?.conflictingPolicyId) {
    return `urn:ugondu:governance:policy-authority/${ctx.policyConflict.conflictingPolicyId}`;
  }
  const providerNamespace = (ctx.provider || 'tenant').toLowerCase();
  if (ctx.severity === IncidentSeverity.CRITICAL || ctx.severity === IncidentSeverity.HIGH) {
    return `urn:ugondu:governance:${providerNamespace}:security-authority`;
  }
  return `urn:ugondu:governance:${providerNamespace}:access-approver`;
}

/**
 * Generate remediation options for an AUTHORIZATION_FAILURE incident.
 *
 * INVARIANT: Resolution options are always ordered by preference:
 *   1. REUSE_EXISTING — check if existing actor already has the authority
 *   2. EXTEND_ROLE    — add minimum grants to existing role
 *   3. CREATE_GRANT   — create new minimum-scope grant
 *   4. REQUEST_APPROVAL — escalate to policy-resolved approver
 *   5. CANCEL_OPERATION — abort safely
 */
export function generateAuthorizationRemediationOptions(
  incident: IncidentRecord,
  policyConfig?: TenantRemediationPolicyConfig
): AuthorizationResolutionOption[] {
  if (!isAuthorizationFailure(incident) || !incident.uppieContext) {
    return [];
  }

  const ctx = incident.uppieContext as AuthorizationFailureIncident & Record<string, unknown>;
  const options: AuthorizationResolutionOption[] = [];

  if (ctx.actor) {
    options.push({
      type:           'REUSE_EXISTING',
      actorId:        ctx.actor,
      assignmentPath: ctx.assignmentPath,
    });
  }

  if (ctx.missingAuthority.length > 0) {
    options.push({
      type:          'EXTEND_ROLE',
      roleId:        resolveRoleIdFromContext(ctx, policyConfig),
      missingGrants: ctx.missingAuthority,
    });
  }

  if (ctx.missingAuthority.length > 0) {
    options.push({
      type:          'CREATE_GRANT',
      minimumGrants: ctx.missingAuthority,
      scope:         ctx.target,
    });
  }

  options.push({
    type:              'REQUEST_APPROVAL',
    requiredAuthority: ctx.missingAuthority.join(', '),
    approver:          resolveApproverFromPolicy(ctx, policyConfig),
  });

  options.push({
    type:   'CANCEL_OPERATION',
    reason: __t('ui.responses.authorization_insufficient_for_operation_on_t', { ctx_target: ctx.target }),
  });

  return options;
}
