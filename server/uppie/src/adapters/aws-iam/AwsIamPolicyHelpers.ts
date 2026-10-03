/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Policy Helpers
 * File           : AwsIamPolicyHelpers.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
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
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AuthorizationRule } from '../../types/index';
import type { AwsPolicyDocument, AwsStatement, AwsPrincipalKind } from './AwsIamClient';
import { compileConditions } from './AwsIamConditions';

export const AWS_POLICY_VERSION = '2012-10-17';
export const AWS_MAX_POLICY_CHARS = 6144;
export const AWS_MAX_VERSIONS = 5;
export const AWS_NAME_PREFIX = 'ugondu-';

const NAME_RE = /^[\w+=,.@-]{1,128}$/;
const ACTION_RE = /^(\*|[A-Za-z0-9-]+:[A-Za-z0-9*?]+)$/;
const RESOURCE_RE = /^(\*|arn:[A-Za-z0-9-]+:.+)$/;
const PRINCIPAL_RE = /^arn:(aws[a-z-]*):iam::(\d{12}):(role|user|group)\/((?:[\w+=,.@-]+\/)*)([\w+=,.@-]{1,128})$/;
const POLICY_RE = /^arn:(aws[a-z-]*):iam::(\d{12}|aws):policy(\/(?:[\w+=,.@-]+\/)*)([\w+=,.@-]{1,128})$/;

const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');
const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));
const uniqueSorted = (v: string[]): string[] => [...new Set(v)].sort();

export const isValidPolicyName = (name: string): boolean => NAME_RE.test(name);

export interface ParsedPrincipal { partition: string; account: string; kind: AwsPrincipalKind; path: string; name: string }
export interface ParsedPolicyArn { partition: string; account: string; path: string; name: string; awsManaged: boolean }

export function parsePrincipalArn(arn: string): ParsedPrincipal {
  const m = PRINCIPAL_RE.exec(arn);
  if (!m) throw fail('uppie.adapter.aws.invalid_principal', { principal: arn });
  return { partition: m[1], account: m[2], kind: m[3] as AwsPrincipalKind, path: `/${m[4]}`, name: m[5] };
}

export function parsePolicyArn(arn: string): ParsedPolicyArn {
  const m = POLICY_RE.exec(arn);
  if (!m) throw fail('uppie.adapter.aws.invalid_policy_arn', { arn });
  return { partition: m[1], account: m[2], path: m[3], name: m[4], awsManaged: m[2] === 'aws' };
}

export const buildPolicyArn = (partition: string, account: string, name: string, path = '/'): string => `arn:${partition}:iam::${account}:policy${path}${name}`;

/** AWS-managed policies are owned by AWS and are never modified, cloned over, or retired. */
export function requireCustomerManaged(arn: string): ParsedPolicyArn {
  const parsed = parsePolicyArn(arn);
  if (parsed.awsManaged) throw fail('uppie.adapter.aws.protected_policy', { arn });
  return parsed;
}

const sidFor = (ruleId: string | undefined, used: Set<string>): string | undefined => {
  const base = (ruleId ?? '').replace(/[^A-Za-z0-9]/g, '');
  if (!base) return undefined;
  let sid = base;
  for (let i = 2; used.has(sid); i++) sid = `${base}${i}`;
  used.add(sid);
  return sid;
};

/**
 * Compiles AuthorizationRules to an IAM policy document. Effects are emitted in IAM's casing (`Allow`/`Deny`);
 * every rule limiter (MFA, source IP, expiry, typed and resource conditions) is compiled into the statement's
 * Condition block (see compileConditions); statements sharing effect, resource and condition are merged and the
 * result is sorted, so the same rule set always yields the same document.
 */
export function buildPolicyDocument(rules: AuthorizationRule[]): AwsPolicyDocument {
  const merged = new Map<string, AwsStatement>();
  for (const r of rules) {
    if (r.action.operations.length === 0) throw fail('uppie.adapter.aws.invalid_rule', { scope: r.resource.scope });
    const condition = compileConditions(r);
    const effect = r.effect === 'DENY' ? 'Deny' : 'Allow';
    const key = JSON.stringify([effect, r.resource.scope, condition ?? null]);
    const existing = merged.get(key) ?? { Effect: effect, Action: [], Resource: [r.resource.scope], ...(condition ? { Condition: condition } : {}) } as AwsStatement;
    existing.Action = uniqueSorted([...existing.Action, ...r.action.operations]);
    if (!existing.Sid) existing.Sid = r.ruleId;
    merged.set(key, existing);
  }
  const used = new Set<string>();
  const order = (s: AwsStatement): string => `${s.Effect}|${s.Resource[0]}|${s.Action.join(',')}|${JSON.stringify(s.Condition ?? null)}`;
  const statements = [...merged.values()]
    .sort((a, b) => order(a).localeCompare(order(b)))
    .map(({ Sid, ...rest }) => { const sid = sidFor(Sid, used); return sid ? { Sid: sid, ...rest } : rest; });
  return { Version: AWS_POLICY_VERSION, Statement: statements as AwsStatement[] };
}

