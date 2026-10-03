/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Azure RBAC Provider Adapter
 * File           : AzureRbacAdapter.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
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

import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type {
  IPolicyProviderAdapter, AdapterContext, AdapterCapabilityDeclaration, ProviderNativePolicy,
  PolicyValidationResult, AttachResult, DetachResult, UpdateResult, CloneResult,
  ObservationWindow, UsageObservation, DependencyReport, ConflictReport, ReconciliationPlan,
  RetirementPlan, RetirementResult, RestoreResult, PolicySimulationResult,
} from '../IPolicyProviderAdapter';
import type {
  AuthorizationRule, AuthorizationConstraints, EffectiveAuthorityResult, PolicyRetirementCertificate,
} from '../../types/index';
import { AZURE_RBAC_CONSTRAINTS } from './AzureRbacConstraints';
import { AzureApiError, createSdkAzureRbacClient } from './AzureRbacClient';
import type { AzureRbacClient, AzureRoleDefinition, AzureRolePayload } from './AzureRbacClient';
import * as discovery from './AzureRbacDiscovery';
import * as model from './AzureRbacModel';
import {
  assignmentName, buildRoleDocument, cloneGuidFor, defaultScope, digestOfDocument, errorText, fail, grantsDigest, isWithin,
  parsePrincipal, parseScope, payloadOf, roleGuidFor, roleIdAt, sameId, splitRoleId, validateRoleDocument,
} from './AzureRbacHelpers';
import type { AzureRoleDocument } from './AzureRbacHelpers';

const MAX_ROLE_NAME = 512;
const statusOf = (e: unknown): number | undefined => (e instanceof AzureApiError ? e.statusCode : undefined);

/** Serialized form of a retired role held in the retirement certificate's rollbackReference. */
interface RoleSnapshot { id: string; payload: AzureRolePayload }

/**
 * AzureRbacAdapter — UPPIE provider adapter for Azure role-based access control.
 *
 * - A policy is a custom role definition; attaching it creates a role assignment at the rules' scope.
 * - Deny assignments are system-managed in Azure: this adapter never creates them, and compiling a Deny rule is refused.
 *   Conditions, constraints, expiring validity and rules that span several scopes are refused too (fail closed).
 * - Role names are `ugondu-<digest12>` of the grants, and role and assignment GUIDs are derived from content, so
 *   generation and attach are idempotent. An existing role of the same id is accepted only when its grants are identical.
 * - Built-in roles can be cloned and assigned but never modified or retired.
 * - Operations prefixed `data:` are data-plane (`dataActions`); all others are control-plane (`actions`).
 * - Azure offers no simulation API and no usage API: simulation and effective authority are model-based (MEDIUM
 *   confidence, group-inherited access is not visible), and usage reports only whether a role is assigned at all.
 * - All Azure access goes through AzureRbacClient; the production client is loaded lazily from @azure/arm-authorization
 *   and tests inject a double. Clients are cached per tenant, environment and credential identity.
 */
export class AzureRbacAdapter implements IPolicyProviderAdapter {
  readonly providerType = 'AZURE_RBAC' as const;

  readonly capabilities: AdapterCapabilityDeclaration = {
    discoverPolicies: 'SUPPORTED', discoverAssignments: 'SUPPORTED', discoverIdentities: 'SUPPORTED_WITH_LIMITS',
    discoverGroups: 'SUPPORTED_WITH_LIMITS', discoverRoles: 'SUPPORTED', discoverEffectiveAuthority: 'SUPPORTED_WITH_LIMITS',
    evaluate: 'SUPPORTED_WITH_LIMITS', simulate: 'SUPPORTED_WITH_LIMITS', generate: 'SUPPORTED', validate: 'SUPPORTED',
    attach: 'SUPPORTED', detach: 'SUPPORTED', update: 'SUPPORTED', clone: 'SUPPORTED',
    observeUsage: 'SUPPORTED_WITH_LIMITS', detectUnused: 'SUPPORTED_WITH_LIMITS', findDependencies: 'SUPPORTED',
    findConflicts: 'SUPPORTED', getConstraints: 'SUPPORTED', reconcile: 'SUPPORTED',
    retire: 'SUPPORTED', restore: 'SUPPORTED',
  };

  private readonly clients = new Map<string, Promise<AzureRbacClient>>();

