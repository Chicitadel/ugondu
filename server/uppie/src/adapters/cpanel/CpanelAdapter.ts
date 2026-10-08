/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — cPanel Provider Adapter
 * File           : CpanelAdapter.ts
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
import { cpanelConstraints } from './CpanelConstraints';
import type { WhmClient, WhmFeatureList } from './CpanelClient';
import { createHttpWhmClient } from './WhmHttpClient';
import * as model from './CpanelModel';
import {
  MAX_PACKAGE_NAME, accountOf, assertKnownFeatures, assertManaged, buildDocument, catalogOf, cloneListName, compileFeatures, digestOfDocument,
  digestOfFeatures, enabledOf, errorText, fail, featureMap, isManagedList, managedPlan, packageNameFor, parseUser, sameSet, sweepOrphans,
  usersOfList, validateDocument,
} from './CpanelHelpers';
import type { CpanelDocument } from './CpanelHelpers';

const usage = (policyId: string, observedUsages: number, unused: boolean): UsageObservation => ({
  policyId, observedUsages, classification: unused ? 'UNUSED' : 'UNKNOWN', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false,
});

/**
 * CpanelAdapter — UPPIE provider adapter for cPanel/WHM hosting servers (WHM API 1).
 *
 * - A policy is a feature list `ugondu_<digest12>`; operations are WHM feature ids. cPanel has no Deny, conditions or
 *   expiry, so rules that use any of them are refused (fail closed) and the adapter never emits a Deny.
 * - An account reaches a feature list only through its package. Attach clones the account's current package into
 *   `<list>__<original package>` (quota and limits are kept) with the managed list, then moves the account to it;
 *   detach moves the account back to the original package and removes the clone once no account uses it.
 *   Attaching replaces the account's whole feature set, which simulate reports as `denied` for features that would be lost.
 * - Only lists and packages created by Ugondu (the `ugondu_` prefix) are ever changed or removed; retiring a list that
 *   any package references is refused, and restore recreates a retired list from the certificate's snapshot.
 * - Usage cannot be observed beyond references: a list no package uses is UNUSED, any other is UNKNOWN.
 * - All WHM access goes through WhmClient (HTTPS, token in the Authorization header); tests inject a double. Clients are
 *   cached per tenant, environment and server identity.
 */
export class CpanelAdapter implements IPolicyProviderAdapter {
  readonly providerType = 'CPANEL' as const;

  readonly capabilities: AdapterCapabilityDeclaration = {
    discoverPolicies: 'SUPPORTED', discoverAssignments: 'SUPPORTED', discoverIdentities: 'SUPPORTED',
    discoverGroups: 'UNSUPPORTED', discoverRoles: 'SUPPORTED', discoverEffectiveAuthority: 'SUPPORTED_WITH_LIMITS',
    evaluate: 'SUPPORTED_WITH_LIMITS', simulate: 'SUPPORTED_WITH_LIMITS', generate: 'SUPPORTED', validate: 'SUPPORTED',
    attach: 'SUPPORTED_WITH_LIMITS', detach: 'SUPPORTED', update: 'SUPPORTED', clone: 'SUPPORTED',
    observeUsage: 'SUPPORTED_WITH_LIMITS', detectUnused: 'SUPPORTED_WITH_LIMITS', findDependencies: 'SUPPORTED',
    findConflicts: 'SUPPORTED', getConstraints: 'SUPPORTED', reconcile: 'SUPPORTED',
    retire: 'SUPPORTED', restore: 'SUPPORTED',
  };

  private readonly clients = new Map<string, Promise<WhmClient>>();

  constructor(private readonly clientFactory: (context: AdapterContext) => Promise<WhmClient> = async (context) => createHttpWhmClient(context)) {}

  private client(context: AdapterContext): Promise<WhmClient> {
    const { host = '', port = '', username = '' } = context.credentials;
    const key = createHash('sha256').update([context.tenantId, context.environmentId, host, port, username].join('|')).digest('hex');
    let pending = this.clients.get(key);
    if (!pending) {
      pending = this.clientFactory(context).catch((e) => { this.clients.delete(key); throw e; });
      this.clients.set(key, pending);
    }
    return pending;
  }

