/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Client Boundary
 * File           : AwsIamClient.ts
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
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AdapterContext } from '../IPolicyProviderAdapter';

export type AwsPrincipalKind = 'role' | 'user' | 'group';

export type AwsCondition = Record<string, Record<string, string | string[]>>;

export interface AwsStatement {
  Sid?:       string;
  Effect:     'Allow' | 'Deny';
  Action:     string[];
  Resource:   string[];
  NotAction?:   string[];   // present only on statements read from AWS; never generated
  NotResource?: string[];   // present only on statements read from AWS; never generated
  Condition?: AwsCondition;
}

export interface AwsPolicyDocument { Version: string; Statement: AwsStatement[] }

export interface AwsPolicySummary { arn: string; name: string; path: string; defaultVersionId?: string; attachmentCount: number }
export interface AwsPolicyDetail extends AwsPolicySummary { description?: string; document: AwsPolicyDocument }
export interface AwsPolicyVersion { versionId: string; isDefault: boolean; createDate?: Date }
export interface AwsEntityRef { kind: AwsPrincipalKind; name: string; arn?: string }
export interface AwsSimDecision { action: string; resource: string; decision: 'allowed' | 'explicitDeny' | 'implicitDeny' }

/** Failure raised by the client; `code` is the AWS error name (e.g. EntityAlreadyExists, NoSuchEntity). */
export class AwsApiError extends Error {
  constructor(message: string, readonly code?: string, readonly statusCode?: number) {
    super(message);
    this.name = 'AwsApiError';
  }
}

/** Minimal IAM surface used by the adapter; implemented by the SDK client and by test doubles. */
export interface AwsIamClient {
  listLocalPolicies(): Promise<AwsPolicySummary[]>;
  getPolicy(arn: string): Promise<AwsPolicyDetail>;
  createPolicy(input: { name: string; path?: string; description?: string; document: AwsPolicyDocument }): Promise<string>;
  listPolicyVersions(arn: string): Promise<AwsPolicyVersion[]>;
  createPolicyVersion(arn: string, document: AwsPolicyDocument): Promise<string>;
  deletePolicyVersion(arn: string, versionId: string): Promise<void>;
  deletePolicy(arn: string): Promise<void>;
  attachPolicy(kind: AwsPrincipalKind, name: string, arn: string): Promise<void>;
  detachPolicy(kind: AwsPrincipalKind, name: string, arn: string): Promise<void>;
  listEntitiesForPolicy(arn: string): Promise<AwsEntityRef[]>;
  listPrincipals(kind: AwsPrincipalKind): Promise<AwsEntityRef[]>;
  listAttachedPolicies(kind: AwsPrincipalKind, name: string): Promise<string[]>;
  listGroupMembers(name: string): Promise<AwsEntityRef[]>;
  simulatePrincipal(principalArn: string, actions: string[], resources: string[]): Promise<AwsSimDecision[]>;
  simulateCustom(documents: string[], actions: string[], resources: string[]): Promise<AwsSimDecision[]>;
  lastAccessed(arn: string): Promise<Array<{ service: string; lastAuthenticated?: Date }>>;
}

const KIND_TITLE: Record<AwsPrincipalKind, string> = { role: 'Role', user: 'User', group: 'Group' };
const LAST_ACCESS_POLL_MS = 1000;
const LAST_ACCESS_MAX_POLLS = 30;

const asList = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? (v as string[]) : [v as string]);

/** Decodes a policy document (the API returns it URL-encoded) and normalizes scalar Action/Resource to lists. */
const toDocument = (raw: unknown): AwsPolicyDocument => {
  const doc = typeof raw === 'string' ? JSON.parse(decodeURIComponent(raw)) : (raw as any);
  const statements: any[] = Array.isArray(doc.Statement) ? doc.Statement : doc.Statement ? [doc.Statement] : [];
  return {
    Version: doc.Version,
    Statement: statements.map((s) => ({
      ...s,
      Action: asList(s.Action),
      Resource: asList(s.Resource),
      ...(s.NotAction !== undefined ? { NotAction: asList(s.NotAction) } : {}),
      ...(s.NotResource !== undefined ? { NotResource: asList(s.NotResource) } : {}),
    })),
  };
};

async function wrap<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (err: any) {
    throw new AwsApiError(err?.message ?? String(err), err?.name, err?.$metadata?.httpStatusCode);
  }
}

/**
 * Builds the production client from @aws-sdk/client-iam (loaded on demand, so the package is only required when
 * this adapter is used). Explicit credentials are used only when both key parts are supplied; otherwise the
 * SDK default provider chain (environment, shared config, instance/role credentials) applies.
 */
