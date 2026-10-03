/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — cPanel Discovery and Analysis Model
 * File           : CpanelModel.ts
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type {
  ConflictReport, DependencyReport, PolicyConflict, PolicySimulationResult, ProviderNativePolicy, ReconciliationPlan,
} from '../IPolicyProviderAdapter';
import type { AuthorizationRule, EffectiveAuthorityResult, EffectivePermission } from '../../types/index';
import { classifyBlast } from '../shared/BlastRadius';
import type { WhmClient, WhmFeatureList } from './CpanelClient';
import {
  accountOf, assertAllowable, assertKnownFeatures, catalogOf, compileFeatures, digestOfFeatures, enabledOf, fail, featuresOfAccount,
  isManagedList, parseUser, sameSet, usersOfList,
} from './CpanelHelpers';
import type { CpanelDocument } from './CpanelHelpers';

type Identity = { id: string; type: string; displayName: string };

/** The adapter's native policy for an existing feature list. */
export function nativePolicyOf(list: WhmFeatureList): ProviderNativePolicy {
  const document: CpanelDocument = { name: list.name, features: enabledOf(list.features) };
  return { providerId: list.name, providerType: 'CPANEL', nativeDocument: document, digest: digestOfFeatures(document.features) };
}

export async function discoverPolicies(client: WhmClient): Promise<ProviderNativePolicy[]> {
  const out: ProviderNativePolicy[] = [];
  for (const name of (await client.listFeatureLists()).sort()) {
    const list = await client.getFeatureList(name);
    if (list) out.push(nativePolicyOf(list));
  }
  return out;
}

/** account → feature list of its package; an account whose package cannot be found is left out. */
export async function discoverAssignments(client: WhmClient): Promise<Record<string, string[]>> {
  const lists = new Map((await client.listPackages()).map((p) => [p.name, p.featureList]));
  const out: Record<string, string[]> = {};
  for (const account of await client.listAccounts()) {
    const list = lists.get(account.plan);
    if (list) out[account.user] = [list];
  }
  return out;
}

