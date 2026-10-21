/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : RegionPolicyRenderer.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
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
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';

export interface RegionScopeConfig {
  accountId: string;
  allowedRegions: string[];
  executionRoleName: string;
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

const REGION_REGEX = /^[a-z]{2}-[a-z]+-\d$/;
const ACCOUNT_REGEX = /^\d{12}$/;

export class RegionPolicyRenderer {
  private readonly defaultAllowedRegions: string[];

  constructor(defaultAllowedRegions: string[] = ['eu-west-3', 'eu-west-1', 'us-east-1']) {
    this.defaultAllowedRegions = defaultAllowedRegions;
  }

  /**
   * Renders an IAM policy document strictly bound to allowed regions,
   * replacing template variables and enforcing zero wildcard resource rules.
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

    // 3. Deep token substitution and wildcard inspection
    const renderedStatements: RenderedStatement[] = [];

    for (const stmt of template.Statement ?? []) {
      const renderedStmt: RenderedStatement = {
        Sid: stmt.Sid,
        Effect: stmt.Effect,
        Action: stmt.Action,
        Resource: this.substituteTokensInResource(stmt.Resource, scope),
        Condition: stmt.Condition ? JSON.parse(JSON.stringify(stmt.Condition)) : undefined,
      };

      // Validate rendered resources for dangerous wildcards
      const resources = Array.isArray(renderedStmt.Resource)
        ? renderedStmt.Resource
        : [renderedStmt.Resource];

      for (const res of resources) {
        if (res === '*') {
          violations.push(
            `Statement '${stmt.Sid}' contains unrestricted wildcard '*' resource. Region-scoped policies must qualify resource ARNs.`
          );
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
    const documentSha256 = crypto.createHash('sha256').update(documentJson, 'utf8').digest('hex');

    return {
      valid: violations.length === 0,
      document,
      documentJson,
      documentSha256,
      violations,
    };
  }

  private substituteTokensInResource(
    resource: string | string[],
    scope: RegionScopeConfig
  ): string | string[] {
    const primaryRegion = scope.allowedRegions[0] ?? 'eu-west-3';

    const substituteString = (s: string): string => {
      return s
        .replace(/\${ACCOUNT_ID}/g, scope.accountId)
        .replace(/\${REGION}/g, primaryRegion)
        .replace(/\${EXECUTION_ROLE_NAME}/g, scope.executionRoleName)
        .replace(/\${TRANSACTION_ID}/g, scope.transactionId ?? '*');
    };

    if (Array.isArray(resource)) {
      const results: string[] = [];
      for (const res of resource) {
        if (res.includes('${REGION}') && scope.allowedRegions.length > 1) {
          // Expand multi-region templates deterministically
          for (const reg of scope.allowedRegions) {
            results.push(
              res
                .replace(/\${ACCOUNT_ID}/g, scope.accountId)
                .replace(/\${REGION}/g, reg)
                .replace(/\${EXECUTION_ROLE_NAME}/g, scope.executionRoleName)
                .replace(/\${TRANSACTION_ID}/g, scope.transactionId ?? '*')
            );
          }
        } else {
          results.push(substituteString(res));
        }
      }
      return results;
    }

    if (resource.includes('${REGION}') && scope.allowedRegions.length > 1) {
      return scope.allowedRegions.map((reg) =>
        resource
          .replace(/\${ACCOUNT_ID}/g, scope.accountId)
          .replace(/\${REGION}/g, reg)
          .replace(/\${EXECUTION_ROLE_NAME}/g, scope.executionRoleName)
          .replace(/\${TRANSACTION_ID}/g, scope.transactionId ?? '*')
      );
    }

    return substituteString(resource);
  }
}
