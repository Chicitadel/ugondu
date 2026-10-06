/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - AWS IAM Test Support
 * File           : awsFakeIam.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AwsApiError } from '../../adapters/aws-iam/AwsIamClient';
import type {
  AwsIamClient, AwsPolicyDocument, AwsEntityRef, AwsPrincipalKind, AwsSimDecision, AwsStatement,
} from '../../adapters/aws-iam/AwsIamClient';

export const ACCOUNT = '123456789012';
export const ARN = {
  role: (n: string): string => `arn:aws:iam::${ACCOUNT}:role/${n}`,
  user: (n: string): string => `arn:aws:iam::${ACCOUNT}:user/${n}`,
  group: (n: string): string => `arn:aws:iam::${ACCOUNT}:group/${n}`,
  policy: (n: string, path = '/'): string => `arn:aws:iam::${ACCOUNT}:policy${path}${n}`,
  managed: (n: string): string => `arn:aws:iam::aws:policy/${n}`,
};
export const ctx: any = { tenantId: 't', environmentId: 'prod', provider: 'AWS_IAM', region: 'eu-west-1', credentials: {} };

export function rule(over: Record<string, any> = {}): any {
  return {
    ruleId: 'rule-1', version: '1.0.0', effect: 'ALLOW', conditions: [], scope: {}, purpose: 'test', owner: 'o',
    constraints: {}, validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: 'PERMANENT', type: 'PERMANENT' },
    subject: { type: 'ROLE', id: ARN.role('app') },
    action: { capability: 'Storage.Read', operations: ['s3:GetObject'] },
    resource: { type: 'aws::s3::Object', scope: 'arn:aws:s3:::bkt/*' },
    ...over,
  };
}

const matches = (pattern: string, value: string): boolean =>
  new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i').test(value);

function decide(docs: AwsPolicyDocument[], action: string, resource: string): AwsSimDecision['decision'] {
  const hits = docs.flatMap((d) => d.Statement).filter((s: AwsStatement) => s.Action.some((a) => matches(a, action)) && s.Resource.some((r) => r === '*' || matches(r, resource) || matches(resource, r)));
  if (hits.some((s) => s.Effect === 'Deny')) return 'explicitDeny';
  return hits.some((s) => s.Effect === 'Allow') ? 'allowed' : 'implicitDeny';
}