  constructor(private readonly clientFactory: (context: AdapterContext) => Promise<AzureRbacClient> = createSdkAzureRbacClient) {}

  private client(context: AdapterContext): Promise<AzureRbacClient> {
    const c = context.credentials;
    const key = createHash('sha256').update([context.tenantId, context.environmentId, c.tenantId ?? '', c.clientId ?? ''].join('|')).digest('hex');
    let pending = this.clients.get(key);
    if (!pending) {
      pending = this.clientFactory(context).catch((e) => { this.clients.delete(key); throw e; });
      this.clients.set(key, pending);
    }
    return pending;
  }

  /** The existing role definition, or undefined when Azure reports it does not exist. */
  private async find(client: AzureRbacClient, roleId: string): Promise<AzureRoleDefinition | undefined> {
    try {
      return await client.getRoleDefinition(roleId);
    } catch (e) {
      if (statusOf(e) === 404) return undefined;
      throw e;
    }
  }

  private async customRole(client: AzureRbacClient, roleId: string): Promise<AzureRoleDefinition> {
    splitRoleId(roleId);
    const role = await client.getRoleDefinition(roleId);
    if (role.roleType !== 'CustomRole') throw fail('uppie.adapter.azure.protected_role', { id: roleId });
    return role;
  }

  async discoverPolicies(context: AdapterContext): Promise<ProviderNativePolicy[]> { return discovery.discoverPolicies(await this.client(context), context); }
  async discoverAssignments(context: AdapterContext): Promise<Record<string, string[]>> { return discovery.discoverAssignments(await this.client(context), context); }
  async discoverIdentities(context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> { return discovery.discoverIdentities(await this.client(context), context); }
  async discoverGroups(context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> { return discovery.discoverGroups(await this.client(context), context); }
  async discoverRoles(context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> { return discovery.discoverRoles(await this.client(context), context); }

  async discoverEffectiveAuthority(actor: string, resource: string, context: AdapterContext): Promise<EffectiveAuthorityResult> {
    return model.effectiveAuthority(await this.client(context), actor, resource, context);
  }

  async evaluate(rule: AuthorizationRule, context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
    try {
      return await model.evaluateRule(await this.client(context), rule, context);
    } catch {
      return 'UNKNOWN';
    }
  }

  async simulate(proposedRules: AuthorizationRule[], context: AdapterContext): Promise<PolicySimulationResult> {
    return model.simulateRules(await this.client(context), proposedRules, context);
  }

  async generate(rules: AuthorizationRule[], context: AdapterContext): Promise<ProviderNativePolicy> {
    const document = buildRoleDocument(rules, context);
    const providerId = roleIdAt(document.assignableScopes[0] as string, roleGuidFor(document));
    return { providerId, providerType: 'AZURE_RBAC', nativeDocument: document, digest: digestOfDocument(document) };
  }

  async validate(nativePolicy: ProviderNativePolicy, _context: AdapterContext): Promise<PolicyValidationResult> {
    const document = nativePolicy.nativeDocument as AzureRoleDocument | undefined;
    const { errors, warnings } = validateRoleDocument(document);
    if (errors.length === 0 && document && nativePolicy.digest && nativePolicy.digest !== digestOfDocument(document)) errors.push(__t('uppie.adapter.azure.validate.digest_mismatch'));
    return { valid: errors.length === 0, errors, warnings };
  }

  /** Makes sure the role exists: built-in roles and identical custom roles are accepted, a different role of that id is refused. */
  private async ensureRole(client: AzureRbacClient, roleId: string, document: AzureRoleDocument): Promise<string> {
    const { scope, guid } = splitRoleId(roleId);
    const existing = await this.find(client, roleId);
    if (existing) {
      if (existing.roleType === 'CustomRole' && grantsDigest(existing) !== grantsDigest(document)) throw fail('uppie.adapter.azure.role_exists_different', { id: roleId });
      return existing.id;
    }
    parseScope(scope);
    return (await client.createOrUpdateRoleDefinition(scope, guid, payloadOf(document))).id;
  }

  async attach(nativePolicy: ProviderNativePolicy, target: string, context: AdapterContext): Promise<AttachResult> {
    try {
      const check = await this.validate(nativePolicy, context);
      if (!check.valid) return { success: false, providerRef: '', attachedAt: '', errors: check.errors };
      const principal = parsePrincipal(target);
      const client = await this.client(context);
      const document = nativePolicy.nativeDocument as AzureRoleDocument;
      const roleId = await this.ensureRole(client, nativePolicy.providerId, document);
      const scope = document.assignmentScope;
      const input = { principalId: principal.principalId, roleDefinitionId: roleId, ...(principal.principalType ? { principalType: principal.principalType } : {}) };
      let providerRef: string;
      try {
        providerRef = (await client.createRoleAssignment(scope, assignmentName(scope, principal.principalId, roleId), input)).id;
      } catch (e) {
        if (statusOf(e) !== 409) throw e; // already assigned (possibly under another name): accept an identical assignment
        const existing = (await client.listRoleAssignments(scope, principal.principalId))
          .find((a) => sameId(a.scope, scope) && sameId(a.principalId, principal.principalId) && sameId(a.roleDefinitionId, roleId));
        if (!existing) throw e;
        providerRef = existing.id;
      }
      return { success: true, providerRef, attachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, providerRef: '', attachedAt: '', errors: [__t('uppie.adapter.azure.attach_error', { error: errorText(e) })] };
    }
  }

  async detach(policyId: string, target: string, context: AdapterContext): Promise<DetachResult> {
    try {
      splitRoleId(policyId);
      const principal = parsePrincipal(target);
      const client = await this.client(context);
      const role = await this.find(client, policyId);
      const held = role ? (await model.assignmentsOfRole(client, role, defaultScope(context))).filter((a) => sameId(a.principalId, principal.principalId)) : [];
      for (const a of held) await client.deleteRoleAssignment(a.scope, a.name);
      return { success: true, detachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.azure.detach_error', { error: errorText(e) })] };
    }
  }

  async update(policyId: string, newRules: AuthorizationRule[], context: AdapterContext): Promise<UpdateResult> {
    try {
      const client = await this.client(context);
      const role = await this.customRole(client, policyId);
      const document = buildRoleDocument(newRules, context);
      const { errors } = validateRoleDocument(document);
      if (errors.length > 0) return { success: false, version: '', errors };
      if (!role.assignableScopes.some((s) => isWithin(document.assignmentScope, s))) throw fail('uppie.adapter.azure.update_scope_change', { id: policyId });
      const { scope, guid } = splitRoleId(role.id);
      await client.createOrUpdateRoleDefinition(scope, guid, { roleName: role.roleName, description: role.description, permissions: document.permissions, assignableScopes: role.assignableScopes });
      return { success: true, version: digestOfDocument(document).slice(0, 12), errors: [] };
    } catch (e) {
      return { success: false, version: '', errors: [__t('uppie.adapter.azure.update_error', { error: errorText(e) })] };
    }
  }

  async clone(policyId: string, newName: string, context: AdapterContext): Promise<CloneResult> {
    try {
      const name = newName.trim();
      if (name.length === 0 || name.length > MAX_ROLE_NAME) throw fail('uppie.adapter.azure.invalid_name', { limit: MAX_ROLE_NAME });
      splitRoleId(policyId);
      const client = await this.client(context);
      const source = await client.getRoleDefinition(policyId);
      const scopes = source.roleType === 'CustomRole' ? source.assignableScopes : [defaultScope(context)];
      const scope = scopes[0] as string;
      const guid = cloneGuidFor(scope, name);
      const clonedId = roleIdAt(scope, guid);
      const copy: AzureRolePayload = { roleName: name, description: source.description, permissions: source.permissions, assignableScopes: scopes };
      const existing = await this.find(client, clonedId);
      if (existing) {
        if (grantsDigest(existing) !== grantsDigest(copy)) throw fail('uppie.adapter.azure.role_exists_different', { id: clonedId });
        return { success: true, clonedId: existing.id, errors: [] };
      }
      return { success: true, clonedId: (await client.createOrUpdateRoleDefinition(scope, guid, copy)).id, errors: [] };
    } catch (e) {
      return { success: false, clonedId: '', errors: [__t('uppie.adapter.azure.clone_error', { error: errorText(e) })] };
    }
  }

  /** Azure keeps no per-role activity history here: a role with no assignments is UNUSED, any other role is UNKNOWN. */
  async observeUsage(policyId: string, _window: ObservationWindow, context: AdapterContext): Promise<UsageObservation> {
    const client = await this.client(context);
    const assigned = await model.assignmentsOfRole(client, await client.getRoleDefinition(policyId), defaultScope(context));
    return { policyId, observedUsages: 0, classification: assigned.length === 0 ? 'UNUSED' : 'UNKNOWN', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false };
  }

  /**
   * Custom roles assignable at the subscription with no role assignments. The threshold cannot be applied because Azure
   * does not expose activity per role, and a role defined only for a resource group is not listed at the subscription
   * scope, so it is invisible here once its last assignment is removed.
   */
  async detectUnused(context: AdapterContext, _thresholdDays: number): Promise<UsageObservation[]> {
    const client = await this.client(context);
    const out: UsageObservation[] = [];
    for (const role of await client.listRoleDefinitions(defaultScope(context), true)) {
      if ((await model.assignmentsOfRole(client, role, defaultScope(context))).length === 0) {
        out.push({ policyId: role.id, observedUsages: 0, classification: 'UNUSED', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false });
      }
    }
    return out;
  }

  async findDependencies(policyId: string, context: AdapterContext): Promise<DependencyReport> {
    const client = await this.client(context);
    return model.dependencies(client, await client.getRoleDefinition(policyId), defaultScope(context));
  }

  async findConflicts(rules: AuthorizationRule[], context: AdapterContext): Promise<ConflictReport> {
    return model.findConflicts(rules, context);
  }

  async getConstraints(_context: AdapterContext): Promise<AuthorizationConstraints> {
    return AZURE_RBAC_CONSTRAINTS;
  }

  async reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], context: AdapterContext): Promise<ReconciliationPlan> {
    try {
      return model.reconcilePlan(desired, observed, context);
    } catch (e) {
      throw fail('uppie.adapter.azure.reconcile_error', { error: errorText(e) });
    }
  }

  async retire(plan: RetirementPlan, context: AdapterContext): Promise<RetirementResult> {
    try {
      const client = await this.client(context);
      const role = await this.customRole(client, plan.policyId);
      const assigned = await model.assignmentsOfRole(client, role, defaultScope(context));
      if (assigned.length > 0) throw fail('uppie.adapter.azure.retire_in_use', { id: plan.policyId, count: assigned.length });
      const snapshot: RoleSnapshot = { id: role.id, payload: { roleName: role.roleName, description: role.description, permissions: role.permissions, assignableScopes: role.assignableScopes } };
      const { scope, guid } = splitRoleId(role.id);
      await client.deleteRoleDefinition(scope, guid);
      const detachmentEvidence = JSON.stringify({ policy: role.id, assignments: 0, approvedBy: plan.approvedBy, verifiedAt: new Date().toISOString() });
      return { success: true, rollbackReference: JSON.stringify(snapshot), detachmentEvidence, errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.azure.retire_error', { error: errorText(e) })] };
    }
  }

  async restore(certificate: PolicyRetirementCertificate, context: AdapterContext): Promise<RestoreResult> {
    try {
      if (!certificate.rollbackReference) return { success: false, restoredId: '', errors: [__t('uppie.adapter.azure.restore_no_reference')] };
      const snapshot = JSON.parse(certificate.rollbackReference) as RoleSnapshot;
      if (!snapshot?.payload || !sameId(snapshot.id, certificate.policyId)) throw fail('uppie.adapter.azure.restore_invalid_snapshot', { id: certificate.policyId });
      const { errors } = validateRoleDocument({ ...snapshot.payload, assignmentScope: snapshot.payload.assignableScopes[0] ?? '' });
      if (errors.length > 0) throw new Error(errors.join('; '));
      const client = await this.client(context);
      const existing = await this.find(client, snapshot.id);
      if (existing) {
        if (grantsDigest(existing) !== grantsDigest(snapshot.payload)) throw fail('uppie.adapter.azure.role_exists_different', { id: snapshot.id });
        return { success: true, restoredId: existing.id, errors: [] };
      }
      const { scope, guid } = splitRoleId(snapshot.id);
      return { success: true, restoredId: (await client.createOrUpdateRoleDefinition(scope, guid, snapshot.payload)).id, errors: [] };
    } catch (e) {
      return { success: false, restoredId: '', errors: [__t('uppie.adapter.azure.restore_error', { error: errorText(e) })] };
    }
  }
}
