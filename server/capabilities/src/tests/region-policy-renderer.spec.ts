/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Tests
 * File           : region-policy-renderer.spec.ts
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
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import {
  RegionPolicyRenderer,
  RenderedPolicyDocument,
  LEGITIMATE_WILDCARD_ACTION_REGEX,
  MUTATING_ACTION_REGEX,
} from '../continuity/RegionPolicyRenderer';
import {
  canonicalJson,
  computePolicyDigest,
} from '../continuity/CanonicalPolicyRegistry';

describe('RegionPolicyRenderer', () => {
  let renderer: RegionPolicyRenderer;

  beforeEach(() => {
    renderer = new RegionPolicyRenderer(['eu-west-3', 'eu-west-1']);
  });

  it('rejects invalid 11-digit or non-numeric account IDs', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'Stmt1',
          Effect: 'Allow',
          Action: 'ec2:DescribeInstances',
          Resource: 'arn:aws:ec2:eu-west-3:12345678901:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '12345678901', // 11 digits
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations).toContain("Invalid AWS Account ID '12345678901': must be exactly 12 digits.");
  });

  it('rejects malformed region names', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'Stmt1',
          Effect: 'Allow',
          Action: 'ec2:DescribeInstances',
          Resource: 'arn:aws:ec2:eu-west-3:123456789012:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '123456789012',
      allowedRegions: ['invalid_region_name!'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations[0]).toContain('violates standard AWS region naming pattern');
  });

  it('accepts partitioned AWS region identifiers such as us-gov-west-1', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'GovRegionalRead',
        Effect: 'Allow',
        Action: 'ec2:DescribeInstances',
        Resource: 'arn:aws-us-gov:ec2:${REGION}:${ACCOUNT_ID}:instance/*',
      }],
    };
    const result = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['us-gov-west-1'],
      executionRoleName: 'UgonduCORExecutionRole',
    });
    expect(result.valid).toBe(true);
    expect(result.document.Statement[0].Resource).toBe('arn:aws-us-gov:ec2:us-gov-west-1:971671216490:instance/*');
  });

  it('expands aws:RequestedRegion conditions across every explicitly allowed region', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'MultiRegionRead',
        Effect: 'Allow',
        Action: 'ec2:DescribeInstances',
        Resource: 'arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/*',
        Condition: { StringEquals: { 'aws:RequestedRegion': '${REGION}' } },
      }],
    };
    const result = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3', 'us-gov-west-1'],
      executionRoleName: 'UgonduCORExecutionRole',
    });
    expect(result.valid).toBe(true);
    expect(result.document.Statement[0].Resource).toEqual([
      'arn:aws:ec2:eu-west-3:971671216490:instance/*',
      'arn:aws:ec2:us-gov-west-1:971671216490:instance/*',
    ]);
    expect((result.document.Statement[0].Condition as any).StringEquals['aws:RequestedRegion'])
      .toEqual(['eu-west-3', 'us-gov-west-1']);
  });

  it('requires explicit allowedRegions and rejects missing or empty allowedRegions without eu-west-3 fallback', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ScopedResourceAccess',
          Effect: 'Allow',
          Action: 'ec2:DescribeInstances',
          Resource: 'arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: [],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations).toContain('No allowed regions specified; policy cannot be regionally scoped.');
    // Must NOT have fallen back to eu-west-3; ${REGION} remains unresolved
    expect(res.violations.some((v) => v.includes('contains unresolved template variables'))).toBe(true);
  });

  it('substitutes account, region, role name, and transaction tokens cleanly across Resource', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ScopedResourceAccess',
          Effect: 'Allow',
          Action: 'ec2:RunInstances',
          Resource: 'arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
      transactionId: 'tx-20261021',
    });

    expect(res.valid).toBe(true);
    expect(res.violations.length).toBe(0);
    expect(res.document.Statement[0].Resource).toBe(
      'arn:aws:ec2:eu-west-3:971671216490:instance/*'
    );
  });

  it('substitutes template tokens across Action strings and Condition values', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'ConditionAndActionTokenSubstitution',
          Effect: 'Allow',
          Action: ['ec2:DescribeVolumes', 'sts:AssumeRole'],
          Resource: 'arn:aws:ec2:${REGION}:${ACCOUNT_ID}:volume/*',
          Condition: {
            StringEquals: {
              'aws:RequestedRegion': '${REGION}',
              'aws:PrincipalAccount': '${ACCOUNT_ID}',
              'aws:PrincipalArn': 'arn:aws:iam::${ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}',
            },
            StringLike: {
              'aws:RequestTag/UgonduTransactionId': '${TRANSACTION_ID}',
            },
            ForAllValuesStringEquals: {
              'aws:TagKeys': ['${EXECUTION_ROLE_NAME}'],
            },
          },
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
      transactionId: 'tx-token-sub-001',
    });

    expect(res.valid).toBe(true);
    expect(res.violations.length).toBe(0);

    const stmt = res.document.Statement[0];
    const condition = stmt.Condition as any;
    expect(condition.StringEquals['aws:RequestedRegion']).toBe('eu-west-3');
    expect(condition.StringEquals['aws:PrincipalAccount']).toBe('971671216490');
    expect(condition.StringEquals['aws:PrincipalArn']).toBe(
      'arn:aws:iam::971671216490:role/UgonduCORExecutionRole'
    );
    expect(condition.StringLike['aws:RequestTag/UgonduTransactionId']).toBe('tx-token-sub-001');
    expect(condition.ForAllValuesStringEquals['aws:TagKeys']).toEqual(['UgonduCORExecutionRole']);
  });

  it('permits Resource: "*" for legitimate AWS read/list operations with Effect Allow (finding COR-005)', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowEc2Describe',
          Effect: 'Allow',
          Action: ['ec2:DescribeInstances', 'ec2:DescribeSecurityGroups', 'ec2:DescribeVpcs'],
          Resource: '*',
        },
        {
          Sid: 'AllowS3ListBuckets',
          Effect: 'Allow',
          Action: 's3:ListAllMyBuckets',
          Resource: '*',
        },
        {
          Sid: 'AllowIamRead',
          Effect: 'Allow',
          Action: ['iam:GetRole', 'iam:ListRolePolicies'],
          Resource: '*',
        },
        {
          Sid: 'AllowSsmDescribe',
          Effect: 'Allow',
          Action: 'ssm:DescribeParameters',
          Resource: '*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(true);
    expect(res.violations.length).toBe(0);
  });

  it('detects and rejects unrestricted wildcard * resources on mutating actions', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'WildcardViolationTerminate',
          Effect: 'Allow',
          Action: 'ec2:TerminateInstances',
          Resource: '*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(
      res.violations.some((v) =>
        v.includes("contains unrestricted wildcard '*' resource with mutating actions (ec2:TerminateInstances)")
      )
    ).toBe(true);
  });

  it('rejects wildcard * resource when mutating actions are mixed with read actions', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'MixedActionsWildcard',
          Effect: 'Allow',
          Action: ['ec2:DescribeInstances', 'ec2:RunInstances'],
          Resource: '*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(
      res.violations.some((v) =>
        v.includes("contains unrestricted wildcard '*' resource with mutating actions (ec2:RunInstances)")
      )
    ).toBe(true);
  });

  it('rejects wildcard * resource for non-legitimate read actions or Effect Deny', () => {
    const template: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'WildcardDeny',
          Effect: 'Deny',
          Action: 'ec2:DescribeInstances',
          Resource: '*',
        },
      ],
    };

    const res = renderer.renderPolicy(template, {
      accountId: '971671216490',
      allowedRegions: ['eu-west-3'],
      executionRoleName: 'UgonduCORExecutionRole',
    });

    expect(res.valid).toBe(false);
    expect(res.violations.some((v) => v.includes("contains unrestricted wildcard '*' resource"))).toBe(true);
  });
});

