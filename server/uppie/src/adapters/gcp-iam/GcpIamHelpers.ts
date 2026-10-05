/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — GCP IAM Helpers
 * File           : GcpIamHelpers.ts
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

import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AuthorizationRule } from '../../types/index';
import type { AdapterContext } from '../IPolicyProviderAdapter';
import { GRPC, GcpApiError } from './GcpIamClient';
import type { GcpCondition, GcpIamClient, GcpPolicy, GcpRoleSpec } from './GcpIamClient';

export const MAX_PERMISSIONS = 3000;
export const MAX_PRINCIPALS = 1500;
const MAX_TITLE = 100;
const MAX_DESCRIPTION = 300;
const MAX_EXPRESSION = 3000;
const MAX_CHAIN = 10;
const RESOURCE = /^(projects|folders|organizations)\/[^/\s]+$/;
const ROLE_NAME = /^((projects|organizations)\/[^/\s]+\/roles\/[A-Za-z0-9_.]{3,64}|roles\/[A-Za-z0-9_.]+)$/;
const PERMISSION = /^[a-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9_]*){2,}$/;
const MEMBER = /^((user|serviceAccount|group|domain):[^\s:]+|(principal|principalSet):\/\/\S+)$/;
/** Permissions that let the holder widen their own or others' access; allowed, but flagged on validation. */
const ESCALATING = /(\.setIamPolicy$|^iam\.serviceAccounts\.(actAs|getAccessToken|implicitDelegation|signBlob|signJwt)$|^iam\.roles\.(create|update)$)/;

export const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));
export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
export const isCustomRole = (name: string): boolean => /^(projects|organizations)\//.test(name);
export const isPermission = (permission: string): boolean => PERMISSION.test(permission);
export const roleParentOfName = (name: string): string => name.slice(0, name.indexOf('/roles/'));
export const roleIdOfName = (name: string): string => name.slice(name.lastIndexOf('/') + 1);
export const sameMember = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

/** The adapter's document: the role to grant, the resource it is granted on, and the optional binding condition. */
export interface GcpRoleDocument { role: GcpRoleSpec & { name: string }; resource: string; condition?: GcpCondition }

export function parseResource(raw: string): string {
  if (!RESOURCE.test(raw)) throw fail('uppie.adapter.gcp.invalid_resource', { resource: raw });
  return raw;
}

/** The environment's project as a resource name; accepts a bare project id or `projects/<id>`. */
export const projectOf = (context: AdapterContext): string => parseResource(context.environmentId.startsWith('projects/') ? context.environmentId : `projects/${context.environmentId}`);

/** The resource followed by its ancestors, up to the organization when there is one. */
export async function chainOf(client: GcpIamClient, resource: string): Promise<string[]> {
  const chain = [resource];
  for (let parent = await client.getParent(resource); parent && chain.length < MAX_CHAIN; parent = await client.getParent(parent)) chain.push(parent);
  return chain;
}

/** A rule__t('s_resource_which_must_be_the_e')s project or one of its ancestors (the credential's own hierarchy). */
export function resolveResource(raw: string | undefined, project: string, chain: string[]): string {
  if (!raw || raw === '*') return project;
  const resource = parseResource(raw);
  if (!chain.includes(resource)) throw fail('uppie.adapter.gcp.scope_outside_environment', { resource });
  return resource;
}

/** Custom roles live in a project or an organization; a folder-level grant uses the organization's role. */
export function roleParentOf(resource: string, chain: string[]): string {
  if (!resource.startsWith('folders/')) return resource;
  const org = chain.slice(chain.indexOf(resource)).find((r) => r.startsWith('organizations/'));
  if (!org) throw fail('uppie.adapter.gcp.no_organization', { resource });
  return org;
}

/** Resources where this adapter may have granted the role: from the environment__t('s_project_up_to_the_role')s parent. */
export function grantScopes(roleName: string, project: string, chain: string[]): string[] {
  if (!isCustomRole(roleName)) return [project];
  const end = chain.indexOf(roleParentOfName(roleName));
  return end < 0 ? [project] : chain.slice(0, end + 1);
}

export function parseMember(member: string): string {
  if (!MEMBER.test(member)) throw fail('uppie.adapter.gcp.invalid_member', { member });
  return member;
}
/** The identifier the policy troubleshooter expects (an email, or a principal URI); domains are not supported by it. */
export function principalOf(member: string): string | undefined {
  if (member.startsWith('domain:')) return undefined;
  return member.includes('://') ? member : member.slice(member.indexOf(':') + 1);
}

