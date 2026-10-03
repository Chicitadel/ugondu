/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Azure RBAC Client Boundary
 * File           : AzureRbacClient.ts
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
import type { AdapterContext } from '../IPolicyProviderAdapter';

export interface AzurePermission {
  actions:        string[];
  notActions:     string[];
  dataActions:    string[];
  notDataActions: string[];
}

/** Role definition body as accepted by Azure (no identifiers). */
export interface AzureRolePayload {
  roleName:        string;
  description:     string;
  permissions:     AzurePermission[];
  assignableScopes: string[];
}

export interface AzureRoleDefinition extends AzureRolePayload {
  /** Full resource id: `<scope>/providers/Microsoft.Authorization/roleDefinitions/<guid>`. */
  id:       string;
  /** The role definition GUID. */
  name:     string;
  roleType: 'CustomRole' | 'BuiltInRole';
}

export type AzurePrincipalType = 'User' | 'Group' | 'ServicePrincipal' | 'ForeignGroup' | 'Device';

export interface AzureRoleAssignment {
  id:               string;
  name:             string;
  scope:            string;
  principalId:      string;
  principalType?:   AzurePrincipalType;
  roleDefinitionId: string;
}

export interface AzureDenyAssignment {
  id:                string;
  scope:             string;
  name:              string;
  permissions:       AzurePermission[];
  principalIds:      string[];
  excludePrincipalIds: string[];
}

/** Failure raised by the client; `code` is the ARM error code (e.g. RoleAssignmentExists), `statusCode` the HTTP status. */
export class AzureApiError extends Error {
  constructor(message: string, readonly code?: string, readonly statusCode?: number) {
    super(message);
    this.name = 'AzureApiError';
  }
}

/** Minimal Azure authorization surface used by the adapter; implemented by the SDK client and by test doubles. */
export interface AzureRbacClient {
  listRoleDefinitions(scope: string, customOnly: boolean): Promise<AzureRoleDefinition[]>;
  getRoleDefinition(roleDefinitionId: string): Promise<AzureRoleDefinition>;
  createOrUpdateRoleDefinition(scope: string, roleGuid: string, payload: AzureRolePayload): Promise<AzureRoleDefinition>;
  deleteRoleDefinition(scope: string, roleGuid: string): Promise<void>;
  /** Assignments at or below `scope`; when `principalId` is given, also those above it. */
  listRoleAssignments(scope: string, principalId?: string): Promise<AzureRoleAssignment[]>;
  createRoleAssignment(scope: string, name: string, input: { principalId: string; principalType?: AzurePrincipalType; roleDefinitionId: string }): Promise<AzureRoleAssignment>;
  deleteRoleAssignment(scope: string, name: string): Promise<void>;
  /** Read-only: deny assignments are system-generated and are never created by this adapter. */
  listDenyAssignments(scope: string): Promise<AzureDenyAssignment[]>;
}

const permissionOf = (p: any): AzurePermission => ({
  actions: p?.actions ?? [], notActions: p?.notActions ?? [], dataActions: p?.dataActions ?? [], notDataActions: p?.notDataActions ?? [],
});

const toRole = (r: any): AzureRoleDefinition => ({
  id: r.id, name: r.name, roleName: r.roleName ?? '', description: r.description ?? '',
  roleType: r.roleType === 'CustomRole' ? 'CustomRole' : 'BuiltInRole',
  permissions: (r.permissions ?? []).map(permissionOf), assignableScopes: r.assignableScopes ?? [],
});

const toAssignment = (a: any): AzureRoleAssignment => ({
  id: a.id, name: a.name, scope: a.scope ?? '', principalId: a.principalId, roleDefinitionId: a.roleDefinitionId,
  ...(a.principalType ? { principalType: a.principalType } : {}),
});

const toDeny = (d: any): AzureDenyAssignment => ({
  id: d.id, scope: d.scope ?? '', name: d.denyAssignmentName ?? d.name ?? '', permissions: (d.permissions ?? []).map(permissionOf),
  principalIds: (d.principals ?? []).map((p: any) => p.id), excludePrincipalIds: (d.excludePrincipals ?? []).map((p: any) => p.id),
});

async function wrap<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err: any) {
    throw new AzureApiError(err?.message ?? String(err), err?.code ?? err?.details?.error?.code, err?.statusCode);
  }
}

async function collect<T>(iterable: AsyncIterable<any>, map: (x: any) => T): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(map(item));
  return out;
}

/** Subscription id from a bare GUID or a `/subscriptions/<id>` path. */
export function subscriptionIdOf(environmentId: string): string {
  const m = /^\/subscriptions\/([^/]+)/i.exec(environmentId);
  return m ? (m[1] as string) : environmentId;
}

/**
 * Builds the production client from @azure/arm-authorization (loaded on demand, so the packages are only required when
 * this adapter is used). A service-principal credential is used only when tenantId, clientId and clientSecret are all
 * supplied; otherwise the Azure default credential chain (environment, workload identity, managed identity, CLI) applies.
 */
export async function createSdkAzureRbacClient(context: AdapterContext): Promise<AzureRbacClient> {
  let arm: any;
  let identity: any;
  try {
    arm = await import('@azure/arm-authorization');
    identity = await import('@azure/identity');
  } catch (err: any) {
    throw new Error(__t('uppie.adapter.azure.sdk_unavailable', { error: err?.message ?? String(err) }));
  }
  const { tenantId, clientId, clientSecret } = context.credentials;
  const credential = tenantId && clientId && clientSecret
    ? new identity.ClientSecretCredential(tenantId, clientId, clientSecret)
    : new identity.DefaultAzureCredential();
  const sdk = new arm.AuthorizationManagementClient(credential, subscriptionIdOf(context.environmentId));

  return {
    listRoleDefinitions: (scope, customOnly) => wrap(() => collect(
      sdk.roleDefinitions.list(scope, customOnly ? { filter: "type eq 'CustomRole'" } : undefined), toRole)),
    getRoleDefinition: (id) => wrap(async () => toRole(await sdk.roleDefinitions.getById(id))),
    createOrUpdateRoleDefinition: (scope, guid, payload) => wrap(async () => toRole(await sdk.roleDefinitions.createOrUpdate(scope, guid, { ...payload, roleType: 'CustomRole' }))),
    deleteRoleDefinition: (scope, guid) => wrap(async () => { await sdk.roleDefinitions.delete(scope, guid); }),
    listRoleAssignments: (scope, principalId) => wrap(() => collect(
      sdk.roleAssignments.listForScope(scope, principalId ? { filter: `principalId eq '${principalId}'` } : undefined), toAssignment)),
    createRoleAssignment: (scope, name, input) => wrap(async () => toAssignment(await sdk.roleAssignments.create(scope, name, input))),
    deleteRoleAssignment: (scope, name) => wrap(async () => { await sdk.roleAssignments.delete(scope, name); }),
    listDenyAssignments: (scope) => wrap(() => collect(sdk.denyAssignments.listForScope(scope), toDeny)),
  };
}
