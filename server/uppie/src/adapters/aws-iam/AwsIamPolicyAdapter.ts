/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — AWS IAM Policy Adapter
 * File           : AwsIamPolicyAdapter.ts
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type {
  IPolicyProviderAdapter, AdapterContext, AdapterCapabilityDeclaration, ProviderNativePolicy,
  PolicyValidationResult, AttachResult, DetachResult, UpdateResult, CloneResult,
  ObservationWindow, UsageObservation, DependencyReport, ConflictReport, ReconciliationPlan,
  RetirementPlan, RetirementResult, RestoreResult, PolicySimulationResult,
} from '../IPolicyProviderAdapter';
import type {
  AuthorizationRule, AuthorizationConstraints, EffectiveAuthorityResult, PolicyRetirementCertificate,
} from '../../types/index';
import { AWS_IAM_CONSTRAINTS } from './AwsIamConstraints';
import { AwsApiError, createSdkAwsIamClient } from './AwsIamClient';
import type { AwsIamClient, AwsPolicyDocument } from './AwsIamClient';
import * as discovery from './AwsIamDiscovery';
import * as analysis from './AwsIamAnalysis';
import {
  AWS_MAX_VERSIONS, buildPolicyArn, buildPolicyDocument, digestOfDocument, grantsDigest, isValidPolicyName,
  parsePolicyArn, parsePrincipalArn, policyNameFor, requireCustomerManaged, validatePolicyDocument,
} from './AwsIamPolicyHelpers';

const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));
const codeOf = (e: unknown): string | undefined => (e instanceof AwsApiError ? e.code : undefined);

/** Serialized form of a retired policy held in the retirement certificate's rollbackReference. */
interface PolicySnapshot { name: string; path: string; description?: string; document: AwsPolicyDocument }

/**
 * AwsIamPolicyAdapter — UPPIE provider adapter for AWS IAM customer-managed policies.
 *
 * - Effects are compiled in IAM casing (`Allow`/`Deny`); AWS supports explicit Deny, which always overrides Allow.
 * - Policy names are `ugondu-<digest12>` of the grants, so generation and attach are idempotent; an existing policy of
 *   the same name is accepted only when its grants are identical.
 * - Targets and principals are full IAM ARNs (the account id is needed to address the policy).
 * - AWS-managed policies are readable and cloneable but never modified or retired.
 * - Effective authority, evaluation and simulation use the IAM policy simulator; wildcard actions cannot be simulated.
 * - All AWS access goes through AwsIamClient; the production client is loaded lazily from @aws-sdk/client-iam,
 *   and tests inject a double. Clients are cached per tenant, environment, region and credential identity.
 */
export class AwsIamPolicyAdapter implements IPolicyProviderAdapter {
  readonly providerType = 'AWS_IAM' as const;

  readonly capabilities: AdapterCapabilityDeclaration = {
    discoverPolicies: 'SUPPORTED', discoverAssignments: 'SUPPORTED', discoverIdentities: 'SUPPORTED',
    discoverGroups: 'SUPPORTED', discoverRoles: 'SUPPORTED', discoverEffectiveAuthority: 'SUPPORTED_WITH_LIMITS',
    evaluate: 'SUPPORTED_WITH_LIMITS', simulate: 'SUPPORTED_WITH_LIMITS', generate: 'SUPPORTED', validate: 'SUPPORTED',
    attach: 'SUPPORTED', detach: 'SUPPORTED', update: 'SUPPORTED', clone: 'SUPPORTED',
    observeUsage: 'SUPPORTED_WITH_LIMITS', detectUnused: 'SUPPORTED_WITH_LIMITS', findDependencies: 'SUPPORTED',
    findConflicts: 'SUPPORTED', getConstraints: 'SUPPORTED', reconcile: 'SUPPORTED',
    retire: 'SUPPORTED', restore: 'SUPPORTED',
  };

  private readonly clients = new Map<string, Promise<AwsIamClient>>();

  constructor(private readonly clientFactory: (context: AdapterContext) => Promise<AwsIamClient> = createSdkAwsIamClient) {}

  private client(context: AdapterContext): Promise<AwsIamClient> {
    const key = createHash('sha256').update([context.tenantId, context.environmentId, context.region ?? '', context.credentials.accessKeyId ?? ''].join('|')).digest('hex');
    let pending = this.clients.get(key);
    if (!pending) {
      pending = this.clientFactory(context).catch((e) => { this.clients.delete(key); throw e; });
      this.clients.set(key, pending);
    }
    return pending;
  }

