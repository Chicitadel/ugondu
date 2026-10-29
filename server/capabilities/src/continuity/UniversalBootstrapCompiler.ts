/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Universal Bootstrap Plan & Policy Compiler
 * File           : UniversalBootstrapCompiler.ts
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
import { canonicalJson, type JsonValue } from './CanonicalPolicyRegistry';
import type {
  AuthorityGapDiagnosis,
  CloudFormationResourceDescriptor,
  DenialRootCauseCategory,
  LogicalBootstrapRoleId,
  PlanBoundPolicyPack,
  PlannedCloudOperation,
  PlanOperationGraphResult,
  PolicyPackContractValidationResult,
} from './UniversalBootstrapTypes';

const FORBIDDEN_BROAD_ACTIONS = new Set([
  '*', '*:*', 'iam:*', 'sts:*', 'cloudformation:*', 'ec2:*', 's3:*',
  'rds:*', 'ecs:*', 'ecr:*', 'route53:*', 'acm:*', 'cloudfront:*', 'dynamodb:*', 'kms:*',
]);

const FORBIDDEN_MANAGED_POLICIES = new Set([
  'AdministratorAccess', 'PowerUserAccess', 'IAMFullAccess',
  'arn:aws:iam::aws:policy/AdministratorAccess',
  'arn:aws:iam::aws:policy/PowerUserAccess',
  'arn:aws:iam::aws:policy/IAMFullAccess',
]);

interface ResourceMappingRule {
  capabilityId: string;
  resourceFamily: string;
  targetRoleId: LogicalBootstrapRoleId;
  createAndUpdateActions: string[];
  verifyActions: string[];
  rollbackActions: string[];
  arnBuilder: (ctx: {
    partition: string; region: string; accountId: string;
    projectSlug: string; environment: string; logicalId: string; properties: Record<string, unknown>;
  }) => string[];
  requiresPassRole?: {
    servicePrincipal: string;
    roleArnBuilder: (ctx: {
      partition: string; accountId: string; projectSlug: string; environment: string;
    }) => string;
  };
}

