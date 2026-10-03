/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — GCP IAM Authority Model
 * File           : GcpIamModel.ts
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
  AdapterContext, ConflictReport, DependencyReport, PolicyConflict, PolicySimulationResult, ProviderNativePolicy, ReconciliationPlan,
} from '../IPolicyProviderAdapter';
import type { AuthorizationRule, EffectiveAuthorityResult, EffectivePermission } from '../../types/index';
import { classifyBlast } from '../shared/BlastRadius';
import { GRPC, GcpApiError } from './GcpIamClient';
import type { GcpIamClient, GcpPolicy, GcpRole } from './GcpIamClient';
import {
  bindingsOf, chainOf, compileCondition, fail, grantScopes, isPermission, parseMember, principalOf, projectOf, resolveResource, sameMember,
} from './GcpIamHelpers';
import type { GcpRoleDocument } from './GcpIamHelpers';

const isBroad = (member: string): boolean => /^(group|domain|principalSet):/.test(member);

/** Members holding the role on any resource where this adapter may have granted it. */
export async function dependencies(client: GcpIamClient, roleName: string, context: AdapterContext): Promise<DependencyReport> {
  const project = projectOf(context);
  const members = new Set<string>();
  for (const scope of grantScopes(roleName, project, await chainOf(client, project))) {
    for (const b of bindingsOf(await client.getPolicy(scope), roleName)) b.members.forEach((m) => members.add(m));
  }
  const all = [...members];
  return {
    policyId: roleName, dependentRoles: [],
    dependentActors: all.filter((m) => !m.startsWith('serviceAccount:')),
    dependentServices: all.filter((m) => m.startsWith('serviceAccount:')),
    blastRadius: classifyBlast(all.length, all.some(isBroad)),
  };
}

/**
 * Permissions the member holds on a resource through bindings on the resource and its ancestors. Group-derived grants
 * and deny policies are not visible to this model (use the troubleshooter-backed evaluation for a definitive answer),
 * so the result is a partial model; conditional bindings yield CONDITIONALLY_GRANTED.
 */
export async function effectiveAuthority(client: GcpIamClient, actor: string, resource: string, context: AdapterContext): Promise<EffectiveAuthorityResult> {
  const member = parseMember(actor);
  const project = projectOf(context);
  const chain = await chainOf(client, project);
  const target = resolveResource(resource, project, chain);
  const roles = new Map<string, GcpRole | undefined>();
  const grants = new Map<string, { sources: Set<string>; unconditional: boolean }>();
  for (const scope of chain.slice(chain.indexOf(target))) {
    for (const b of (await client.getPolicy(scope)).bindings) {
      if (!b.members.some((m) => sameMember(m, member))) continue;
      if (!roles.has(b.role)) {
        roles.set(b.role, await client.getRole(b.role).catch((e) => { if (e instanceof GcpApiError && e.code === GRPC.NOT_FOUND) return undefined; throw e; }));
      }
      const role = roles.get(b.role);
      if (!role || role.deleted) continue;
      for (const p of role.includedPermissions) {
        const g = grants.get(p) ?? { sources: new Set<string>(), unconditional: false };
        g.sources.add(b.role);
        g.unconditional = g.unconditional || !b.condition;
        grants.set(p, g);
      }
    }
  }
  const permissions: EffectivePermission[] = [...grants].sort(([a], [b]) => a.localeCompare(b)).map(([capability, g]) => ({
    capability, resource: target, sourcePolicies: [...g.sources].sort(), denyPolicies: [],
    state: g.unconditional ? 'GRANTED' : 'CONDITIONALLY_GRANTED', confidence: g.unconditional ? 'MEDIUM' : 'LOW',
  } as EffectivePermission));
  return { actorId: actor, resourceId: target, evaluatedAt: new Date().toISOString(), permissions, evaluationMethod: 'PARTIAL_MODEL' };
}

/** Policy Troubleshooter verdicts for every permission of a rule; undefined when the subject or a permission cannot be checked. */
async function verdicts(client: GcpIamClient, rule: AuthorizationRule, project: string, chain: string[]) {
  const ops = rule.action.operations;
  const principal = principalOf(parseMember(rule.subject.id));
  if (!principal || ops.length === 0 || !ops.every(isPermission)) return undefined;
  const resource = resolveResource(rule.resource.scope, project, chain);
  const out: Array<{ permission: string; access: string }> = [];
  for (const permission of ops) out.push({ permission, access: await client.troubleshoot(principal, resource, permission) });
  return { member: rule.subject.id, resource, results: out };
}

/** GRANTED when every permission is allowed, DENIED when any is not granted, UNKNOWN when the verdict is conditional or unavailable. */
export async function evaluateRule(client: GcpIamClient, rule: AuthorizationRule, context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
  const project = projectOf(context);
  const found = await verdicts(client, rule, project, await chainOf(client, project));
  if (!found) return 'UNKNOWN';
  if (found.results.some((r) => r.access === 'NOT_GRANTED')) return 'DENIED';
  return found.results.every((r) => r.access === 'GRANTED') ? 'GRANTED' : 'UNKNOWN';
}

/**
 * Compares proposed Allow rules with current access as decided by the troubleshooter (allow policies, deny policies,
 * conditions and group membership): a permission not yet granted is `allowed`, anything else `unchanged`. Deny rules
 * cannot be realised through allow policies and are reported unchanged; confidence reflects how much was decided.
 */
