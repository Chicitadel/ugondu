/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — GCP IAM Discovery
 * File           : GcpIamDiscovery.ts
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
import { GRPC, GcpApiError } from './GcpIamClient';
import type { GcpIamClient, GcpPolicy, GcpRole } from './GcpIamClient';
import { chainOf, digestOfDocument, projectOf, roleParentOfName } from './GcpIamHelpers';
import type { GcpRoleDocument } from './GcpIamHelpers';

const GROUP_LIKE = /^(group|domain|principalSet):/;

/** The adapter's native policy for an existing custom role; the role is granted on the resource that defines it. */
export function nativePolicyOf(role: GcpRole): ProviderNativePolicy {
  const document: GcpRoleDocument = {
    role: { name: role.name, title: role.title, description: role.description, stage: role.stage, includedPermissions: role.includedPermissions },
    resource: roleParentOfName(role.name),
  };
  return { providerId: role.name, providerType: 'GCP_IAM', nativeDocument: document, digest: digestOfDocument(document) };
}

/** Allow policies on the environment's project and every ancestor, keyed by resource. */
async function policiesOf(client: GcpIamClient, context: AdapterContext): Promise<{ chain: string[]; policies: Map<string, GcpPolicy> }> {
  const chain = await chainOf(client, projectOf(context));
  const policies = new Map<string, GcpPolicy>();
  for (const resource of chain) policies.set(resource, await client.getPolicy(resource));
  return { chain, policies };
}

const allMembers = (policies: Map<string, GcpPolicy>): string[] => [...new Set([...policies.values()].flatMap((p) => p.bindings.flatMap((b) => b.members)))];

/** Custom roles defined on the environment's project and its organization (folders cannot define roles). */
export async function discoverPolicies(client: GcpIamClient, context: AdapterContext): Promise<ProviderNativePolicy[]> {
  const chain = await chainOf(client, projectOf(context));
  const out: ProviderNativePolicy[] = [];
  for (const parent of chain.filter((r) => !r.startsWith('folders/'))) for (const role of await client.listRoles(parent)) out.push(nativePolicyOf(role));
  return out;
}

/** member → roles, merged across the project and its ancestors. */
export async function discoverAssignments(client: GcpIamClient, context: AdapterContext): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const policy of (await policiesOf(client, context)).policies.values()) {
    for (const b of policy.bindings) {
      for (const member of b.members) {
        const roles = out[member] ?? [];
        if (!roles.includes(b.role)) roles.push(b.role);
        out[member] = roles;
      }
    }
  }
  return out;
}

/** Individual principals that appear in the hierarchy's bindings; the account part doubles as the display name. */
export async function discoverIdentities(client: GcpIamClient, context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> {
  return allMembers((await policiesOf(client, context)).policies).filter((m) => !GROUP_LIKE.test(m)).map((id) => {
    const [kind = 'principal'] = id.split(':');
    return { id, type: kind.toUpperCase(), displayName: id.includes('://') ? id : id.slice(id.indexOf(':') + 1) };
  });
}

/** Groups, domains and principal sets named in bindings; their membership is held by the directory and is not reported. */
export async function discoverGroups(client: GcpIamClient, context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> {
  return allMembers((await policiesOf(client, context)).policies).filter((m) => GROUP_LIKE.test(m))
    .map((id) => ({ id, displayName: id.includes('://') ? id : id.slice(id.indexOf(':') + 1), members: [] }));
}

/** Roles granted anywhere in the hierarchy, plus the custom roles defined there. */
export async function discoverRoles(client: GcpIamClient, context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> {
  const { chain, policies } = await policiesOf(client, context);
  const names = new Set<string>([...policies.values()].flatMap((p) => p.bindings.map((b) => b.role)));
  for (const parent of chain.filter((r) => !r.startsWith('folders/'))) for (const role of await client.listRoles(parent)) names.add(role.name);
  const out: Array<{ id: string; displayName: string; policies: string[] }> = [];
  for (const name of [...names].sort()) {
    try {
      const role = await client.getRole(name);
      if (!role.deleted) out.push({ id: name, displayName: role.title || name, policies: [name] });
    } catch (e) {
      if (!(e instanceof GcpApiError) || e.code !== GRPC.NOT_FOUND) throw e; // a binding to a deleted role is skipped
    }
  }
  return out;
}
