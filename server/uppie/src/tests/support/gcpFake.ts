/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - GCP IAM Test Support
 * File           : gcpFake.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { GRPC, GcpApiError } from '../../adapters/gcp-iam/GcpIamClient';
import type { GcpAccess, GcpBinding, GcpCondition, GcpIamClient, GcpPolicy, GcpRole, GcpRoleSpec } from '../../adapters/gcp-iam/GcpIamClient';

export const ORG = 'organizations/9';
export const FOLDER = 'folders/100';
export const PROJECT = 'projects/app-prod';
export const OTHER = 'projects/other';
export const USER = 'user:alice@example.com';
export const BOB = 'user:bob@example.com';
export const SA = 'serviceAccount:ci@app-prod.iam.gserviceaccount.com';
export const GROUP = 'group:devs@example.com';
export const VIEWER = 'roles/viewer';
export const ctx: any = { tenantId: 't', environmentId: 'app-prod', provider: 'GCP_IAM', credentials: {} };

export function rule(over: Record<string, any> = {}): any {
  return {
    ruleId: 'rule-1', version: '1.0.0', effect: 'ALLOW', conditions: [], scope: {}, purpose: 'test', owner: 'o',
    constraints: {}, validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: 'PERMANENT', type: 'PERMANENT' },
    subject: { type: 'USER', id: USER },
    action: { capability: 'Storage.Read', operations: ['storage.objects.get', 'storage.objects.list'] },
    resource: { type: 'gcp::project', scope: PROJECT },
    ...over,
  };
}

const INVALID_ARGUMENT = 3;
const RESOURCE_EXHAUSTED = 8;
const err = (code: number, message: string): GcpApiError => new GcpApiError(message, code);
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const emailOf = (member: string): string => (member.includes('://') ? member : member.slice(member.indexOf(':') + 1)).toLowerCase();

/**
 * In-memory Google Cloud IAM enforcing the rules the adapter must respect: policies are written with the etag they were
 * read with (ABORTED otherwise), bindings need an existing, live role that is defined on the resource or an ancestor,
 * custom roles are per project/organization with a quota, deleted roles keep their id until purged, and predefined roles
 * are immutable. The troubleshooter decides from the bindings of the hierarchy, group membership and seeded denies.
 */
