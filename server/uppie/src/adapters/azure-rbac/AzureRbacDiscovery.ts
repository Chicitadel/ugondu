/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Azure RBAC Discovery
 * File           : AzureRbacDiscovery.ts
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

import type { AdapterContext, ProviderNativePolicy } from '../IPolicyProviderAdapter';
import { AzureApiError } from './AzureRbacClient';
import type { AzureRbacClient, AzureRoleAssignment, AzureRoleDefinition } from './AzureRbacClient';
import { defaultScope, digestOfDocument } from './AzureRbacHelpers';
import type { AzureRoleDocument } from './AzureRbacHelpers';

const GROUP_TYPES = new Set(['Group', 'ForeignGroup']);

/** The adapter's native policy for an existing Azure role definition. */
export function nativePolicyOf(role: AzureRoleDefinition): ProviderNativePolicy {
  const document: AzureRoleDocument = {
    roleName: role.roleName, description: role.description, permissions: role.permissions,
    assignableScopes: role.assignableScopes, assignmentScope: role.assignableScopes[0] ?? '',
  };
  return { providerId: role.id, providerType: 'AZURE_RBAC', nativeDocument: document, digest: digestOfDocument(document) };
}

/**
 * Role definitions visible from the environment's subscription. Azure lists only roles assignable at the queried scope
 * or above, so a role defined for a single resource group is found through the assignments that reference it; such a
 * role is therefore discoverable only while it is assigned.
 */
async function visibleRoles(client: AzureRbacClient, context: AdapterContext, customOnly: boolean): Promise<AzureRoleDefinition[]> {
  const scope = defaultScope(context);
  const found = new Map<string, AzureRoleDefinition>();
  for (const role of await client.listRoleDefinitions(scope, customOnly)) found.set(role.id.toLowerCase(), role);
  const tried = new Set<string>(found.keys());
  for (const a of await client.listRoleAssignments(scope)) {
    const key = a.roleDefinitionId.toLowerCase();
    if (tried.has(key)) continue;
    tried.add(key);
    try {
      const role = await client.getRoleDefinition(a.roleDefinitionId);
      if (!customOnly || role.roleType === 'CustomRole') found.set(key, role);
    } catch (e) {
      if (!(e instanceof AzureApiError) || e.statusCode !== 404) throw e; // a dangling assignment is skipped
    }
  }
  return [...found.values()];
}

/** Custom role definitions assignable within, or assigned inside, the environment's subscription. */
export async function discoverPolicies(client: AzureRbacClient, context: AdapterContext): Promise<ProviderNativePolicy[]> {
  return (await visibleRoles(client, context, true)).map(nativePolicyOf);
}

/** principalId → role definition ids, from the role assignments at and below the environment's subscription. */
export async function discoverAssignments(client: AzureRbacClient, context: AdapterContext): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const a of await client.listRoleAssignments(defaultScope(context))) {
    const roles = out[a.principalId] ?? [];
    if (!roles.includes(a.roleDefinitionId)) roles.push(a.roleDefinitionId);
    out[a.principalId] = roles;
  }
  return out;
}

const principals = (assignments: AzureRoleAssignment[], wantGroups: boolean): Map<string, string> => {
  const seen = new Map<string, string>();
  for (const a of assignments) {
    const type = a.principalType ?? 'Unknown';
    if (GROUP_TYPES.has(type) === wantGroups && !seen.has(a.principalId)) seen.set(a.principalId, type);
  }
  return seen;
};

/**
 * Identities that hold role assignments. The directory (Microsoft Graph) is outside this adapter's authorization
 * surface, so identities are those visible through assignments and the object id doubles as the display name.
 */
export async function discoverIdentities(client: AzureRbacClient, context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> {
  const assignments = await client.listRoleAssignments(defaultScope(context));
  return [...principals(assignments, false)].map(([id, type]) => ({ id, type: type.toUpperCase(), displayName: id }));
}

/** Groups that hold role assignments; membership requires a directory query and is therefore not reported. */
export async function discoverGroups(client: AzureRbacClient, context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> {
  const assignments = await client.listRoleAssignments(defaultScope(context));
  return [...principals(assignments, true)].map(([id]) => ({ id, displayName: id, members: [] }));
}

/** Every role definition (built-in and custom) visible from the environment's subscription. */
export async function discoverRoles(client: AzureRbacClient, context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> {
  return (await visibleRoles(client, context, false)).map((r) => ({ id: r.id, displayName: r.roleName, policies: [r.id] }));
}