/** In-memory IAM that enforces the constraints the adapter must respect: 5 versions, delete conflicts, explicit Deny wins. */
export function fakeIam() {
  const policies = new Map<string, { name: string; path: string; description?: string; versions: Array<{ id: string; document: AwsPolicyDocument; isDefault: boolean; createDate: Date }>; counter: number }>();
  const attachments = new Map<string, Set<string>>(); // policy ARN -> "kind/name"
  const principals: AwsEntityRef[] = [];
  const groupMembers = new Map<string, string[]>();
  const usage = new Map<string, Array<{ service: string; lastAuthenticated?: Date }>>();
  const calls: string[] = [];
  const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v), (_k, val) => val);
  const need = (arn: string) => { const p = policies.get(arn); if (!p) throw new AwsApiError(__t('no_such_entity'), 'NoSuchEntity', 404); return p; };
  const keyOf = (kind: AwsPrincipalKind, name: string): string => `${kind}/${name}`;
  const docsFor = (key: string): AwsPolicyDocument[] => [...attachments].filter(([, set]) => set.has(key)).map(([arn]) => need(arn).versions.find((v) => v.isDefault)!.document);
  const summary = (arn: string) => { const p = need(arn); return { arn, name: p.name, path: p.path, defaultVersionId: p.versions.find((v) => v.isDefault)?.id, attachmentCount: attachments.get(arn)?.size ?? 0 }; };

  const client: AwsIamClient = {
    async listLocalPolicies() { return [...policies.keys()].filter((a) => !a.includes('::aws:')).map(summary); },
    async getPolicy(arn) { const p = need(arn); return { ...summary(arn), description: p.description, document: copy(p.versions.find((v) => v.isDefault)!.document) }; },
    async createPolicy({ name, path = '/', description, document }) {
      const arn = ARN.policy(name, path);
      if (policies.has(arn)) throw new AwsApiError(__t('already_exists'), 'EntityAlreadyExists', 409);
      policies.set(arn, { name, path, description, versions: [{ id: 'v1', document: copy(document), isDefault: true, createDate: new Date(1_700_000_000_000) }], counter: 1 });
      calls.push(`createPolicy:${name}`);
      return arn;
    },
    async listPolicyVersions(arn) { return need(arn).versions.map((v) => ({ versionId: v.id, isDefault: v.isDefault, createDate: v.createDate })); },
    async createPolicyVersion(arn, document) {
      const p = need(arn);
      if (p.versions.length >= 5) throw new AwsApiError(__t('version_limit'), 'LimitExceeded', 409);
      p.counter++;
      p.versions.forEach((v) => { v.isDefault = false; });
      p.versions.push({ id: `v${p.counter}`, document: copy(document), isDefault: true, createDate: new Date(1_700_000_000_000 + p.counter * 1000) });
      return `v${p.counter}`;
    },
    async deletePolicyVersion(arn, id) {
      const p = need(arn);
      if (p.versions.find((v) => v.id === id)?.isDefault) throw new AwsApiError(__t('default_version'), 'DeleteConflict', 409);
      p.versions = p.versions.filter((v) => v.id !== id);
    },
    async deletePolicy(arn) {
      const p = need(arn);
      if ((attachments.get(arn)?.size ?? 0) > 0 || p.versions.length > 1) throw new AwsApiError(__t('delete_conflict'), 'DeleteConflict', 409);
      policies.delete(arn);
    },
    async attachPolicy(kind, name, arn) { need(arn); (attachments.get(arn) ?? attachments.set(arn, new Set()).get(arn)!).add(keyOf(kind, name)); },
    async detachPolicy(kind, name, arn) { if (!attachments.get(arn)?.delete(keyOf(kind, name))) throw new AwsApiError(__t('not_attached'), 'NoSuchEntity', 404); },
    async listEntitiesForPolicy(arn) { return [...(attachments.get(arn) ?? [])].map((k) => ({ kind: k.split('/')[0] as AwsPrincipalKind, name: k.split('/')[1] })); },
    async listPrincipals(kind) { return principals.filter((p) => p.kind === kind); },
    async listAttachedPolicies(kind, name) { return [...attachments].filter(([, set]) => set.has(keyOf(kind, name))).map(([arn]) => arn); },
    async listGroupMembers(name) { return (groupMembers.get(name) ?? []).map((u) => ({ kind: 'user' as const, name: u, arn: ARN.user(u) })); },
    async simulatePrincipal(principalArn, actions, resources) {
      calls.push('simulatePrincipal');
      const docs = docsFor((principalArn.split(':').pop() as string));
      return actions.flatMap((action) => resources.map((resource) => ({ action, resource, decision: decide(docs, action, resource) })));
    },
    async simulateCustom(documents, actions, resources) {
      const docs = documents.map((d) => JSON.parse(d) as AwsPolicyDocument);
      return actions.flatMap((action) => resources.map((resource) => ({ action, resource, decision: decide(docs, action, resource) })));
    },
    async lastAccessed(arn) { return usage.get(arn) ?? []; },
  };

  const addPrincipal = (kind: AwsPrincipalKind, name: string): void => { principals.push({ kind, name, arn: ARN[kind](name) }); };
  const seedManaged = (name: string, document: AwsPolicyDocument): string => {
    const arn = ARN.managed(name);
    policies.set(arn, { name, path: '/', versions: [{ id: 'v1', document, isDefault: true, createDate: new Date(0) }], counter: 1 });
    return arn;
  };
  return { client, policies, attachments, usage, calls, addPrincipal, groupMembers, seedManaged };
}
