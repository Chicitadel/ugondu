/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Azure RBAC Authority Model
 * File           : AzureRbacModel.ts
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
import type { AzureDenyAssignment, AzureRbacClient, AzureRoleAssignment, AzureRoleDefinition } from './AzureRbacClient';
import {
  fail, hasWildcard, isInheritedFrom, lower, matches, operationsOf, parsePrincipal, permits, resolveScope, sameId, splitOperation,
} from './AzureRbacHelpers';
import type { AzureRoleDocument } from './AzureRbacHelpers';

/** The deny-assignment principal that stands for "everyone". */
const EVERYONE = '00000000-0000-0000-0000-000000000000';

/** Role assignments of a role across the scopes where it can be assigned (a built-in role is searched at `fallbackScope`). */
export async function assignmentsOfRole(client: AzureRbacClient, role: AzureRoleDefinition, fallbackScope: string): Promise<AzureRoleAssignment[]> {
  const scopes = role.roleType === 'CustomRole' ? role.assignableScopes : [fallbackScope];
  const seen = new Map<string, AzureRoleAssignment>();
  for (const scope of scopes) {
    for (const a of await client.listRoleAssignments(scope)) if (sameId(a.roleDefinitionId, role.id)) seen.set(lower(a.id), a);
  }
  return [...seen.values()];
}

/** Principals assigned the role. Groups make the blast radius BROAD because membership is unbounded. */
export async function dependencies(client: AzureRbacClient, role: AzureRoleDefinition, fallbackScope: string): Promise<DependencyReport> {
  const assignments = await assignmentsOfRole(client, role, fallbackScope);
  const label = (a: AzureRoleAssignment): string => `${a.principalType ?? 'Principal'}/${a.principalId}`;
  const isService = (a: AzureRoleAssignment): boolean => a.principalType === 'ServicePrincipal';
  return {
    policyId: role.id,
    dependentRoles: [],
    dependentActors: assignments.filter((a) => !isService(a)).map(label),
    dependentServices: assignments.filter(isService).map(label),
    blastRadius: classifyBlast(assignments.length, assignments.some((a) => a.principalType === 'Group' || a.principalType === 'ForeignGroup')),
  };
}

interface Authority { roles: AzureRoleDefinition[]; assignments: AzureRoleAssignment[]; denies: AzureDenyAssignment[] }

/**
 * Role assignments held by the principal that apply at the resource (at the scope or inherited from above), the role
 * definitions behind them, and the deny assignments in force. Group-inherited assignments are not visible without a
 * directory query, so the result is a partial model.
 */
async function authorityOf(client: AzureRbacClient, principalId: string, resource: string): Promise<Authority> {
  const assignments = (await client.listRoleAssignments(resource, principalId)).filter((a) => sameId(a.principalId, principalId) && isInheritedFrom(resource, a.scope));
  const byId = new Map<string, AzureRoleDefinition>();
  for (const a of assignments) if (!byId.has(lower(a.roleDefinitionId))) byId.set(lower(a.roleDefinitionId), await client.getRoleDefinition(a.roleDefinitionId));
  const denies = (await client.listDenyAssignments(resource)).filter((d) =>
    isInheritedFrom(resource, d.scope) && (d.principalIds.includes(EVERYONE) || d.principalIds.some((p) => sameId(p, principalId))) && !d.excludePrincipalIds.some((p) => sameId(p, principalId)));
  return { roles: [...byId.values()], assignments, denies };
}

const denyingOf = (a: Authority, op: string): string[] => a.denies.filter((d) => permits(d.permissions, op)).map((d) => d.id);
const grantingOf = (a: Authority, op: string): string[] => a.roles.filter((r) => permits(r.permissions, op)).map((r) => r.id);
/** Deny assignments that remove part of a wildcard operation (exclusions on the deny are ignored: the result is conservative). */
const partialDenyOf = (a: Authority, op: string): string[] => {
  const { data, name } = splitOperation(op);
  return hasWildcard(name)
    ? a.denies.filter((d) => d.permissions.some((p) => (data ? p.dataActions : p.actions).some((x) => matches(x, name) || matches(name, x)))).map((d) => d.id)
    : [];
};

/** Per-operation effective permissions for a principal at a resource, from its role assignments and the deny assignments. */
export async function effectiveAuthority(client: AzureRbacClient, actor: string, resource: string, context: AdapterContext): Promise<EffectiveAuthorityResult> {
  const principal = parsePrincipal(actor);
  const scope = resolveScope(resource, context);
  const authority = await authorityOf(client, principal.principalId, scope);
  const permissions: EffectivePermission[] = [...new Set(authority.roles.flatMap((r) => operationsOf(r.permissions)))].sort().map((op) => {
    const denied = denyingOf(authority, op);
    const partial = denied.length > 0 ? [] : partialDenyOf(authority, op);
    return {
      capability: op, resource: scope, sourcePolicies: grantingOf(authority, op), denyPolicies: [...denied, ...partial],
      state: denied.length > 0 ? 'DENIED' : partial.length > 0 ? 'CONDITIONALLY_GRANTED' : 'GRANTED',
      confidence: partial.length > 0 ? 'LOW' : 'MEDIUM',
    } as EffectivePermission;
  });
  return { actorId: actor, resourceId: scope, evaluatedAt: new Date().toISOString(), permissions, evaluationMethod: 'PARTIAL_MODEL' };
}

/**
 * GRANTED when the rule's operations are all permitted by the subject's own assignments; DENIED only through a matching
 * deny assignment. Absence of a grant is UNKNOWN, since group-inherited access cannot be observed without the directory.
 */
