/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Condition Compiler
 * File           : AwsIamConditions.ts
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AuthorizationRule } from '../../types/index';
import type { AwsCondition } from './AwsIamClient';

const OPERATOR_RE = /^[A-Za-z]+(IfExists)?$/;
const KEY_RE = /^[A-Za-z0-9:/._-]+$/;

const invalid = (type: string): Error => new Error(__t('uppie.adapter.aws.invalid_condition', { type }));
const list = (v: unknown): string[] | undefined => {
  const items = Array.isArray(v) ? v : typeof v === 'string' ? [v] : undefined;
  return items && items.length > 0 && items.every((i) => typeof i === 'string' && i.length > 0) ? (items as string[]) : undefined;
};
const isoDate = (v: unknown): string | undefined => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : undefined);

/**
 * Compiles every limiting aspect of an AuthorizationRule into one IAM `Condition` block: resource conditions,
 * MFA / source-IP constraints, validity expiry and the typed condition list. Conditions combine with AND semantics.
 * Fails closed: an unknown condition type, malformed value, or two different constraints on the same key throws,
 * because silently dropping a condition would widen access.
 */
export function compileConditions(rule: AuthorizationRule): AwsCondition | undefined {
  const out: AwsCondition = {};
  const set = (operator: string, key: string, value: string | string[], type: string): void => {
    if (!OPERATOR_RE.test(operator) || !KEY_RE.test(key)) throw invalid(type);
    const block = (out[operator] ??= {});
    if (key in block && JSON.stringify(block[key]) !== JSON.stringify(value)) throw invalid(type);
    block[key] = value;
  };

  for (const [key, value] of Object.entries(rule.resource.conditions ?? {})) set('StringEquals', key, value, 'RESOURCE');
  if (rule.constraints?.requireMfa) set('Bool', 'aws:MultiFactorAuthPresent', 'true', 'MFA_REQUIRED');
  if (rule.constraints?.ipRange) set('IpAddress', 'aws:SourceIp', rule.constraints.ipRange, 'IP_BOUND');
  const expiry = rule.validity && rule.validity.expiresAt !== 'PERMANENT' ? isoDate(rule.validity.expiresAt) : undefined;
  if (expiry) set('DateLessThan', 'aws:CurrentTime', expiry, 'TEMPORARY');

  for (const c of rule.conditions ?? []) {
    const v = c.value ?? {};
    switch (c.type) {
      case 'MFA_REQUIRED': set('Bool', 'aws:MultiFactorAuthPresent', 'true', c.type); break;
      case 'IP_BOUND': { const cidr = list(v.cidr); if (!cidr) throw invalid(c.type); set('IpAddress', 'aws:SourceIp', cidr, c.type); break; }
      case 'TIME_BOUND': {
        const from = v.notBefore === undefined ? undefined : isoDate(v.notBefore);
        const to = v.notAfter === undefined ? undefined : isoDate(v.notAfter);
        if ((v.notBefore !== undefined && !from) || (v.notAfter !== undefined && !to) || (!from && !to)) throw invalid(c.type);
        if (from) set('DateGreaterThan', 'aws:CurrentTime', from, c.type);
        if (to) set('DateLessThan', 'aws:CurrentTime', to, c.type);
        break;
      }
      case 'TAG_MATCH': {
        if (typeof v.key !== 'string' || typeof v.value !== 'string' || !v.key) throw invalid(c.type);
        set('StringEquals', `aws:ResourceTag/${v.key}`, v.value, c.type);
        break;
      }
      case 'CUSTOM': {
        const values = list(v.values);
        if (typeof v.operator !== 'string' || typeof v.key !== 'string' || !values) throw invalid(c.type);
        set(v.operator, v.key, values, c.type);
        break;
      }
      default: throw invalid(String((c as { type: unknown }).type));
    }
  }
  return Object.keys(out).length > 0 ? sortCondition(out) : undefined;
}

/** Stable key order so identical constraints always serialize (and therefore hash) identically. */
function sortCondition(c: AwsCondition): AwsCondition {
  const sorted: AwsCondition = {};
  for (const op of Object.keys(c).sort()) {
    sorted[op] = {};
    for (const key of Object.keys(c[op]).sort()) sorted[op][key] = c[op][key];
  }
  return sorted;
}
