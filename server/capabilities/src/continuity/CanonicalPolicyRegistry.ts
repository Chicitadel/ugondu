/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : CanonicalPolicyRegistry.ts
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

import * as crypto from 'crypto';
import {
  UniversalBootstrapRuntime,
  type LoadedUniversalBootstrapGovernance,
  type UniversalRoleCatalogEntry,
} from './UniversalBootstrapRuntime';

export interface CanonicalRoleDefinition {
  roleName: string;
  arnPattern: string;
  purpose: 'runner' | 'execution' | 'workload' | 'audit';
  mandatoryTags: string[];
  allowedPrincipals: string[];
  maxSessionDurationSeconds: number;
}

export interface PolicyPackManifest {
  packId: string;
  version: string;
  canonicalSha256: string;
  governanceClass: 'GOVERNMENT' | 'ENTERPRISE' | 'SOVEREIGN';
  targetPlatform: string;
  requiredStatements: Array<{
    sid: string;
    effect: 'Allow' | 'Deny';
    actions: string[];
    resources: string[];
  }>;
}

export interface PolicyIntegrityCheck {
  valid: boolean;
  packId: string;
  computedSha256: string;
  expectedSha256: string;
  driftDetected: boolean;
  mismatchedStatements: string[];
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

/**
 * Deterministic recursive canonical JSON serializer.
 * Recursively sorts all object keys lexicographically and strips extraneous whitespace.
 */
export function canonicalJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const object = value as Record<string, JsonValue>;
  return '{' + Object.keys(object).sort().map(
    (key) => JSON.stringify(key) + ':' + canonicalJson(object[key])
  ).join(',') + '}';
}

/**
 * Computes canonical SHA-256 digest of normalized JSON string or policy document.
 */
export function computePolicyDigest(policyDocument: string): string {
  try {
    const parsed = JSON.parse(policyDocument) as JsonValue;
    const normalized = canonicalJson(parsed);
    return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
  } catch {
    return crypto.createHash('sha256').update(policyDocument.trim(), 'utf8').digest('hex');
  }
}

/**
 * Registry of canonical roles, immutable policy pack manifests, and drift detection.
 */
export class CanonicalPolicyRegistry {
  private readonly roles = new Map<string, CanonicalRoleDefinition>();
  private readonly policyPacks = new Map<string, PolicyPackManifest>();

  constructor() {
    this.seedDefaultCanonicalDefinitions();
  }

  private seedDefaultCanonicalDefinitions(): void {
    this.registerRole({
      roleName: 'UgonduCORExecutionRole',
      arnPattern: '^arn:aws:iam::[0-9]{12}:role/UgonduCORExecutionRole$',
      purpose: 'execution',
      mandatoryTags: ['UgonduTransactionId'],
      allowedPrincipals: ['UgonduCORRunner'],
      maxSessionDurationSeconds: 3600,
    });

    this.registerRole({
      roleName: 'UgonduCORRunner',
      arnPattern: '^arn:aws:iam::[0-9]{12}:role/UgonduCORRunner$',
      purpose: 'runner',
      mandatoryTags: [],
      allowedPrincipals: ['token.actions.githubusercontent.com'],
      maxSessionDurationSeconds: 3600,
    });
  }

  public registerRole(def: CanonicalRoleDefinition): void {
    this.roles.set(def.roleName, { ...def });
  }

  public getRole(roleName: string): CanonicalRoleDefinition | undefined {
    return this.roles.get(roleName);
  }

  public listCanonicalRoles(): CanonicalRoleDefinition[] {
    return Array.from(this.roles.values());
  }

  public registerPolicyPack(pack: PolicyPackManifest): void {
    this.policyPacks.set(pack.packId, { ...pack });
  }

  public getPolicyPack(packId: string): PolicyPackManifest | undefined {
    return this.policyPacks.get(packId);
  }

  public getUniversalBootstrapGovernance(customRootDir?: string): LoadedUniversalBootstrapGovernance {
    return UniversalBootstrapRuntime.loadUniversalBootstrapBundle(customRootDir);
  }

  public listUniversalCatalogRoles(customRootDir?: string): UniversalRoleCatalogEntry[] {
    return UniversalBootstrapRuntime.loadUniversalBootstrapBundle(customRootDir).roleCatalog.roles;
  }

  /**
   * Validates live policy document against a registered canonical policy pack.
   */
  public verifyPolicyIntegrity(packId: string, livePolicyDocument: string): PolicyIntegrityCheck {
    const pack = this.policyPacks.get(packId);
    if (!pack) {
      return {
        valid: false,
        packId,
        computedSha256: computePolicyDigest(livePolicyDocument),
        expectedSha256: 'NOT_REGISTERED',
        driftDetected: true,
        mismatchedStatements: [`Policy pack '${packId}' is not registered in canonical registry.`],
      };
    }

    const computed = computePolicyDigest(livePolicyDocument);
    const mismatchedStatements: string[] = [];

    let parsedDoc: any;
    try {
      parsedDoc = JSON.parse(livePolicyDocument);
    } catch {
      return {
        valid: false,
        packId,
        computedSha256: computed,
        expectedSha256: pack.canonicalSha256,
        driftDetected: true,
        mismatchedStatements: ['Malformed JSON policy document.'],
      };
    }

    const liveStatements = Array.isArray(parsedDoc?.Statement) ? parsedDoc.Statement : [];

    for (const req of pack.requiredStatements) {
      const match = liveStatements.find((s: any) => s.Sid === req.sid);
      if (!match) {
        mismatchedStatements.push(`Missing mandatory statement Sid: '${req.sid}'`);
        continue;
      }
      if (match.Effect !== req.effect) {
        mismatchedStatements.push(
          `Statement '${req.sid}' has effect '${match.Effect}', expected '${req.effect}'`
        );
      }
    }

    const driftDetected = mismatchedStatements.length > 0 || computed !== pack.canonicalSha256;

    return {
      valid: !driftDetected,
      packId,
      computedSha256: computed,
      expectedSha256: pack.canonicalSha256,
      driftDetected,
      mismatchedStatements,
    };
  }
}
