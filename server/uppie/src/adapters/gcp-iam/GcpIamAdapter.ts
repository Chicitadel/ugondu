/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — GCP IAM Provider Adapter
 * File           : GcpIamAdapter.ts
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
import { GCP_IAM_CONSTRAINTS } from './GcpIamConstraints';
import { GRPC, GcpApiError, createSdkGcpIamClient } from './GcpIamClient';
import type { GcpIamClient, GcpRole, GcpRoleSpec } from './GcpIamClient';
import * as discovery from './GcpIamDiscovery';
import * as model from './GcpIamModel';
import {
  assertGrantable, bindingsOf, buildDocument, chainOf, digestOfDocument, editPolicy, errorText, fail, grantScopes, isCustomRole, parseMember,
  projectOf, roleIdOfName, roleParentOf, roleParentOfName, samePermissions, validateDocument, withMember, withoutMember,
} from './GcpIamHelpers';
import type { GcpRoleDocument } from './GcpIamHelpers';

const ROLE_ID = /^[a-zA-Z0-9_.]{3,64}$/;
const codeOf = (e: unknown): number | undefined => (e instanceof GcpApiError ? e.code : undefined);
const specOf = (r: GcpRoleSpec): GcpRoleSpec => ({ title: r.title, description: r.description, stage: r.stage, includedPermissions: r.includedPermissions });

/**
 * GcpIamAdapter — UPPIE provider adapter for Google Cloud IAM.
 *
 * - A policy is one custom role (`ugondu_<digest12>`) plus the binding that grants it on the rules' resource; the
 *   resource must be the environment__t('s_project_or_one_of_its_ancest')s role.
 * - Operations are IAM permissions. Deny effects (a separate policy type in GCP), rules that differ in resource or
 *   condition, and conditions other than time bounds are refused (fail closed).
 * - Allow policies are edited get → mutate → set with the etag; a concurrent edit (ABORTED) is retried, never overwritten.
 * - Predefined roles can be granted and cloned but never changed or retired; retiring a custom role is a soft delete
 *   that is refused while any binding references the role, and restore undeletes it (or recreates it once purged).
 * - Simulation uses the Policy Troubleshooter (allow, deny, conditions and group membership included). Effective
 *   authority is modelled from the hierarchy's bindings and is partial: group membership and deny are not expanded.
 * - All Google Cloud access goes through GcpIamClient; the production client is loaded lazily and tests inject a double.
 *   Clients are cached per tenant, environment and credential identity.
 */
export class GcpIamAdapter implements IPolicyProviderAdapter {
  readonly providerType = 'GCP_IAM' as const;

  readonly capabilities: AdapterCapabilityDeclaration = {
    discoverPolicies: 'SUPPORTED_WITH_LIMITS', discoverAssignments: 'SUPPORTED', discoverIdentities: 'SUPPORTED_WITH_LIMITS',
    discoverGroups: 'SUPPORTED_WITH_LIMITS', discoverRoles: 'SUPPORTED_WITH_LIMITS', discoverEffectiveAuthority: 'SUPPORTED_WITH_LIMITS',
    evaluate: 'SUPPORTED_WITH_LIMITS', simulate: 'SUPPORTED_WITH_LIMITS', generate: 'SUPPORTED', validate: 'SUPPORTED',
    attach: 'SUPPORTED', detach: 'SUPPORTED', update: 'SUPPORTED_WITH_LIMITS', clone: 'SUPPORTED',
    observeUsage: 'SUPPORTED_WITH_LIMITS', detectUnused: 'SUPPORTED_WITH_LIMITS', findDependencies: 'SUPPORTED_WITH_LIMITS',
    findConflicts: 'SUPPORTED', getConstraints: 'SUPPORTED', reconcile: 'SUPPORTED',
    retire: 'SUPPORTED', restore: 'SUPPORTED',
  };

  private readonly clients = new Map<string, Promise<GcpIamClient>>();

  constructor(private readonly clientFactory: (context: AdapterContext) => Promise<GcpIamClient> = createSdkGcpIamClient) {}