const sorted = (xs: string[]): string[] => [...new Set(xs)].sort();
export const samePermissions = (a: string[], b: string[]): boolean => JSON.stringify(sorted(a)) === JSON.stringify(sorted(b));
const digestOf = (permissions: string[], resource: string, expression: string): string =>
  createHash('sha256').update(JSON.stringify([sorted(permissions), resource, expression])).digest('hex');
/** Digest of what the document grants and where; independent of the localized role and condition texts. */
export const digestOfDocument = (doc: GcpRoleDocument): string => digestOf(doc.role.includedPermissions, doc.resource, doc.condition?.expression ?? '');

const isoOf = (value: unknown, ruleId: string): string => {
  const t = typeof value === 'string' ? Date.parse(value) : NaN;
  if (Number.isNaN(t)) throw fail('uppie.adapter.gcp.condition_unsupported', { ruleId });
  return new Date(t).toISOString();
};

/**
 * The IAM condition expression for a rule. Only time bounds can be expressed (a TIME_BOUND condition and the rule's
 * expiry); every other condition or constraint is refused rather than dropped. Only canonical timestamps are emitted.
 */
export function compileCondition(rule: AuthorizationRule): string | undefined {
  const unsupported = (): Error => fail('uppie.adapter.gcp.condition_unsupported', { ruleId: rule.ruleId });
  const c = rule.constraints ?? {};
  if (c.requireMfa !== undefined || c.ipRange !== undefined || c.maxCallsPerHour !== undefined || Object.keys(rule.resource.conditions ?? {}).length > 0) throw unsupported();
  const starts: string[] = [];
  const ends: string[] = [];
  for (const cond of rule.conditions ?? []) {
    if (cond.type !== 'TIME_BOUND') throw unsupported();
    const v = cond.value as Record<string, unknown>;
    if (v.notBefore !== undefined) starts.push(isoOf(v.notBefore, rule.ruleId));
    if (v.notAfter !== undefined) ends.push(isoOf(v.notAfter, rule.ruleId));
  }
  if (rule.validity && rule.validity.expiresAt !== 'PERMANENT') ends.push(isoOf(rule.validity.expiresAt, rule.ruleId));
  const parts = [...(starts.length ? [`request.time >= timestamp("${starts.sort().pop()}")`] : []), ...(ends.length ? [`request.time < timestamp("${ends.sort()[0]}")`] : [])];
  return parts.length > 0 ? parts.join(' && ') : undefined;
}

/**
 * Compiles AIR rules into one custom role plus the binding that grants it. Deny effects are refused (GCP deny policies
 * are a separate policy type), and rules that differ in resource or condition are refused because merging them would
 * widen access.
 */
export function buildDocument(rules: AuthorizationRule[], project: string, chain: string[]): GcpRoleDocument {
  if (rules.length === 0) throw fail('uppie.adapter.gcp.no_rules');
  const permissions: string[] = [];
  const shapes = new Set<string>();
  for (const rule of rules) {
    if (rule.effect !== 'ALLOW') throw fail('uppie.adapter.gcp.deny_unsupported', { ruleId: rule.ruleId });
    if (rule.action.operations.length === 0) throw fail('uppie.adapter.gcp.invalid_rule', { ruleId: rule.ruleId });
    shapes.add(JSON.stringify([resolveResource(rule.resource.scope, project, chain), compileCondition(rule) ?? '']));
    permissions.push(...rule.action.operations);
  }
  if (shapes.size > 1) throw fail('uppie.adapter.gcp.mixed_scopes');
  const [resource, expression] = JSON.parse([...shapes][0] as string) as [string, string];
  const digest = digestOf(permissions, resource, expression);
  const roleId = `ugondu_${digest.slice(0, 12)}`;
  return {
    role: {
      name: `${roleParentOf(resource, chain)}/roles/${roleId}`, stage: 'GA', includedPermissions: sorted(permissions),
      title: __t('uppie.adapter.gcp.role_title', { digest: digest.slice(0, 12) }), description: __t('uppie.adapter.gcp.role_description', { digest: digest.slice(0, 12) }),
    },
    resource,
    ...(expression ? { condition: { title: __t('uppie.adapter.gcp.condition_title', { digest: digest.slice(0, 12) }), expression } } : {}),
  };
}