export async function discoverIdentities(client: WhmClient): Promise<Identity[]> {
  const resellers = new Set(await client.listResellers());
  const byId = new Map<string, Identity>();
  for (const a of await client.listAccounts()) byId.set(a.user, { id: a.user, type: resellers.has(a.user) ? 'WHM_RESELLER' : 'CPANEL_ACCOUNT', displayName: a.domain || a.user });
  for (const r of resellers) if (!byId.has(r)) byId.set(r, { id: r, type: 'WHM_RESELLER', displayName: r });
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Packages play the role of roles: each one carries exactly one feature list. */
export async function discoverRoles(client: WhmClient): Promise<Array<{ id: string; displayName: string; policies: string[] }>> {
  return (await client.listPackages()).map((p) => ({ id: p.name, displayName: p.name, policies: [p.featureList] })).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Features the account holds through its package and that package's feature list (features the server disables are off).
 * Feature lists are account-wide, so the resource does not narrow the result; a suspended account holds nothing.
 */
export async function effectiveAuthority(client: WhmClient, actor: string, resource: string): Promise<EffectiveAuthorityResult> {
  const user = parseUser(actor);
  const account = await accountOf(client, user);
  const held = account.suspended ? { list: '', enabled: [] as string[] } : await featuresOfAccount(client, account);
  if (!held) throw fail('uppie.adapter.cpanel.package_unresolved', { account: user, plan: account.plan });
  const permissions: EffectivePermission[] = held.enabled.map((capability) => ({
    capability, resource, sourcePolicies: [held.list], denyPolicies: [], state: 'GRANTED', confidence: 'MEDIUM',
  } as EffectivePermission));
  return { actorId: actor, resourceId: resource, evaluatedAt: new Date().toISOString(), permissions, evaluationMethod: 'POLICY_MODEL' };
}

/** GRANTED when the account holds every operation of the rule, DENIED when it lacks any (or is suspended), UNKNOWN when it cannot be decided. */
export async function evaluateRule(client: WhmClient, rule: AuthorizationRule): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
  const ops = rule.action.operations;
  if (ops.length === 0) return 'UNKNOWN';
  const account = await accountOf(client, parseUser(rule.subject.id));
  if (account.suspended) return 'DENIED';
  const held = await featuresOfAccount(client, account);
  if (!held) return 'UNKNOWN';
  return ops.every((op) => held.enabled.includes(op)) ? 'GRANTED' : 'DENIED';
}

/**
 * Attaching a feature list replaces the account's whole feature set, so for each subject the proposed features are compared
 * with those the account holds now: new features are `allowed`, kept ones `unchanged` and features that would be lost `denied`.
 * Subjects that cannot be compiled or resolved are reported unchanged and lower the confidence.
 */
export async function simulateRules(client: WhmClient, rules: AuthorizationRule[]): Promise<PolicySimulationResult> {
  const catalog = await catalogOf(client);
  const bySubject = new Map<string, AuthorizationRule[]>();
  for (const rule of rules) bySubject.set(rule.subject.id, [...(bySubject.get(rule.subject.id) ?? []), rule]);
  const [allowed, denied, unchanged, users] = [[] as string[], [] as string[], [] as string[], new Set<string>()];
  let decided = 0;
  let skipped = 0;
  for (const [subject, group] of bySubject) {
    const scope = group[0]?.resource.scope ?? '';
    let features: string[];
    let held: { enabled: string[] } | undefined;
    try {
      features = compileFeatures(group);
      assertKnownFeatures(features, catalog);
      const account = await client.getAccount(parseUser(subject));
      held = account ? await featuresOfAccount(client, account) : undefined;
    } catch { held = undefined; features = group.flatMap((r) => r.action.operations); }
    if (!held) { skipped += features.length; unchanged.push(...features.map((f) => `${subject}:${scope}:${f}`)); continue; }
    users.add(subject);
    for (const f of features) { (held.enabled.includes(f) ? unchanged : allowed).push(`${subject}:${scope}:${f}`); decided++; }
    for (const f of held.enabled.filter((x) => !features.includes(x))) { denied.push(`${subject}:${scope}:${f}`); decided++; }
  }
  return {
    allowed, denied, unchanged, confidence: decided === 0 ? 'LOW' : skipped === 0 ? 'HIGH' : 'MEDIUM',
    blastRadius: { policyId: '', dependentRoles: [], dependentActors: [...users], dependentServices: [], blastRadius: classifyBlast(users.size, false) },
  };
}

/** Packages that carry the list and the accounts on them. */
export async function dependencies(client: WhmClient, list: string): Promise<DependencyReport> {
  const { packages, accounts } = await usersOfList(client, list);
  return {
    policyId: list, dependentRoles: packages.map((p) => p.name).sort(), dependentActors: accounts.map((a) => a.user).sort(), dependentServices: [],
    blastRadius: classifyBlast(accounts.length, false),
  };
}

/** cPanel cannot express Deny, so an Allow and a Deny of the same subject and feature cannot both hold; such a pair is reported as ambiguous. */
export function findConflicts(rules: AuthorizationRule[]): ConflictReport {
  const conflicts: PolicyConflict[] = [];
  for (const deny of rules.filter((r) => r.effect === 'DENY')) {
    for (const allow of rules.filter((r) => r.effect === 'ALLOW' && r.subject.id === deny.subject.id)) {
      const shared = allow.action.operations.filter((op) => deny.action.operations.includes(op));
      if (shared.length > 0) {
        conflicts.push({
          ruleA: allow.ruleId, ruleB: deny.ruleId, conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS',
          explanation: __t('uppie.adapter.cpanel.conflict_explanation', { subject: allow.subject.id, operations: shared.sort().join(', ') }),
        });
      }
    }
  }
  return { conflicts };
}

/** Diffs the desired features per account with those the observed managed lists give the accounts that use them. */
export async function reconcilePlan(client: WhmClient, desired: AuthorizationRule[], observed: ProviderNativePolicy[]): Promise<ReconciliationPlan> {
  const have = new Map<string, Set<string>>();
  for (const p of observed) {
    const doc = p.nativeDocument as CpanelDocument;
    if (!isManagedList(doc.name)) continue;
    for (const account of (await usersOfList(client, doc.name)).accounts) {
      const set = have.get(`Allow|${account.user}`) ?? new Set<string>();
      doc.features.forEach((f) => set.add(f));
      have.set(`Allow|${account.user}`, set);
    }
  }
  const want = new Map<string, { rule: AuthorizationRule; features: Set<string> }>();
  for (const rule of desired) {
    assertAllowable(rule);
    const id = `Allow|${parseUser(rule.subject.id)}`;
    const entry = want.get(id) ?? { rule, features: new Set<string>() };
    rule.action.operations.forEach((f) => entry.features.add(f));
    want.set(id, entry);
  }
  const plan: ReconciliationPlan = { toAdd: [], toRemove: [], toUpdate: [], noChange: [] };
  for (const [id, { rule, features }] of want) {
    const current = have.get(id);
    const merged: AuthorizationRule = { ...rule, action: { ...rule.action, operations: [...features].sort() } };
    if (!current) plan.toAdd.push(merged);
    else if (sameSet([...current], [...features])) plan.noChange.push(id);
    else plan.toUpdate.push({ ruleId: id, newRule: merged });
  }
  plan.toRemove = [...have.keys()].filter((id) => !want.has(id));
  return plan;
}