/** Digest of the grants alone (Sids excluded), independent of key and statement order. */
export const grantsDigest = (doc: AwsPolicyDocument): string =>
  sha256(JSON.stringify(doc.Statement
    .map((s) => JSON.stringify([s.Effect, [...(s.Action ?? [])].sort(), [...(s.Resource ?? [])].sort(), s.Condition ?? null, s.NotAction ?? null, s.NotResource ?? null]))
    .sort()));

/** Deterministic policy name from the grants, so regenerating identical rules is idempotent. */
export const policyNameFor = (doc: AwsPolicyDocument): string => `${AWS_NAME_PREFIX}${grantsDigest(doc).slice(0, 12)}`;

export const digestOfDocument = (doc: unknown): string => sha256(JSON.stringify(doc));

/** Structural validation of a policy document; returns localized errors and warnings. */
export function validatePolicyDocument(doc: AwsPolicyDocument | undefined): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!doc || typeof doc !== 'object') return { errors: [__t('uppie.adapter.aws.validate.no_document')], warnings };
  if (doc.Version !== AWS_POLICY_VERSION) errors.push(__t('uppie.adapter.aws.validate.invalid_version', { version: String(doc.Version) }));
  if (!Array.isArray(doc.Statement) || doc.Statement.length === 0) errors.push(__t('uppie.adapter.aws.validate.no_statements'));
  for (const s of Array.isArray(doc.Statement) ? doc.Statement : []) {
    if (s.Effect !== 'Allow' && s.Effect !== 'Deny') errors.push(__t('uppie.adapter.aws.validate.invalid_effect', { effect: String(s.Effect) }));
    for (const a of s.Action ?? []) if (!ACTION_RE.test(a)) errors.push(__t('uppie.adapter.aws.validate.invalid_action', { action: a }));
    for (const r of s.Resource ?? []) if (!RESOURCE_RE.test(r)) errors.push(__t('uppie.adapter.aws.validate.invalid_resource', { resource: r }));
    if (!s.NotAction && (s.Action ?? []).length === 0) errors.push(__t('uppie.adapter.aws.validate.invalid_action', { action: '' }));
    if (!s.NotResource && (s.Resource ?? []).length === 0) errors.push(__t('uppie.adapter.aws.validate.invalid_resource', { resource: '' }));
    if (s.Effect === 'Allow') {
      if ((s.Action ?? []).includes('*') && (s.Resource ?? []).includes('*')) errors.push(__t('uppie.adapter.aws.validate.admin_wildcard'));
      else for (const a of s.Action ?? []) if (a.endsWith(':*')) warnings.push(__t('uppie.adapter.aws.validate.service_wildcard', { action: a }));
    }
  }
  const size = JSON.stringify(doc).replace(/\s+/g, '').length;
  if (size > AWS_MAX_POLICY_CHARS) errors.push(__t('uppie.adapter.aws.validate.too_large', { size, limit: AWS_MAX_POLICY_CHARS }));
  return { errors, warnings };
}

/** One entry per (effect, resource): the unit of comparison for reconciliation. */
export function statementGrants(doc: AwsPolicyDocument): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const s of doc.Statement ?? []) {
    for (const resource of s.Resource ?? []) {
      const id = `${s.Effect}|${resource}`;
      const set = out.get(id) ?? new Set<string>();
      (s.Action ?? []).forEach((a) => set.add(a));
      out.set(id, set);
    }
  }
  return out;
}

const globToRegExp = (g: string): RegExp => {
  const escaped = g.replace(/[.+^$(){}|[\]\\]/g, '\\$&');
  return new RegExp('^' + escaped.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
};

/** True when `pattern` (IAM wildcard syntax: `*`, `?`) matches `value`. IAM actions are case-insensitive. */
export const globMatches = (pattern: string, value: string): boolean => globToRegExp(pattern).test(value);

/** Approximate overlap of two IAM wildcard patterns: either one matches the other taken literally. */
export const globOverlaps = (a: string, b: string): boolean => globMatches(a, b) || globMatches(b, a);

/** True when a statement can apply to the given literal action on the given resource (NotAction forms are excluded). */
export const statementCovers = (s: AwsStatement, action: string, resource: string): boolean =>
  !s.NotAction && !s.NotResource && s.Action.some((a) => globMatches(a, action)) && s.Resource.some((r) => globOverlaps(r, resource));

export const hasWildcard = (action: string): boolean => /[*?]/.test(action);
