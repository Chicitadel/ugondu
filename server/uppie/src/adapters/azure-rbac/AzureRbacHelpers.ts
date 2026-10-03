/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Azure RBAC Helpers
 * File           : AzureRbacHelpers.ts
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
import { subscriptionIdOf } from './AzureRbacClient';
import type { AzurePermission, AzurePrincipalType, AzureRolePayload } from './AzureRbacClient';

/** Operations prefixed with this marker are data-plane (`dataActions`); all others are control-plane (`actions`). */
export const DATA_PREFIX = 'data:';
const ROLE_SEGMENT = '/providers/Microsoft.Authorization/roleDefinitions/';
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ROLE_NAME = 512;

export const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));
export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
export const lower = (s: string): string => s.toLowerCase();
export const sameId = (a: string, b: string): boolean => lower(a) === lower(b);

/** The role document handled by the adapter: the Azure role body plus the scope at which it is assigned. */
export interface AzureRoleDocument extends AzureRolePayload { assignmentScope: string }

export type ScopeKind = 'managementGroup' | 'subscription' | 'resourceGroup' | 'resource';
export interface ParsedScope { kind: ScopeKind; path: string; /** The subscription, resource group or management group that encloses the scope. */ enclosing: string }

/** Accepts management-group, subscription, resource-group and resource scopes; anything else is rejected. */
export function parseScope(scope: string): ParsedScope {
  const path = scope.replace(/\/+$/, '');
  let m = /^\/providers\/Microsoft\.Management\/managementGroups\/[^/]+$/i.exec(path);
  if (m) return { kind: 'managementGroup', path, enclosing: path };
  m = /^\/subscriptions\/[^/]+$/i.exec(path);
  if (m) return { kind: 'subscription', path, enclosing: path };
  m = /^(\/subscriptions\/[^/]+\/resourceGroups\/[^/]+)$/i.exec(path);
  if (m) return { kind: 'resourceGroup', path, enclosing: path };
  m = /^(\/subscriptions\/[^/]+\/resourceGroups\/[^/]+)\/providers\/.+/i.exec(path);
  if (m) return { kind: 'resource', path, enclosing: m[1] as string };
  throw fail('uppie.adapter.azure.invalid_scope', { scope });
}

export const defaultScope = (context: AdapterContext): string => `/subscriptions/${subscriptionIdOf(context.environmentId)}`;
export const resolveScope = (raw: string | undefined, context: AdapterContext): string =>
  !raw || raw === '*' ? defaultScope(context) : parseScope(raw).path;

/** True when `child` equals `parent` or lies beneath it. */
export const isWithin = (child: string, parent: string): boolean => lower(child) === lower(parent) || lower(child).startsWith(`${lower(parent)}/`);
/** Management-group and tenant-root scopes sit above every subscription and cannot be compared by path prefix. */
export const isInheritedFrom = (resource: string, scope: string): boolean =>
  scope === '/' || /^\/providers\/Microsoft\.Management\/managementGroups\//i.test(scope) || isWithin(resource, scope);