export async function evaluateRule(client: AzureRbacClient, rule: AuthorizationRule, context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
  const ops = rule.action.operations;
  if (ops.length === 0 || ops.some(hasWildcard)) return 'UNKNOWN';
  const principal = parsePrincipal(rule.subject.id);
  const authority = await authorityOf(client, principal.principalId, resolveScope(rule.resource.scope, context));
  if (ops.some((op) => denyingOf(authority, op).length > 0)) return 'DENIED';
  return ops.every((op) => grantingOf(authority, op).length > 0) ? 'GRANTED' : 'UNKNOWN';
}

/**
 * Compares proposed Allow rules against current access: an operation not yet held is `allowed`, one already held is
 * `unchanged`. Deny rules cannot be realised in Azure RBAC and are reported unchanged. Azure has no simulation API, so
 * confidence never exceeds MEDIUM, and drops to LOW when no rule could be evaluated.
 */
export async function simulateRules(client: AzureRbacClient, rules: AuthorizationRule[], context: AdapterContext): Promise<PolicySimulationResult> {
  const allowed: string[] = [];
  const unchanged: string[] = [];
  const subjects = new Map<string, string>();
  let simulated = 0;
  let skipped = 0;
  for (const rule of rules) {
    const ops = rule.action.operations;
    const scope = resolveScope(rule.resource.scope, context);
    const idOf = (op: string): string => `${rule.subject.id}:${scope}:${op}`;
    let principal;
    try { principal = parsePrincipal(rule.subject.id); } catch { principal = undefined; }
    if (rule.effect !== 'ALLOW' || !principal || ops.some(hasWildcard)) { skipped++; unchanged.push(...ops.map(idOf)); continue; }
    subjects.set(rule.subject.id, principal.principalType ?? 'Principal');
    const authority = await authorityOf(client, principal.principalId, scope);
    for (const op of ops) (grantingOf(authority, op).length > 0 || denyingOf(authority, op).length > 0 ? unchanged : allowed).push(idOf(op));
    simulated++;
  }
  const blast = classifyBlast(subjects.size, [...subjects.values()].some((t) => t === 'Group' || t === 'ForeignGroup'));
  return {
    allowed, denied: [], unchanged, confidence: simulated === 0 ? 'LOW' : 'MEDIUM',
    blastRadius: { policyId: '', dependentRoles: [], dependentActors: [...subjects.keys()], dependentServices: [], blastRadius: blast },
  } as PolicySimulationResult;
}

/**
 * Azure RBAC is additive, so Allow rules cannot conflict with each other. A Deny rule has no Azure equivalent (deny
 * assignments are system-managed); one that overlaps an Allow of the same subject is reported as ambiguous.
 */
export function findConflicts(rules: AuthorizationRule[], context: AdapterContext): ConflictReport {
  const conflicts: PolicyConflict[] = [];
  const overlaps = (a: string, b: string): boolean => matches(a, b) || matches(b, a);
  for (const deny of rules.filter((r) => r.effect === 'DENY')) {
    for (const allow of rules.filter((r) => r.effect === 'ALLOW' && sameId(r.subject.id, deny.subject.id))) {
      const allowScope = resolveScope(allow.resource.scope, context);
      const denyScope = resolveScope(deny.resource.scope, context);
      const shared = allow.action.operations.some((a) => deny.action.operations.some((d) => overlaps(a, d)));
      if (shared && (isInheritedFrom(denyScope, allowScope) || isInheritedFrom(allowScope, denyScope))) {
        conflicts.push({
          ruleA: allow.ruleId, ruleB: deny.ruleId, conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'AMBIGUOUS',
          explanation: __t('uppie.adapter.azure.conflict_explanation', { subject: allow.subject.id, allowScope, denyScope }),
        });
      }
    }
  }
  return { conflicts };
}

/** Diffs desired Allow rules against observed role documents on (assignment scope) with their operation sets. */
export function reconcilePlan(desired: AuthorizationRule[], observed: ProviderNativePolicy[], context: AdapterContext): ReconciliationPlan {
  const have = new Map<string, Set<string>>();
  for (const p of observed) {
    const doc = p.nativeDocument as AzureRoleDocument;
    const id = `Allow|${lower(doc.assignmentScope)}`;
    const set = have.get(id) ?? new Set<string>();
    operationsOf(doc.permissions).forEach((o) => set.add(o));
    have.set(id, set);
  }
  const want = new Map<string, { rule: AuthorizationRule; ops: Set<string> }>();
  for (const rule of desired) {
    if (rule.effect !== 'ALLOW') throw fail('uppie.adapter.azure.deny_unsupported', { ruleId: rule.ruleId });
    const id = `Allow|${lower(resolveScope(rule.resource.scope, context))}`;
    const entry = want.get(id) ?? { rule, ops: new Set<string>() };
    rule.action.operations.forEach((o) => entry.ops.add(o));
    want.set(id, entry);
  }
  const plan: ReconciliationPlan = { toAdd: [], toRemove: [], toUpdate: [], noChange: [] };
  for (const [id, { rule, ops }] of want) {
    const current = have.get(id);
    const merged: AuthorizationRule = { ...rule, action: { ...rule.action, operations: [...ops].sort() } };
    const lowered = new Set([...ops].map(lower));
    if (!current) plan.toAdd.push(merged);
    else if (current.size === ops.size && [...current].every((o) => lowered.has(lower(o)))) plan.noChange.push(id);
    else plan.toUpdate.push({ ruleId: id, newRule: merged });
  }
  plan.toRemove = [...have.keys()].filter((id) => !want.has(id));
  return plan;
}
