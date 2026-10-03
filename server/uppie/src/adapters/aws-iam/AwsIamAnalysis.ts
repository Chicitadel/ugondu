/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Analysis
 * File           : AwsIamAnalysis.ts
 * Version        : 1.0.0
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
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type {
  ProviderNativePolicy, DependencyReport, ConflictReport, PolicyConflict, ReconciliationPlan,
  ObservationWindow, UsageObservation, PolicySimulationResult,
} from '../IPolicyProviderAdapter';
import type { AuthorizationRule, EffectiveAuthorityResult, EffectivePermission } from '../../types/index';
import { classifyBlast } from '../shared/BlastRadius';
import type { AwsIamClient, AwsPolicyDocument, AwsSimDecision } from './AwsIamClient';
import {
  buildPolicyDocument, globOverlaps, hasWildcard, parsePrincipalArn, statementCovers, statementGrants,
} from './AwsIamPolicyHelpers';

/** IAM simulation requests are bounded; larger action sets are split into batches. */
const SIMULATION_BATCH = 50;
const DAY_MS = 86_400_000;

async function inBatches(actions: string[], run: (batch: string[]) => Promise<AwsSimDecision[]>): Promise<AwsSimDecision[]> {
  const out: AwsSimDecision[] = [];
  for (let i = 0; i < actions.length; i += SIMULATION_BATCH) out.push(...(await run(actions.slice(i, i + SIMULATION_BATCH))));
  return out;
}

/**
 * Per-action effective permissions for a principal. Actions come from the principal's attached managed policies; the
 * allow/deny decision for each literal action is computed by the IAM policy simulator, so it reflects every policy that
 * applies to the principal (inline, group, boundary, SCP-visible). Wildcard actions cannot be simulated and are reported
 * as NEEDS_SIMULATION.
 */
export async function effectiveAuthority(client: AwsIamClient, actor: string, resource: string): Promise<EffectiveAuthorityResult> {
  const principal = parsePrincipalArn(actor);
  const attached = await Promise.all((await client.listAttachedPolicies(principal.kind, principal.name)).map((arn) => client.getPolicy(arn)));
  const actions = [...new Set(attached.flatMap((p) => p.document.Statement.flatMap((s) => s.Action)))].sort();
  const literal = actions.filter((a) => !hasWildcard(a));
  const decisions = new Map((await inBatches(literal, (batch) => client.simulatePrincipal(actor, batch, [resource]))).map((d) => [d.action.toLowerCase(), d.decision]));
  const sources = (action: string, effect: 'Allow' | 'Deny'): string[] =>
    attached.filter((p) => p.document.Statement.some((s) => s.Effect === effect && statementCovers(s, action, resource))).map((p) => p.arn);

  const permissions: EffectivePermission[] = actions.map((action) => {
    const decision = decisions.get(action.toLowerCase());
    return {
      capability: action, resource, sourcePolicies: sources(action, 'Allow'), denyPolicies: sources(action, 'Deny'),
      state: hasWildcard(action) || !decision ? 'NEEDS_SIMULATION' : decision === 'allowed' ? 'GRANTED' : 'DENIED',
      confidence: hasWildcard(action) || !decision ? 'LOW' : 'HIGH',
    };
  });
  return { actorId: actor, resourceId: resource, evaluatedAt: new Date().toISOString(), permissions, evaluationMethod: permissions.some((p) => p.state === 'NEEDS_SIMULATION') ? 'PARTIAL_MODEL' : 'PROVIDER_API' };
}

/** GRANTED when the rule's subject currently holds every operation on the resource; UNKNOWN when it cannot be simulated. */
export async function evaluateRule(client: AwsIamClient, rule: AuthorizationRule): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
  const ops = rule.action.operations;
  if (ops.length === 0 || ops.some(hasWildcard)) return 'UNKNOWN';
  parsePrincipalArn(rule.subject.id);
  const decisions = await inBatches(ops, (batch) => client.simulatePrincipal(rule.subject.id, batch, [rule.resource.scope]));
  if (decisions.length === 0) return 'UNKNOWN';
  return decisions.every((d) => d.decision === 'allowed') ? 'GRANTED' : 'DENIED';
}

/**
 * Compares the proposed rule set against current access. Allow rules not yet effective are `allowed`; Deny rules that
 * would remove access which is currently held are `denied`; everything else is `unchanged`. Rules with wildcard actions
 * or non-ARN subjects cannot be simulated and lower the confidence.
 */
export async function simulateRules(client: AwsIamClient, rules: AuthorizationRule[]): Promise<PolicySimulationResult> {
  const proposed = JSON.stringify(buildPolicyDocument(rules));
  const allowed: string[] = [];
  const denied: string[] = [];
  const unchanged: string[] = [];
  const subjects = new Map<string, ReturnType<typeof parsePrincipalArn>>();
  let simulated = 0;
  let skipped = 0;
  for (const rule of rules) {
    const ops = rule.action.operations;
    let principal;
    try { principal = parsePrincipalArn(rule.subject.id); } catch { principal = undefined; }
    if (!principal || ops.some(hasWildcard)) { skipped++; continue; }
    subjects.set(rule.subject.id, principal);
    const current = new Map((await inBatches(ops, (b) => client.simulatePrincipal(rule.subject.id, b, [rule.resource.scope]))).map((d) => [d.action.toLowerCase(), d.decision]));
    const after = new Map((await inBatches(ops, (b) => client.simulateCustom([proposed], b, [rule.resource.scope]))).map((d) => [d.action.toLowerCase(), d.decision]));
    for (const op of ops) {
      const id = `${rule.subject.id}:${rule.resource.scope}:${op}`;
      const had = current.get(op.toLowerCase()) === 'allowed';
      if (rule.effect === 'ALLOW') (had || after.get(op.toLowerCase()) !== 'allowed' ? unchanged : allowed).push(id);
      else (had && after.get(op.toLowerCase()) === 'explicitDeny' ? denied : unchanged).push(id);
    }
    simulated++;
  }
  const hasGroup = [...subjects.values()].some((s) => s.kind === 'group');
  const blast = classifyBlast(subjects.size, hasGroup);
  const confidence = simulated === 0 ? 'LOW' : skipped === 0 ? 'HIGH' : 'MEDIUM';
  return { allowed, denied, unchanged, confidence, blastRadius: { policyId: '', dependentRoles: [], dependentActors: [...subjects.keys()], dependentServices: [], blastRadius: blast } };
}

