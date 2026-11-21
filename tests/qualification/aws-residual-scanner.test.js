/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Qualification — AWS Residual Scanner Qualification
 * File           : aws-residual-scanner.test.js
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 * Governance     : Corporate Policy Governed | Security Reviewed
 * Standards      : ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { AwsResidualScanner } = require(path.resolve(__dirname, '../../server/engine-core/dist/assurance/fault/aws-residual-scanner.js'));

describe('POST-COR-002: AWS Residual Scanner Least-Privilege Remediation', () => {
  test('RES-001: Manifest-based scanning verifies clean S3 deletion via HeadBucket (404)', async () => {
    const scanner = new AwsResidualScanner('eu-west-3');
    // Mock EC2, RDS, and S3 clients on the scanner instance
    scanner.ec2 = {
      describeVpcs: async () => ({ Vpcs: [] }),
      describeSubnets: async () => ({ Subnets: [] }),
      describeInstances: async () => ({ Reservations: [] }),
    };
    scanner.rds = {
      describeDBInstances: async () => ({ DBInstances: [] }),
    };
    scanner.s3 = {
      headBucket: async ({ Bucket }) => {
        const err = new Error('NotFound');
        err.$metadata = { httpStatusCode: 404 };
        err.name = 'NotFound';
        throw err;
      },
      listBuckets: async () => {
        throw new Error('s3:ListAllMyBuckets should NOT be called when manifest is provided');
      }
    };

    const mockManifest = {
      listResources: () => [
        { type: 's3', id: 'ugondu-cor-bucket-tx123-12345678' }
      ]
    };

    const leaked = await scanner.scanForLeakedResources({
      transactionId: 'tx123',
      manifest: mockManifest
    });

    assert.equal(leaked, false, 'Clean deletion should return false (no leaked resources)');
  });

  test('RES-002: Manifest-based scanning detects lingering bucket (200 OK) as leaked', async () => {
    const scanner = new AwsResidualScanner('eu-west-3');
    scanner.ec2 = {
      describeVpcs: async () => ({ Vpcs: [] }),
      describeSubnets: async () => ({ Subnets: [] }),
      describeInstances: async () => ({ Reservations: [] }),
    };
    scanner.rds = {
      describeDBInstances: async () => ({ DBInstances: [] }),
    };
    scanner.s3 = {
      headBucket: async ({ Bucket }) => {
        // Bucket still exists!
        return {};
      },
      listBuckets: async () => {
        throw new Error('s3:ListAllMyBuckets should NOT be called');
      }
    };

    const mockManifest = {
      listResources: () => [
        { type: 's3', id: 'ugondu-cor-bucket-tx123-lingering' }
      ]
    };

    const leaked = await scanner.scanForLeakedResources({
      transactionId: 'tx123',
      manifest: mockManifest
    });

    assert.equal(leaked, true, 'Lingering bucket must be reported as leaked (true)');
  });

  test('RES-003: HeadBucket unexpected provider failure (500 or 403) fails closed', async () => {
    const scanner = new AwsResidualScanner('eu-west-3');
    scanner.ec2 = {
      describeVpcs: async () => ({ Vpcs: [] }),
      describeSubnets: async () => ({ Subnets: [] }),
      describeInstances: async () => ({ Reservations: [] }),
    };
    scanner.rds = {
      describeDBInstances: async () => ({ DBInstances: [] }),
    };
    scanner.s3 = {
      headBucket: async ({ Bucket }) => {
        const err = new Error('AccessDenied');
        err.$metadata = { httpStatusCode: 403 };
        err.name = 'AccessDenied';
        throw err;
      }
    };

    const mockManifest = {
      listResources: () => [
        { type: 's3', id: 'ugondu-cor-bucket-tx123-12345678' }
      ]
    };

    await assert.rejects(
      async () => {
        await scanner.scanForLeakedResources({
          transactionId: 'tx123',
          manifest: mockManifest
        });
      },
      (err) => {
        assert.ok(err, 'Must throw error on unexpected provider failure');
        return true;
      }
    );
  });

  test('RES-004: Fargate / zero-S3 runs do not invoke S3 HeadBucket or ListBuckets', async () => {
    let s3Called = false;
    const scanner = new AwsResidualScanner('eu-west-3');
    scanner.ec2 = {
      describeVpcs: async () => ({ Vpcs: [] }),
      describeSubnets: async () => ({ Subnets: [] }),
      describeInstances: async () => ({ Reservations: [] }),
    };
    scanner.rds = {
      describeDBInstances: async () => ({ DBInstances: [] }),
    };
    scanner.s3 = {
      headBucket: async () => { s3Called = true; },
      listBuckets: async () => { s3Called = true; }
    };

    const mockManifest = {
      listResources: () => [
        { type: 'vpc', id: 'vpc-123' },
        { type: 'subnet', id: 'subnet-123' }
      ]
    };

    const leaked = await scanner.scanForLeakedResources({
      transactionId: 'tx123',
      manifest: mockManifest
    });

    assert.equal(s3Called, false, 'S3 must not be called when manifest contains no S3 resources');
    assert.equal(leaked, false, 'No residuals when all VPC resources are cleaned');
  });

  test('RES-005: Leaked EC2 or RDS resource is correctly reported', async () => {
    const scanner = new AwsResidualScanner('eu-west-3');
    scanner.ec2 = {
      describeVpcs: async () => ({ Vpcs: [{ VpcId: 'vpc-leaked' }] }),
      describeSubnets: async () => ({ Subnets: [] }),
      describeInstances: async () => ({ Reservations: [] }),
    };
    scanner.rds = {
      describeDBInstances: async () => ({ DBInstances: [] }),
    };
    scanner.s3 = {
      headBucket: async () => { throw { $metadata: { httpStatusCode: 404 } }; }
    };

    const leaked = await scanner.scanForLeakedResources({
      transactionId: 'tx123'
    });

    assert.equal(leaked, true, 'Leaked VPC must be detected');
  });
});
