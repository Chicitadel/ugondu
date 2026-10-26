/******************************************************************************
 * Project        : Ugondu
 * Module         : tenant/policy
 * File           : resolver.ts
 * Version        : 1.1.0
 * Author         : Ugondu Engineer
 * Organization   : Ujomor Platform
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-26
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Copyright (c) 2026 Ujomor Platform
 * All Rights Reserved.
 ******************************************************************************/

import { Effect, PolicyContext, PolicyStatement } from './types';

type PolicyRule = PolicyStatement & {
  principals?: string[];
  conditions?: Record<string, unknown>;
};

type EvaluationContext = PolicyContext & { rules?: unknown[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every(
    (item) => typeof item === 'string' && item.length > 0
  );
}

function matchesPattern(pattern: string, value: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\\*/g, '.*');').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`).test(value);
}

export class Resolver {
  /**
   * Evaluate only explicitly scoped rules. Invalid, missing, unmatched or
   * contradictory policy input defaults to DENY; a matching DENY always wins.
   */
  public resolve(context: unknown, resource: unknown): 'ALLOW' | 'DENY' {
    if (!isRecord(context)) return 'DENY';

    const typedContext = context as unknown as EvaluationContext;
    const action = typedContext.action;
    const principal = typedContext.principal;
    const attributes = typedContext.attributes;
    const contextResource = typedContext.resource;
    const requestResource = this.extractResource(resource) ?? contextResource;

    if (typeof action !== 'string' || action.length === 0) return 'DENY';
    if (typeof principal !== 'string' || principal.length === 0) return 'DENY';
    if (!isRecord(attributes)) return 'DENY';
    if (typeof requestResource !== 'string' || requestResource.length === 0) return 'DENY';
    if (typeof contextResource === 'string' && resource !== undefined && requestResource !== contextResource) {
      return 'DENY';
    }

    const rules = typedContext.rules;
    if (!Array.isArray(rules) || rules.length === 0) return 'DENY';

    let allowMatched = false;
    for (const candidate of rules) {
      if (!isRecord(candidate)) return 'DENY';
      const rule = candidate as unknown as PolicyRule;
      if (rule.effect !== Effect.ALLOW && rule.effect !== Effect.DENY) return 'DENY';
      if (!isNonEmptyStringArray(rule.actions) || !isNonEmptyStringArray(rule.resources)) return 'DENY';
      const principals = rule.principals === undefined ? ['*'] : rule.principals;
      if (!isNonEmptyStringArray(principals)) return 'DENY';
      if (rule.conditions !== undefined && !isRecord(rule.conditions)) return 'DENY';

      const actionMatches = rule.actions.some((pattern) => matchesPattern(pattern, action));
      const resourceMatches = rule.resources.some((pattern) => matchesPattern(pattern, requestResource));
      const principalMatches = principals.some((pattern) => matchesPattern(pattern, principal));
      if (!actionMatches || !resourceMatches || !principalMatches) continue;

      const conditions = rule.conditions ?? {};
      const conditionsMatch = Object.entries(conditions).every(([key, expected]) =>
        Object.prototype.hasOwnProperty.call(attributes, key) && Object.is(attributes[key], expected)
      );
      if (!conditionsMatch) continue;

      if (rule.effect === Effect.DENY) return 'DENY';
      allowMatched = true;
    }

    return allowMatched ? 'ALLOW' : 'DENY';
  }

  private extractResource(resource: unknown): string | undefined {
    if (typeof resource === 'string' && resource.length > 0) return resource;
    if (!isRecord(resource)) return undefined;
    for (const key of ['arn', 'id', 'resource']) {
      const value = resource[key];
      if (typeof value === 'string' && value.length > 0) return value;
    }
    return undefined;
  }
}
