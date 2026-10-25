/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE / UPLM — Policy Pack Loader & Deterministic Renderer
 * File           : UplmPackLoaderAndRenderer.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (RCS Paris 943 432 534)
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE
 *
 * Governance     : Corporate Policy Governed | Security Reviewed | Protocol Frozen
 * Standards      : ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { __t } from '@ugondu/shared';
import type { ResolvedEnvironment } from './UplmTypes';

export interface PolicyPackPolicyEntry {
  logicalId: string;
  physicalName: string;
  templatePath: string;
  sha256: string;
  statementCount: number;
  compactCharLength: number;
  targetRoleLogicalId: string;
  description: string;
  sids: string[];
}

export interface PolicyPackRoleEntry {
  logicalId: string;
  physicalName: string;
  arn: string;
  roleKind: 'EXECUTION_ROLE' | 'RUNNER_ROLE';
  templatePath: string;
  sha256: string;
  description: string;
  trustedPrincipalArn?: string;
  prohibitExecutionPolicyAttachment: boolean;
}

export interface LoadedPolicyPack {
  packDir: string;
  id: string;
  name: string;
  version: string;
  providerId: string;
  accountId: string;
  region: string;
  trustedRelease: boolean;
  roles: PolicyPackRoleEntry[];
  policies: PolicyPackPolicyEntry[];
  quotas: {
    maxManagedPolicySizeChars: number;
    maxManagedPoliciesPerRole: number;
    requiredManagedPolicySlots: number;
    maxVersionsPerManagedPolicy: number;
    totalStatementsInPack: number;
  };
  safetyGuardrails: {
    preserveUnattachedTestFixture: boolean;
    firstRunReadOnly: boolean;
    prohibitRunnerExecutionAttachment: boolean;
    prohibitInlinePaste: boolean;
    prohibitSelfEscalation: boolean;
    blockOnUnknownTrustPrincipal: boolean;
    requireInspectAndPlanBeforeAttach: boolean;
  };
}

export interface RenderedPolicyArtifact {
  logicalId: string;
  physicalName: string;
  targetRoleArn: string;
  renderedDocument: Record<string, unknown>;
  canonicalJson: string;
  sha256: string;
  compactCharLength: number;
  statementCount: number;
  sids: string[];
}

const ALLOWED_IAM_RUNTIME_VARIABLES = new Set(['${aws:PrincipalTag/UgonduTransactionId}']);
const ALLOWED_TEMPLATE_VARIABLES = new Set([
  'accountId', 'region', 'partition', 'targetRoleName', 'runnerRoleName', 'transactionId',
]);
const SECRET_DETECTION_REGEX =
  /(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|aws_secret_access_key|secretAccessKey|sessionToken|BEGIN [A-Z ]*PRIVATE KEY)/i;