export const CLOUDFORMATION_RESOURCE_MAP: Record<string, ResourceMappingRule> = {
  'AWS::EC2::VPC': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.vpc', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:CreateVpc', 'ec2:ModifyVpcAttribute', 'ec2:CreateTags'],
    verifyActions: ['ec2:DescribeVpcs', 'ec2:DescribeVpcAttribute'], rollbackActions: ['ec2:DeleteVpc'],
    arnBuilder: ({ partition, region, accountId }) => [`arn:${partition}:ec2:${region}:${accountId}:vpc/*`],
  },
  'AWS::EC2::InternetGateway': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.igw', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:CreateInternetGateway', 'ec2:CreateTags'],
    verifyActions: ['ec2:DescribeInternetGateways'], rollbackActions: ['ec2:DeleteInternetGateway'],
    arnBuilder: ({ partition, region, accountId }) => [`arn:${partition}:ec2:${region}:${accountId}:internet-gateway/*`],
  },
  'AWS::EC2::VPCGatewayAttachment': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.igw_attachment', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:AttachInternetGateway'],
    verifyActions: ['ec2:DescribeInternetGateways', 'ec2:DescribeVpcs'], rollbackActions: ['ec2:DetachInternetGateway'],
    arnBuilder: ({ partition, region, accountId }) => [
      `arn:${partition}:ec2:${region}:${accountId}:vpc/*`, `arn:${partition}:ec2:${region}:${accountId}:internet-gateway/*`,
    ],
  },
  'AWS::EC2::Subnet': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.subnet', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:CreateSubnet', 'ec2:ModifySubnetAttribute', 'ec2:CreateTags'],
    verifyActions: ['ec2:DescribeSubnets'], rollbackActions: ['ec2:DeleteSubnet'],
    arnBuilder: ({ partition, region, accountId }) => [
      `arn:${partition}:ec2:${region}:${accountId}:subnet/*`, `arn:${partition}:ec2:${region}:${accountId}:vpc/*`,
    ],
  },
  'AWS::EC2::RouteTable': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.route_table', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:CreateRouteTable', 'ec2:CreateTags'],
    verifyActions: ['ec2:DescribeRouteTables'], rollbackActions: ['ec2:DeleteRouteTable'],
    arnBuilder: ({ partition, region, accountId }) => [
      `arn:${partition}:ec2:${region}:${accountId}:route-table/*`, `arn:${partition}:ec2:${region}:${accountId}:vpc/*`,
    ],
  },
  'AWS::EC2::Route': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.route', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:CreateRoute', 'ec2:ReplaceRoute'],
    verifyActions: ['ec2:DescribeRouteTables'], rollbackActions: ['ec2:DeleteRoute'],
    arnBuilder: ({ partition, region, accountId }) => [`arn:${partition}:ec2:${region}:${accountId}:route-table/*`],
  },
  'AWS::EC2::SubnetRouteTableAssociation': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.route_association', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:AssociateRouteTable', 'ec2:ReplaceRouteTableAssociation'],
    verifyActions: ['ec2:DescribeRouteTables'], rollbackActions: ['ec2:DisassociateRouteTable'],
    arnBuilder: ({ partition, region, accountId }) => [
      `arn:${partition}:ec2:${region}:${accountId}:route-table/*`, `arn:${partition}:ec2:${region}:${accountId}:subnet/*`,
    ],
  },
  'AWS::EC2::SecurityGroup': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'network.security_group', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:CreateSecurityGroup', 'ec2:AuthorizeSecurityGroupIngress', 'ec2:AuthorizeSecurityGroupEgress', 'ec2:CreateTags'],
    verifyActions: ['ec2:DescribeSecurityGroups', 'ec2:DescribeSecurityGroupRules'],
    rollbackActions: ['ec2:RevokeSecurityGroupIngress', 'ec2:RevokeSecurityGroupEgress', 'ec2:DeleteSecurityGroup'],
    arnBuilder: ({ partition, region, accountId }) => [
      `arn:${partition}:ec2:${region}:${accountId}:security-group/*`, `arn:${partition}:ec2:${region}:${accountId}:vpc/*`,
    ],
  },
  'AWS::IAM::Role': {
    capabilityId: 'cap.bootstrap.policy_synthesis', resourceFamily: 'identity.iam_role', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['iam:CreateRole', 'iam:AttachRolePolicy', 'iam:PutRolePolicy', 'iam:TagRole'],
    verifyActions: ['iam:GetRole', 'iam:ListAttachedRolePolicies', 'iam:ListRolePolicies'],
    rollbackActions: ['iam:DetachRolePolicy', 'iam:DeleteRolePolicy', 'iam:DeleteRole'],
    arnBuilder: ({ partition, accountId, projectSlug, environment, logicalId }) => [
      `arn:${partition}:iam::${accountId}:role/${projectSlug}-${environment}-*`, `arn:${partition}:iam::${accountId}:role/*${logicalId}*`,
    ],
  },
  'AWS::IAM::InstanceProfile': {
    capabilityId: 'cap.bootstrap.policy_synthesis', resourceFamily: 'identity.instance_profile', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['iam:CreateInstanceProfile', 'iam:AddRoleToInstanceProfile', 'iam:TagInstanceProfile'],
    verifyActions: ['iam:GetInstanceProfile'],
    rollbackActions: ['iam:RemoveRoleFromInstanceProfile', 'iam:DeleteInstanceProfile'],
    arnBuilder: ({ partition, accountId, projectSlug, environment, logicalId }) => [
      `arn:${partition}:iam::${accountId}:instance-profile/${projectSlug}-${environment}-*`,
      `arn:${partition}:iam::${accountId}:instance-profile/*${logicalId}*`, `arn:${partition}:iam::${accountId}:role/*`,
    ],
  },
  'AWS::EC2::Instance': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'compute.ec2_instance', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['ec2:RunInstances', 'ec2:StartInstances', 'ec2:ModifyInstanceAttribute', 'ec2:CreateTags'],
    verifyActions: ['ec2:DescribeInstances', 'ec2:DescribeInstanceStatus', 'ec2:DescribeVolumes'],
    rollbackActions: ['ec2:StopInstances', 'ec2:TerminateInstances'],
    arnBuilder: ({ partition, region, accountId }) => [
      `arn:${partition}:ec2:${region}:${accountId}:instance/*`, `arn:${partition}:ec2:${region}:${accountId}:volume/*`,
      `arn:${partition}:ec2:${region}:${accountId}:network-interface/*`, `arn:${partition}:ec2:${region}:${accountId}:subnet/*`,
      `arn:${partition}:ec2:${region}:${accountId}:security-group/*`, `arn:${partition}:ec2:${region}::image/*`,
    ],
    requiresPassRole: {
      servicePrincipal: 'ec2.amazonaws.com',
      roleArnBuilder: ({ partition, accountId, projectSlug, environment }) =>
        `arn:${partition}:iam::${accountId}:role/${projectSlug}-${environment}-*`,
    },
  },
  'AWS::S3::Bucket': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'storage.s3_bucket', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['s3:CreateBucket', 's3:PutBucketTagging', 's3:PutBucketVersioning', 's3:PutEncryptionConfiguration', 's3:PutBucketPublicAccessBlock'],
    verifyActions: ['s3:GetBucketLocation', 's3:GetBucketTagging', 's3:GetBucketVersioning', 's3:GetEncryptionConfiguration'],
    rollbackActions: ['s3:DeleteBucket'],
    arnBuilder: ({ partition, projectSlug, environment }) => [`arn:${partition}:s3:::${projectSlug}-${environment}-*`],
  },
  'AWS::RDS::DBInstance': {
    capabilityId: 'cap.workload.runtime_compute_data', resourceFamily: 'database.rds_instance', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['rds:CreateDBInstance', 'rds:ModifyDBInstance', 'rds:AddTagsToResource'],
    verifyActions: ['rds:DescribeDBInstances', 'rds:ListTagsForResource'], rollbackActions: ['rds:DeleteDBInstance'],
    arnBuilder: ({ partition, region, accountId, projectSlug, environment }) => [
      `arn:${partition}:rds:${region}:${accountId}:db:${projectSlug}-${environment}-*`,
      `arn:${partition}:rds:${region}:${accountId}:subgrp:*`, `arn:${partition}:rds:${region}:${accountId}:secgrp:*`,
    ],
  },
  'AWS::Route53::RecordSet': {
    capabilityId: 'cap.dns.route53_records', resourceFamily: 'dns.route53_record', targetRoleId: 'dns_certificate_role',
    createAndUpdateActions: ['route53:ChangeResourceRecordSets'],
    verifyActions: ['route53:GetHostedZone', 'route53:ListResourceRecordSets', 'route53:GetChange'],
    rollbackActions: ['route53:ChangeResourceRecordSets'],
    arnBuilder: ({ partition, properties }) => {
      const zoneId = typeof properties.HostedZoneId === 'string' && properties.HostedZoneId.trim() ? properties.HostedZoneId.trim() : 'Z_SCOPED_HOSTED_ZONE';
      return [`arn:${partition}:route53:::hostedzone/${zoneId}`, `arn:${partition}:route53:::change/*`];
    },
  },
  'AWS::CertificateManager::Certificate': {
    capabilityId: 'cap.tls.acm_certificate', resourceFamily: 'tls.acm_certificate', targetRoleId: 'dns_certificate_role',
    createAndUpdateActions: ['acm:RequestCertificate', 'acm:AddTagsToCertificate'],
    verifyActions: ['acm:DescribeCertificate', 'acm:GetCertificate', 'acm:ListCertificates'],
    rollbackActions: ['acm:DeleteCertificate'],
    arnBuilder: ({ partition, region, accountId }) => [`arn:${partition}:acm:${region}:${accountId}:certificate/*`],
  },
  'AWS::CloudFront::Distribution': {
    capabilityId: 'cap.cdn.cloudfront_distribution', resourceFamily: 'cdn.cloudfront_distribution', targetRoleId: 'execution_role',
    createAndUpdateActions: ['cloudfront:CreateDistributionWithTags', 'cloudfront:UpdateDistribution', 'cloudfront:TagResource', 'cloudfront:CreateOriginAccessControl', 'cloudfront:UpdateOriginAccessControl', 'cloudfront:CreateInvalidation'],
    verifyActions: ['cloudfront:GetDistribution', 'cloudfront:GetDistributionConfig', 'cloudfront:ListDistributions', 'cloudfront:GetOriginAccessControl', 'cloudfront:GetInvalidation'],
    rollbackActions: ['cloudfront:UpdateDistribution', 'cloudfront:DeleteDistribution'],
    arnBuilder: ({ partition, accountId }) => [`arn:${partition}:cloudfront::${accountId}:distribution/*`, `arn:${partition}:cloudfront::${accountId}:origin-access-control/*`],
  },
  'AWS::Budgets::Budget': {
    capabilityId: 'cap.cost.aws_budget', resourceFamily: 'cost.aws_budget', targetRoleId: 'iac_service_role',
    createAndUpdateActions: ['budgets:CreateBudget', 'budgets:ModifyBudget'],
    verifyActions: ['budgets:DescribeBudget'],
    rollbackActions: ['budgets:DeleteBudget'],
    arnBuilder: ({ partition, accountId, environment, properties }) => {
      const nestedBudget = properties.Budget && typeof properties.Budget === 'object'
        ? properties.Budget as Record<string, unknown>
        : undefined;
      const rawName = properties.BudgetName ?? nestedBudget?.BudgetName;
      const subValue = rawName && typeof rawName === 'object'
        ? (rawName as Record<string, unknown>)['Fn::Sub']
        : rawName;
      const budgetName = typeof subValue === 'string'
        ? subValue.replace(/^!Sub\\s+/, '').replace(/\\$\\{EnvironmentName\\}/g, environment)
        : '';
      if (!budgetName || /\\$\\{[^}]+\\}/.test(budgetName)) {
        throw new Error('AWS_BUDGET_NAME_UNRESOLVED');
      }
      return [`arn:${partition}:budgets::${accountId}:budget:${budgetName}`];
    },
  },

};