export async function createSdkAwsIamClient(context: AdapterContext): Promise<AwsIamClient> {
  let sdk: any;
  try {
    sdk = await import('@aws-sdk/client-iam');
  } catch (err: any) {
    throw new Error(__t('uppie.adapter.aws.sdk_unavailable', { error: err?.message ?? String(err) }));
  }
  const { accessKeyId, secretAccessKey, sessionToken } = context.credentials;
  const iam = new sdk.IAMClient({
    region: context.region ?? 'us-east-1',
    ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey, sessionToken } } : {}),
  });
  const send = (name: string, input: Record<string, unknown>): Promise<any> => wrap(() => iam.send(new sdk[`${name}Command`](input)));
  /** Follows Marker/IsTruncated pagination, concatenating the items selected from each page. */
  const pages = async <T>(name: string, input: Record<string, unknown>, pick: (page: any) => T[]): Promise<T[]> => {
    const out: T[] = [];
    let marker: string | undefined;
    do {
      const page = await send(name, { ...input, ...(marker ? { Marker: marker } : {}) });
      out.push(...pick(page));
      marker = page.IsTruncated ? page.Marker : undefined;
    } while (marker);
    return out;
  };
  const sim = (name: string, input: Record<string, unknown>): Promise<AwsSimDecision[]> =>
    pages(name, input, (p) => (p.EvaluationResults ?? []).map((r: any) => ({ action: r.EvalActionName, resource: r.EvalResourceName, decision: r.EvalDecision })));
  const summary = (p: any): AwsPolicySummary => ({ arn: p.Arn, name: p.PolicyName, path: p.Path ?? '/', defaultVersionId: p.DefaultVersionId, attachmentCount: p.AttachmentCount ?? 0 });

  return {
    listLocalPolicies: async () => (await pages('ListPolicies', { Scope: 'Local' }, (p) => p.Policies ?? [])).map(summary),
    getPolicy: async (arn) => {
      const { Policy } = await send('GetPolicy', { PolicyArn: arn });
      const { PolicyVersion } = await send('GetPolicyVersion', { PolicyArn: arn, VersionId: Policy.DefaultVersionId });
      return { ...summary(Policy), description: Policy.Description, document: toDocument(PolicyVersion.Document) };
    },
    createPolicy: async ({ name, path, description, document }) =>
      (await send('CreatePolicy', { PolicyName: name, Path: path, Description: description, PolicyDocument: JSON.stringify(document) })).Policy.Arn,
    listPolicyVersions: async (arn) => (await pages('ListPolicyVersions', { PolicyArn: arn }, (p) => p.Versions ?? []))
      .map((v: any) => ({ versionId: v.VersionId, isDefault: Boolean(v.IsDefaultVersion), createDate: v.CreateDate })),
    createPolicyVersion: async (arn, document) =>
      (await send('CreatePolicyVersion', { PolicyArn: arn, PolicyDocument: JSON.stringify(document), SetAsDefault: true })).PolicyVersion.VersionId,
    deletePolicyVersion: async (arn, versionId) => { await send('DeletePolicyVersion', { PolicyArn: arn, VersionId: versionId }); },
    deletePolicy: async (arn) => { await send('DeletePolicy', { PolicyArn: arn }); },
    attachPolicy: async (kind, name, arn) => { await send(`Attach${KIND_TITLE[kind]}Policy`, { [`${KIND_TITLE[kind]}Name`]: name, PolicyArn: arn }); },
    detachPolicy: async (kind, name, arn) => { await send(`Detach${KIND_TITLE[kind]}Policy`, { [`${KIND_TITLE[kind]}Name`]: name, PolicyArn: arn }); },
    listEntitiesForPolicy: async (arn) => {
      const all = await pages('ListEntitiesForPolicy', { PolicyArn: arn }, (p) => [p]);
      return all.flatMap((p: any) => [
        ...(p.PolicyRoles ?? []).map((r: any) => ({ kind: 'role' as const, name: r.RoleName })),
        ...(p.PolicyUsers ?? []).map((u: any) => ({ kind: 'user' as const, name: u.UserName })),
        ...(p.PolicyGroups ?? []).map((g: any) => ({ kind: 'group' as const, name: g.GroupName })),
      ]);
    },
    listPrincipals: async (kind) => (await pages(`List${KIND_TITLE[kind]}s`, {}, (p) => p[`${KIND_TITLE[kind]}s`] ?? []))
      .map((e: any) => ({ kind, name: e[`${KIND_TITLE[kind]}Name`], arn: e.Arn })),
    listAttachedPolicies: async (kind, name) => (await pages(`ListAttached${KIND_TITLE[kind]}Policies`, { [`${KIND_TITLE[kind]}Name`]: name }, (p) => p.AttachedPolicies ?? []))
      .map((p: any) => p.PolicyArn),
    listGroupMembers: async (name) => (await pages('GetGroup', { GroupName: name }, (p) => p.Users ?? []))
      .map((u: any) => ({ kind: 'user' as const, name: u.UserName, arn: u.Arn })),
    simulatePrincipal: (principalArn, actions, resources) => sim('SimulatePrincipalPolicy', { PolicySourceArn: principalArn, ActionNames: actions, ResourceArns: resources }),
    simulateCustom: (documents, actions, resources) => sim('SimulateCustomPolicy', { PolicyInputList: documents, ActionNames: actions, ResourceArns: resources }),
    lastAccessed: async (arn) => {
      const { JobId } = await send('GenerateServiceLastAccessedDetails', { Arn: arn, Granularity: 'SERVICE_LEVEL' });
      for (let i = 0; i < LAST_ACCESS_MAX_POLLS; i++) {
        const probe = await send('GetServiceLastAccessedDetails', { JobId });
        if (probe.JobStatus === 'COMPLETED') {
          return (await pages('GetServiceLastAccessedDetails', { JobId }, (p) => p.ServicesLastAccessed ?? []))
            .map((s: any) => ({ service: s.ServiceNamespace, lastAuthenticated: s.LastAuthenticated }));
        }
        if (probe.JobStatus === 'FAILED') throw new AwsApiError(probe.Error?.Message ?? probe.JobStatus, 'ServiceLastAccessedFailed');
        await new Promise((resolve) => setTimeout(resolve, LAST_ACCESS_POLL_MS));
      }
      throw new AwsApiError(__t('uppie.adapter.aws.last_accessed_timeout'), 'ServiceLastAccessedTimeout');
    },
  };
}