export function validateDocument(doc: GcpRoleDocument | undefined): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!doc?.role || !Array.isArray(doc.role.includedPermissions) || doc.role.includedPermissions.length === 0) return { errors: [__t('uppie.adapter.gcp.validate.no_permissions')], warnings };
  const { role } = doc;
  if (!ROLE_NAME.test(role.name)) errors.push(__t('uppie.adapter.gcp.validate.invalid_role_name', { name: role.name }));
  if (!RESOURCE.test(doc.resource ?? '')) errors.push(__t('uppie.adapter.gcp.invalid_resource', { resource: String(doc.resource) }));
  if (role.title.length > MAX_TITLE || role.description.length > MAX_DESCRIPTION) errors.push(__t('uppie.adapter.gcp.validate.text_too_long', { title: MAX_TITLE, description: MAX_DESCRIPTION }));
  if (role.includedPermissions.length > MAX_PERMISSIONS) errors.push(__t('uppie.adapter.gcp.validate.too_many_permissions', { count: role.includedPermissions.length, limit: MAX_PERMISSIONS }));
  for (const p of new Set(role.includedPermissions)) {
    if (!PERMISSION.test(p)) errors.push(__t('uppie.adapter.gcp.validate.invalid_permission', { permission: p }));
    else if (ESCALATING.test(p)) warnings.push(__t('uppie.adapter.gcp.validate.escalating_permission', { permission: p }));
  }
  if (doc.condition && doc.condition.expression.length > MAX_EXPRESSION) errors.push(__t('uppie.adapter.gcp.validate.expression_too_long', { limit: MAX_EXPRESSION }));
  return { errors, warnings };
}

const sameCondition = (a?: GcpCondition, b?: GcpCondition): boolean => (a?.expression ?? '') === (b?.expression ?? '');
export const principalCount = (policy: GcpPolicy): number => policy.bindings.reduce((n, b) => n + b.members.length, 0);
export const bindingsOf = (policy: GcpPolicy, role: string): GcpPolicy['bindings'] => policy.bindings.filter((b) => b.role === role);

/** Adds the member to the (role, condition) binding, creating it when needed; the policy is returned unchanged when already granted. */
export function withMember(policy: GcpPolicy, role: string, member: string, condition?: GcpCondition): { policy: GcpPolicy; changed: boolean } {
  const existing = policy.bindings.find((b) => b.role === role && sameCondition(b.condition, condition));
  if (existing?.members.some((m) => sameMember(m, member))) return { policy, changed: false };
  const bindings = existing
    ? policy.bindings.map((b) => (b === existing ? { ...b, members: [...b.members, member] } : b))
    : [...policy.bindings, { role, members: [member], ...(condition ? { condition } : {}) }];
  const next = { ...policy, version: 3, bindings };
  if (principalCount(next) > MAX_PRINCIPALS) throw fail('uppie.adapter.gcp.policy_full', { limit: MAX_PRINCIPALS });
  return { policy: next, changed: true };
}

/** Removes the member from every binding of the role (whatever its condition), dropping bindings left empty. */
export function withoutMember(policy: GcpPolicy, role: string, member: string): { policy: GcpPolicy; changed: boolean } {
  if (!bindingsOf(policy, role).some((b) => b.members.some((m) => sameMember(m, member)))) return { policy, changed: false };
  const bindings = policy.bindings
    .map((b) => (b.role === role ? { ...b, members: b.members.filter((m) => !sameMember(m, member)) } : b))
    .filter((b) => b.members.length > 0);
  return { policy: { ...policy, version: 3, bindings }, changed: true };
}

/** The role must be a predefined role or a custom role defined on the resource or one of its ancestors, and the resource must be the environment's own. */
export function assertGrantable(doc: GcpRoleDocument, chain: string[]): void {
  const resource = parseResource(doc.resource);
  const at = chain.indexOf(resource);
  if (at < 0) throw fail('uppie.adapter.gcp.scope_outside_environment', { resource });
  if (isCustomRole(doc.role.name) && !chain.slice(at).includes(roleParentOfName(doc.role.name))) throw fail('uppie.adapter.gcp.scope_outside_environment', { resource: roleParentOfName(doc.role.name) });
}

const MAX_WRITE_ATTEMPTS = 5;
/** Reads, edits and writes the allow policy; a stale etag is retried on a fresh read. Returns whether a write happened. */
export async function editPolicy(client: GcpIamClient, resource: string, edit: (p: GcpPolicy) => { policy: GcpPolicy; changed: boolean }): Promise<boolean> {
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt++) {
    const result = edit(await client.getPolicy(resource));
    if (!result.changed) return false;
    try {
      await client.setPolicy(resource, result.policy);
      return true;
    } catch (e) {
      if (!(e instanceof GcpApiError) || e.code !== GRPC.ABORTED) throw e;
    }
  }
  throw fail('uppie.adapter.gcp.policy_conflict', { resource });
}