/** Loads and validates the AWS COR V9 policy pack from `policy-packs/aws/cor`. */
export class UplmPackLoaderAndRenderer {
  static resolveDefaultAwsCorPackDir(): string {
    const candidates = [
      path.resolve(__dirname, '../../../../policy-packs/aws/cor'),
      path.resolve(process.cwd(), 'policy-packs/aws/cor'),
      path.resolve(process.cwd(), '../../policy-packs/aws/cor'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(c, 'pack.yaml'))) return c;
    }
    return candidates[0];
  }

  static loadAwsCorV9Pack(packDir = UplmPackLoaderAndRenderer.resolveDefaultAwsCorPackDir()): LoadedPolicyPack {
    const packYamlPath = path.join(packDir, 'pack.yaml');
    const schemaPath = path.join(packDir, 'schema', 'policy-pack.schema.json');

    if (!fs.existsSync(packYamlPath)) {
      throw new Error(__t('uplm.error.missing_pack_yaml', { packYamlPath }));
    }
    if (!fs.existsSync(schemaPath)) {
      throw new Error(__t('uplm.error.missing_pack_schema', { schemaPath }));
    }

    const packYamlContent = fs.readFileSync(packYamlPath, 'utf8');
    if (!packYamlContent.includes('apiVersion: uplm.ugondu.io/v1') || !packYamlContent.includes('kind: PolicyPack')) {
      throw new Error(__t('uplm.error.invalid_api_version'));
    }

    const pack: LoadedPolicyPack = {
      packDir,
      id: 'aws.cor.v9',
      name: 'Ugondu COR V9 Split Managed Policy Pack',
      version: '9.0.0',
      providerId: 'aws',
      accountId: '971671216490',
      region: 'eu-west-3',
      trustedRelease: true,
      roles: [
        {
          logicalId: 'execution-role',
          physicalName: 'UgonduCORExecutionRole',
          arn: 'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
          roleKind: 'EXECUTION_ROLE',
          templatePath: 'templates/roles/execution-role-trust.json',
          sha256: '48d7f97020616f8a68688bc24c08ae31df4dbd8dcf12910b9be7fd7dc0272214',
          description: 'Target execution role for Ugondu COR V9 split managed policies.',
          trustedPrincipalArn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
          prohibitExecutionPolicyAttachment: false,
        },
        {
          logicalId: 'runner-role',
          physicalName: 'UgonduCORRunner',
          arn: 'arn:aws:iam::971671216490:role/UgonduCORRunner',
          roleKind: 'RUNNER_ROLE',
          templatePath: 'templates/roles/runner-assume-role.json',
          sha256: '05851db93e89fcc0b2ef7db76d5c66ae5f5862e5dbaed05c20910f4fe56c2053',
          description: 'GitHub OIDC / runner base role allowed only to assume UgonduCORExecutionRole with session tags.',
          prohibitExecutionPolicyAttachment: true,
        },
      ],
      policies: [
        {
          logicalId: 'discovery',
          physicalName: 'UgonduCOR-V9-Discovery',
          templatePath: 'templates/policies/discovery.json',
          sha256: 'a924036937a4c6e5a6baeef040b6e01b0f925ed83db5f661c3697d8799db9fa2',
          statementCount: 2,
          compactCharLength: 832,
          targetRoleLogicalId: 'execution-role',
          description: 'Read-only SSM and global resource discovery statements (2 statements).',
          sids: ['AllowRegionIndependentSSM', 'AllowGlobalReadDiscovery'],
        },
        {
          logicalId: 'ec2-creation',
          physicalName: 'UgonduCOR-V9-EC2-Creation',
          templatePath: 'templates/policies/ec2-creation.json',
          sha256: '480fee8c64d81dc29b2bef0ad1b0f2d60552929807b59b1103a9a5943fe08e1d',
          statementCount: 9,
          compactCharLength: 3927,
          targetRoleLogicalId: 'execution-role',
          description: 'Transaction-tagged EC2 VPC, subnet, IGW, route table, SG, snapshot, and instance creation (9 statements).',
          sids: [
            'CreateTaggedVpc', 'CreateTaggedSubnet', 'CreateTaggedInternetGateway',
            'CreateTaggedRouteTable', 'CreateTaggedSecurityGroup', 'CreateTaggedSnapshot',
            'LaunchTaggedInstanceTags', 'LaunchTaggedInstanceReadOnly', 'AllowTaggingDuringCreation',
          ],
        },
        {
          logicalId: 'ec2-cleanup',
          physicalName: 'UgonduCOR-V9-EC2-Cleanup',
          templatePath: 'templates/policies/ec2-cleanup.json',
          sha256: '2ac6041170ec7587fefdd2b6657d232d3087607dc89172a7f20f3d432978b0e5',
          statementCount: 12,
          compactCharLength: 4989,
          targetRoleLogicalId: 'execution-role',
          description: 'Ownership tag protection and transaction-scoped EC2 cleanup and routing operations (12 statements).',
          sids: [
            'DenyRemovalOfUgonduOwnershipTags', 'EnforceDeleteVpc', 'EnforceDeleteSubnet',
            'EnforceDeleteInternetGateway', 'EnforceDeleteRouteTable', 'EnforceDeleteSecurityGroup',
            'EnforceTerminateInstances', 'EnforceDeleteNetworkInterface', 'EnforceDeleteSnapshot',
            'AllowAttachDetachGateway', 'AllowRouteTableAssoc', 'AllowRouteOps',
          ],
        },
        {
          logicalId: 'rds-s3',
          physicalName: 'UgonduCOR-V9-RDS-S3',
          templatePath: 'templates/policies/rds-s3.json',
          sha256: 'f4c205fd467b7b07c0e44cd6f40b21e1e1227cb0f097137230d88a95013b78f8',
          statementCount: 11,
          compactCharLength: 4104,
          targetRoleLogicalId: 'execution-role',
          description: 'Transaction-isolated RDS instance/snapshot/subnet-group and S3 bucket/object lifecycle permissions (11 statements).',
          sids: [
            'AllowRDSTaggingDuringCreation', 'CreateTransactionTaggedDBInstance',
            'CreateTransactionTaggedDBSnapshot', 'CreateTransactionTaggedDBSubnetGroup',
            'EnforceDBInstanceDestructiveBounds', 'EnforceDBSnapshotDestructiveBounds',
            'EnforceDBSubnetGroupDestructiveBounds', 'EnforceS3BucketCreation',
            'EnforceS3BucketTagging', 'EnforceS3BucketOperations', 'EnforceS3ObjectOperations',
          ],
        },
        {
          logicalId: 'ecr-ecs',
          physicalName: 'UgonduCOR-V9-ECR-ECS',
          templatePath: 'templates/policies/ecr-ecs.json',
          sha256: '09e8e53d76c6deeb73e10c413f0bc88ed5321642392d287edcb6da09257ff560',
          statementCount: 12,
          compactCharLength: 5170,
          targetRoleLogicalId: 'execution-role',
          description: 'Transaction-scoped ECR repository, ECS cluster/service/task-definition, tag-stripping deny, and scoped PassRole (12 statements).',
          sids: [
            'AllowECRTaggingDuringCreation', 'AllowECSTaggingDuringCreation', 'CreateECROperations',
            'EnforceECROperations', 'CreateECSTaskDefinition', 'CreateECSCluster',
            'CreateECSService', 'DeregisterECSTaskDefinition', 'DeleteECSCluster',
            'ModifyECSService', 'DenyECSTagStripping', 'AllowPassRoleForECS',
          ],
        },
      ],
      quotas: {
        maxManagedPolicySizeChars: 6144,
        maxManagedPoliciesPerRole: 10,
        requiredManagedPolicySlots: 5,
        maxVersionsPerManagedPolicy: 5,
        totalStatementsInPack: 46,
      },
      safetyGuardrails: {
        preserveUnattachedTestFixture: true,
        firstRunReadOnly: true,
        prohibitRunnerExecutionAttachment: true,
        prohibitInlinePaste: true,
        prohibitSelfEscalation: true,
        blockOnUnknownTrustPrincipal: true,
        requireInspectAndPlanBeforeAttach: true,
      },
    };

    UplmPackLoaderAndRenderer.verifyPackIntegrity(pack);
    return pack;
  }

  static verifyPackIntegrity(pack: LoadedPolicyPack): void {
    let totalStatements = 0;
    const seenSids = new Set<string>();

    for (const role of pack.roles) {
      const fullPath = path.join(pack.packDir, role.templatePath);
      const raw = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
      const digest = createHash('sha256').update(raw).digest('hex');
      if (digest !== role.sha256) {
        throw new Error(
          __t('uplm.error.role_sha_mismatch', { templatePath: role.templatePath, expected: role.sha256, actual: digest })
        );
      }
    }

    for (const policy of pack.policies) {
      const fullPath = path.join(pack.packDir, policy.templatePath);
      const raw = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
      const digest = createHash('sha256').update(raw).digest('hex');
      if (digest !== policy.sha256) {
        throw new Error(
          __t('uplm.error.policy_sha_mismatch', { templatePath: policy.templatePath, expected: policy.sha256, actual: digest })
        );
      }
      const parsed = JSON.parse(raw) as { Version: string; Statement: Array<{ Sid: string }> };
      const compactLen = JSON.stringify(parsed).length;
      if (compactLen !== policy.compactCharLength) {
        throw new Error(
          __t('uplm.error.compact_length_mismatch', { physicalName: policy.physicalName, expected: policy.compactCharLength, actual: compactLen })
        );
      }
      if (compactLen > pack.quotas.maxManagedPolicySizeChars) {
        throw new Error(
          __t('uplm.error.policy_size_exceeded', { physicalName: policy.physicalName, actual: compactLen, limit: pack.quotas.maxManagedPolicySizeChars })
        );
      }
      if (parsed.Statement.length !== policy.statementCount) {
        throw new Error(
          __t('uplm.error.statement_count_mismatch', { physicalName: policy.physicalName, expected: policy.statementCount, actual: parsed.Statement.length })
        );
      }
      for (const stmt of parsed.Statement) {
        if (seenSids.has(stmt.Sid)) {
          throw new Error(__t('uplm.error.duplicate_sid', { sid: stmt.Sid }));
        }
        seenSids.add(stmt.Sid);
      }
      totalStatements += parsed.Statement.length;
    }

    if (totalStatements !== pack.quotas.totalStatementsInPack) {
      throw new Error(
        __t('uplm.error.total_statements_mismatch', { actual: totalStatements, expected: pack.quotas.totalStatementsInPack })
      );
    }
  }

  /** Renders a policy template using a validated `ResolvedEnvironment` with §4.4 invariants. */
  static renderTemplateObject(
    template: Record<string, unknown>,
    env: ResolvedEnvironment,
    expectedScope?: { accountId: string; region: string }
  ): { canonicalJson: string; sha256: string; rendered: Record<string, unknown> } {
    if (expectedScope) {
      if (env.accountId !== expectedScope.accountId) {
        throw new Error(
          __t('uplm.error.account_mismatch', { actual: env.accountId, expected: expectedScope.accountId })
        );
      }
      if (env.region !== expectedScope.region) {
        throw new Error(
          __t('uplm.error.region_mismatch', { actual: env.region, expected: expectedScope.region })
        );
      }
    }

    if (!env.transactionId || !/^[a-zA-Z0-9_-]{3,64}$/.test(env.transactionId)) {
      throw new Error(__t('uplm.error.invalid_transaction_id', { transactionId: env.transactionId }));
    }

    const availableSlots = env.quotas.maxManagedPoliciesPerRole - env.quotas.currentAttachedManagedPolicies;
    if (availableSlots < 5) {
      throw new Error(
        __t('uplm.error.slots_remaining', { availableSlots })
      );
    }

    const variableValues: Record<string, string> = {
      accountId: env.accountId,
      region: env.region,
      partition: env.partition,
      targetRoleName: env.targetRoleName,
      runnerRoleName: env.runnerRoleName ?? 'UgonduCORRunner',
      transactionId: env.transactionId,
    };

    const transformValue = (val: unknown): unknown => {
      if (typeof val === 'string') {
        if (SECRET_DETECTION_REGEX.test(val)) {
          throw new Error(__t('uplm.error.secrets_prohibited'));
        }

        const resolved = val.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_match, varName: string) => {
          if (!ALLOWED_TEMPLATE_VARIABLES.has(varName)) {
            throw new Error(__t('uplm.error.unknown_template_variable', { varName }));
          }
          const replacement = variableValues[varName];
          if (!replacement) {
            throw new Error(__t('uplm.error.variable_no_value', { varName }));
          }
          return replacement;
        });

        if (resolved.includes('{{') || resolved.includes('}}')) {
          throw new Error(__t('uplm.error.malformed_mustache', { resolved }));
        }

        const dollarMatches = resolved.match(/\$\{[^}]*\}/g) ?? [];
        for (const dm of dollarMatches) {
          if (!ALLOWED_IAM_RUNTIME_VARIABLES.has(dm)) {
            throw new Error(__t('uplm.error.disallowed_expression', { expression: dm }));
          }
        }

        return resolved;
      }
      if (Array.isArray(val)) return val.map((item) => transformValue(item));
      if (val !== null && typeof val === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
          out[k] = transformValue(v);
        }
        return out;
      }
      return val;
    };

    const rendered = transformValue(template) as Record<string, unknown>;
    const canonicalJson = JSON.stringify(rendered);
    if (canonicalJson.length > env.quotas.maxManagedPolicySizeChars) {
      throw new Error(
        __t('uplm.error.rendered_policy_size_exceeded', { actual: canonicalJson.length, limit: env.quotas.maxManagedPolicySizeChars })
      );
    }

    const sha256 = createHash('sha256').update(canonicalJson).digest('hex');
    return { canonicalJson, sha256, rendered };
  }

  static renderAllAwsCorPolicies(
    env: ResolvedEnvironment,
    pack = UplmPackLoaderAndRenderer.loadAwsCorV9Pack()
  ): RenderedPolicyArtifact[] {
    return pack.policies.map((p) => {
      const fullPath = path.join(pack.packDir, p.templatePath);
      const raw = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const { canonicalJson, rendered } = UplmPackLoaderAndRenderer.renderTemplateObject(
        parsed,
        env,
        { accountId: pack.accountId, region: pack.region }
      );
      return {
        logicalId: p.logicalId,
        physicalName: p.physicalName,
        targetRoleArn: env.targetRoleArn,
        renderedDocument: rendered,
        canonicalJson,
        sha256: p.sha256,
        compactCharLength: canonicalJson.length,
        statementCount: p.statementCount,
        sids: [...p.sids],
      };
    });
  }
}
