/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Universal Bootstrap & Cloud Provisioning Tests
 * File           : universal-bootstrap-runtime.spec.ts
 * Version        : 1.0.0
 * Author         : Ignatus Chika UJOMOR / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (RCS Paris 943 432 534)
 * Created Date   : 2026-10-26
 * Last Modified  : 2026-10-26
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Policy Governed (https://policies.airroofers.eu)
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001:2022 / SOC 2 Type II / OWASP ASVS 4.0.3 / NIST SP 800-53 Rev. 5
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import {
  CanonicalPolicyRegistry,
  UniversalBootstrapRuntime,
  UNIVERSAL_BOOTSTRAP_LIFECYCLE_STAGES,
  POLICY_PACK_LIFECYCLE_STAGES,
} from '../continuity';

describe('UniversalBootstrapRuntime (UG-UPLM-BOOTSTRAP-UNIVERSAL-001)', () => {
  const repoRoot = UniversalBootstrapRuntime.resolveRepositoryRoot();
  const dumcholuTemplatePath = path.join(
    repoRoot,
    'infrastructure/aws/dumcholu-pilot-staging.yaml'
  );

  it('loads and validates the canonical universal bootstrap governance bundle via CanonicalPolicyRegistry', () => {
    const registry = new CanonicalPolicyRegistry();
    const gov = registry.getUniversalBootstrapGovernance(repoRoot);

    expect(gov.bundle.bundle_id).toBe('ugondu.universal-bootstrap.bundle');
    expect(gov.bundle.task_id).toBe('UG-UPLM-BOOTSTRAP-UNIVERSAL-001');
    expect(gov.bundle.bundle_invariants.fail_closed).toBe(true);
    expect(gov.capabilities.governance.legal_policy_authority).toBe(
      'https://policies.airroofers.eu'
    );
    expect(UNIVERSAL_BOOTSTRAP_LIFECYCLE_STAGES).toHaveLength(11);
    expect(POLICY_PACK_LIFECYCLE_STAGES).toHaveLength(9);

    const roles = registry.listUniversalCatalogRoles(repoRoot);
    expect(roles.map((r) => r.role_id)).toEqual(
      expect.arrayContaining([
        'bootstrap_authority',
        'runner_base',
        'execution_role',
        'iac_service_role',
        'workload_runtime_role',
        'dns_certificate_role',
        'state_artifact_role',
        'observer_verifier',
      ])
    );
    const runner = roles.find((r) => r.role_id === 'runner_base');
    expect(runner?.may_mutate_cloud_workloads).toBe(false);
    expect(runner?.scope.length).toBeGreaterThan(10);
  });

  it('parses infrastructure/aws/dumcholu-pilot-staging.yaml and derives a plan-bound policy pack', () => {
    expect(fs.existsSync(dumcholuTemplatePath)).toBe(true);
    const templateContent = fs.readFileSync(dumcholuTemplatePath, 'utf8');
    const resources =
      UniversalBootstrapRuntime.parseCloudFormationTemplateResources(templateContent);

    expect(resources).toHaveLength(15);
    expect(resources.map((r) => r.logicalId)).toEqual(
      expect.arrayContaining([
        'MonthlyCostBudget',
        'PilotVPC',
        'InternetGateway',
        'AttachGateway',
        'PublicSubnet',
        'PublicRouteTable',
        'DefaultPublicRoute',
        'SubnetRouteTableAssociation',
        'SharedWebSecurityGroup',
        'DumcholuBackendSecurityGroup',
        'UgonduBackendSecurityGroup',
        'UUVBackendSecurityGroup',
        'PilotInstanceRole',
        'PilotInstanceProfile',
        'PilotHostInstance',
      ])
    );

    const graph = UniversalBootstrapRuntime.derivePlanOperationGraph({
      accountId: '971671216490',
      region: 'eu-west-3',
      environment: 'staging',
      projectSlug: 'dumcholu',
      transactionId: 'tx-dumcholu-staging-001',
      callerPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      executionRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      iacServiceRoleArn: 'arn:aws:iam::971671216490:role/UgonduIacServiceRole',
      cloudFormationTemplateContent: templateContent,
      cloudFormationStackName: 'dumcholu-staging-stack',
    });

    expect(graph.status).toBe('READY');
    expect(graph.exitCode).toBe(0);
    expect(graph.operations.length).toBe(15);
    const budgetOperation = graph.operations.find((operation) => operation.resourceType === 'AWS::Budgets::Budget');
    expect(budgetOperation?.capabilityId).toBe('cap.cost.aws_budget');
    expect(budgetOperation?.resourceArns).toContain(
      'arn:aws:budgets::971671216490:budget:airroofers-staging-monthly-cost-budget',
    );
    expect(budgetOperation?.providerActions).toEqual(
      expect.arrayContaining(['budgets:CreateBudget', 'budgets:ModifyBudget', 'budgets:DescribeBudget']),
    );
    expect(graph.capabilityIds).toEqual(
      expect.arrayContaining([
        'cap.iac.cloudformation_stack',
        'cap.workload.runtime_compute_data',
        'cap.bootstrap.policy_synthesis',
      ])
    );

    const pack = UniversalBootstrapRuntime.generatePlanBoundPolicyPack({
      graph,
      roleId: 'execution_role',
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
    });

    expect(pack.plan_digest).toBe(graph.planDigest);
    expect(pack.policy_documents.length).toBeGreaterThanOrEqual(1);
    const validation = UniversalBootstrapRuntime.validatePolicyPackAgainstContract(pack);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);
  });

  it('fails closed with AUTHORITY_GAP when a template or plan contains an unmapped resource type', () => {
    const unknownTemplate = [
      "AWSTemplateFormatVersion: '2010-09-09'",
      'Resources:',
      '  UnknownResource:',
      '    Type: AWS::Quantum::UnmappedWidget',
      '    Properties:',
      '      Name: test',
    ].join('\n');

    const graph = UniversalBootstrapRuntime.derivePlanOperationGraph({
      accountId: '971671216490',
      region: 'eu-west-3',
      environment: 'staging',
      projectSlug: 'dumcholu',
      transactionId: 'tx-unmapped-001',
      callerPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      executionRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      cloudFormationTemplateContent: unknownTemplate,
    });

    expect(graph.status).toBe('AUTHORITY_GAP');
    expect(graph.exitCode).toBe(1);
    expect(graph.authorityGap?.terminalStatus).toBe('AUTHORITY_GAP');
    expect(graph.authorityGap?.rootCauseCategory).toBe('UNMAPPED_PLAN_OPERATION');
    expect(graph.authorityGap?.unmappedResourceTypes).toContain('AWS::Quantum::UnmappedWidget');
    expect(graph.authorityGap?.mutationsAttemptedAfterGap).toBe(0);

    expect(() =>
      UniversalBootstrapRuntime.generatePlanBoundPolicyPack({
        graph,
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      })
    ).toThrow('AUTHORITY_GAP');
  });

  it('enforces ACM us-east-1 for CloudFront viewer certificates and target region for regional services', () => {
    const badCloudFrontCert = UniversalBootstrapRuntime.derivePlanOperationGraph({
      accountId: '971671216490',
      region: 'eu-west-3',
      environment: 'production',
      projectSlug: 'ugondu',
      transactionId: 'tx-acm-bad-cf',
      callerPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      executionRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      acmCertificateRequest: {
        domainName: 'ugondu.airroofers.eu',
        certificateUsage: 'CLOUDFRONT_VIEWER',
        certificateRegion: 'eu-west-3',
      },
    });
    expect(badCloudFrontCert.status).toBe('AUTHORITY_GAP');
    expect(badCloudFrontCert.exitCode).toBe(1);
    expect(badCloudFrontCert.authorityGap?.rootCauseCategory).toBe('WRONG_ACCOUNT_OR_REGION');

    const validCloudFrontDnsStack = UniversalBootstrapRuntime.derivePlanOperationGraph({
      accountId: '971671216490',
      region: 'eu-west-3',
      environment: 'production',
      projectSlug: 'ugondu',
      transactionId: 'tx-acm-valid-cf',
      callerPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      executionRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      acmCertificateRequest: {
        domainName: 'ugondu.airroofers.eu',
        certificateUsage: 'CLOUDFRONT_VIEWER',
        certificateRegion: 'us-east-1',
      },
      dnsOperations: [
        {
          hostedZoneId: 'Z0123456789ABCDEF',
          recordName: '_acme-challenge.ugondu.airroofers.eu',
          recordType: 'CNAME',
          action: 'UPSERT',
        },
      ],
      cloudFrontDistribution: {
        domainAliases: ['ugondu.airroofers.eu'],
        viewerCertificateArn:
          'arn:aws:acm:us-east-1:971671216490:certificate/11111111-2222-3333-4444-555555555555',
      },
    });

    expect(validCloudFrontDnsStack.status).toBe('READY');
    expect(validCloudFrontDnsStack.exitCode).toBe(0);
    expect(validCloudFrontDnsStack.capabilityIds).toEqual(
      expect.arrayContaining([
        'cap.tls.acm_certificate',
        'cap.dns.route53_records',
        'cap.cdn.cloudfront_distribution',
      ])
    );
  });

  it('derives Terraform S3 + DynamoDB + KMS state backend and resource permissions', () => {
    const tfGraph = UniversalBootstrapRuntime.derivePlanOperationGraph({
      accountId: '971671216490',
      region: 'eu-west-3',
      environment: 'staging',
      projectSlug: 'ugondu',
      transactionId: 'tx-tf-001',
      callerPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      executionRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      terraformBackend: {
        stateBucket: 'airroofers-terraform-state-eu-west-3',
        stateKeyPrefix: 'ugondu/staging/',
        lockTableName: 'airroofers-terraform-locks',
        kmsKeyArn: 'arn:aws:kms:eu-west-3:971671216490:key/mrk-1234567890',
      },
      terraformResources: [
        { address: 'aws_vpc.main', type: 'aws_vpc' },
        { address: 'aws_s3_bucket.artifacts', type: 'aws_s3_bucket' },
      ],
    });

    expect(tfGraph.status).toBe('READY');
    expect(tfGraph.capabilityIds).toContain('cap.iac.terraform_workspace');
    const pack = UniversalBootstrapRuntime.generatePlanBoundPolicyPack({
      graph: tfGraph,
      roleId: 'state_artifact_role',
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduStateArtifactRole',
    });
    expect(UniversalBootstrapRuntime.validatePolicyPackAgainstContract(pack).valid).toBe(true);
  });

  it('rejects overbroad actions, unscoped iam:PassRole, and runner_base workload mutation bindings', () => {
    const tfGraph = UniversalBootstrapRuntime.derivePlanOperationGraph({
      accountId: '971671216490',
      region: 'eu-west-3',
      environment: 'staging',
      projectSlug: 'ugondu',
      transactionId: 'tx-guard-001',
      callerPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      executionRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      terraformResources: [{ address: 'aws_vpc.main', type: 'aws_vpc' }],
    });

    expect(() =>
      UniversalBootstrapRuntime.generatePlanBoundPolicyPack({
        graph: tfGraph,
        roleId: 'runner_base',
        targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
      })
    ).toThrow('PROHIBITED_MUTATION_ROLE_BINDING');

    const validPack = UniversalBootstrapRuntime.generatePlanBoundPolicyPack({
      graph: tfGraph,
      roleId: 'execution_role',
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
    });

    const tamperedPack = JSON.parse(JSON.stringify(validPack));
    tamperedPack.policy_documents[0].document.Statement.push({
      Sid: 'ForbiddenBroad',
      Effect: 'Allow',
      Action: ['cloudformation:*', 'iam:PassRole'],
      Resource: ['*'],
    });

    const validation = UniversalBootstrapRuntime.validatePolicyPackAgainstContract(tamperedPack);
    expect(validation.valid).toBe(false);
    expect(validation.violations).toEqual(
      expect.arrayContaining([
        'OVERBROAD_ACTION_PROHIBITED:cloudformation:*',
        'UNSCOPED_IAM_PASS_ROLE_WILDCARD_RESOURCE',
        'UNSCOPED_IAM_PASS_ROLE_MISSING_PASSED_TO_SERVICE',
      ])
    );
  });

  it('diagnoses SCP, permissions boundary, trust policy, and missing iam:PassRole denials accurately', () => {
    const scpDenial = UniversalBootstrapRuntime.diagnoseBootstrapDenial({
      rawErrorMessage:
        'User: arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/tx is not authorized to perform: ec2:RunInstances with an explicit deny in a service control policy',
      callerPrincipalArn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/tx',
      targetAccountId: '971671216490',
      targetRegion: 'eu-west-3',
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      deniedActions: ['ec2:RunInstances'],
      affectedResourceArns: ['arn:aws:ec2:eu-west-3:971671216490:instance/*'],
      planDigest: 'a'.repeat(64),
    });
    expect(scpDenial.terminalStatus).toBe('AUTHORITY_GAP');
    expect(scpDenial.exitCode).toBe(1);
    expect(scpDenial.rootCauseCategory).toBe('SCP_DENY');
    expect(scpDenial.mutationsAttemptedAfterGap).toBe(0);
    expect(
      scpDenial.remediationOptions.optionBOperatorHandoff.leastPrivilegePolicyDocument
    ).toBeDefined();

    const boundaryDenial = UniversalBootstrapRuntime.diagnoseBootstrapDenial({
      rawErrorMessage: 'AccessDenied: denied by permissions boundary',
      callerPrincipalArn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/tx',
      targetAccountId: '971671216490',
      targetRegion: 'eu-west-3',
      targetRoleArn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
      deniedActions: ['iam:CreateRole'],
      affectedResourceArns: ['arn:aws:iam::971671216490:role/dumcholu-*'],
      planDigest: 'b'.repeat(64),
    });
    expect(boundaryDenial.rootCauseCategory).toBe('PERMISSIONS_BOUNDARY_DENY');
  });

  it('resolves capability access across Community, Professional, and Enterprise editions with non-dead-end paths', () => {
    const commCfn = UniversalBootstrapRuntime.resolveUniversalCapabilityAccess(
      'cap.iac.cloudformation_stack',
      'community',
      repoRoot
    );
    expect(commCfn.supported).toBe(true);
    expect(commCfn.deliveryMode).toBe('GUIDED_OPERATOR_HANDOFF');
    expect(commCfn.governingPoliciesUrl).toBe('https://policies.airroofers.eu');

    const entCfn = UniversalBootstrapRuntime.resolveUniversalCapabilityAccess(
      'cap.iac.cloudformation_stack',
      'enterprise',
      repoRoot
    );
    expect(entCfn.supported).toBe(true);
    expect(entCfn.deliveryMode).toBe('AUTONOMOUS_OR_DELEGATED');
  });
});
