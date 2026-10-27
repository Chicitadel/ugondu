/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : RegionPolicyRenderer.ts
 * Version        : 1.1.0
 * Author         : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { computePolicyDigest } from './CanonicalPolicyRegistry';

export interface RegionScopeConfig {
  accountId: string;
  allowedRegions: string[];
  executionRoleName: string;
  runnerRoleName?: string;
  transactionId?: string;
}

export interface RenderedStatement {
  Sid: string;
  Effect: 'Allow' | 'Deny';
  Action: string | string[];
  Resource: string | string[];
  Condition?: Record<string, unknown>;
}

export interface RenderedPolicyDocument {
  Version: string;
  Statement: RenderedStatement[];
}

export interface PolicyRenderResult {
  valid: boolean;
  document: RenderedPolicyDocument;
  documentJson: string;
  documentSha256: string;
  violations: string[];
}

const REGION_REGEX = /^[a-z]{2}(?:-[a-z0-9]+)+-\d$/;
const ACCOUNT_REGEX = /^\d{12}$/;

export const LEGITIMATE_WILDCARD_ACTION_REGEX =
  /^(?:ec2:Describe|s3:ListAllMyBuckets|iam:Get|iam:List|ssm:Describe)/i;
export const MUTATING_ACTION_REGEX =
  /(?:Create|Delete|Terminate|RunInstances|Modify|Put|Attach|Detach)/i;

export class RegionPolicyRenderer {
  private readonly defaultAllowedRegions: string[];

  constructor(defaultAllowedRegions: string[] = []) {
    this.defaultAllowedRegions = defaultAllowedRegions;
  }

  /**
   * Renders an IAM policy document strictly bound to allowed regions,
   * replacing template variables and enforcing action-aware wildcard resource rules.
   */
  public renderPolicy(
    template: RenderedPolicyDocument,
    scope: RegionScopeConfig
  ): PolicyRenderResult {
    const violations: string[] = [];

    // 1. Account ID validation
    if (!ACCOUNT_REGEX.test(scope.accountId)) {
      violations.push(`Invalid AWS Account ID '${scope.accountId}': must be exactly 12 digits.`);
    }

    // 2. Region validation
    if (!scope.allowedRegions || scope.allowedRegions.length === 0) {
      violations.push('No allowed regions specified; policy cannot be regionally scoped.');
    } else {
      for (const reg of scope.allowedRegions) {
        if (!REGION_REGEX.test(reg)) {
          violations.push(`Region '${reg}' violates standard AWS region naming pattern.`);
        }
      }
    }

    const primaryRegion =
      scope.allowedRegions && scope.allowedRegions.length > 0 ? scope.allowedRegions[0] : '';

    // 3. Deep token substitution and wildcard inspection
    const renderedStatements: RenderedStatement[] = [];

    for (const stmt of template.Statement ?? []) {
      const renderedStmt: RenderedStatement = {
        Sid: stmt.Sid,
        Effect: stmt.Effect,
        Action: this.substituteTokensInAction(stmt.Action, scope, primaryRegion),
        Resource: this.substituteTokensInResource(stmt.Resource, scope, primaryRegion),
        Condition: this.substituteTokensInCondition(stmt.Condition, scope, primaryRegion),
      };

      // Validate rendered actions for unresolved template tokens
      const actions = Array.isArray(renderedStmt.Action)
        ? renderedStmt.Action
        : [renderedStmt.Action];
      for (const act of actions) {
        if (act.includes('${REGION}') || act.includes('${ACCOUNT_ID}')) {
          violations.push(`Statement '${stmt.Sid}' action contains unresolved template variables: ${act}`);
        }
      }

      // Validate rendered conditions for unresolved template tokens
      if (renderedStmt.Condition) {
        this.checkUnresolvedConditionTokens(stmt.Sid, renderedStmt.Condition, violations);
      }

      // Validate rendered resources for dangerous wildcards and unresolved tokens
      const resources = Array.isArray(renderedStmt.Resource)
        ? renderedStmt.Resource
        : [renderedStmt.Resource];

      for (const res of resources) {
        if (res === '*') {
          const allLegitimate =
            actions.length > 0 &&
            actions.every((a) => LEGITIMATE_WILDCARD_ACTION_REGEX.test(a));

          if (renderedStmt.Effect === 'Allow' && allLegitimate) {
            // Permitted: AWS read/list operations legitimately requiring Resource: "*"
            continue;
          }

          const mutating = actions.filter((a) => MUTATING_ACTION_REGEX.test(a));
          if (mutating.length > 0) {
            violations.push(
              `Statement '${stmt.Sid}' contains unrestricted wildcard '*' resource with mutating actions (${mutating.join(', ')}). Region-scoped policies must qualify resource ARNs.`
            );
          } else {
            violations.push(
              `Statement '${stmt.Sid}' contains unrestricted wildcard '*' resource. Region-scoped policies must qualify resource ARNs.`
            );
          }
        }
        if (res.includes('${REGION}') || res.includes('${ACCOUNT_ID}')) {
          violations.push(`Statement '${stmt.Sid}' contains unresolved template variables: ${res}`);
        }
      }

      renderedStatements.push(renderedStmt);
    }

    const document: RenderedPolicyDocument = {
      Version: template.Version || '2012-10-17',
      Statement: renderedStatements,
    };

    const documentJson = JSON.stringify(document, null, 2);
    const documentSha256 = computePolicyDigest(documentJson);

    return {
      valid: violations.length === 0,
      document,
      documentJson,
      documentSha256,
      violations,
    };
  }