describe('CanonicalPolicyRegistry / canonicalJson & computePolicyDigest', () => {
  it('RegionPolicyRenderer emits the same recursive canonical digest as the canonical policy registry', () => {
    const first: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'CanonicalNestedCondition',
        Effect: 'Allow',
        Action: 'ec2:DescribeInstances',
        Resource: '*',
        Condition: { StringEquals: { 'aws:PrincipalAccount': '971671216490', 'aws:RequestedRegion': 'eu-west-3' } },
      }],
    };
    const reordered: RenderedPolicyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'CanonicalNestedCondition',
        Effect: 'Allow',
        Action: 'ec2:DescribeInstances',
        Resource: '*',
        Condition: { StringEquals: { 'aws:RequestedRegion': 'eu-west-3', 'aws:PrincipalAccount': '971671216490' } },
      }],
    };
    const scope = { accountId: '971671216490', allowedRegions: ['eu-west-3'], executionRoleName: 'UgonduCORExecutionRole' };
    const firstResult = renderer.renderPolicy(first, scope);
    const reorderedResult = renderer.renderPolicy(reordered, scope);
    expect(firstResult.documentSha256).toBe(computePolicyDigest(firstResult.documentJson));
    expect(firstResult.documentSha256).toBe(reorderedResult.documentSha256);
  });

  it('canonicalJson recursively sorts object keys lexicographically', () => {
    const objA = { z: 1, a: 2, m: { y: 'nested', b: true } };
    const objB = { a: 2, m: { b: true, y: 'nested' }, z: 1 };

    expect(canonicalJson(objA)).toBe(canonicalJson(objB));
    expect(canonicalJson(objA)).toBe('{"a":2,"m":{"b":true,"y":"nested"},"z":1}');
  });

  it('canonicalJson handles arrays and primitives deterministically', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson('hello')).toBe('"hello"');
    expect(canonicalJson(123.45)).toBe('123.45');
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson([{ b: 1, a: 2 }, { d: 4, c: 3 }])).toBe(
      '[{"a":2,"b":1},{"c":3,"d":4}]'
    );
  });

  it('computePolicyDigest computes identical SHA-256 for documents with differing key order and whitespace', () => {
    const doc1 = JSON.stringify(
      {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'Stmt1',
            Effect: 'Allow',
            Action: 'ec2:DescribeInstances',
            Resource: '*',
          },
        ],
      },
      null,
      2
    );

    const doc2 = JSON.stringify({
      Statement: [
        {
          Resource: '*',
          Sid: 'Stmt1',
          Action: 'ec2:DescribeInstances',
          Effect: 'Allow',
        },
      ],
      Version: '2012-10-17',
    });

    const digest1 = computePolicyDigest(doc1);
    const digest2 = computePolicyDigest(doc2);

    expect(digest1).toBe(digest2);
    expect(digest1).toMatch(/^[0-9a-f]{64}$/);
  });
});
