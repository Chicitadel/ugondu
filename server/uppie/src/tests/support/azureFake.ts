/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - Azure RBAC Test Support
 * File           : azureFake.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AzureApiError } from '../../adapters/azure-rbac/AzureRbacClient';
import type {
  AzureDenyAssignment, AzureRbacClient, AzurePrincipalType, AzureRoleAssignment, AzureRoleDefinition, AzureRolePayload,
} from '../../adapters/azure-rbac/AzureRbacClient';

export const SUB = '11111111-1111-1111-1111-111111111111';
export const SCOPE = `/subscriptions/${SUB}`;
export const RG = `${SCOPE}/resourceGroups/rg-app`;
export const RG2 = `${SCOPE}/resourceGroups/rg-data`;
export const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
export const GROUP_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
export const SP_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
export const READER_ID = '/providers/Microsoft.Authorization/roleDefinitions/acdd72a7-3385-48ef-bd42-f606fba81ae7';
export const ctx: any = { tenantId: 't', environmentId: SUB, provider: 'AZURE_RBAC', credentials: {} };

export function rule(over: Record<string, any> = {}): any {
  return {
    ruleId: 'rule-1', version: '1.0.0', effect: 'ALLOW', conditions: [], scope: {}, purpose: 'test', owner: 'o',
    constraints: {}, validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: 'PERMANENT', type: 'PERMANENT' },
    subject: { type: 'USER', id: `User:${USER_ID}` },
    action: { capability: 'Storage.Read', operations: ['Microsoft.Storage/storageAccounts/read'] },
    resource: { type: 'azure::storage', scope: RG },
    ...over,
  };
}

const low = (s: string): string => s.toLowerCase();
const within = (child: string, parent: string): boolean => parent === '/' || low(child) === low(parent) || low(child).startsWith(`${low(parent)}/`);
const above = (scope: string, a: string): boolean => within(scope, a) || /^\/providers\/Microsoft\.Management\//i.test(a) || a === '/';
const err = (status: number, code: string): AzureApiError => new AzureApiError(code, code, status);
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));

/**
 * In-memory Azure authorization service enforcing the rules the adapter must respect: built-in roles are immutable,
 * role names are unique, roles are only assignable inside their assignable scopes, roles with assignments cannot be
 * deleted, assignment names are idempotent, and duplicate (scope, principal, role) assignments conflict.
 */
export function fakeAzure() {
  const roles = new Map<string, AzureRoleDefinition>();
  const assignments = new Map<string, AzureRoleAssignment>();
  const denies: AzureDenyAssignment[] = [];
  const calls: string[] = [];
  roles.set(low(READER_ID), {
    id: READER_ID, name: 'acdd72a7-3385-48ef-bd42-f606fba81ae7', roleName: 'Reader', description: 'View everything', roleType: 'BuiltInRole',
    permissions: [{ actions: ['*/read'], notActions: [], dataActions: [], notDataActions: [] }], assignableScopes: ['/'],
  });
  const lookup = (id: string): AzureRoleDefinition | undefined => roles.get(low(id)) ?? [...roles.values()].find((r) => r.roleType === 'BuiltInRole' && low(id).endsWith(`/${low(r.name)}`));
  const visibleAt = (scope: string): AzureRoleDefinition[] => [...roles.values()].filter((r) => r.assignableScopes.some((s) => within(scope, s)));

  const client: AzureRbacClient = {
    async listRoleDefinitions(scope, customOnly) { return copy(visibleAt(scope).filter((r) => !customOnly || r.roleType === 'CustomRole')); },
    async getRoleDefinition(id) { const r = lookup(id); if (!r) throw err(404, 'RoleDefinitionDoesNotExist'); return copy(r); },
    async createOrUpdateRoleDefinition(scope, guid, payload: AzureRolePayload) {
      const id = `${scope}/providers/Microsoft.Authorization/roleDefinitions/${guid}`;
      if (lookup(id)?.roleType === 'BuiltInRole') throw err(400, 'BuiltInRoleNotModifiable');
      if (!payload.assignableScopes.some((s) => within(scope, s))) throw err(400, 'InvalidAssignableScopes');
      if ([...roles.values()].some((r) => low(r.roleName) === low(payload.roleName) && low(r.id) !== low(id))) throw err(409, 'RoleDefinitionWithSameNameExists');
      const role: AzureRoleDefinition = { ...copy(payload), id, name: guid, roleType: 'CustomRole' };
      roles.set(low(id), role);
      calls.push(`putRole:${guid}`);
      return copy(role);
    },
    async deleteRoleDefinition(scope, guid) {
      const id = `${scope}/providers/Microsoft.Authorization/roleDefinitions/${guid}`;
      const role = lookup(id);
      if (!role) throw err(404, 'RoleDefinitionDoesNotExist');
      if (role.roleType === 'BuiltInRole') throw err(400, 'BuiltInRoleNotModifiable');
      if ([...assignments.values()].some((a) => low(a.roleDefinitionId) === low(role.id))) throw err(409, 'RoleDefinitionHasAssignments');
      roles.delete(low(id));
      calls.push(`deleteRole:${guid}`);
    },
    async listRoleAssignments(scope, principalId) {
      const hits = [...assignments.values()].filter((a) => (principalId ? low(a.principalId) === low(principalId) && (within(a.scope, scope) || above(scope, a.scope)) : within(a.scope, scope)));
      return copy(hits);
    },
    async createRoleAssignment(scope, name, input) {
      const role = lookup(input.roleDefinitionId);
      if (!role) throw err(400, 'RoleDefinitionDoesNotExist');
      if (!role.assignableScopes.some((s) => within(scope, s))) throw err(400, 'RoleDefinitionNotAssignableAtScope');
      const id = `${scope}/providers/Microsoft.Authorization/roleAssignments/${name}`;
      const same = (a: AzureRoleAssignment): boolean => low(a.scope) === low(scope) && low(a.principalId) === low(input.principalId) && low(a.roleDefinitionId) === low(role.id);
      const byName = assignments.get(low(id));
      if (byName) { if (same(byName)) return copy(byName); throw err(409, 'RoleAssignmentUpdateNotPermitted'); }
      if ([...assignments.values()].some(same)) throw err(409, 'RoleAssignmentExists');
      const made: AzureRoleAssignment = { id, name, scope, principalId: input.principalId, roleDefinitionId: role.id, ...(input.principalType ? { principalType: input.principalType } : {}) };
      assignments.set(low(id), made);
      calls.push(`assign:${name}`);
      return copy(made);
    },
    async deleteRoleAssignment(scope, name) {
      const id = `${scope}/providers/Microsoft.Authorization/roleAssignments/${name}`;
      if (!assignments.delete(low(id))) throw err(404, 'RoleAssignmentNotFound');
      calls.push(`unassign:${name}`);
    },
    async listDenyAssignments(scope) { return copy(denies.filter((d) => above(scope, d.scope))); },
  };

  /** Test hooks that seed state the adapter itself is not allowed to create. */
  const seed = {
    assign(scope: string, principalId: string, principalType: AzurePrincipalType, roleDefinitionId: string, name = `seed-${assignments.size}`): void {
      const id = `${scope}/providers/Microsoft.Authorization/roleAssignments/${name}`;
      assignments.set(low(id), { id, name, scope, principalId, principalType, roleDefinitionId });
    },
    deny(entry: AzureDenyAssignment): void { denies.push(entry); },
  };
  return { client, seed, calls, roles, assignments };
}