  async discoverPolicies(context: AdapterContext): Promise<ProviderNativePolicy[]> { return discovery.discoverPolicies(await this.client(context)); }
  async discoverAssignments(context: AdapterContext): Promise<Record<string, string[]>> { return discovery.discoverAssignments(await this.client(context)); }
  async discoverIdentities(context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> { return discovery.discoverIdentities(await this.client(context)); }
  async discoverGroups(context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> { return discovery.discoverGroups(await this.client(context)); }
  async discoverRoles(context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> { return discovery.discoverRoles(await this.client(context)); }

  async discoverEffectiveAuthority(actor: string, resource: string, context: AdapterContext): Promise<EffectiveAuthorityResult> {
    return analysis.effectiveAuthority(await this.client(context), actor, resource);
  }

  async evaluate(rule: AuthorizationRule, context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
    try {
      return await analysis.evaluateRule(await this.client(context), rule);
    } catch {
      return 'UNKNOWN';
    }
  }

  async simulate(proposedRules: AuthorizationRule[], context: AdapterContext): Promise<PolicySimulationResult> {
    return analysis.simulateRules(await this.client(context), proposedRules);
  }

  async generate(rules: AuthorizationRule[], _context: AdapterContext): Promise<ProviderNativePolicy> {
    const document = buildPolicyDocument(rules);
    return { providerId: policyNameFor(document), providerType: 'AWS_IAM', nativeDocument: document, digest: digestOfDocument(document) };
  }

  async validate(nativePolicy: ProviderNativePolicy, _context: AdapterContext): Promise<PolicyValidationResult> {
    const document = nativePolicy.nativeDocument as AwsPolicyDocument | undefined;
    const { errors, warnings } = validatePolicyDocument(document);
    if (errors.length === 0 && nativePolicy.digest && nativePolicy.digest !== digestOfDocument(document)) errors.push(__t('uppie.adapter.aws.validate.digest_mismatch'));
    return { valid: errors.length === 0, errors, warnings };
  }

  async attach(nativePolicy: ProviderNativePolicy, target: string, context: AdapterContext): Promise<AttachResult> {
    try {
      const check = await this.validate(nativePolicy, context);
      if (!check.valid) return { success: false, providerRef: '', attachedAt: '', errors: check.errors };
      const principal = parsePrincipalArn(target);
      const client = await this.client(context);
      const document = nativePolicy.nativeDocument as AwsPolicyDocument;
      let arn = nativePolicy.providerId;
      if (arn.startsWith('arn:')) {
        parsePolicyArn(arn);
      } else {
        if (!isValidPolicyName(arn)) throw fail('uppie.adapter.aws.invalid_name', { name: arn });
        const name = arn;
        arn = buildPolicyArn(principal.partition, principal.account, name);
        try {
          await client.createPolicy({ name, document });
        } catch (e) {
          if (codeOf(e) !== 'EntityAlreadyExists') throw e;
          if (grantsDigest((await client.getPolicy(arn)).document) !== grantsDigest(document)) throw fail('uppie.adapter.aws.policy_exists_different', { arn });
        }
      }
      await client.attachPolicy(principal.kind, principal.name, arn); // attaching an already-attached policy is a no-op in IAM
      return { success: true, providerRef: arn, attachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      return { success: false, providerRef: '', attachedAt: '', errors: [__t('uppie.adapter.aws.attach_error', { error: errorText(e) })] };
    }
  }

  async detach(policyId: string, target: string, context: AdapterContext): Promise<DetachResult> {
    try {
      parsePolicyArn(policyId);
      const principal = parsePrincipalArn(target);
      await (await this.client(context)).detachPolicy(principal.kind, principal.name, policyId);
      return { success: true, detachedAt: new Date().toISOString(), errors: [] };
    } catch (e) {
      if (codeOf(e) === 'NoSuchEntity') return { success: true, detachedAt: new Date().toISOString(), errors: [] }; // already detached
      return { success: false, errors: [__t('uppie.adapter.aws.detach_error', { error: errorText(e) })] };
    }
  }

  async update(policyId: string, newRules: AuthorizationRule[], context: AdapterContext): Promise<UpdateResult> {
    try {
      requireCustomerManaged(policyId);
      const document = buildPolicyDocument(newRules);
      const { errors } = validatePolicyDocument(document);
      if (errors.length > 0) return { success: false, version: '', errors };
      const client = await this.client(context);
      const versions = await client.listPolicyVersions(policyId);
      if (versions.length >= AWS_MAX_VERSIONS) { // IAM keeps at most five versions: drop the oldest non-default one
        const oldest = versions.filter((v) => !v.isDefault).sort((a, b) => (a.createDate?.getTime() ?? 0) - (b.createDate?.getTime() ?? 0))[0];
        if (oldest) await client.deletePolicyVersion(policyId, oldest.versionId);
      }
      return { success: true, version: await client.createPolicyVersion(policyId, document), errors: [] };
    } catch (e) {
      return { success: false, version: '', errors: [__t('uppie.adapter.aws.update_error', { error: errorText(e) })] };
    }
  }

  async clone(policyId: string, newName: string, context: AdapterContext): Promise<CloneResult> {
    try {
      parsePolicyArn(policyId);
      if (!isValidPolicyName(newName)) throw fail('uppie.adapter.aws.invalid_name', { name: newName });
      const client = await this.client(context);
      const source = await client.getPolicy(policyId);
      return { success: true, clonedId: await client.createPolicy({ name: newName, description: source.description, document: source.document }), errors: [] };
    } catch (e) {
      return { success: false, clonedId: '', errors: [__t('uppie.adapter.aws.clone_error', { error: errorText(e) })] };
    }
  }

  async observeUsage(policyId: string, window: ObservationWindow, context: AdapterContext): Promise<UsageObservation> {
    return analysis.observeUsage(await this.client(context), policyId, window);
  }

  async detectUnused(context: AdapterContext, thresholdDays: number): Promise<UsageObservation[]> {
    return analysis.detectUnused(await this.client(context), thresholdDays);
  }

  async findDependencies(policyId: string, context: AdapterContext): Promise<DependencyReport> {
    return analysis.dependencies(await this.client(context), policyId);
  }

  async findConflicts(rules: AuthorizationRule[], _context: AdapterContext): Promise<ConflictReport> {
    return analysis.findConflicts(rules);
  }

  async getConstraints(_context: AdapterContext): Promise<AuthorizationConstraints> {
    return AWS_IAM_CONSTRAINTS;
  }

  async reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], _context: AdapterContext): Promise<ReconciliationPlan> {
    try {
      return analysis.reconcilePlan(desired, observed);
    } catch (e) {
      throw fail('uppie.adapter.aws.reconcile_error', { error: errorText(e) });
    }
  }

  async retire(plan: RetirementPlan, context: AdapterContext): Promise<RetirementResult> {
    try {
      const { name, path } = requireCustomerManaged(plan.policyId);
      const client = await this.client(context);
      const policy = await client.getPolicy(plan.policyId);
      const attached = await client.listEntitiesForPolicy(plan.policyId);
      if (attached.length > 0) throw fail('uppie.adapter.aws.retire_in_use', { arn: plan.policyId, count: attached.length });
      const snapshot: PolicySnapshot = { name, path, ...(policy.description ? { description: policy.description } : {}), document: policy.document };
      for (const v of (await client.listPolicyVersions(plan.policyId)).filter((x) => !x.isDefault)) await client.deletePolicyVersion(plan.policyId, v.versionId);
      await client.deletePolicy(plan.policyId);
      const detachmentEvidence = JSON.stringify({ policy: plan.policyId, attachedEntities: 0, approvedBy: plan.approvedBy, verifiedAt: new Date().toISOString() });
      return { success: true, rollbackReference: JSON.stringify(snapshot), detachmentEvidence, errors: [] };
    } catch (e) {
      return { success: false, errors: [__t('uppie.adapter.aws.retire_error', { error: errorText(e) })] };
    }
  }

  async restore(certificate: PolicyRetirementCertificate, context: AdapterContext): Promise<RestoreResult> {
    try {
      if (!certificate.rollbackReference) return { success: false, restoredId: '', errors: [__t('uppie.adapter.aws.restore_no_reference')] };
      const { name, path } = requireCustomerManaged(certificate.policyId);
      const snapshot = JSON.parse(certificate.rollbackReference) as PolicySnapshot;
      if (snapshot.name !== name || snapshot.path !== path) throw fail('uppie.adapter.aws.restore_invalid_snapshot', { arn: certificate.policyId });
      const { errors } = validatePolicyDocument(snapshot.document);
      if (errors.length > 0) throw new Error(errors.join('; '));
      const restoredId = await (await this.client(context)).createPolicy({ name, path, description: snapshot.description, document: snapshot.document });
      return { success: true, restoredId, errors: [] };
    } catch (e) {
      return { success: false, restoredId: '', errors: [__t('uppie.adapter.aws.restore_error', { error: errorText(e) })] };
    }
  }
}