  async discoverPolicies(context: AdapterContext): Promise<ProviderNativePolicy[]> { return model.discoverPolicies(await this.client(context)); }
  async discoverAssignments(context: AdapterContext): Promise<Record<string, string[]>> { return model.discoverAssignments(await this.client(context)); }
  async discoverIdentities(context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> { return model.discoverIdentities(await this.client(context)); }
  async discoverGroups(_context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> { throw new Error('UNSUPPORTED: cPanel has no group concept'); }
  async discoverRoles(context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> { return model.discoverRoles(await this.client(context)); }

  async discoverEffectiveAuthority(actor: string, resource: string, context: AdapterContext): Promise<EffectiveAuthorityResult> {
    return model.effectiveAuthority(await this.client(context), actor, resource);
  }

  async evaluate(rule: AuthorizationRule, context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
    try {
      return await model.evaluateRule(await this.client(context), rule);
    } catch {
      return 'UNKNOWN';
    }
  }

  async simulate(proposedRules: AuthorizationRule[], context: AdapterContext): Promise<PolicySimulationResult> {
    return model.simulateRules(await this.client(context), proposedRules);
  }

  async generate(rules: AuthorizationRule[], context: AdapterContext): Promise<ProviderNativePolicy> {
    const document = buildDocument(rules, await catalogOf(await this.client(context)));
    return { providerId: document.name, providerType: 'CPANEL', nativeDocument: document, digest: digestOfDocument(document) };
  }

  async validate(nativePolicy: ProviderNativePolicy, context: AdapterContext): Promise<PolicyValidationResult> {
    return this.check(nativePolicy, await catalogOf(await this.client(context)));
  }

  private check(nativePolicy: ProviderNativePolicy, catalog: string[]): PolicyValidationResult {
    const document = nativePolicy.nativeDocument as CpanelDocument | undefined;
    const { errors, warnings } = validateDocument(document, catalog);
    if (errors.length === 0 && document && nativePolicy.digest && nativePolicy.digest !== digestOfDocument(document)) errors.push(__t('uppie.adapter.cpanel.validate.digest_mismatch'));
    return { valid: errors.length === 0, errors, warnings };
  }

  /** The existing list of the document's name, accepted only when it enables exactly the same features; undefined when absent. */
  private async matchingList(client: WhmClient, document: CpanelDocument): Promise<WhmFeatureList | undefined> {
    const existing = await client.getFeatureList(document.name);
    if (existing && !sameSet(enabledOf(existing.features), document.features)) throw fail('uppie.adapter.cpanel.list_exists_different', { name: document.name });
    return existing;
  }

  /** Creates the list when absent. */
  private async ensureList(client: WhmClient, document: CpanelDocument, catalog: string[]): Promise<void> {
    if (!(await this.matchingList(client, document))) await client.saveFeatureList(document.name, featureMap(catalog, document.features), false);
  }

  async attach(nativePolicy: ProviderNativePolicy, target: string, context: AdapterContext): Promise<AttachResult> {
    try {
      const client = await this.client(context);
      const catalog = await catalogOf(client);
      const check = this.check(nativePolicy, catalog);
      if (!check.valid) return { success: false, providerRef: '', attachedAt: '', errors: check.errors };
      const user = parseUser(target);
      const document = nativePolicy.nativeDocument as CpanelDocument;
      const list = await this.matchingList(client, document);
      const account = await accountOf(client, user);
      const current = managedPlan(account.plan);
      const done = { success: true, providerRef: `${user}#${document.name}`, attachedAt: new Date().toISOString(), errors: [] };
      if (current?.list === document.name) return done;
      const origin = current ? current.origin : account.plan;
      const name = packageNameFor(document.name, origin);
      if (name.length > MAX_PACKAGE_NAME) throw fail('uppie.adapter.cpanel.package_name_too_long', { name, max: MAX_PACKAGE_NAME });
      const packages = await client.listPackages();
      const source = packages.find((p) => p.name === origin);
      if (!source) throw fail('uppie.adapter.cpanel.origin_package_missing', { package: origin });
      const existing = packages.find((p) => p.name === name);
      if (existing && existing.featureList !== document.name) throw fail('uppie.adapter.cpanel.package_conflict', { name });
      if (!list) await client.saveFeatureList(document.name, featureMap(catalog, document.features), false);
      if (!existing) await client.createPackage({ name, featureList: document.name, attributes: source.attributes });
      await client.changePackage(user, name);
      if (current) await sweepOrphans(client, current.list);
      return done;
    } catch (e) {
      return { success: false, providerRef: '', attachedAt: '', errors: [__t('uppie.adapter.cpanel.attach_error', { error: errorText(e) })] };
    }
  }

  async detach(policyId: string, target: string, context: AdapterContext): Promise<DetachResult> {
    try {
      const user = parseUser(target);
      const client = await this.client(context);
      const current = managedPlan((await accountOf(client, user)).plan);
      if (current?.list === policyId) {
        if (!(await client.listPackages()).some((p) => p.name === current.origin)) throw fail('uppie.adapter.cpanel.origin_package_missing', { package: current.origin });
        await client.changePackage(user, current.origin);
      }
      await sweepOrphans(client, policyId);
      return { success: true, detachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.cpanel.detach_error', { error: errorText(e) })] };
    }
  }

  async update(policyId: string, newRules: AuthorizationRule[], context: AdapterContext): Promise<UpdateResult> {
    try {
      assertManaged(policyId);
      const client = await this.client(context);
      const catalog = await catalogOf(client);
      if (!(await client.getFeatureList(policyId))) throw fail('uppie.adapter.cpanel.list_missing', { name: policyId });
      const features = compileFeatures(newRules);
      assertKnownFeatures(features, catalog);
      await client.saveFeatureList(policyId, featureMap(catalog, features), true);
      return { success: true, version: digestOfFeatures(features).slice(0, 12), errors: [] };
    } catch (e) {
      return { success: false, version: '', errors: [__t('uppie.adapter.cpanel.update_error', { error: errorText(e) })] };
    }
  }

  async clone(policyId: string, newName: string, context: AdapterContext): Promise<CloneResult> {
    try {
      const name = cloneListName(newName);
      const client = await this.client(context);
      const source = await client.getFeatureList(policyId);
      if (!source) throw fail('uppie.adapter.cpanel.list_missing', { name: policyId });
      const existing = await client.getFeatureList(name);
      if (existing) {
        if (!sameSet(enabledOf(existing.features), enabledOf(source.features))) throw fail('uppie.adapter.cpanel.list_exists_different', { name });
        return { success: true, clonedId: name, errors: [] };
      }
      await client.saveFeatureList(name, source.features, false);
      return { success: true, clonedId: name, errors: [] };
    } catch (e) {
      return { success: false, clonedId: '', errors: [__t('uppie.adapter.cpanel.clone_error', { error: errorText(e) })] };
    }
  }

  /** cPanel keeps no feature usage history: a list no package references is UNUSED, any other list is UNKNOWN. */
  async observeUsage(policyId: string, _window: ObservationWindow, context: AdapterContext): Promise<UsageObservation> {
    const client = await this.client(context);
    if (!(await client.getFeatureList(policyId))) return usage(policyId, 0, false);
    const { packages, accounts } = await usersOfList(client, policyId);
    return usage(policyId, accounts.length, packages.length === 0);
  }

  /** Managed lists that no package references; the threshold cannot be applied because no usage history exists. */
  async detectUnused(context: AdapterContext, _thresholdDays: number): Promise<UsageObservation[]> {
    const client = await this.client(context);
    const used = new Set((await client.listPackages()).map((p) => p.featureList));
    return (await client.listFeatureLists()).filter((n) => isManagedList(n) && !used.has(n)).sort().map((n) => usage(n, 0, true));
  }

  async findDependencies(policyId: string, context: AdapterContext): Promise<DependencyReport> {
    return model.dependencies(await this.client(context), policyId);
  }

  async findConflicts(rules: AuthorizationRule[], _context: AdapterContext): Promise<ConflictReport> {
    return model.findConflicts(rules);
  }

  async getConstraints(context: AdapterContext): Promise<AuthorizationConstraints> {
    return cpanelConstraints((await catalogOf(await this.client(context))).length);
  }

  async reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], context: AdapterContext): Promise<ReconciliationPlan> {
    try {
      return await model.reconcilePlan(await this.client(context), desired, observed);
    } catch (e) {
      throw fail('uppie.adapter.cpanel.reconcile_error', { error: errorText(e) });
    }
  }

  async retire(plan: RetirementPlan, context: AdapterContext): Promise<RetirementResult> {
    try {
      assertManaged(plan.policyId);
      const client = await this.client(context);
      const list = await client.getFeatureList(plan.policyId);
      if (!list) throw fail('uppie.adapter.cpanel.list_missing', { name: plan.policyId });
      const { packages } = await usersOfList(client, plan.policyId);
      if (packages.length > 0) throw fail('uppie.adapter.cpanel.retire_in_use', { name: plan.policyId, count: packages.length });
      const snapshot: CpanelDocument = { name: plan.policyId, features: enabledOf(list.features) };
      await client.deleteFeatureList(plan.policyId);
      const detachmentEvidence = JSON.stringify({ policy: plan.policyId, packages: 0, approvedBy: plan.approvedBy, verifiedAt: new Date().toISOString() });
      return { success: true, rollbackReference: JSON.stringify(snapshot), detachmentEvidence, errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.cpanel.retire_error', { error: errorText(e) })] };
    }
  }

  async restore(certificate: PolicyRetirementCertificate, context: AdapterContext): Promise<RestoreResult> {
    try {
      if (!certificate.rollbackReference) return { success: false, restoredId: '', errors: [__t('uppie.adapter.cpanel.restore_no_reference')] };
      const snapshot = JSON.parse(certificate.rollbackReference) as CpanelDocument;
      if (!snapshot?.name || snapshot.name !== certificate.policyId || !Array.isArray(snapshot.features)) throw fail('uppie.adapter.cpanel.restore_invalid_snapshot', { name: certificate.policyId });
      assertManaged(snapshot.name);
      const client = await this.client(context);
      const catalog = await catalogOf(client);
      const { errors } = validateDocument(snapshot, catalog);
      if (errors.length > 0) throw new Error(errors.join('; '));
      await this.ensureList(client, snapshot, catalog);
      return { success: true, restoredId: snapshot.name, errors: [] };
    } catch (e) {
      return { success: false, restoredId: '', errors: [__t('uppie.adapter.cpanel.restore_error', { error: errorText(e) })] };
    }
  }
}