export function fakeGcp(options: { roleLimit?: number } = {}) {
  const parents = new Map<string, string | undefined>([[PROJECT, FOLDER], [FOLDER, ORG], [OTHER, ORG], [ORG, undefined]]);
  const policies = new Map<string, GcpPolicy>();
  const roles = new Map<string, GcpRole>();
  const members = new Map<string, string[]>();
  const denied = new Set<string>();
  const calls: string[] = [];
  let abortNext = 0;
  let counter = 0;
  const bump = (etag?: string): string => String(Number(etag ?? '0') + 1);
  const known = (resource: string): void => { if (!parents.has(resource)) throw err(GRPC.NOT_FOUND, `unknown ${resource}`); };
  const chain = (resource: string): string[] => { const out = [resource]; for (let p = parents.get(resource); p; p = parents.get(p)) out.push(p); return out; };
  const policyOf = (resource: string): GcpPolicy => { known(resource); if (!policies.has(resource)) policies.set(resource, { version: 3, etag: '0', bindings: [] }); return policies.get(resource) as GcpPolicy; };

  roles.set(VIEWER, { name: VIEWER, title: 'Viewer', description: 'Read access', stage: 'GA', includedPermissions: ['resourcemanager.projects.get', 'storage.objects.get'], deleted: false });
  roles.set('roles/storage.objectAdmin', { name: 'roles/storage.objectAdmin', title: 'Storage Object Admin', description: 'Full object control', stage: 'GA', includedPermissions: ['storage.objects.get', 'storage.objects.list', 'storage.objects.delete'], deleted: false });
  const live = (name: string): GcpRole | undefined => { const r = roles.get(name); return r && !r.deleted ? r : undefined; };
  const parentOfRole = (name: string): string => name.slice(0, name.indexOf('/roles/'));
  const checkBinding = (resource: string, role: string): void => {
    if (!live(role)) throw err(INVALID_ARGUMENT, `role ${role} does not exist`);
    if (/^(projects|organizations)\//.test(role) && !chain(resource).includes(parentOfRole(role))) throw err(INVALID_ARGUMENT, `role ${role} is not defined for ${resource}`);
  };
  const customOf = (name: string): GcpRole => {
    const r = roles.get(name);
    if (!r) throw err(GRPC.NOT_FOUND, `no role ${name}`);
    if (!/^(projects|organizations)\//.test(name)) throw err(INVALID_ARGUMENT, 'predefined roles are immutable');
    return r;
  };
  const checkEtag = (role: GcpRole, etag?: string): void => { if (etag !== undefined && etag !== role.etag) throw err(GRPC.ABORTED, 'stale role etag'); };

  const client: GcpIamClient = {
    async getPolicy(resource) { return copy(policyOf(resource)); },
    async setPolicy(resource, policy) {
      const current = policyOf(resource);
      calls.push(`setPolicy:${resource}`);
      if (abortNext > 0) { abortNext--; current.etag = bump(current.etag); throw err(GRPC.ABORTED, 'concurrent edit'); }
      if (policy.etag !== current.etag) throw err(GRPC.ABORTED, 'stale policy etag');
      if (policy.version !== 3 && policy.bindings.some((b) => b.condition)) throw err(GRPC.FAILED_PRECONDITION, 'conditions need policy version 3');
      if (policy.bindings.reduce((n, b) => n + b.members.length, 0) > 1500) throw err(RESOURCE_EXHAUSTED, 'too many principals');
      for (const b of policy.bindings) checkBinding(resource, b.role);
      const saved: GcpPolicy = { version: 3, etag: bump(current.etag), bindings: copy(policy.bindings) };
      policies.set(resource, saved);
      return copy(saved);
    },
    async getParent(resource) { known(resource); return parents.get(resource); },
    async listRoles(parent) { known(parent); return copy([...roles.values()].filter((r) => !r.deleted && r.name.startsWith(`${parent}/roles/`))); },
    async getRole(name) { const r = roles.get(name); if (!r) throw err(GRPC.NOT_FOUND, `no role ${name}`); return copy(r); },
    async createRole(parent, roleId, spec: GcpRoleSpec) {
      known(parent);
      if (!/^(projects|organizations)\//.test(parent)) throw err(INVALID_ARGUMENT, 'roles live in projects and organizations');
      if (!/^[a-zA-Z0-9_.]{3,64}$/.test(roleId)) throw err(INVALID_ARGUMENT, 'bad role id');
      if (spec.includedPermissions.length > 3000) throw err(INVALID_ARGUMENT, 'too many permissions');
      const name = `${parent}/roles/${roleId}`;
      if (roles.has(name)) throw err(GRPC.ALREADY_EXISTS, `role ${name} exists`);
      if ([...roles.values()].filter((r) => !r.deleted && r.name.startsWith(`${parent}/roles/`)).length >= (options.roleLimit ?? 300)) throw err(RESOURCE_EXHAUSTED, 'role quota');
      const role: GcpRole = { ...copy(spec), name, deleted: false, etag: `r${++counter}` };
      roles.set(name, role);
      calls.push(`createRole:${name}`);
      return copy(role);
    },
    async updateRole(name, spec, etag) {
      const role = customOf(name);
      if (role.deleted) throw err(GRPC.FAILED_PRECONDITION, 'role is deleted');
      checkEtag(role, etag);
      Object.assign(role, copy(spec), { etag: `r${++counter}` });
      calls.push(`updateRole:${name}`);
      return copy(role);
    },
    async deleteRole(name, etag) {
      const role = customOf(name);
      checkEtag(role, etag);
      role.deleted = true;
      role.etag = `r${++counter}`;
      calls.push(`deleteRole:${name}`);
      return copy(role);
    },
    async undeleteRole(name, etag) {
      const role = customOf(name);
      if (!role.deleted) throw err(GRPC.FAILED_PRECONDITION, 'role is not deleted');
      checkEtag(role, etag);
      role.deleted = false;
      role.etag = `r${++counter}`;
      calls.push(`undeleteRole:${name}`);
      return copy(role);
    },
    async troubleshoot(principal, resource, permission): Promise<GcpAccess> {
      known(resource);
      if (denied.has(`${principal.toLowerCase()}|${permission}`)) return 'NOT_GRANTED';
      let conditional = false;
      for (const scope of chain(resource)) {
        for (const b of policyOf(scope).bindings) {
          const holds = b.members.some((m) => emailOf(m) === principal.toLowerCase() || (members.get(m) ?? []).some((e) => e === principal.toLowerCase()));
          if (!holds || !live(b.role)?.includedPermissions.includes(permission)) continue;
          if (!b.condition) return 'GRANTED';
          conditional = true;
        }
      }
      return conditional ? 'UNKNOWN_CONDITIONAL' : 'NOT_GRANTED';
    },
  };

  /** Test hooks that seed state the adapter itself does not create. */
  const seed = {
    bind(resource: string, role: string, who: string[], condition?: GcpCondition): void {
      checkBinding(resource, role);
      const policy = policyOf(resource);
      const binding: GcpBinding = { role, members: [...who], ...(condition ? { condition } : {}) };
      policy.bindings.push(binding);
      policy.etag = bump(policy.etag);
    },
    role(name: string, includedPermissions: string[], over: Partial<GcpRole> = {}): void {
      roles.set(name, { name, title: 'Seeded', description: 'Seeded role', stage: 'GA', includedPermissions, deleted: false, etag: `r${++counter}`, ...over });
    },
    purge(name: string): void { roles.delete(name); },
    abortNext(times: number): void { abortNext = times; },
    group(member: string, emails: string[]): void { members.set(member, emails.map((e) => e.toLowerCase())); },
    deny(email: string, permission: string): void { denied.add(`${email.toLowerCase()}|${permission}`); },
  };
  return { client, seed, calls, roles, policies, policyOf };
}
