/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — GCP IAM Client Boundary
 * File           : GcpIamClient.ts
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

export interface GcpCondition { title: string; description?: string; expression: string }
export interface GcpBinding { role: string; members: string[]; condition?: GcpCondition }
/** `etag` is the base64 form of the opaque service value; it is echoed back unchanged to detect concurrent edits. */
export interface GcpPolicy { version: number; etag?: string; bindings: GcpBinding[] }

export interface GcpRoleSpec { title: string; description: string; stage: string; includedPermissions: string[] }
export interface GcpRole extends GcpRoleSpec { name: string; etag?: string; deleted: boolean }

export type GcpAccess = 'GRANTED' | 'NOT_GRANTED' | 'UNKNOWN_CONDITIONAL' | 'UNKNOWN_INFO_DENIED' | 'UNKNOWN';

/** gRPC status codes the adapter reacts to. */
export const GRPC = { NOT_FOUND: 5, ALREADY_EXISTS: 6, FAILED_PRECONDITION: 9, ABORTED: 10 } as const;

/** Failure raised by the client; `code` is the gRPC status code of the failed call. */
export class GcpApiError extends Error {
  constructor(message: string, readonly code?: number) {
    super(message);
    this.name = 'GcpApiError';
  }
}

/** Minimal Google Cloud surface used by the adapter; implemented by the SDK clients and by test doubles. */
export interface GcpIamClient {
  /** Allow policy of a project, folder or organization (conditions included, policy version 3). */
  getPolicy(resource: string): Promise<GcpPolicy>;
  /** Writes the policy; fails with ABORTED when the etag is stale. */
  setPolicy(resource: string, policy: GcpPolicy): Promise<GcpPolicy>;
  /** `folders/<id>` or `organizations/<id>` that contains the resource; undefined for an organization. */
  getParent(resource: string): Promise<string | undefined>;
  /** Custom roles defined directly under a project or organization (soft-deleted roles are not listed). */
  listRoles(parent: string): Promise<GcpRole[]>;
  /** A predefined (`roles/...`) or custom role; soft-deleted custom roles are returned with `deleted` set. */
  getRole(name: string): Promise<GcpRole>;
  createRole(parent: string, roleId: string, spec: GcpRoleSpec): Promise<GcpRole>;
  updateRole(name: string, spec: GcpRoleSpec, etag?: string): Promise<GcpRole>;
  deleteRole(name: string, etag?: string): Promise<GcpRole>;
  undeleteRole(name: string, etag?: string): Promise<GcpRole>;
  /** Policy Troubleshooter verdict for one principal, resource and permission (allow, deny, conditions and groups included). */
  troubleshoot(principal: string, resource: string, permission: string): Promise<GcpAccess>;
}

const b64 = (bytes: unknown): string | undefined => (bytes ? Buffer.from(bytes as Uint8Array).toString('base64') : undefined);
const unb64 = (text: string | undefined): Buffer | undefined => (text ? Buffer.from(text, 'base64') : undefined);
const stageOf = (s: unknown): string => (typeof s === 'string' ? s : 'GA');

const toRole = (r: any): GcpRole => ({
  name: r.name, title: r.title ?? '', description: r.description ?? '', stage: stageOf(r.stage),
  includedPermissions: [...(r.includedPermissions ?? [])], deleted: r.deleted === true, ...(r.etag ? { etag: b64(r.etag) as string } : {}),
});
const toPolicy = (p: any): GcpPolicy => ({
  version: p?.version ?? 3, ...(p?.etag ? { etag: b64(p.etag) as string } : {}),
  bindings: (p?.bindings ?? []).map((b: any) => ({
    role: b.role, members: [...(b.members ?? [])],
    ...(b.condition?.expression ? { condition: { title: b.condition.title ?? '', description: b.condition.description ?? '', expression: b.condition.expression } } : {}),
  })),
});
const fromPolicy = (p: GcpPolicy): Record<string, unknown> => ({
  version: 3, etag: unb64(p.etag),
  bindings: p.bindings.map((b) => ({ role: b.role, members: b.members, ...(b.condition ? { condition: b.condition } : {}) })),
});