/** An Allow and a Deny by the same subject whose actions and resources overlap: IAM resolves it as explicit Deny wins. */
export function findConflicts(rules: AuthorizationRule[]): ConflictReport {
  const conflicts: PolicyConflict[] = [];
  const allows = rules.filter((r) => r.effect === 'ALLOW');
  for (const deny of rules.filter((r) => r.effect === 'DENY')) {
    for (const allow of allows) {
      const overlap = allow.subject.id === deny.subject.id && globOverlaps(allow.resource.scope, deny.resource.scope)
        && allow.action.operations.some((a) => deny.action.operations.some((d) => globOverlaps(a, d)));
      if (overlap) {
        conflicts.push({
          ruleA: allow.ruleId, ruleB: deny.ruleId, conflictType: 'ALLOW_DENY_OVERLAP', resolution: 'B_WINS',
          explanation: __t('uppie.adapter.aws.conflict_explanation', { subject: allow.subject.id, allowScope: allow.resource.scope, denyScope: deny.resource.scope }),
        });
      }
    }
  }
  return { conflicts };
}

/** Diffs desired rules against observed policy documents on (effect, resource) with action sets. */
export function reconcilePlan(desired: AuthorizationRule[], observed: ProviderNativePolicy[]): ReconciliationPlan {
  const have = new Map<string, Set<string>>();
  for (const p of observed) {
    for (const [id, actions] of statementGrants(p.nativeDocument as AwsPolicyDocument)) {
      const set = have.get(id) ?? new Set<string>();
      actions.forEach((a) => set.add(a));
      have.set(id, set);
    }
  }
  const want = new Map<string, { rule: AuthorizationRule; actions: Set<string> }>();
  for (const rule of desired) {
    const id = `${rule.effect === 'DENY' ? 'Deny' : 'Allow'}|${rule.resource.scope}`;
    const entry = want.get(id) ?? { rule, actions: new Set<string>() };
    rule.action.operations.forEach((a) => entry.actions.add(a));
    want.set(id, entry);
  }
  const plan: ReconciliationPlan = { toAdd: [], toRemove: [], toUpdate: [], noChange: [] };
  for (const [id, { rule, actions }] of want) {
    const current = have.get(id);
    const merged: AuthorizationRule = { ...rule, action: { ...rule.action, operations: [...actions].sort() } };
    if (!current) plan.toAdd.push(merged);
    else if (current.size === actions.size && [...actions].every((a) => current.has(a))) plan.noChange.push(id);
    else plan.toUpdate.push({ ruleId: id, newRule: merged });
  }
  plan.toRemove = [...have.keys()].filter((id) => !want.has(id));
  return plan;
}

/** Principals the policy is attached to. Any attached group makes the blast radius BROAD (membership is unbounded). */
export async function dependencies(client: AwsIamClient, policyId: string): Promise<DependencyReport> {
  const entities = await client.listEntitiesForPolicy(policyId);
  const label = (e: { kind: string; name: string }): string => `${e.kind}/${e.name}`;
  return {
    policyId,
    dependentRoles: entities.filter((e) => e.kind === 'role').map(label),
    dependentActors: entities.filter((e) => e.kind !== 'role').map(label),
    dependentServices: [],
    blastRadius: classifyBlast(entities.length, entities.some((e) => e.kind === 'group')),
  };
}

/** Service last-accessed data for the policy within the window (limited: scheduled/failover/emergency paths are not visible to IAM). */
export async function observeUsage(client: AwsIamClient, policyId: string, window: ObservationWindow): Promise<UsageObservation> {
  const services = await client.lastAccessed(policyId);
  const start = Date.parse(window.startAt);
  const end = Date.parse(window.endAt);
  const stamps = services.filter((s) => s.lastAuthenticated).map((s) => new Date(s.lastAuthenticated as Date).getTime());
  const inWindow = stamps.filter((t) => t >= start && t <= end);
  const last = stamps.length > 0 ? Math.max(...stamps) : undefined;
  return {
    policyId, observedUsages: inWindow.length, ...(last !== undefined ? { lastUsedAt: new Date(last).toISOString() } : {}),
    classification: inWindow.length > 0 ? 'ACTIVE' : last !== undefined ? 'RARELY_USED' : 'UNUSED',
    scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false,
  };
}

/** Unattached policies, plus attached ones with no service activity within the threshold. */
export async function detectUnused(client: AwsIamClient, thresholdDays: number): Promise<UsageObservation[]> {
  const out: UsageObservation[] = [];
  const window = { startAt: new Date(Date.now() - thresholdDays * DAY_MS).toISOString(), endAt: new Date().toISOString() };
  for (const policy of await client.listLocalPolicies()) {
    if (policy.attachmentCount === 0) {
      out.push({ policyId: policy.arn, observedUsages: 0, classification: 'UNUSED', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false });
      continue;
    }
    const usage = await observeUsage(client, policy.arn, window);
    if (usage.observedUsages === 0) out.push(usage);
  }
  return out;
}
