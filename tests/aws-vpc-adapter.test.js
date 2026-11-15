/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Plugins / AWS VPC Adapter
 * File           : aws-vpc-adapter.test.js
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const { test, describe, beforeEach } = require('node:test');

// Preload i18n mock if not already present
if (typeof global.__t !== 'function') {
  global.__t = (key, ...args) => `[en] ${key}${args.length ? ' ' + args.join(' ') : ''}`;
}

const {
  AwsVpcReconciler,
  CloudTrailOwnershipEvidenceProvider,
  ActionClassification,
  DefaultSafetyGatesValidator
} = require('../server/plugins/aws-vpc-adapter/dist/aws-vpc-reconciler');

describe('AWS VPC Adapter Plugin — Isolated Lifecycle & Fail-Closed Security', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.AWS_REGION;
  });

  test('VPC-001: Independent Loading — module loads safely without AWS_REGION set', () => {
    assert.strictEqual(typeof AwsVpcReconciler, 'function', 'AwsVpcReconciler should be exported');
    assert.strictEqual(typeof CloudTrailOwnershipEvidenceProvider, 'function');
    assert.strictEqual(typeof DefaultSafetyGatesValidator, 'function');
    assert.strictEqual(ActionClassification.DESTRUCTIVE, 'DESTRUCTIVE');
    assert.strictEqual(ActionClassification.RECOVERABLE, 'RECOVERABLE');
  });

  test('VPC-002: Fail-Closed without Region — throws safety violation on operation execution if region missing', async () => {
    const reconciler = new AwsVpcReconciler();
    await assert.rejects(
      async () => reconciler.createVpc('tx-123', { CidrBlock: '10.0.0.0/16' }),
      /Safety Violation: AWS_REGION must be explicitly specified/
    );
  });

  test('VPC-003: Isolated Lifecycle — createVpc enforces mandatory Ugondu governance tags', async () => {
    let capturedCommand = null;
    const mockEc2Client = {
      send: async (cmd) => {
        capturedCommand = cmd;
        return { Vpc: { VpcId: 'vpc-isolated-001' } };
      }
    };

    const reconciler = new AwsVpcReconciler({
      region: 'eu-west-3',
      ec2Client: mockEc2Client
    });

    const result = await reconciler.createVpc('tx-isolated-99', {
      CidrBlock: '10.100.0.0/16',
      tags: [{ Key: 'CustomEnv', Value: 'Staging' }]
    });

    assert.strictEqual(result.status, 'CREATED');
    assert.strictEqual(result.vpcId, 'vpc-isolated-001');

    const tags = result.tags;
    const corTag = tags.find(t => t.Key === 'UgonduCOR');
    const txTag = tags.find(t => t.Key === 'UgonduTransactionId');
    const customTag = tags.find(t => t.Key === 'CustomEnv');

    assert.ok(corTag, 'UgonduCOR tag must be present');
    assert.strictEqual(corTag.Value, 'true');
    assert.ok(txTag, 'UgonduTransactionId tag must be present');
    assert.strictEqual(txTag.Value, 'tx-isolated-99');
    assert.ok(customTag, 'Caller custom tags must be preserved');
    assert.strictEqual(customTag.Value, 'Staging');
  });

  test('VPC-004: Fail-Closed Ownership Verification — rejects orphan without matching CloudTrail logs', async () => {
    const mockEc2Client = { send: async () => ({}) };
    const reconciler = new AwsVpcReconciler({
      region: 'eu-west-3',
      ec2Client: mockEc2Client
    });

    const envelope = {
      principalArn: 'arn:aws:iam::123456789012:user/alice',
      accountId: '123456789012',
      region: 'eu-west-3',
      resourceId: 'vpc-orphan-999',
      action: 'RECOVER',
      classification: 'ORPHANED_RESOURCE',
      transactionId: 'tx-test-01',
      intentHash: 'hash123',
      policyVersion: '1.0',
      expiration: Date.now() + 60000
    };

    // Mismatched CloudTrail logs (different account)
    const mismatchedLogs = [
      {
        resourceId: 'vpc-orphan-999',
        action: 'CreateVpc',
        rawCloudTrailEvent: JSON.stringify({
          recipientAccountId: '999999999999', // Mismatched account
          awsRegion: 'eu-west-3',
          userIdentity: { arn: 'arn:aws:iam::123456789012:user/alice' }
        })
      }
    ];

    await assert.rejects(
      async () => reconciler.handleOrphanVpc(
        'vpc-orphan-999',
        'RECOVER',
        mismatchedLogs,
        envelope,
        ['sig_valid_human_approval_1']
      ),
      /Ownership not proven|err_ownership_not_proven/
    );
  });

  test('VPC-005: Fail-Closed External Approval — rejects handling orphan without approval signatures', async () => {
    const mockEc2Client = { send: async () => ({}) };
    const reconciler = new AwsVpcReconciler({
      region: 'eu-west-3',
      ec2Client: mockEc2Client
    });

    const envelope = {
      principalArn: 'arn:aws:iam::123456789012:user/alice',
      accountId: '123456789012',
      region: 'eu-west-3',
      resourceId: 'vpc-orphan-999',
      action: 'RECOVER',
      classification: 'ORPHANED_RESOURCE',
      transactionId: 'tx-test-02',
      intentHash: 'hash123',
      policyVersion: '1.0',
      expiration: Date.now() + 60000
    };

    const validLogs = [
      {
        resourceId: 'vpc-orphan-999',
        action: 'CreateVpc',
        rawCloudTrailEvent: JSON.stringify({
          recipientAccountId: '123456789012',
          awsRegion: 'eu-west-3',
          userIdentity: { arn: 'arn:aws:iam::123456789012:user/alice' }
        })
      }
    ];

    await assert.rejects(
      async () => reconciler.handleOrphanVpc(
        'vpc-orphan-999',
        'RECOVER',
        validLogs,
        envelope,
        [] // Empty approval signatures
      ),
      /safety_violation_external_huma/
    );
  });

  test('VPC-006: Proven Recovery Workflow — tags VPC, verifies via describe, and returns signed audit receipt', async () => {
    const calls = [];
    const mockEc2Client = {
      send: async (cmd) => {
        calls.push(cmd);
        // DescribeVpcsCommand response
        return {
          Vpcs: [
            {
              VpcId: 'vpc-recovered-001',
              Tags: [
                { Key: 'UgonduCOR', Value: 'true' },
                { Key: 'COR_Recovered', Value: 'true' }
              ]
            }
          ]
        };
      }
    };

    let safetyActionValidated = false;
    const mockSafetyGates = {
      validateAction: async (ctx) => {
        safetyActionValidated = true;
        assert.strictEqual(ctx.classification, ActionClassification.RECOVERABLE);
        return true;
      }
    };

    const reconciler = new AwsVpcReconciler({
      region: 'eu-west-3',
      ec2Client: mockEc2Client,
      safetyGates: mockSafetyGates
    });

    const envelope = {
      principalArn: 'arn:aws:iam::123456789012:user/operator',
      accountId: '123456789012',
      region: 'eu-west-3',
      resourceId: 'vpc-recovered-001',
      action: 'RECOVER',
      classification: 'ORPHANED_RESOURCE',
      transactionId: 'tx-recover-01',
      intentHash: 'intent_hash_abc_123',
      policyVersion: '1.0',
      expiration: Date.now() + 60000
    };

    const cloudTrailLogs = [
      {
        resourceId: 'vpc-recovered-001',
        action: 'CreateVpc',
        rawCloudTrailEvent: JSON.stringify({
          recipientAccountId: '123456789012',
          awsRegion: 'eu-west-3',
          userIdentity: { arn: 'arn:aws:iam::123456789012:user/operator' }
        })
      }
    ];

    const result = await reconciler.handleOrphanVpc(
      'vpc-recovered-001',
      'RECOVER',
      cloudTrailLogs,
      envelope,
      ['sig_human_operator_approval_001'],
      'tx-recover-01'
    );

    assert.strictEqual(result.status, 'RECOVERED');
    assert.strictEqual(result.vpcId, 'vpc-recovered-001');
    assert.ok(result.evidence);
    assert.strictEqual(result.evidence.intentHash, 'intent_hash_abc_123');
    assert.strictEqual(result.evidence.signature, 'sig_human_operator_approval_001');
    assert.strictEqual(result.evidence.verificationMethod, 'aws-api-describe-vpcs');
    assert.strictEqual(safetyActionValidated, true, 'Safety gate must be validated');
  });

  test('VPC-007: Destructive Cleanup Gate — enforces DESTRUCTIVE classification and refuses untagged delete', async () => {
    const mockEc2Client = {
      send: async () => ({
        Vpcs: [
          {
            VpcId: 'vpc-unowned-delete',
            Tags: [] // Missing UgonduCOR tags
          }
        ]
      })
    };

    let classifiedAsDestructive = false;
    const mockSafetyGates = {
      validateAction: async (ctx) => {
        if (ctx.classification === ActionClassification.DESTRUCTIVE) {
          classifiedAsDestructive = true;
        }
        return true;
      }
    };

    const reconciler = new AwsVpcReconciler({
      region: 'eu-west-3',
      ec2Client: mockEc2Client,
      safetyGates: mockSafetyGates
    });

    const envelope = {
      principalArn: 'arn:aws:iam::123456789012:user/admin',
      accountId: '123456789012',
      region: 'eu-west-3',
      resourceId: 'vpc-unowned-delete',
      action: 'CLEANUP',
      classification: 'DESTRUCTIVE',
      transactionId: 'tx-clean-01',
      intentHash: 'intent_destructive_01',
      policyVersion: '1.0',
      expiration: Date.now() + 60000
    };

    const cloudTrailLogs = [
      {
        resourceId: 'vpc-unowned-delete',
        action: 'CreateVpc',
        rawCloudTrailEvent: JSON.stringify({
          recipientAccountId: '123456789012',
          awsRegion: 'eu-west-3',
          userIdentity: { arn: 'arn:aws:iam::123456789012:user/admin' }
        })
      }
    ];

    // Must fail because VPC tags are missing UgonduCOR
    await assert.rejects(
      async () => reconciler.handleOrphanVpc(
        'vpc-unowned-delete',
        'CLEANUP',
        cloudTrailLogs,
        envelope,
        ['sig_admin_delete_approval_1'],
        'tx-clean-01'
      ),
      /Refusing to delete VPC vpc-unowned-delete: missing ownership tags/
    );

    assert.strictEqual(classifiedAsDestructive, true, 'Action must be classified as DESTRUCTIVE');
  });
});