  private substituteTokensInAction(
    action: string | string[],
    scope: RegionScopeConfig,
    primaryRegion: string
  ): string | string[] {
    const substituteString = (s: string): string => {
      let result = s
        .replace(/\${ACCOUNT_ID}/g, scope.accountId)
        .replace(/\${EXECUTION_ROLE_NAME}/g, scope.executionRoleName)
        .replace(/\${RUNNER_ROLE_NAME}/g, scope.runnerRoleName ?? 'UgonduCORRunner')
        .replace(/\${TRANSACTION_ID}/g, scope.transactionId ?? '*');
      if (primaryRegion) {
        result = result.replace(/\${REGION}/g, primaryRegion);
      }
      return result;
    };

    if (Array.isArray(action)) {
      return action.map(substituteString);
    }
    return substituteString(action);
  }

  private substituteTokensInCondition(
    condition: Record<string, unknown> | undefined,
    scope: RegionScopeConfig,
    primaryRegion: string
  ): Record<string, unknown> | undefined {
    if (!condition) {
      return undefined;
    }
    return this.substituteTokensInValue(condition, scope, primaryRegion) as Record<string, unknown>;
  }

  private substituteTokensInValue(
    value: unknown,
    scope: RegionScopeConfig,
    primaryRegion: string
  ): unknown {
    if (typeof value === 'string') {
      let result = value
        .replace(/\${ACCOUNT_ID}/g, scope.accountId)
        .replace(/\${EXECUTION_ROLE_NAME}/g, scope.executionRoleName)
        .replace(/\${RUNNER_ROLE_NAME}/g, scope.runnerRoleName ?? 'UgonduCORRunner')
        .replace(/\${TRANSACTION_ID}/g, scope.transactionId ?? '*');
      if (primaryRegion) {
        result = result.replace(/\${REGION}/g, primaryRegion);
      }
      return result;
    }
    if (Array.isArray(value)) {
      return value.map((item) => this.substituteTokensInValue(item, scope, primaryRegion));
    }
    if (value !== null && typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(obj)) {
        const requestedRegionToken =
          k === 'aws:RequestedRegion' &&
          scope.allowedRegions.length > 1 &&
          ((typeof v === 'string' && v.includes('${REGION}')) ||
            (Array.isArray(v) && v.some((item) => typeof item === 'string' && item.includes('${REGION}'))));
        result[k] = requestedRegionToken
          ? [...scope.allowedRegions]
          : this.substituteTokensInValue(v, scope, primaryRegion);
      }
      return result;
    }
    return value;
  }

  private checkUnresolvedConditionTokens(
    sid: string,
    value: unknown,
    violations: string[]
  ): void {
    if (typeof value === 'string') {
      if (value.includes('${REGION}') || value.includes('${ACCOUNT_ID}')) {
        violations.push(`Statement '${sid}' condition contains unresolved template variables: ${value}`);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        this.checkUnresolvedConditionTokens(sid, item, violations);
      }
    } else if (value !== null && typeof value === 'object') {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        this.checkUnresolvedConditionTokens(sid, nested, violations);
      }
    }
  }

  private substituteTokensInResource(
    resource: string | string[],
    scope: RegionScopeConfig,
    primaryRegion: string
  ): string | string[] {
    const substituteString = (s: string, region: string): string => {
      let result = s
        .replace(/\${ACCOUNT_ID}/g, scope.accountId)
        .replace(/\${EXECUTION_ROLE_NAME}/g, scope.executionRoleName)
        .replace(/\${RUNNER_ROLE_NAME}/g, scope.runnerRoleName ?? 'UgonduCORRunner')
        .replace(/\${TRANSACTION_ID}/g, scope.transactionId ?? '*');
      if (region) {
        result = result.replace(/\${REGION}/g, region);
      }
      return result;
    };

    if (Array.isArray(resource)) {
      const results: string[] = [];
      for (const res of resource) {
        if (res.includes('${REGION}') && scope.allowedRegions && scope.allowedRegions.length > 1) {
          // Expand multi-region templates deterministically
          for (const reg of scope.allowedRegions) {
            results.push(substituteString(res, reg));
          }
        } else {
          results.push(substituteString(res, primaryRegion));
        }
      }
      return results;
    }

    if (resource.includes('${REGION}') && scope.allowedRegions && scope.allowedRegions.length > 1) {
      return scope.allowedRegions.map((reg) => substituteString(resource, reg));
    }

    return substituteString(resource, primaryRegion);
  }
}