async function wrap<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err: any) {
    throw new GcpApiError(err?.message ?? String(err), typeof err?.code === 'number' ? err.code : undefined);
  }
}

/**
 * Builds the production client from @google-cloud/resource-manager, @google-cloud/iam and
 * @google-cloud/policytroubleshooter (loaded on demand, so the packages are only required when this adapter is used).
 * A service-account key is used only when clientEmail and privateKey are both supplied; otherwise Application Default
 * Credentials apply.
 */
export async function createSdkGcpIamClient(context: AdapterContext): Promise<GcpIamClient> {
  let rm: any;
  let iam: any;
  let checker: any;
  try {
    rm = await import('@google-cloud/resource-manager');
    iam = await import('@google-cloud/iam');
    checker = await import('@google-cloud/policytroubleshooter');
  } catch (err: any) {
    throw new Error(__t('uppie.adapter.gcp.sdk_unavailable', { error: err?.message ?? String(err) }));
  }
  const { clientEmail, privateKey } = context.credentials;
  const options = clientEmail && privateKey ? { credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, '\n') } } : {};
  const resourceClients: Record<string, any> = {
    projects: new rm.ProjectsClient(options), folders: new rm.FoldersClient(options), organizations: new rm.OrganizationsClient(options),
  };
  const roles = new iam.IAMClient(options);
  const troubleshooter = new checker.IamCheckerClient(options);
  const kind = (resource: string): any => resourceClients[resource.split('/')[0] as string];
  const spec = (s: GcpRoleSpec, etag?: string): Record<string, unknown> => ({ title: s.title, description: s.description, stage: s.stage, includedPermissions: s.includedPermissions, ...(etag ? { etag: unb64(etag) } : {}) });

  return {
    getPolicy: (resource) => wrap(async () => toPolicy((await kind(resource).getIamPolicy({ resource, options: { requestedPolicyVersion: 3 } }))[0])),
    setPolicy: (resource, policy) => wrap(async () => toPolicy((await kind(resource).setIamPolicy({ resource, policy: fromPolicy(policy) }))[0])),
    getParent: (resource) => wrap(async () => {
      if (resource.startsWith('organizations/')) return undefined;
      const [found] = resource.startsWith('folders/') ? await resourceClients.folders.getFolder({ name: resource }) : await resourceClients.projects.getProject({ name: resource });
      return (found.parent as string | undefined) || undefined;
    }),
    listRoles: (parent) => wrap(async () => {
      const out: GcpRole[] = [];
      for await (const r of roles.listRolesAsync({ parent, view: 'FULL', showDeleted: false })) out.push(toRole(r));
      return out;
    }),
    getRole: (name) => wrap(async () => toRole((await roles.getRole({ name }))[0])),
    createRole: (parent, roleId, s) => wrap(async () => toRole((await roles.createRole({ parent, roleId, role: spec(s) }))[0])),
    updateRole: (name, s, etag) => wrap(async () => toRole((await roles.updateRole({ name, role: spec(s, etag), updateMask: { paths: ['title', 'description', 'stage', 'included_permissions'] } }))[0])),
    deleteRole: (name, etag) => wrap(async () => toRole((await roles.deleteRole({ name, etag: unb64(etag) }))[0])),
    undeleteRole: (name, etag) => wrap(async () => toRole((await roles.undeleteRole({ name, etag: unb64(etag) }))[0])),
    troubleshoot: (principal, resource, permission) => wrap(async () => {
      const [res] = await troubleshooter.troubleshootIamPolicy({ accessTuple: { principal, fullResourceName: `//cloudresourcemanager.googleapis.com/${resource}`, permission } });
      return (typeof res.access === 'string' ? res.access : 'UNKNOWN') as GcpAccess;
    }),
  };
}