  private client(context: AdapterContext): Promise<GcpIamClient> {
    const key = createHash('sha256').update([context.tenantId, context.environmentId, context.credentials.clientEmail ?? ''].join('|')).digest('hex');
    let pending = this.clients.get(key);
    if (!pending) {
      pending = this.clientFactory(context).catch((e) => { this.clients.delete(key); throw e; });
      this.clients.set(key, pending);
    }
    return pending;
  }

  private async find(client: GcpIamClient, name: string): Promise<GcpRole | undefined> {
    try {
      return await client.getRole(name);
    } catch (e) {
      if (codeOf(e) === GRPC.NOT_FOUND) return undefined;
      throw e;
    }
  }

  /** The custom role, which must be defined on the environment's project or one of its ancestors. */
  private async customRole(client: GcpIamClient, name: string, chain: string[]): Promise<GcpRole> {
    if (!isCustomRole(name)) throw fail('uppie.adapter.gcp.protected_role', { name });
    if (!chain.includes(roleParentOfName(name))) throw fail('uppie.adapter.gcp.scope_outside_environment', { resource: roleParentOfName(name) });
    return client.getRole(name);
  }

  /**
   * A custom role defined on the environment's own project. Roles defined on the organization are shared with every
   * other project below it, so their usage cannot be proven from here and changing or retiring them is refused.
   */
  private async ownRole(client: GcpIamClient, name: string, context: AdapterContext, chain: string[]): Promise<GcpRole> {
    const role = await this.customRole(client, name, chain);
    if (roleParentOfName(name) !== projectOf(context)) throw fail('uppie.adapter.gcp.shared_role', { name });
    return role;
  }

  /** Number of bindings that reference the role on the resources where this adapter may have granted it. */
  private async bindingCount(client: GcpIamClient, roleName: string, context: AdapterContext, chain?: string[]): Promise<number> {
    const scopes = grantScopes(roleName, projectOf(context), chain ?? await chainOf(client, projectOf(context)));
    let count = 0;
    for (const resource of scopes) count += bindingsOf(await client.getPolicy(resource), roleName).length;
    return count;
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
    const client = await this.client(context);
    const document = buildDocument(rules, projectOf(context), await chainOf(client, projectOf(context)));
    return { providerId: document.role.name, providerType: 'GCP_IAM', nativeDocument: document, digest: digestOfDocument(document) };
  }

  async validate(nativePolicy: ProviderNativePolicy, _context: AdapterContext): Promise<PolicyValidationResult> {
    const document = nativePolicy.nativeDocument as GcpRoleDocument | undefined;
    const { errors, warnings } = validateDocument(document);
    if (errors.length === 0 && document && nativePolicy.digest && nativePolicy.digest !== digestOfDocument(document)) errors.push(__t('uppie.adapter.gcp.validate.digest_mismatch'));
    return { valid: errors.length === 0, errors, warnings };
  }

  /** Makes sure the role exists: predefined roles and identical custom roles are accepted, a different role of that name is refused. */
  private async ensureRole(client: GcpIamClient, document: GcpRoleDocument): Promise<string> {
    const { name } = document.role;
    if (!isCustomRole(name)) {
      await client.getRole(name);
      return name;
    }
    const accept = async (existing: GcpRole): Promise<string> => {
      if (!samePermissions(existing.includedPermissions, document.role.includedPermissions)) throw fail('uppie.adapter.gcp.role_exists_different', { name });
      if (existing.deleted) await client.undeleteRole(name, existing.etag);
      return name;
    };
    const existing = await this.find(client, name);
    if (existing) return accept(existing);
    try {
      await client.createRole(roleParentOfName(name), roleIdOfName(name), specOf(document.role));
    } catch (e) {
      if (codeOf(e) !== GRPC.ALREADY_EXISTS) throw e;
      return accept(await client.getRole(name)); // created concurrently: accept it only when identical
    }
    return name;
  }