const uuidFrom = (seed: string): string => {
  const h = createHash('sha256').update(seed).digest('hex');
  const variant = ((parseInt(h.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(18, 20)}-${h.slice(20, 32)}`;
};
export const assignmentName = (scope: string, principalId: string, roleDefinitionId: string): string =>
  uuidFrom(`assignment|${lower(scope)}|${lower(principalId)}|${lower(roleDefinitionId)}`);

export const roleIdAt = (scope: string, guid: string): string => `${scope}${ROLE_SEGMENT}${guid}`;
export function splitRoleId(id: string): { scope: string; guid: string } {
  const at = lower(id).lastIndexOf(lower(ROLE_SEGMENT));
  const guid = at < 0 ? '' : id.slice(at + ROLE_SEGMENT.length);
  if (!GUID.test(guid)) throw fail('uppie.adapter.azure.invalid_role_id', { id });
  return { scope: id.slice(0, at), guid };
}

/** `<objectId>` or `<User|Group|ServicePrincipal|ForeignGroup|Device>:<objectId>`. */
export function parsePrincipal(target: string): { principalId: string; principalType?: AzurePrincipalType } {
  const m = /^(?:(User|Group|ServicePrincipal|ForeignGroup|Device):)?([0-9a-f-]{36})$/i.exec(target);
  if (!m || !GUID.test(m[2] as string)) throw fail('uppie.adapter.azure.invalid_principal', { principal: target });
  const type = m[1] ? (['User', 'Group', 'ServicePrincipal', 'ForeignGroup', 'Device'].find((t) => sameId(t, m[1] as string)) as AzurePrincipalType) : undefined;
  return { principalId: m[2] as string, ...(type ? { principalType: type } : {}) };
}

const escapeRx = (s: string): string => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
/** Azure operation patterns are case-insensitive and `*` matches any run of characters. */
export const matches = (pattern: string, op: string): boolean => new RegExp(`^${pattern.split('*').map(escapeRx).join('.*')}$`, 'i').test(op);
export const hasWildcard = (op: string): boolean => op.includes('*');
export const splitOperation = (op: string): { data: boolean; name: string } =>
  op.startsWith(DATA_PREFIX) ? { data: true, name: op.slice(DATA_PREFIX.length) } : { data: false, name: op };

/** True when some permission block allows the operation and none of its exclusions removes it. */
export function permits(permissions: AzurePermission[], operation: string): boolean {
  const { data, name } = splitOperation(operation);
  return permissions.some((p) =>
    (data ? p.dataActions : p.actions).some((a) => matches(a, name)) && !(data ? p.notDataActions : p.notActions).some((n) => matches(n, name)));
}

const sorted = (xs: string[]): string[] => [...new Set(xs)].sort();
const canonicalBlock = (p: AzurePermission): string =>
  JSON.stringify([sorted(p.actions.map(lower)), sorted(p.notActions.map(lower)), sorted(p.dataActions.map(lower)), sorted(p.notDataActions.map(lower))]);

/** Digest of what a role grants and where it can be assigned; independent of its display name and description. */
export function grantsDigest(role: Pick<AzureRolePayload, 'permissions' | 'assignableScopes'>): string {
  const body = JSON.stringify([role.permissions.map(canonicalBlock).sort(), sorted(role.assignableScopes.map(lower))]);
  return createHash('sha256').update(body).digest('hex');
}
export const digestOfDocument = (doc: AzureRoleDocument): string =>
  createHash('sha256').update(`${grantsDigest(doc)}|${lower(doc.assignmentScope)}`).digest('hex');
export const roleNameFor = (doc: Pick<AzureRolePayload, 'permissions' | 'assignableScopes'>): string => `ugondu-${grantsDigest(doc).slice(0, 12)}`;
export const roleGuidFor = (doc: Pick<AzureRolePayload, 'permissions' | 'assignableScopes'>): string => uuidFrom(`role|${grantsDigest(doc)}`);
export const cloneGuidFor = (scope: string, roleName: string): string => uuidFrom(`clone|${lower(scope)}|${lower(roleName)}`);
export const payloadOf = (doc: AzureRoleDocument): AzureRolePayload =>
  ({ roleName: doc.roleName, description: doc.description, permissions: doc.permissions, assignableScopes: doc.assignableScopes });

/** Flattens a role into the operations it grants (exclusions are not applied); data-plane operations carry the marker. */
export const operationsOf = (permissions: AzurePermission[]): string[] =>
  sorted(permissions.flatMap((p) => [...p.actions, ...p.dataActions.map((d) => `${DATA_PREFIX}${d}`)]));

/**
 * Compiles AIR rules into one Azure custom role. Azure RBAC cannot express anything beyond an allow-list at a scope, so
 * the compiler fails closed: deny effects (deny assignments are system-managed), conditions, constraints, expiring
 * validity and rules spanning more than one scope (which would widen access when merged) are rejected.
 */
export function buildRoleDocument(rules: AuthorizationRule[], context: AdapterContext): AzureRoleDocument {
  const actions: string[] = [];
  const dataActions: string[] = [];
  const scopes = new Set<string>();
  for (const rule of rules) {
    if (rule.effect !== 'ALLOW') throw fail('uppie.adapter.azure.deny_unsupported', { ruleId: rule.ruleId });
    const constrained = rule.constraints?.requireMfa !== undefined || rule.constraints?.ipRange !== undefined || rule.constraints?.maxCallsPerHour !== undefined;
    if ((rule.conditions ?? []).length > 0 || Object.keys(rule.resource.conditions ?? {}).length > 0 || constrained) {
      throw fail('uppie.adapter.azure.condition_unsupported', { ruleId: rule.ruleId });
    }
    if (rule.validity && rule.validity.expiresAt !== 'PERMANENT') throw fail('uppie.adapter.azure.validity_unsupported', { ruleId: rule.ruleId });
    if (rule.action.operations.length === 0) throw fail('uppie.adapter.azure.invalid_rule', { ruleId: rule.ruleId });
    scopes.add(lower(resolveScope(rule.resource.scope, context)));
    for (const op of rule.action.operations) {
      const { data, name } = splitOperation(op);
      (data ? dataActions : actions).push(name);
    }
  }
  if (rules.length === 0) throw fail('uppie.adapter.azure.no_rules');
  if (scopes.size > 1) throw fail('uppie.adapter.azure.mixed_scopes');
  const assignmentScope = resolveScope(rules[0]?.resource.scope, context);
  const base = {
    permissions: [{ actions: sorted(actions), notActions: [], dataActions: sorted(dataActions), notDataActions: [] }],
    assignableScopes: [parseScope(assignmentScope).enclosing],
  };
  return { roleName: roleNameFor(base), description: __t('uppie.adapter.azure.role_description', { digest: grantsDigest(base).slice(0, 12) }), ...base, assignmentScope };
}

/** Structural validation of a role document; wildcard-all grants are errors, service-wide wildcards are warnings. */
export function validateRoleDocument(doc: AzureRoleDocument | undefined): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!doc || !Array.isArray(doc.permissions) || doc.permissions.length === 0) return { errors: [__t('uppie.adapter.azure.validate.no_permissions')], warnings };
  if (!doc.roleName || doc.roleName.length > MAX_ROLE_NAME) errors.push(__t('uppie.adapter.azure.validate.invalid_role_name', { limit: MAX_ROLE_NAME }));
  const all = doc.permissions.flatMap((p) => [...p.actions, ...p.dataActions]);
  if (all.length === 0) errors.push(__t('uppie.adapter.azure.validate.no_permissions'));
  for (const op of new Set(all)) {
    if (op === '*') errors.push(__t('uppie.adapter.azure.validate.admin_wildcard'));
    else if (!op.includes('/') || /\s/.test(op)) errors.push(__t('uppie.adapter.azure.validate.invalid_action', { action: op }));
    else if (op.endsWith('/*') || op.startsWith('*/')) warnings.push(__t('uppie.adapter.azure.validate.broad_wildcard', { action: op }));
  }
  if (!Array.isArray(doc.assignableScopes) || doc.assignableScopes.length === 0) errors.push(__t('uppie.adapter.azure.validate.no_assignable_scopes'));
  for (const scope of doc.assignableScopes ?? []) {
    try {
      if (parseScope(scope).kind === 'resource') errors.push(__t('uppie.adapter.azure.validate.resource_assignable', { scope }));
    } catch (e) { errors.push(errorText(e)); }
  }
  if (doc.assignmentScope && !(doc.assignableScopes ?? []).some((s) => isWithin(doc.assignmentScope, s))) {
    errors.push(__t('uppie.adapter.azure.validate.assignment_outside', { scope: doc.assignmentScope }));
  }
  return { errors, warnings };
}