export function computePlanDigest(payload: unknown): string {
  const normalized = canonicalJson(JSON.parse(JSON.stringify(payload)) as JsonValue);
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function buildAuthorityGapDiagnosis(params: {
  rootCauseCategory: DenialRootCauseCategory; callerPrincipalArn: string; targetAccountId: string;
  targetRegion: string; targetRoleId: LogicalBootstrapRoleId; targetRoleArn: string;
  deniedActions: string[]; affectedResourceArns: string[]; unmappedResourceTypes: string[];
  planDigest: string; rawDetail?: string;
}): AuthorityGapDiagnosis {
  const scopedActions = params.deniedActions.length > 0 ? params.deniedActions : ['iam:GetRole', 'iam:ListAttachedRolePolicies'];
  const scopedArns = params.affectedResourceArns.length > 0 ? params.affectedResourceArns : [params.targetRoleArn];
  return {
    terminalStatus: 'AUTHORITY_GAP', exitCode: 1, rootCauseCategory: params.rootCauseCategory,
    callerPrincipalArn: params.callerPrincipalArn, targetAccountId: params.targetAccountId, targetRegion: params.targetRegion,
    deniedActions: params.deniedActions, affectedResourceArns: params.affectedResourceArns,
    unmappedResourceTypes: params.unmappedResourceTypes, mutationsAttemptedAfterGap: 0,
    summary: `[AUTHORITY_GAP:${params.rootCauseCategory}] Caller ${params.callerPrincipalArn} cannot proceed on ${params.targetRoleArn} in ${params.targetAccountId}/${params.targetRegion} (plan ${params.planDigest}).`,
    remediationOptions: {
      optionAAutonomousBootstrap: {
        mode: 'AUTONOMOUS_BOOTSTRAP_VIA_DELEGATED_AUTHORITY', targetBootstrapRoleId: 'bootstrap_authority',
        requiredBootstrapActions: ['iam:GetRole', 'iam:GetPolicy', 'iam:GetPolicyVersion', 'iam:ListAttachedRolePolicies', 'iam:CreatePolicy', 'iam:CreatePolicyVersion', 'iam:AttachRolePolicy'],
        scopedResourceArns: [params.targetRoleArn, `arn:aws:iam::${params.targetAccountId}:policy/Ugondu*`],
        instructions: `Authorize bootstrap_authority for plan digest ${params.planDigest} so Ugondu can reconcile and read-back verify the scoped policy pack automatically.`,
      },
      optionBOperatorHandoff: {
        mode: 'LEAST_PRIVILEGE_OPERATOR_HANDOFF', targetRoleId: params.targetRoleId, targetRoleArn: params.targetRoleArn, planDigest: params.planDigest,
        leastPrivilegePolicyDocument: {
          Version: '2012-10-17',
          Statement: [{ Sid: 'UgonduPlanScopedAuthorityGrant', Effect: 'Allow', Action: scopedActions, Resource: scopedArns, Condition: { StringEquals: { 'aws:RequestedRegion': params.targetRegion } } }],
        },
        cliVerificationCommands: [
          `aws iam get-role --role-name ${params.targetRoleArn.split('/').pop()}`,
          `aws iam list-attached-role-policies --role-name ${params.targetRoleArn.split('/').pop()}`,
        ],
        instructions: `Apply the plan-bound least-privilege policy document to ${params.targetRoleArn} via approved IaC or IAM console and re-run read-back verification.`,
      },
    },
  };
}

export function parseCloudFormationTemplateResources(templateContent: string): CloudFormationResourceDescriptor[] {
  const trimmed = templateContent.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as { Resources?: Record<string, { Type?: string; Properties?: Record<string, unknown> }> };
    return Object.entries(parsed.Resources ?? {}).map(([logicalId, def]) => ({
      logicalId, resourceType: String(def.Type ?? ''), properties: (def.Properties ?? {}) as Record<string, unknown>,
    }));
  }
  const lines = templateContent.replace(/\r\n/g, '\n').split('\n');
  let inResources = false, currentLogicalId: string | null = null, currentType: string | null = null;
  let currentProps: Record<string, unknown> = {};
  const descriptors: CloudFormationResourceDescriptor[] = [];
  const flushCurrent = (): void => {
    if (currentLogicalId && currentType) descriptors.push({ logicalId: currentLogicalId, resourceType: currentType, properties: { ...currentProps } });
    currentLogicalId = null; currentType = null; currentProps = {};
  };
  for (const rawLine of lines) {
    const commentStripped = rawLine.replace(/\s+#.*$/, '');
    if (!commentStripped.trim()) continue;
    if (/^Resources:\s*$/.test(commentStripped)) { inResources = true; continue; }
    if (inResources && /^[A-Za-z0-9_]+:\s*$/.test(commentStripped)) { flushCurrent(); inResources = false; continue; }
    if (!inResources) continue;
    const resourceMatch = commentStripped.match(/^ {2}([A-Za-z0-9_]+):\s*$/);
    if (resourceMatch) { flushCurrent(); currentLogicalId = resourceMatch[1]; continue; }
    if (currentLogicalId) {
      const typeMatch = commentStripped.match(/^ {4}Type:\s*['"]?([A-Za-z0-9:_]+)['"]?\s*$/);
      if (typeMatch) { currentType = typeMatch[1]; continue; }
      if (currentType === 'AWS::Budgets::Budget') {
        const budgetNameMatch = commentStripped.match(/^ {8}BudgetName:\\s*(.+)$/);
        if (budgetNameMatch) {
          currentProps.BudgetName = budgetNameMatch[1].trim().replace(/^['"]|['"]$/g, '');
          continue;
        }
      }
      const propMatch = commentStripped.match(/^ {6}([A-Za-z0-9_]+):\s*(.+)$/);
      if (propMatch) currentProps[propMatch[1]] = propMatch[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
  flushCurrent();
  return descriptors;
}

export function validatePolicyPackAgainstContract(pack: PlanBoundPolicyPack): PolicyPackContractValidationResult {
  const violations: string[] = [];
  if (!pack.policy_pack_id) violations.push('MISSING_POLICY_PACK_ID');
  if (!pack.version) violations.push('MISSING_VERSION');
  if (!pack.provider) violations.push('MISSING_PROVIDER');
  if (!Array.isArray(pack.capability_ids) || pack.capability_ids.length === 0) violations.push('MISSING_CAPABILITY_IDS');
  if (!pack.role_id) violations.push('MISSING_ROLE_ID');
  if (pack.role_id === 'runner_base' || pack.role_id === 'observer_verifier') violations.push(`PROHIBITED_WORKLOAD_MUTATION_ROLE:${pack.role_id}`);
  if (!/^[a-fA-F0-9]{64}$/.test(pack.plan_digest || '')) violations.push('INVALID_PLAN_DIGEST_SHA256');
  if (!pack.target_scope?.environment || !pack.target_scope.resource_families?.length || !pack.target_scope.operation_ids?.length) {
    violations.push('INCOMPLETE_TARGET_SCOPE');
  }
  if (!Array.isArray(pack.policy_documents) || pack.policy_documents.length === 0) violations.push('EMPTY_POLICY_DOCUMENTS');
  if (pack.policy_documents.length > 10) violations.push(`MANAGED_POLICY_QUOTA_EXCEEDED:${pack.policy_documents.length}`);

  let totalCompactChars = 0;
  for (const docEntry of pack.policy_documents) {
    const compact = JSON.stringify(docEntry.document);
    totalCompactChars += compact.length;
    if (compact.length > 6144) violations.push(`POLICY_SIZE_LIMIT_EXCEEDED:${docEntry.policy_name}:${compact.length}`);
    for (const forbidden of FORBIDDEN_MANAGED_POLICIES) {
      if (compact.includes(forbidden)) violations.push(`FORBIDDEN_ADMIN_DEFAULT:${forbidden}`);
    }
    const statements = Array.isArray(docEntry.document?.Statement) ? docEntry.document.Statement : [];
    for (const stmt of statements) {
      if (stmt.Effect !== 'Allow') continue;
      const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
      const resources = Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource];
      for (const act of actions) {
        const actStr = String(act || '').trim();
        if (FORBIDDEN_BROAD_ACTIONS.has(actStr)) violations.push(`OVERBROAD_ACTION_PROHIBITED:${actStr}`);
        if (actStr === '*' && resources.includes('*')) violations.push('WILDCARD_ACTION_WITH_WILDCARD_RESOURCE');
        if (actStr.toLowerCase() === 'iam:passrole') {
          if (resources.includes('*')) violations.push('UNSCOPED_IAM_PASS_ROLE_WILDCARD_RESOURCE');
          const passedToService = (stmt.Condition as Record<string, Record<string, unknown>> | undefined)?.StringEquals?.['iam:PassedToService'];
          if (!passedToService) violations.push('UNSCOPED_IAM_PASS_ROLE_MISSING_PASSED_TO_SERVICE');
        }
      }
    }
  }
  return { valid: violations.length === 0, status: violations.length === 0 ? 'VALIDATED' : 'REJECTED', violations, totalCompactChars, policyDocumentCount: pack.policy_documents.length };
}
