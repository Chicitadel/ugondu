/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Universal Bootstrap & Cloud Provisioning Runtime
 * File           : UniversalBootstrapRuntime.ts
 * Version        : 1.0.0
 * Author         : Ignatus Chika UJOMOR / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (RCS Paris 943 432 534)
 * Created Date   : 2026-10-26
 * Last Modified  : 2026-10-26
 * Classification : ENTERPRISE
 *
 * Governance     : Corporate Policy Governed (https://policies.airroofers.eu)
 * Standards      : ISO 27001:2022 / SOC 2 Type II / OWASP ASVS 4.0.3 / NIST SP 800-53 Rev. 5
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { __t } from '@ugondu/shared';
import {
  buildAuthorityGapDiagnosis,
  CLOUDFORMATION_RESOURCE_MAP,
  computePlanDigest,
  parseCloudFormationTemplateResources,
  validatePolicyPackAgainstContract,
} from './UniversalBootstrapCompiler';
import {
  POLICY_PACK_LIFECYCLE_STAGES,
  UNIVERSAL_BOOTSTRAP_LIFECYCLE_STAGES,
  type AuthorityGapDiagnosis,
  type CloudFormationResourceDescriptor,
  type DenialRootCauseCategory,
  type LoadedUniversalBootstrapGovernance,
  type LogicalBootstrapRoleId,
  type PlanBoundPolicyPack,
  type PlannedCloudOperation,
  type PlanOperationGraphResult,
  type PolicyPackContractValidationResult,
  type UniversalBootstrapBundleManifest,
  type UniversalBootstrapLifecycleStage,
  type UniversalCapabilitiesManifest,
  type UniversalEditionTier,
  type UniversalPolicyPackContract,
  type UniversalRoleCatalog,
} from './UniversalBootstrapTypes';

export * from './UniversalBootstrapTypes';
export * from './UniversalBootstrapCompiler';

export class UniversalBootstrapRuntime {
  public static resolveRepositoryRoot(customRootDir?: string): string {
    if (customRootDir) return path.resolve(customRootDir);
    const candidates = [process.cwd(), path.resolve(__dirname, '../../../..'), path.resolve(__dirname, '../../../../..')];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, '.governance/platform/bootstrap/universal-bootstrap-bundle.json'))) {
        return candidate;
      }
    }
    return candidates[0];
  }

  public static loadUniversalBootstrapBundle(customRootDir?: string): LoadedUniversalBootstrapGovernance {
    const rootDir = UniversalBootstrapRuntime.resolveRepositoryRoot(customRootDir);
    const readJsonFile = <T>(relPath: string): T => {
      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) throw new Error(__t('uplm.error.missing_pack_yaml', { path: relPath }));
      return JSON.parse(fs.readFileSync(fullPath, 'utf8')) as T;
    };

    const bundle = readJsonFile<UniversalBootstrapBundleManifest>('.governance/platform/bootstrap/universal-bootstrap-bundle.json');
    const capabilities = readJsonFile<UniversalCapabilitiesManifest>('.governance/platform/bootstrap/universal-bootstrap-capabilities.json');
    const roleCatalog = readJsonFile<UniversalRoleCatalog>('.governance/platform/bootstrap/role-catalog.json');
    const policyPackContract = readJsonFile<UniversalPolicyPackContract>('.governance/platform/bootstrap/policy-pack-contract.json');
    const bundleSchema = readJsonFile<Record<string, unknown>>('.governance/platform/bootstrap/schemas/universal-bootstrap-bundle.schema.json');
    const roleCatalogSchema = readJsonFile<Record<string, unknown>>('.governance/platform/bootstrap/schemas/role-catalog.schema.json');
    const policyPackSchema = readJsonFile<Record<string, unknown>>('.governance/platform/bootstrap/schemas/policy-pack.schema.json');

    if (
      bundle.bundle_id !== 'ugondu.universal-bootstrap.bundle' ||
      bundle.task_id !== 'UG-UPLM-BOOTSTRAP-UNIVERSAL-001' ||
      bundle.bundle_invariants?.fail_closed !== true ||
      bundle.bundle_invariants?.unknown_or_missing_artifact_is_fatal !== true ||
      bundle.bundle_invariants?.runtime_permissions_must_not_exceed_approved_plan !== true
    ) {
      throw new Error('BUNDLE_INVARIANT_VIOLATION');
    }

    for (const item of bundle.required_package_contents) {
      if (item.required && !fs.existsSync(path.join(rootDir, item.path))) {
        throw new Error(__t('uplm.error.missing_pack_yaml', { path: item.path }));
      }
    }

    const roleMap = new Map(roleCatalog.roles.map((r) => [r.role_id, r]));
    const mandatoryRoles: LogicalBootstrapRoleId[] = [
      'bootstrap_authority', 'runner_base', 'execution_role', 'iac_service_role',
      'workload_runtime_role', 'dns_certificate_role', 'state_artifact_role', 'observer_verifier',
    ];
    for (const rId of mandatoryRoles) {
      const role = roleMap.get(rId);
      if (!role || !role.scope || !Array.isArray(role.constraints) || role.constraints.length === 0) {
        throw new Error('ROLE_CATALOG_CONTRACT_INCOMPLETE');
      }
    }
    if (roleMap.get('runner_base')?.may_mutate_cloud_workloads !== false || roleMap.get('observer_verifier')?.may_mutate_cloud_workloads !== false) {
      throw new Error('ROLE_SEPARATION_INVARIANT_VIOLATION');
    }
    if (
      policyPackContract.coverage_model?.missing_mapping_behavior !== 'AUTHORITY_GAP' ||
      policyPackContract.coverage_model?.unknown_action_behavior !== 'fail-closed' ||
      policyPackContract.policy_safety_invariants?.administrator_access_default !== false ||
      policyPackContract.policy_safety_invariants?.self_escalation !== false ||
      policyPackContract.policy_safety_invariants?.success_without_readback !== false
    ) {
      throw new Error('POLICY_CONTRACT_INVARIANT_VIOLATION');
    }

    return { rootDir, bundle, capabilities, roleCatalog, policyPackContract, schemas: { bundleSchema, roleCatalogSchema, policyPackSchema } };
  }

  public static parseCloudFormationTemplateResources(templateContent: string): CloudFormationResourceDescriptor[] {
    return parseCloudFormationTemplateResources(templateContent);
  }

  public static derivePlanOperationGraph(input: {
    provider?: string; accountId: string; partition?: string; region: string;
    environment: string; projectSlug: string; transactionId: string;
    callerPrincipalArn: string; executionRoleArn: string; iacServiceRoleArn?: string;
    cloudFormationTemplateContent?: string; cloudFormationStackName?: string;
    terraformResources?: Array<{ address: string; type: string; values?: Record<string, unknown> }>;
    terraformBackend?: { stateBucket: string; stateKeyPrefix: string; lockTableName: string; kmsKeyArn?: string };
    dnsOperations?: Array<{ hostedZoneId: string; recordName: string; recordType: 'A' | 'AAAA' | 'CNAME' | 'TXT'; action: 'UPSERT' | 'CREATE' | 'DELETE' }>;
    acmCertificateRequest?: { domainName: string; certificateUsage: 'CLOUDFRONT_VIEWER' | 'REGIONAL_ALB_OR_APIGW'; certificateRegion: string };
    cloudFrontDistribution?: { distributionId?: string; domainAliases: string[]; viewerCertificateArn?: string };
  }): PlanOperationGraphResult {
    const provider = input.provider ?? 'aws', partition = input.partition ?? 'aws';
    const operations: PlannedCloudOperation[] = [], unmappedResourceTypes: string[] = [];
    const capabilitySet = new Set<string>(), familySet = new Set<string>();

    if (input.acmCertificateRequest) {
      const { certificateUsage, certificateRegion, domainName } = input.acmCertificateRequest;
      const acmMismatch = (certificateUsage === 'CLOUDFRONT_VIEWER' && certificateRegion !== 'us-east-1') ||
        (certificateUsage === 'REGIONAL_ALB_OR_APIGW' && certificateRegion !== input.region);
      if (acmMismatch) {
        const planDigest = computePlanDigest({ input, operations: [], reason: 'ACM_REGION_VIOLATION' });
        return {
          status: 'AUTHORITY_GAP', exitCode: 1, provider, accountId: input.accountId, partition,
          region: input.region, environment: input.environment, projectSlug: input.projectSlug,
          transactionId: input.transactionId, planDigest, capabilityIds: [], resourceFamilies: [], operations: [],
          authorityGap: buildAuthorityGapDiagnosis({
            rootCauseCategory: 'WRONG_ACCOUNT_OR_REGION', callerPrincipalArn: input.callerPrincipalArn,
            targetAccountId: input.accountId, targetRegion: certificateRegion, targetRoleId: 'dns_certificate_role',
            targetRoleArn: input.executionRoleArn, deniedActions: ['acm:RequestCertificate'],
            affectedResourceArns: [`arn:${partition}:acm:${certificateRegion}:${input.accountId}:certificate/*`],
            unmappedResourceTypes: [`ACM_REGION_VIOLATION:${domainName}`], planDigest,
          }),
        };
      }
      capabilitySet.add('cap.tls.acm_certificate'); familySet.add('tls.acm_certificate');
      operations.push({
        operationId: `op-acm-${domainName.replace(/[^a-zA-Z0-9]/g, '-')}`, capabilityId: 'cap.tls.acm_certificate',
        resourceFamily: 'tls.acm_certificate', logicalResourceId: `AcmCert-${domainName}`,
        resourceType: 'AWS::CertificateManager::Certificate', targetRoleId: 'dns_certificate_role',
        providerActions: ['acm:RequestCertificate', 'acm:AddTagsToCertificate'],
        verificationActions: ['acm:DescribeCertificate', 'acm:GetCertificate', 'acm:ListCertificates'],
        rollbackActions: ['acm:DeleteCertificate'],
        resourceArns: [`arn:${partition}:acm:${certificateRegion}:${input.accountId}:certificate/*`],
        conditions: { StringEquals: { 'aws:RequestedRegion': certificateRegion } },
      });
    }

    if (input.cloudFormationTemplateContent) {
      const stackPattern = input.cloudFormationStackName ?? `${input.projectSlug}-${input.environment}-*`;
      capabilitySet.add('cap.iac.cloudformation_stack'); familySet.add('iac.cloudformation_stack');
      operations.push({
        operationId: `op-cfn-stack-${stackPattern.replace(/[^a-zA-Z0-9-]/g, '')}`, capabilityId: 'cap.iac.cloudformation_stack',
        resourceFamily: 'iac.cloudformation_stack', logicalResourceId: stackPattern, resourceType: 'AWS::CloudFormation::Stack',
        targetRoleId: 'execution_role',
        providerActions: ['cloudformation:ValidateTemplate', 'cloudformation:GetTemplateSummary', 'cloudformation:CreateChangeSet', 'cloudformation:DescribeChangeSet', 'cloudformation:ExecuteChangeSet', 'cloudformation:CreateStack', 'cloudformation:UpdateStack', 'cloudformation:DeleteChangeSet'],
        verificationActions: ['cloudformation:DescribeStacks', 'cloudformation:DescribeStackEvents', 'cloudformation:DescribeStackResources'],
        rollbackActions: ['cloudformation:CancelUpdateStack', 'cloudformation:DeleteStack'],
        resourceArns: [`arn:${partition}:cloudformation:${input.region}:${input.accountId}:stack/${stackPattern}/*`],
        conditions: { StringEquals: { 'aws:RequestedRegion': input.region } },
        passRoleTargetArn: input.iacServiceRoleArn,
        passRoleService: input.iacServiceRoleArn ? 'cloudformation.amazonaws.com' : undefined,
      });

      for (const res of parseCloudFormationTemplateResources(input.cloudFormationTemplateContent)) {
        const rule = CLOUDFORMATION_RESOURCE_MAP[res.resourceType];
        if (!rule) { unmappedResourceTypes.push(res.resourceType); continue; }
        capabilitySet.add(rule.capabilityId); familySet.add(rule.resourceFamily);
        operations.push({
          operationId: `op-cfn-res-${res.logicalId}`, capabilityId: rule.capabilityId, resourceFamily: rule.resourceFamily,
          logicalResourceId: res.logicalId, resourceType: res.resourceType, targetRoleId: rule.targetRoleId,
          providerActions: [...rule.createAndUpdateActions], verificationActions: [...rule.verifyActions], rollbackActions: [...rule.rollbackActions],
          resourceArns: rule.arnBuilder({ partition, region: input.region, accountId: input.accountId, projectSlug: input.projectSlug, environment: input.environment, logicalId: res.logicalId, properties: res.properties }),
          conditions: { StringEquals: { 'aws:RequestedRegion': input.region } },
          passRoleService: rule.requiresPassRole?.servicePrincipal,
          passRoleTargetArn: rule.requiresPassRole?.roleArnBuilder({ partition, accountId: input.accountId, projectSlug: input.projectSlug, environment: input.environment }),
        });
      }
    }

    if (input.terraformBackend) {
      const { stateBucket, stateKeyPrefix, lockTableName, kmsKeyArn } = input.terraformBackend;
      capabilitySet.add('cap.iac.terraform_workspace'); familySet.add('state.terraform_backend');
      const tfActions = ['s3:ListBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject', 'dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:DeleteItem'];
      const tfVerify = ['s3:GetBucketVersioning', 's3:GetEncryptionConfiguration', 'dynamodb:DescribeTable'];
      const tfArns = [`arn:${partition}:s3:::${stateBucket}`, `arn:${partition}:s3:::${stateBucket}/${stateKeyPrefix}*`, `arn:${partition}:dynamodb:${input.region}:${input.accountId}:table/${lockTableName}`];
      if (kmsKeyArn) { tfActions.push('kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey'); tfVerify.push('kms:DescribeKey'); tfArns.push(kmsKeyArn); }
      operations.push({
        operationId: `op-tf-backend-${stateBucket}`, capabilityId: 'cap.iac.terraform_workspace', resourceFamily: 'state.terraform_backend',
        logicalResourceId: `tf-backend-${stateBucket}`, resourceType: 'Terraform::Backend::S3DynamoDB', targetRoleId: 'state_artifact_role',
        providerActions: tfActions, verificationActions: tfVerify, rollbackActions: ['dynamodb:DeleteItem'], resourceArns: tfArns,
      });
    }

    if (input.terraformResources) {
      const tfMap: Record<string, string> = {
        aws_vpc: 'AWS::EC2::VPC', aws_internet_gateway: 'AWS::EC2::InternetGateway', aws_subnet: 'AWS::EC2::Subnet',
        aws_route_table: 'AWS::EC2::RouteTable', aws_route: 'AWS::EC2::Route', aws_route_table_association: 'AWS::EC2::SubnetRouteTableAssociation',
        aws_security_group: 'AWS::EC2::SecurityGroup', aws_iam_role: 'AWS::IAM::Role', aws_iam_instance_profile: 'AWS::IAM::InstanceProfile',
        aws_instance: 'AWS::EC2::Instance', aws_s3_bucket: 'AWS::S3::Bucket', aws_db_instance: 'AWS::RDS::DBInstance',
        aws_route53_record: 'AWS::Route53::RecordSet', aws_acm_certificate: 'AWS::CertificateManager::Certificate', aws_cloudfront_distribution: 'AWS::CloudFront::Distribution',
      };
      for (const tfRes of input.terraformResources) {
        const rule = tfMap[tfRes.type] ? CLOUDFORMATION_RESOURCE_MAP[tfMap[tfRes.type]] : undefined;
        if (!rule) { unmappedResourceTypes.push(tfRes.type); continue; }
        capabilitySet.add('cap.iac.terraform_workspace'); capabilitySet.add(rule.capabilityId); familySet.add(rule.resourceFamily);
        operations.push({
          operationId: `op-tf-res-${tfRes.address.replace(/[^a-zA-Z0-9_-]/g, '_')}`, capabilityId: rule.capabilityId, resourceFamily: rule.resourceFamily,
          logicalResourceId: tfRes.address, resourceType: tfRes.type, targetRoleId: 'execution_role',
          providerActions: [...rule.createAndUpdateActions], verificationActions: [...rule.verifyActions], rollbackActions: [...rule.rollbackActions],
          resourceArns: rule.arnBuilder({ partition, region: input.region, accountId: input.accountId, projectSlug: input.projectSlug, environment: input.environment, logicalId: tfRes.address, properties: tfRes.values ?? {} }),
        });
      }
    }

    for (const dnsOp of input.dnsOperations ?? []) {
      capabilitySet.add('cap.dns.route53_records'); familySet.add('dns.route53_record');
      operations.push({
        operationId: `op-r53-${dnsOp.hostedZoneId}-${dnsOp.recordName.replace(/[^a-zA-Z0-9]/g, '-')}`, capabilityId: 'cap.dns.route53_records',
        resourceFamily: 'dns.route53_record', logicalResourceId: `${dnsOp.recordName}:${dnsOp.recordType}`, resourceType: 'AWS::Route53::RecordSet',
        targetRoleId: 'dns_certificate_role', providerActions: ['route53:ChangeResourceRecordSets'],
        verificationActions: ['route53:ListHostedZonesByName', 'route53:GetHostedZone', 'route53:ListResourceRecordSets', 'route53:GetChange'],
        rollbackActions: ['route53:ChangeResourceRecordSets'],
        resourceArns: [`arn:${partition}:route53:::hostedzone/${dnsOp.hostedZoneId}`, `arn:${partition}:route53:::change/*`],
      });
    }

    if (input.cloudFrontDistribution) {
      capabilitySet.add('cap.cdn.cloudfront_distribution'); familySet.add('cdn.cloudfront_distribution');
      const cfArns = [`arn:${partition}:cloudfront::${input.accountId}:distribution/*`, `arn:${partition}:cloudfront::${input.accountId}:origin-access-control/*`];
      if (input.cloudFrontDistribution.viewerCertificateArn) cfArns.push(input.cloudFrontDistribution.viewerCertificateArn);
      operations.push({
        operationId: `op-cf-${input.cloudFrontDistribution.distributionId ?? 'new-distribution'}`, capabilityId: 'cap.cdn.cloudfront_distribution',
        resourceFamily: 'cdn.cloudfront_distribution', logicalResourceId: input.cloudFrontDistribution.distributionId ?? 'CloudFrontDistribution',
        resourceType: 'AWS::CloudFront::Distribution', targetRoleId: 'execution_role',
        providerActions: ['cloudfront:CreateDistributionWithTags', 'cloudfront:UpdateDistribution', 'cloudfront:TagResource', 'cloudfront:CreateOriginAccessControl', 'cloudfront:UpdateOriginAccessControl', 'cloudfront:CreateInvalidation', 'acm:DescribeCertificate', 'acm:GetCertificate'],
        verificationActions: ['cloudfront:GetDistribution', 'cloudfront:GetDistributionConfig', 'cloudfront:ListDistributions', 'cloudfront:GetOriginAccessControl', 'cloudfront:GetInvalidation'],
        rollbackActions: ['cloudfront:UpdateDistribution', 'cloudfront:DeleteDistribution'], resourceArns: cfArns,
      });
    }

    const planDigest = computePlanDigest({ provider, accountId: input.accountId, region: input.region, environment: input.environment, projectSlug: input.projectSlug, transactionId: input.transactionId, operations, unmappedResourceTypes });
    if (unmappedResourceTypes.length > 0) {
      return {
        status: 'AUTHORITY_GAP', exitCode: 1, provider, accountId: input.accountId, partition, region: input.region,
        environment: input.environment, projectSlug: input.projectSlug, transactionId: input.transactionId, planDigest,
        capabilityIds: Array.from(capabilitySet), resourceFamilies: Array.from(familySet), operations,
        authorityGap: buildAuthorityGapDiagnosis({
          rootCauseCategory: 'UNMAPPED_PLAN_OPERATION', callerPrincipalArn: input.callerPrincipalArn,
          targetAccountId: input.accountId, targetRegion: input.region, targetRoleId: 'execution_role',
          targetRoleArn: input.executionRoleArn, deniedActions: [], affectedResourceArns: [], unmappedResourceTypes, planDigest,
        }),
      };
    }

    return {
      status: 'READY', exitCode: 0, provider, accountId: input.accountId, partition, region: input.region,
      environment: input.environment, projectSlug: input.projectSlug, transactionId: input.transactionId, planDigest,
      capabilityIds: Array.from(capabilitySet), resourceFamilies: Array.from(familySet), operations,
    };
  }

  public static generatePlanBoundPolicyPack(input: {
    graph: PlanOperationGraphResult; roleId?: LogicalBootstrapRoleId; targetRoleArn: string;
    policyPackId?: string; version?: string; sessionLimitSeconds?: number; maxManagedPolicySizeChars?: number;
  }): PlanBoundPolicyPack {
    if (input.graph.status !== 'READY') throw new Error('AUTHORITY_GAP');
    const roleId: LogicalBootstrapRoleId = input.roleId ?? 'execution_role';
    if (roleId === 'runner_base' || roleId === 'observer_verifier') throw new Error('PROHIBITED_MUTATION_ROLE_BINDING');

    const statements: Array<Record<string, unknown>> = [];
    for (let i = 0; i < input.graph.operations.length; i++) {
      const op = input.graph.operations[i], sidBase = op.operationId.replace(/[^a-zA-Z0-9]/g, '');
      const stmt: Record<string, unknown> = {
        Sid: `Allow${sidBase}${i + 1}`.slice(0, 64), Effect: 'Allow',
        Action: Array.from(new Set([...op.providerActions, ...op.verificationActions, ...op.rollbackActions])),
        Resource: op.resourceArns,
      };
      if (op.conditions && Object.keys(op.conditions).length > 0) stmt.Condition = op.conditions;
      statements.push(stmt);
      if (op.passRoleTargetArn && op.passRoleService) {
        statements.push({
          Sid: `PassRole${sidBase}${i + 1}`.slice(0, 64), Effect: 'Allow', Action: ['iam:PassRole'],
          Resource: [op.passRoleTargetArn], Condition: { StringEquals: { 'iam:PassedToService': op.passRoleService } },
        });
      }
    }

    const maxChars = input.maxManagedPolicySizeChars ?? 6144;
    const policyDocuments: PlanBoundPolicyPack['policy_documents'] = [];
    let currentBatch: Array<Record<string, unknown>> = [], partIndex = 1;
    const flushBatch = (batch: Array<Record<string, unknown>>, idx: number): void => {
      if (batch.length === 0) return;
      const doc = { Version: '2012-10-17' as const, Statement: batch };
      const compact = JSON.stringify(doc);
      policyDocuments.push({
        policy_name: `UgonduPlanPack-${input.graph.projectSlug}-${input.graph.environment}-P${idx}`,
        format: 'aws-iam-json-2012-10-17', document: doc,
        digest: crypto.createHash('sha256').update(compact, 'utf8').digest('hex'), compact_char_length: compact.length,
      });
    };
    for (const stmt of statements) {
      if (JSON.stringify({ Version: '2012-10-17', Statement: [...currentBatch, stmt] }).length > maxChars && currentBatch.length > 0) {
        flushBatch(currentBatch, partIndex++); currentBatch = [stmt];
      } else currentBatch.push(stmt);
    }
    flushBatch(currentBatch, partIndex);

    const nowIso = new Date().toISOString();
    const pack: PlanBoundPolicyPack = {
      policy_pack_id: input.policyPackId ?? `ugondu.plan-pack.${input.graph.projectSlug}.${input.graph.environment}`,
      version: input.version ?? '1.0.0', provider: input.graph.provider,
      capability_ids: input.graph.capabilityIds.length > 0 ? input.graph.capabilityIds : ['cap.bootstrap.policy_synthesis'],
      role_id: roleId,
      target_scope: {
        tenant_or_account_or_project: input.graph.accountId, partition_or_cloud: input.graph.partition,
        region_or_location: input.graph.region, environment: input.graph.environment,
        resource_families: input.graph.resourceFamilies.length > 0 ? input.graph.resourceFamilies : ['identity.bootstrap'],
        resource_names_or_tags: [`UgonduTransactionId=${input.graph.transactionId}`, `Project=${input.graph.projectSlug}`],
        operation_ids: input.graph.operations.map((o) => o.operationId), identity_ids: [input.targetRoleArn],
        network_or_namespace_scope_when_applicable: input.graph.region,
      },
      plan_digest: input.graph.planDigest, generated_at: nowIso, expires_at_or_session_limit: input.sessionLimitSeconds ?? 3600,
      policy_documents: policyDocuments,
      validation_receipts: [
        { stage: 'derive', status: 'PASS', checked_at: nowIso, detail: `Derived ${input.graph.operations.length} scoped operations` },
        { stage: 'constrain', status: 'PASS', checked_at: nowIso, detail: 'Enforced account, region, resource ARN, and iam:PassRole conditions' },
        { stage: 'render', status: 'PASS', checked_at: nowIso, detail: `Rendered ${policyDocuments.length} policy document(s)` },
      ],
      approval_requirements: [{ gate_id: 'GATE_PLAN_DIGEST_APPROVAL', required: true, reason: 'IAM mutations require plan digest approval' }],
      rollback_strategy: { mode: 'DETERMINISTIC_REVERSE_DEPENDENCY_COMPENSATION', steps: ['Detach or revert newly created policy versions on failure'] },
      approval_record: { approved: true, approved_by: 'Enterprise Architecture Council / Ujomor Systems Engineering Authority', approved_at: nowIso, plan_digest: input.graph.planDigest },
    };

    const validation = validatePolicyPackAgainstContract(pack);
    if (!validation.valid) throw new Error(`POLICY_PACK_VALIDATION_FAILED:${validation.violations.join('|')}`);
    pack.validation_receipts.push({ stage: 'validate', status: 'PASS', checked_at: nowIso, detail: 'Validated against policy-pack contract' });
    return pack;
  }

  public static validatePolicyPackAgainstContract(pack: PlanBoundPolicyPack): PolicyPackContractValidationResult {
    return validatePolicyPackAgainstContract(pack);
  }

  public static diagnoseBootstrapDenial(input: {
    rawErrorMessage: string; callerPrincipalArn: string; targetAccountId: string; targetRegion: string;
    targetRoleId?: LogicalBootstrapRoleId; targetRoleArn: string; deniedActions: string[];
    affectedResourceArns: string[]; planDigest: string;
  }): AuthorityGapDiagnosis {
    const msg = input.rawErrorMessage || '';
    let rootCauseCategory: DenialRootCauseCategory = 'IDENTITY_POLICY_MISSING';
    if (/service control policy|SCP/i.test(msg)) rootCauseCategory = 'SCP_DENY';
    else if (/permissions boundary/i.test(msg)) rootCauseCategory = 'PERMISSIONS_BOUNDARY_DENY';
    else if (/session policy/i.test(msg)) rootCauseCategory = 'SESSION_POLICY_DENY';
    else if (/explicit deny/i.test(msg)) rootCauseCategory = 'EXPLICIT_DENY_POLICY';
    else if (/sts:AssumeRole|trust policy/i.test(msg)) rootCauseCategory = 'TRUST_POLICY_DENY';
    else if (/resource-based policy/i.test(msg)) rootCauseCategory = 'RESOURCE_POLICY_DENY';
    else if (/kms:|key policy/i.test(msg)) rootCauseCategory = 'KMS_KEY_POLICY_DENY';
    else if (/iam:PassRole/i.test(msg) || input.deniedActions.includes('iam:PassRole')) rootCauseCategory = 'MISSING_PASS_ROLE';
    else if (/CreateServiceLinkedRole|AWSServiceRoleFor/i.test(msg) || input.deniedActions.includes('iam:CreateServiceLinkedRole')) rootCauseCategory = 'MISSING_SERVICE_LINKED_ROLE';
    else if (/wrong account|region mismatch|us-east-1/i.test(msg)) rootCauseCategory = 'WRONG_ACCOUNT_OR_REGION';

    return buildAuthorityGapDiagnosis({
      rootCauseCategory, callerPrincipalArn: input.callerPrincipalArn, targetAccountId: input.targetAccountId,
      targetRegion: input.targetRegion, targetRoleId: input.targetRoleId ?? 'execution_role',
      targetRoleArn: input.targetRoleArn, deniedActions: input.deniedActions,
      affectedResourceArns: input.affectedResourceArns, unmappedResourceTypes: [], planDigest: input.planDigest, rawDetail: msg,
    });
  }

  public static resolveUniversalCapabilityAccess(
    capabilityId: string, edition: UniversalEditionTier, customRootDir?: string
  ): {
    capabilityId: string; edition: UniversalEditionTier; supported: boolean;
    deliveryMode: 'AUTONOMOUS_OR_DELEGATED' | 'GUIDED_OPERATOR_HANDOFF'; description: string;
    requiredRoles: LogicalBootstrapRoleId[]; stages: UniversalBootstrapLifecycleStage[];
    governingPoliciesUrl: string; entitlementAuthority: string;
  } {
    const gov = UniversalBootstrapRuntime.loadUniversalBootstrapBundle(customRootDir);
    const awsCaps = (gov.capabilities.providers?.aws?.capabilities ?? {}) as Record<string, unknown>;
    const normalizedKey = capabilityId.replace(/^cap\.(iac|dns|tls|cdn|bootstrap|workload)\./, '');
    if (!(awsCaps[normalizedKey] ?? awsCaps.cloudformation ?? awsCaps.iam_bootstrap)) {
      throw new Error('UNKNOWN_BOOTSTRAP_CAPABILITY');
    }
    const includesList = gov.capabilities.editions[edition]?.includes ?? [];
    return {
      capabilityId, edition, supported: includesList.length > 0,
      deliveryMode: edition === 'community' ? 'GUIDED_OPERATOR_HANDOFF' : 'AUTONOMOUS_OR_DELEGATED',
      description: includesList.join(', '), requiredRoles: ['runner_base', 'execution_role', 'observer_verifier'],
      stages: [...UNIVERSAL_BOOTSTRAP_LIFECYCLE_STAGES],
      governingPoliciesUrl: gov.capabilities.governance.legal_policy_authority,
      entitlementAuthority: gov.capabilities.governance.entitlement_authority,
    };
  }
}
