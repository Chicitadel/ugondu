import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  runBootstrapProvisionPhase,
  verifyOrCreateRdsSlr
} from '../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs';

const target = {
  accountId: '971671216490',
  region: 'eu-west-3',
  executionRoleName: 'UgonduCORExecutionRole'
};

function roleReadback() {
  return {
    status: 0,
    json: {
      Role: {
        Arn: 'arn:aws:iam::971671216490:role/AWSServiceRoleForRDS',
        AssumeRolePolicyDocument: {
          Statement: [{ Principal: { Service: 'rds.amazonaws.com' } }]
        }
      }
    }
  };
}

function makeEvidenceDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-bootstrap-fail-closed-'));
}

test('service-linked role create success is not accepted without a valid role read-back', () => {
  let getRoleCalls = 0;
  const aws = (args) => {
    if (args[0] === 'iam' && args[1] === 'get-role') {
      getRoleCalls += 1;
      return getRoleCalls === 1
        ? { status: 1, stderr: 'NoSuchEntity: role not found' }
        : { status: 1, stderr: 'AccessDenied: cannot verify role' };
    }
    if (args[0] === 'iam' && args[1] === 'create-service-linked-role') {
      return { status: 0, json: { Role: { RoleName: 'AWSServiceRoleForRDS' } } };
    }
    throw new Error(`Unexpected AWS command: ${args.join(' ')}`);
  };

  const result = verifyOrCreateRdsSlr(aws, {}, 'eu-west-3');
  assert.equal(result.ok, false);
  assert.match(result.detail, /verify|AWSServiceRoleForRDS/i);
  assert.equal(getRoleCalls, 2);
});

test('non-access-denied attach mutation failure returns non-zero and a FAIL report', () => {
  const evidenceDir = makeEvidenceDir();
  try {
    const aws = (args) => {
      if (args[0] === 'sts' && args[1] === 'get-caller-identity') {
        return {
          status: 0,
          json: {
            Account: target.accountId,
            Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/test-session'
          }
        };
      }
      if (args[0] === 'iam' && args[1] === 'list-role-policies') {
        return { status: 0, json: { PolicyNames: [] } };
      }
      if (args[0] === 'iam' && args[1] === 'list-attached-role-policies') {
        return { status: 0, json: { AttachedPolicies: [] } };
      }
      if (args[0] === 'iam' && args[1] === 'get-role') return roleReadback();
      if (args[0] === 'iam' && args[1] === 'get-policy') {
        return { status: 1, stderr: 'NoSuchEntity: managed policy not found' };
      }
      if (args[0] === 'iam' && args[1] === 'attach-role-policy') {
        return { status: 1, stderr: 'Throttling: request rate exceeded' };
      }
      throw new Error(`Unexpected AWS command: ${args.join(' ')}`);
    };

    const result = runBootstrapProvisionPhase({
      awsRunner: aws,
      target,
      region: target.region,
      evidenceDir
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.report.status, 'FAIL');
    assert.equal(result.report.errorCode, 'UG-BOOTSTRAP-ATTACHMENT-FAILED');
    assert.match(result.report.detail, /Throttling/);
  } finally {
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
});

test('successful attach response without read-back confirmation is not reported as success', () => {
  const evidenceDir = makeEvidenceDir();
  try {
    const aws = (args) => {
      if (args[0] === 'sts' && args[1] === 'get-caller-identity') {
        return {
          status: 0,
          json: {
            Account: target.accountId,
            Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/test-session'
          }
        };
      }
      if (args[0] === 'iam' && args[1] === 'list-role-policies') {
        return { status: 0, json: { PolicyNames: [] } };
      }
      if (args[0] === 'iam' && args[1] === 'list-attached-role-policies') {
        return { status: 0, json: { AttachedPolicies: [] } };
      }
      if (args[0] === 'iam' && args[1] === 'get-role') return roleReadback();
      if (args[0] === 'iam' && args[1] === 'get-policy') {
        return { status: 1, stderr: 'NoSuchEntity: managed policy not found' };
      }
      if (args[0] === 'iam' && args[1] === 'attach-role-policy') {
        return { status: 0, json: {} };
      }
      throw new Error(`Unexpected AWS command: ${args.join(' ')}`);
    };

    const result = runBootstrapProvisionPhase({
      awsRunner: aws,
      target,
      region: target.region,
      evidenceDir
    });

    assert.equal(result.exitCode, 1);
    assert.equal(result.report.status, 'FAIL');
    assert.equal(result.report.errorCode, 'UG-BOOTSTRAP-ATTACHMENT-UNVERIFIED');
  } finally {
    fs.rmSync(evidenceDir, { recursive: true, force: true });
  }
});