export async function simulateRules(client: GcpIamClient, rules: AuthorizationRule[], context: AdapterContext): Promise<PolicySimulationResult> {
  const project = projectOf(context);
  const chain = await chainOf(client, project);
  const allowed: string[] = [];
  const unchanged: string[] = [];
  const subjects = new Set<string>();
  let decided = 0;
  let skipped = 0;
  for (const rule of rules) {
    let found;
    try { found = rule.effect === 'ALLOW' ? await verdicts(client, rule, project, chain) : undefined; } catch { found = undefined; }
    if (!found) { skipped++; unchanged.push(...rule.action.operations.map((p) => `${rule.subject.id}:${rule.resource.scope}:${p}`)); continue; }
    subjects.add(found.member);
    for (const r of found.results) {
      (r.access === 'NOT_GRANTED' ? allowed : unchanged).push(`${found.member}:${found.resource}:${r.permission}`);
      if (r.access === 'GRANTED' || r.access === 'NOT_GRANTED') decided++; else skipped++;
    }
  }
  return {
    allowed, denied: [], unchanged, confidence: decided === 0 ? 'LOW' : skipped === 0 ? 'HIGH' : 'MEDIUM',
    blastRadius: { policyId: '', dependentRoles: [], dependentActors: [...subjects], dependentServices: [], blastRadius: classifyBlast(subjects.size, [...subjects].some(isBroad)) },
  } as PolicySimulationResult;
}

/**
 * Allow policies are additive and cannot conflict with each other. A Deny rule has no allow-policy equivalent; one that
 * overlaps an Allow of the same subject on the same or a related resource is reported as ambiguous.
 */
export async function findConflicts(client: GcpIamClient, rules: AuthorizationRule[], context: AdapterContext): Promise<ConflictReport> {
  const denies = rules.filter((r) => r.effect === 'DENY');
  if (denies.length === 0) return { conflicts: [] };
  const project = projectOf(context);
  const chain = await chainOf(client, project);
  const resourceOf = (r: AuthorizationRule): string => resolveResource(r.resource.scope, project, chain);
  const conflicts: PolicyConflict[] = [];
  for (const deny of denies) {
    for (const allow of rules.filter((r) => r.effect === 'ALLOW' && sameMember(r.subject.id, deny.subject.id))) {
      const [allowScope, denyScope] = [resourceOf(allow), resourceOf(deny)]; // both lie on one hierarchy chain, so they are always ancestor-related
      if (allow.action.operations.some((p) => deny.action.operations.includes(p))) {
        conflicts.push({
          ruleA: allow.ruleId, ruleB: deny.ruleId, conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS',
          explanation: __t('uppie.adapter.gcp.conflict_explanation', { subject: allow.subject.id, allowScope, denyScope }),
        });
      }
    }
  }
  return { conflicts };
}

/** Diffs desired Allow rules against observed role documents on (resource, condition) with their permission sets. */
export async function reconcilePlan(client: GcpIamClient, desired: AuthorizationRule[], observed: ProviderNativePolicy[], context: AdapterContext): Promise<ReconciliationPlan> {
  const project = projectOf(context);
  const chain = await chainOf(client, project);
  const have = new Map<string, Set<string>>();
  const granted = new Map<string, GcpPolicy>();
  for (const resource of chain) granted.set(resource, await client.getPolicy(resource));
  for (const p of observed) {
    const doc = p.nativeDocument as GcpRoleDocument;
    const places = chain.flatMap((resource) => bindingsOf(granted.get(resource) as GcpPolicy, doc.role.name).map((b) => ({ resource, expression: b.condition?.expression ?? '' })));
    for (const place of places.length > 0 ? places : [{ resource: doc.resource, expression: doc.condition?.expression ?? '' }]) {
      const id = `Allow|${place.resource}|${place.expression}`;
      const set = have.get(id) ?? new Set<string>();
      doc.role.includedPermissions.forEach((x) => set.add(x));
      have.set(id, set);
    }
  }
  const want = new Map<string, { rule: AuthorizationRule; permissions: Set<string> }>();
  for (const rule of desired) {
    if (rule.effect !== 'ALLOW') throw fail('uppie.adapter.gcp.deny_unsupported', { ruleId: rule.ruleId });
    const id = `Allow|${resolveResource(rule.resource.scope, project, chain)}|${compileCondition(rule) ?? ''}`;
    const entry = want.get(id) ?? { rule, permissions: new Set<string>() };
    rule.action.operations.forEach((x) => entry.permissions.add(x));
    want.set(id, entry);
  }
  const plan: ReconciliationPlan = { toAdd: [], toRemove: [], toUpdate: [], noChange: [] };
  for (const [id, { rule, permissions }] of want) {
    const current = have.get(id);
    const merged: AuthorizationRule = { ...rule, action: { ...rule.action, operations: [...permissions].sort() } };
    if (!current) plan.toAdd.push(merged);
    else if (current.size === permissions.size && [...permissions].every((x) => current.has(x))) plan.noChange.push(id);
    else plan.toUpdate.push({ ruleId: id, newRule: merged });
  }
  plan.toRemove = [...have.keys()].filter((id) => !want.has(id));
  return plan;
}
