/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Discovery
 * File           : AwsIamDiscovery.ts
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

import type { ProviderNativePolicy } from '../IPolicyProviderAdapter';
import type { AwsIamClient, AwsPrincipalKind, AwsPolicyDetail } from './AwsIamClient';
import { digestOfDocument } from './AwsIamPolicyHelpers';

const KINDS: AwsPrincipalKind[] = ['role', 'user', 'group'];

/** Wraps a managed policy as a provider-native policy: providerId is the ARN, the document is the default version. */
export function toNativePolicy(detail: AwsPolicyDetail): ProviderNativePolicy {
  return { providerId: detail.arn, providerType: 'AWS_IAM', nativeDocument: detail.document, digest: digestOfDocument(detail.document) };
}

/** Customer-managed policies with their default-version documents. */
export async function discoverPolicies(client: AwsIamClient): Promise<ProviderNativePolicy[]> {
  const summaries = await client.listLocalPolicies();
  return Promise.all(summaries.map(async (s) => toNativePolicy(await client.getPolicy(s.arn))));
}

/** Principal ARN → attached managed-policy ARNs, across roles, users and groups. */
export async function discoverAssignments(client: AwsIamClient): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const kind of KINDS) {
    for (const p of await client.listPrincipals(kind)) out[p.arn ?? `${kind}/${p.name}`] = await client.listAttachedPolicies(kind, p.name);
  }
  return out;
}

export async function discoverIdentities(client: AwsIamClient): Promise<Array<{ id: string; type: string; displayName: string }>> {
  const out: Array<{ id: string; type: string; displayName: string }> = [];
  for (const kind of ['user', 'role'] as const) {
    for (const p of await client.listPrincipals(kind)) out.push({ id: p.arn ?? `${kind}/${p.name}`, type: kind.toUpperCase(), displayName: p.name });
  }
  return out;
}

export async function discoverGroups(client: AwsIamClient): Promise<Array<{ id: string; displayName: string; members: string[] }>> {
  const groups = await client.listPrincipals('group');
  return Promise.all(groups.map(async (g) => ({
    id: g.arn ?? `group/${g.name}`,
    displayName: g.name,
    members: (await client.listGroupMembers(g.name)).map((m) => m.arn ?? `user/${m.name}`),
  })));
}

/** IAM roles with the managed policies attached to each. */
export async function discoverRoles(client: AwsIamClient): Promise<Array<{ id: string; displayName: string; policies: string[] }>> {
  const roles = await client.listPrincipals('role');
  return Promise.all(roles.map(async (r) => ({ id: r.arn ?? `role/${r.name}`, displayName: r.name, policies: await client.listAttachedPolicies('role', r.name) })));
}