  async attach(nativePolicy: ProviderNativePolicy, target: string, context: AdapterContext): Promise<AttachResult> {
    try {
      const check = await this.validate(nativePolicy, context);
      if (!check.valid) return { success: false, providerRef: '', attachedAt: '', errors: check.errors };
      const member = parseMember(target);
      const client = await this.client(context);
      const document = nativePolicy.nativeDocument as GcpRoleDocument;
      assertGrantable(document, await chainOf(client, projectOf(context)));
      const role = await this.ensureRole(client, document);
      await editPolicy(client, document.resource, (p) => withMember(p, role, member, document.condition));
      return { success: true, providerRef: `${document.resource}#${role}#${member}`, attachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, providerRef: '', attachedAt: '', errors: [__t('uppie.adapter.gcp.attach_error', { error: errorText(e) })] };
    }
  }

  async detach(policyId: string, target: string, context: AdapterContext): Promise<DetachResult> {
    try {
      const member = parseMember(target);
      const client = await this.client(context);
      const chain = await chainOf(client, projectOf(context));
      for (const resource of grantScopes(policyId, projectOf(context), chain)) await editPolicy(client, resource, (p) => withoutMember(p, policyId, member));
      return { success: true, detachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.gcp.detach_error', { error: errorText(e) })] };
    }
  }

  async update(policyId: string, newRules: AuthorizationRule[], context: AdapterContext): Promise<UpdateResult> {
    try {
      const client = await this.client(context);
      const chain = await chainOf(client, projectOf(context));
      const role = await this.ownRole(client, policyId, context, chain);
      const document = buildDocument(newRules, projectOf(context), chain);
      if (document.condition) throw fail('uppie.adapter.gcp.update_condition_change', { name: policyId });
      if (roleParentOf(document.resource, chain) !== roleParentOfName(policyId)) throw fail('uppie.adapter.gcp.update_scope_change', { name: policyId });
      const { errors } = validateDocument({ ...document, role: { ...document.role, name: policyId } });
      if (errors.length > 0) return { success: false, version: '', errors };
      const updated = await client.updateRole(policyId, { ...specOf(role), includedPermissions: document.role.includedPermissions }, role.etag);
      return { success: true, version: updated.etag ?? digestOfDocument(document).slice(0, 12), errors: [] };
    } catch (e) {
      return { success: false, version: '', errors: [__t('uppie.adapter.gcp.update_error', { error: errorText(e) })] };
    }
  }

  async clone(policyId: string, newName: string, context: AdapterContext): Promise<CloneResult> {
    try {
      const roleId = newName.trim();
      if (!ROLE_ID.test(roleId)) throw fail('uppie.adapter.gcp.invalid_name', { name: roleId });
      const client = await this.client(context);
      const chain = await chainOf(client, projectOf(context));
      const source = await client.getRole(policyId);
      if (isCustomRole(policyId) && !chain.includes(roleParentOfName(policyId))) throw fail('uppie.adapter.gcp.scope_outside_environment', { resource: roleParentOfName(policyId) });
      const parent = isCustomRole(policyId) ? roleParentOfName(policyId) : projectOf(context);
      const name = `${parent}/roles/${roleId}`;
      const existing = await this.find(client, name);
      if (existing) {
        if (!samePermissions(existing.includedPermissions, source.includedPermissions)) throw fail('uppie.adapter.gcp.role_exists_different', { name });
        if (existing.deleted) await client.undeleteRole(name, existing.etag);
        return { success: true, clonedId: name, errors: [] };
      }
      return { success: true, clonedId: (await client.createRole(parent, roleId, specOf(source))).name, errors: [] };
    } catch (e) {
      return { success: false, clonedId: '', errors: [__t('uppie.adapter.gcp.clone_error', { error: errorText(e) })] };
    }
  }

  /**
   * Google Cloud keeps no per-role activity here: a project role no binding references is UNUSED, any other role is
   * UNKNOWN. Organization roles are shared with other projects, so their usage cannot be proven from this environment.
   */
  async observeUsage(policyId: string, _window: ObservationWindow, context: AdapterContext): Promise<UsageObservation> {
    const unused = roleParentOfName(policyId) === projectOf(context) && await this.bindingCount(await this.client(context), policyId, context) === 0;
    return { policyId, observedUsages: 0, classification: unused ? 'UNUSED' : 'UNKNOWN', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false };
  }

  /** Custom roles of the environment's project that no binding on its hierarchy references; the threshold cannot be applied. */
  async detectUnused(context: AdapterContext, _thresholdDays: number): Promise<UsageObservation[]> {
    const client = await this.client(context);
    const chain = await chainOf(client, projectOf(context));
    const out: UsageObservation[] = [];
    for (const role of await client.listRoles(projectOf(context))) {
      if (await this.bindingCount(client, role.name, context, chain) === 0) {
        out.push({ policyId: role.name, observedUsages: 0, classification: 'UNUSED', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false });
      }
    }
    return out;
  }

  async findDependencies(policyId: string, context: AdapterContext): Promise<DependencyReport> {
    return model.dependencies(await this.client(context), policyId, context);
  }

  async findConflicts(rules: AuthorizationRule[], context: AdapterContext): Promise<ConflictReport> {
    return model.findConflicts(await this.client(context), rules, context);
  }

  async getConstraints(_context: AdapterContext): Promise<AuthorizationConstraints> {
    return GCP_IAM_CONSTRAINTS;
  }

  async reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], context: AdapterContext): Promise<ReconciliationPlan> {
    try {
      return await model.reconcilePlan(await this.client(context), desired, observed, context);
    } catch (e) {
      throw fail('uppie.adapter.gcp.reconcile_error', { error: errorText(e) });
    }
  }

  async retire(plan: RetirementPlan, context: AdapterContext): Promise<RetirementResult> {
    try {
      const client = await this.client(context);
      const chain = await chainOf(client, projectOf(context));
      const role = await this.ownRole(client, plan.policyId, context, chain);
      if (role.deleted) throw fail('uppie.adapter.gcp.already_retired', { name: role.name });
      const count = await this.bindingCount(client, role.name, context, chain);
      if (count > 0) throw fail('uppie.adapter.gcp.retire_in_use', { name: role.name, count });
      const snapshot = { name: role.name, ...specOf(role) };
      await client.deleteRole(role.name, role.etag);
      const detachmentEvidence = JSON.stringify({ policy: role.name, bindings: 0, approvedBy: plan.approvedBy, verifiedAt: new Date().toISOString() });
      return { success: true, rollbackReference: JSON.stringify(snapshot), detachmentEvidence, errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.gcp.retire_error', { error: errorText(e) })] };
    }
  }

  async restore(certificate: PolicyRetirementCertificate, context: AdapterContext): Promise<RestoreResult> {
    try {
      if (!certificate.rollbackReference) return { success: false, restoredId: '', errors: [__t('uppie.adapter.gcp.restore_no_reference')] };
      const snapshot = JSON.parse(certificate.rollbackReference) as GcpRoleSpec & { name: string };
      if (!snapshot?.name || snapshot.name !== certificate.policyId || !Array.isArray(snapshot.includedPermissions)) throw fail('uppie.adapter.gcp.restore_invalid_snapshot', { name: certificate.policyId });
      if (!isCustomRole(snapshot.name)) throw fail('uppie.adapter.gcp.protected_role', { name: snapshot.name });
      const [parent, client] = [roleParentOfName(snapshot.name), await this.client(context)];
      if (!(await chainOf(client, projectOf(context))).includes(parent)) throw fail('uppie.adapter.gcp.scope_outside_environment', { resource: parent });
      if (parent !== projectOf(context)) throw fail('uppie.adapter.gcp.shared_role', { name: snapshot.name });
      const { errors } = validateDocument({ role: snapshot, resource: parent });
      if (errors.length > 0) throw new Error(errors.join('; '));
      const existing = await this.find(client, snapshot.name);
      if (!existing) return { success: true, restoredId: (await client.createRole(parent, roleIdOfName(snapshot.name), specOf(snapshot))).name, errors: [] };
      if (!samePermissions(existing.includedPermissions, snapshot.includedPermissions)) throw fail('uppie.adapter.gcp.role_exists_different', { name: snapshot.name });
      if (existing.deleted) await client.undeleteRole(snapshot.name, existing.etag);
      return { success: true, restoredId: snapshot.name, errors: [] };
    } catch (e) {
      return { success: false, restoredId: '', errors: [__t('uppie.adapter.gcp.restore_error', { error: errorText(e) })] };
    }
  }
}
