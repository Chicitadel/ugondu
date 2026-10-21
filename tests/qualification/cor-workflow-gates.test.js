/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Qualification / COR Workflow Gate Guardrails
 * File           : cor-workflow-gates.test.js
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 *
 * Guards COR audit findings P0-A (untagged AWS role-assumption fallback),
 * P0-B (COR job able to succeed while the AWS physical gate fails),
 * COR-001/COR-007 (RDS SLR preflight fail-closed), and COR-002 (Fail-closed
 * bootstrap denial handling).
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const WORKFLOW = path.resolve(__dirname, '../../.github/workflows/cor.yml');
const text = fs.readFileSync(WORKFLOW, 'utf8').replace(/\r\n/g, '\n');

// Minimal structural reader for the fixed layout of this workflow file.
// Deliberately dependency-free: the guard must run wherever `node` runs.
function parseJobs(src) {
  const body = src.slice(src.indexOf('\njobs:\n') + 6);
  const out = {};
  const parts = body.split(/^  ([A-Za-z0-9_-]+):\s*$/m);
  for (let i = 1; i < parts.length; i += 2) out[parts[i]] = parseJob(parts[i + 1]);
  return out;
}

function parseJob(block) {
  const stepsAt = block.search(/^    steps:\s*$/m);
  const head = stepsAt >= 0 ? block.slice(0, stepsAt) : block;
  const stepsSrc = stepsAt >= 0 ? block.slice(stepsAt) : '';
  const needsInline = head.match(/^    needs:\s*\[(.*)\]\s*$/m);
  const needsList = head.match(/^    needs:\s*\n((?:      - .+\n?)+)/m);
  const needs = needsInline
    ? needsInline[1].split(',').map((s) => s.trim()).filter(Boolean)
    : needsList
      ? needsList[1].split('\n').map((l) => l.replace(/^\s*-\s*/, '').trim()).filter(Boolean)
      : [];
  const ifMatch = head.match(/^    if:\s*(.+)$/m);
  const steps = stepsSrc
    .split(/^      - (?=name:)/m)
    .slice(1)
    .map((s) => {
      const name = (s.match(/^name:\s*(.+)$/m) || [])[1];
      const runAt = s.search(/^        run:\s*\|\s*$/m);
      const run = runAt >= 0
        ? s.slice(runAt).split('\n').slice(1)
            .filter((l, idx, a) => l.startsWith('          ') || l.trim() === '' )
            .join('\n')
        : ((s.match(/^        run:\s*(.+)$/m) || [])[1] || '');
      const envBlock = s.match(/^        env:\n((?:          .+\n?)+)/m);
      const env = {};
      if (envBlock) {
        for (const l of envBlock[1].split('\n')) {
          const m = l.match(/^\s+([A-Z0-9_]+):\s*(.*)$/);
          if (m) env[m[1]] = m[2];
        }
      }
      return { name: (name || '').trim(), run, env };
    });
  return { needs, if: ifMatch ? ifMatch[1].trim() : undefined, steps };
}

const jobs = parseJobs(text);

function step(job, name) {
  const s = job.steps.find((x) => x.name === name);
  assert.ok(s, `step not found: ${name}`);
  return s;
}

test('COR-WF-001 tagged assume-role step has no untagged fallback', () => {
  const run = step(jobs['aws-physical-gate'], 'Assume Tagged Execution Session').run;
  const assumeCalls = run.match(/aws sts assume-role/g) || [];
  assert.equal(assumeCalls.length, 1, 'exactly one assume-role call is permitted');
  assert.match(run, /--tags "Key=UgonduTransactionId,Value=\$TX_ID" "Key=UgonduCOR,Value=true"/);
  const callStart = run.indexOf('aws sts assume-role');
  const callEnd = run.indexOf(')', run.indexOf('--output text', callStart));
  const call = run.slice(callStart, callEnd + 1);
  assert.doesNotMatch(call, /\|\||&&|;/, 'assume-role must not be chained to any fallback');
  assert.doesNotMatch(run, /\|\|\s*\\\\?\s*\r?\n?\s*aws\s/, 'no || aws ... retry permitted');
  assert.doesNotMatch(run, /2>\/dev\/null/, 'assume-role errors must not be silenced');
  assert.match(run, /set -euo pipefail/);
});

test('COR-WF-002 assumed identity is verified before credentials are exported', () => {
  const run = step(jobs['aws-physical-gate'], 'Assume Tagged Execution Session').run;
  const verifyAt = run.indexOf('get-caller-identity');
  const exportAt = run.indexOf('GITHUB_ENV');
  assert.ok(verifyAt > 0 && exportAt > verifyAt, 'identity check must precede export');
  assert.match(run, /::add-mask::\$AK/);
  assert.match(run, /::add-mask::\$SK/);
  assert.match(run, /::add-mask::\$ST/);
});

test('COR-WF-003 physical gate mutating steps follow the tagged session step', () => {
  const names = jobs['aws-physical-gate'].steps.map((s) => s.name);
  const session = names.indexOf('Assume Tagged Execution Session');
  for (const n of [
    'Run physical certification',
    'Run physical fargate certification',
    'Assert zero residual resources cleanup verification',
  ]) {
    assert.ok(names.indexOf(n) > session, `${n} must run after the tagged session`);
  }
});

test('COR-WF-004 final release gate depends on every mandatory gate', () => {
  const gate = jobs['cor-final-release-gate'];
  assert.ok(gate, 'cor-final-release-gate job must exist');
  assert.deepEqual([...gate.needs].sort(), ['aws-physical-gate', 'cor']);
  assert.equal(gate.if, 'always()', 'gate must evaluate even when children fail or skip');
});

test('COR-WF-005 final gate accepts only success (rejects skipped/cancelled/failure)', () => {
  const run = step(jobs['cor-final-release-gate'], 'Require every mandatory gate to have succeeded').run;
  assert.match(run, /!= "success"/);
  assert.match(run, /exit 1/);
  const env = step(jobs['cor-final-release-gate'], 'Require every mandatory gate to have succeeded').env;
  assert.match(env.COR_RESULT, /needs\.cor\.result/);
  assert.match(env.AWS_RESULT, /needs\.aws-physical-gate\.result/);
});

test('COR-WF-006 every mandatory gate job is a dependency of the final gate', () => {
  const mandatory = Object.keys(jobs).filter((k) => k !== 'cor-final-release-gate');
  const needs = jobs['cor-final-release-gate'].needs;
  for (const j of mandatory) assert.ok(needs.includes(j), `final gate must need '${j}'`);
});

test('COR-WF-007 bootstrap policy pack reconciliation runs before AWS conformance probes', () => {
  const steps = jobs['aws-physical-gate'].steps;
  const names = steps.map((s) => s.name);
  const oidcIdx = names.indexOf('Configure Base OIDC Credentials');
  const provisionIdx = names.indexOf('Reconcile AWS COR V9 Policy Pack (Bootstrap Provision)');
  const assumeIdx = names.indexOf('Assume Tagged Execution Session');
  const verifyIdx = names.indexOf('Verify Reconciled AWS COR V9 Effective Permissions');
  const probeIdx = names.indexOf('Run fail-closed AWS read-only conformance probes');

  assert.ok(oidcIdx >= 0 && provisionIdx > oidcIdx, 'bootstrap-provision must follow base OIDC credentials');
  assert.ok(assumeIdx > provisionIdx, 'tagged session assumption must follow bootstrap-provision');
  assert.ok(verifyIdx > assumeIdx, 'verify-effective must follow tagged session assumption');
  assert.ok(probeIdx > verifyIdx, 'conformance probes must run only after verify-effective');
  assert.match(step(jobs['aws-physical-gate'], 'Reconcile AWS COR V9 Policy Pack (Bootstrap Provision)').run, /--phase bootstrap-provision/);
  assert.match(step(jobs['aws-physical-gate'], 'Verify Reconciled AWS COR V9 Effective Permissions').run, /--phase verify-effective/);
});

test('COR-WF-008 validates all 5 UgonduCOR-V9 policy templates, quotas, and guardrails', async () => {
  const { loadAndValidateBootstrapPolicyPack, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');
  assert.equal(Object.keys(BOOTSTRAP_OPERATING_STATES).length, 6, 'exactly 6 operating states must be defined');
  const pack = loadAndValidateBootstrapPolicyPack();
  assert.equal(pack.policies.length, 5);
  assert.ok(pack.policies.length <= pack.maxPoliciesPerRole);
  assert.equal(pack.totalStatements, 46);
  assert.equal(pack.executionRole.physicalName, 'UgonduCORExecutionRole');
  assert.equal(pack.runnerRole.physicalName, 'UgonduCORRunner');
  assert.equal(pack.runnerRole.prohibitExecutionPolicyAttachment, true);
  for (const p of pack.policies) {
    assert.ok(p.compactCharLength <= 6144, `${p.physicalName} exceeds 6144 chars`);
    assert.match(p.sha256, /^[0-9a-f]{64}$/);
  }
});

test('COR-WF-009 operating state 1: INITIAL_INSTALLATION_AUTHORIZED when runner creates/attaches 5 policies', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-s1-'));
  const { runBootstrapProvisionPhase, runVerifyEffectivePhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');

  const attached = [];
  const created = [];
  const provisionRes = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      if (args[1] === 'get-role' && args.includes('AWSServiceRoleForRDS')) {
        return { status: 0, json: { Role: { RoleName: 'AWSServiceRoleForRDS', AssumeRolePolicyDocument: { Statement: [{ Effect: 'Allow', Principal: { Service: 'rds.amazonaws.com' }, Action: 'sts:AssumeRole' }] } } }, stderr: '' };
      }
      if (args[1] === 'list-attached-role-policies') return { status: 0, json: { AttachedPolicies: attached.map((a) => ({ PolicyArn: a, PolicyName: a.split('/').pop() })) }, stderr: '' };
      if (args[1] === 'attach-role-policy') {
        const arn = args[args.indexOf('--policy-arn') + 1];
        if (!created.includes(arn) && arn.endsWith('UgonduCOR-V9-Discovery')) {
          return { status: 254, json: null, stderr: 'An error occurred (NoSuchEntity) when calling the AttachRolePolicy operation' };
        }
        attached.push(arn);
        return { status: 0, json: {}, stderr: '' };
      }
      if (args[1] === 'create-policy') {
        const name = args[args.indexOf('--policy-name') + 1];
        const arn = `arn:aws:iam::971671216490:policy/${name}`;
        created.push(arn);
        return { status: 0, json: { Policy: { PolicyName: name, Arn: arn } }, stderr: '' };
      }
      if (args[1] === 'get-policy') return { status: 0, json: { Policy: { DefaultVersionId: 'v1' } }, stderr: '' };
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(provisionRes.exitCode, 0);
  assert.equal(attached.length, 5);
  assert.equal(created.length, 1);
  assert.equal(provisionRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.INITIAL_INSTALLATION_AUTHORIZED);

  const verifyRes = runVerifyEffectivePhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/12345' }, stderr: '' };
      if (args[0] === 'ec2' && args[1] === 'describe-vpcs') return { status: 0, json: { Vpcs: [{ VpcId: 'vpc-1' }] }, stderr: '' };
      if (args[0] === 'iam' && args[1] === 'list-users') return { status: 254, json: null, stderr: 'AccessDenied' };
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(verifyRes.exitCode, 0);
  assert.equal(verifyRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.INITIAL_INSTALLATION_AUTHORIZED);
  assert.equal(verifyRes.report.status, 'PASS');
});

test('COR-WF-010 operating state 2: RETURNING_INSTALLATION_MATCHED when 5 policies are already attached', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-s2-'));
  const { runBootstrapProvisionPhase, runVerifyEffectivePhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');

  const existingPolicies = [
    { PolicyName: 'UgonduCOR-V9-Discovery' },
    { PolicyName: 'UgonduCOR-V9-EC2-Creation' },
    { PolicyName: 'UgonduCOR-V9-EC2-Cleanup' },
    { PolicyName: 'UgonduCOR-V9-RDS-S3' },
    { PolicyName: 'UgonduCOR-V9-ECR-ECS' }
  ];

  const provisionRes = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      if (args[1] === 'get-role' && args.includes('AWSServiceRoleForRDS')) {
        return { status: 0, json: { Role: { RoleName: 'AWSServiceRoleForRDS', AssumeRolePolicyDocument: { Statement: [{ Effect: 'Allow', Principal: { Service: 'rds.amazonaws.com' }, Action: 'sts:AssumeRole' }] } } }, stderr: '' };
      }
      if (args[1] === 'list-attached-role-policies') return { status: 0, json: { AttachedPolicies: existingPolicies }, stderr: '' };
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(provisionRes.exitCode, 0, 'bootstrap-provision must exit 0 when policies are already confirmed attached');
  assert.equal(provisionRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.RETURNING_INSTALLATION_MATCHED);

  const verifyRes = runVerifyEffectivePhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/12345' }, stderr: '' };
      if (args[0] === 'ec2' && args[1] === 'describe-vpcs') return { status: 0, json: { Vpcs: [] }, stderr: '' };
      if (args[0] === 'iam' && args[1] === 'list-users') return { status: 254, json: null, stderr: 'AccessDenied' };
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(verifyRes.exitCode, 0);
  assert.equal(verifyRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.RETURNING_INSTALLATION_MATCHED);
  assert.equal(verifyRes.report.status, 'PASS');
});

test('COR-WF-011 operating state 3: DRIFT_DETECTED_AND_RECONCILED when partial policy attachments are repaired', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-s3-'));
  const { runBootstrapProvisionPhase, runVerifyEffectivePhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');
  const provisionRes = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      if (args[1] === 'get-role' && args.includes('AWSServiceRoleForRDS')) {
        return { status: 0, json: { Role: { RoleName: 'AWSServiceRoleForRDS', AssumeRolePolicyDocument: { Statement: [{ Effect: 'Allow', Principal: { Service: 'rds.amazonaws.com' }, Action: 'sts:AssumeRole' }] } } }, stderr: '' };
      }
      if (args[1] === 'list-attached-role-policies') {
        return { status: 0, json: { AttachedPolicies: [{ PolicyName: 'UgonduCOR-V9-Discovery' }, { PolicyName: 'UgonduCOR-V9-EC2-Creation' }] }, stderr: '' };
      }
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(provisionRes.exitCode, 0);
  assert.equal(provisionRes.report.attachedDuringBootstrap.length, 3);
  assert.equal(provisionRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED);
  const verifyRes = runVerifyEffectivePhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/12345' }, stderr: '' };
      if (args[0] === 'ec2' && args[1] === 'describe-vpcs') return { status: 0, json: { Vpcs: [] }, stderr: '' };
      if (args[0] === 'iam' && args[1] === 'list-users') return { status: 254, json: null, stderr: 'AccessDenied' };
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(verifyRes.exitCode, 0);
  assert.equal(verifyRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED);
});

test('COR-WF-012 operating state 4: BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT fails closed during bootstrap-provision with UG-BOOTSTRAP-AUTH-MISSING', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-s4-'));
  const { runBootstrapProvisionPhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');
  const provisionRes = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      if (args[1] === 'get-role' && args.includes('AWSServiceRoleForRDS')) {
        return { status: 0, json: { Role: { RoleName: 'AWSServiceRoleForRDS', AssumeRolePolicyDocument: { Statement: [{ Effect: 'Allow', Principal: { Service: 'rds.amazonaws.com' }, Action: 'sts:AssumeRole' }] } } }, stderr: '' };
      }
      if (args[1] === 'list-attached-role-policies') return { status: 0, json: { AttachedPolicies: [] }, stderr: '' };
      return { status: 254, json: null, stderr: 'AccessDenied: not authorized to perform iam:AttachRolePolicy' };
    }
  });
  assert.equal(provisionRes.exitCode, 1, 'bootstrap-provision must fail closed with exit code 1 when runner lacks write authority');
  assert.equal(provisionRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT);
  assert.equal(provisionRes.report.errorCode, 'UG-BOOTSTRAP-AUTH-MISSING');
  assert.match(provisionRes.report.diagnostic, /arn:aws:iam::971671216490:role\/UgonduCORExecutionRole/);
  assert.match(provisionRes.report.diagnostic, /\(Option A\)/);
  assert.match(provisionRes.report.diagnostic, /\(Option B\)/);
});

test('COR-WF-013 operating states 5 & 6: CANONICAL_ROLE_MISSING_OR_UNASSUMABLE and SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-s56-'));
  const { runBootstrapProvisionPhase, runVerifyEffectivePhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');

  const roleMissing = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      return { status: 254, json: null, stderr: 'NoSuchEntity: The role with name UgonduCORExecutionRole cannot be found.' };
    }
  });
  assert.equal(roleMissing.exitCode, 1);
  assert.equal(roleMissing.report.operatingState, BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE);

  const selfEscalate = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    targetRoleOverride: 'UgonduCORRunner',
    awsRunner: () => ({ status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' })
  });
  assert.equal(selfEscalate.exitCode, 1);
  assert.equal(selfEscalate.report.operatingState, BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION);

  const boundaryFail = runVerifyEffectivePhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORExecutionRole/12345' }, stderr: '' };
      if (args[0] === 'ec2' && args[1] === 'describe-vpcs') return { status: 0, json: { Vpcs: [] }, stderr: '' };
      if (args[0] === 'iam' && args[1] === 'list-users') return { status: 0, json: { Users: [] }, stderr: '' };
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(boundaryFail.exitCode, 1);
  assert.equal(boundaryFail.report.operatingState, BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION);
  assert.equal(boundaryFail.report.errorCode, 'UG-BOOTSTRAP-BOUNDARY-VIOLATION');
});

test('COR-WF-014 RDS service-linked role preflight fails closed with UG-BOOTSTRAP-AUTH-MISSING when missing and caller lacks create authority', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-slr-fail-'));
  const { runBootstrapProvisionPhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');
  let slrCreationAttempted = false;
  const provisionRes = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      if (args[1] === 'list-attached-role-policies') return { status: 0, json: { AttachedPolicies: [] }, stderr: '' };
      if (args[1] === 'get-role' && args.includes('AWSServiceRoleForRDS')) {
        return { status: 254, json: null, stderr: 'NoSuchEntity: The role with name AWSServiceRoleForRDS cannot be found.' };
      }
      if (args[1] === 'create-service-linked-role' && args.includes('rds.amazonaws.com')) {
        slrCreationAttempted = true;
        return { status: 254, json: null, stderr: 'AccessDenied: User is not authorized to perform: iam:CreateServiceLinkedRole' };
      }
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(slrCreationAttempted, true, 'create-service-linked-role must be attempted when AWSServiceRoleForRDS returns NoSuchEntity');
  assert.equal(provisionRes.exitCode, 1, 'must exit 1 when SLR creation fails with AccessDenied');
  assert.equal(provisionRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT);
  assert.equal(provisionRes.report.errorCode, 'UG-BOOTSTRAP-AUTH-MISSING');
  assert.match(provisionRes.report.diagnostic, /AWSServiceRoleForRDS/);
  assert.match(provisionRes.report.diagnostic, /iam:CreateServiceLinkedRole/);
});

test('COR-WF-015 RDS service-linked role preflight creates and re-verifies AWSServiceRoleForRDS when missing', async () => {
  const os = require('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ugondu-reconcile-slr-create-'));
  const { runBootstrapProvisionPhase, BOOTSTRAP_OPERATING_STATES } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');
  let slrCreated = false;
  const attached = [];
  const provisionRes = runBootstrapProvisionPhase({
    evidenceDir: tmpDir,
    awsRunner: (args) => {
      if (args[0] === 'sts') return { status: 0, json: { Account: '971671216490', Arn: 'arn:aws:sts::971671216490:assumed-role/UgonduCORRunner/GitHubActions' }, stderr: '' };
      if (args[1] === 'list-attached-role-policies') return { status: 0, json: { AttachedPolicies: attached.map((a) => ({ PolicyArn: a, PolicyName: a.split('/').pop() })) }, stderr: '' };
      if (args[1] === 'get-role' && args.includes('AWSServiceRoleForRDS')) {
        if (!slrCreated) return { status: 254, json: null, stderr: 'NoSuchEntity: role not found' };
        return { status: 0, json: { Role: { RoleName: 'AWSServiceRoleForRDS', AssumeRolePolicyDocument: { Statement: [{ Effect: 'Allow', Principal: { Service: 'rds.amazonaws.com' }, Action: 'sts:AssumeRole' }] } } }, stderr: '' };
      }
      if (args[1] === 'create-service-linked-role' && args.includes('rds.amazonaws.com')) {
        slrCreated = true;
        return { status: 0, json: {}, stderr: '' };
      }
      if (args[1] === 'attach-role-policy') {
        attached.push(args[args.indexOf('--policy-arn') + 1]);
        return { status: 0, json: {}, stderr: '' };
      }
      return { status: 0, json: {}, stderr: '' };
    }
  });
  assert.equal(slrCreated, true, 'create-service-linked-role must be called');
  assert.equal(provisionRes.exitCode, 0, 'bootstrap-provision succeeds after autonomous SLR creation and verification');
  assert.equal(provisionRes.report.operatingState, BOOTSTRAP_OPERATING_STATES.INITIAL_INSTALLATION_AUTHORIZED);
});

test('COR-WF-016 starter bootstrap policy template is account-agnostic and uses valid AWS IAM CreatePolicy resource scoping', async () => {
  const rootDir = path.resolve(__dirname, '../..');
  const { renderBootstrapStarterPolicy } = await import('../../scripts/aws-conformance/reconcile-bootstrap-policy-pack.mjs');
  const rawTemplate = fs.readFileSync(path.join(rootDir, 'policy-packs/aws/cor/bootstrap/runner-bootstrap-permissions.template.json'), 'utf8');
  assert.ok(!/\b\d{12}\b/.test(rawTemplate), 'template must not hardcode any 12-digit AWS account ID');
  assert.ok(!rawTemplate.includes('iam:PolicyName'), 'template must not use invalid iam:PolicyName condition key');

  const renderedCustom = renderBootstrapStarterPolicy({ accountId: '210987654321' });
  const customStr = JSON.stringify(renderedCustom);
  assert.ok(customStr.includes('arn:aws:iam::210987654321:role/UgonduCORExecutionRole'), 'must render arbitrary customer account ID');
  assert.ok(!customStr.includes('971671216490'), 'must not leak another account ID into custom rendered policy');

  const renderedDefault = renderBootstrapStarterPolicy();
  const committedJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'policy-packs/aws/cor/bootstrap/runner-bootstrap-permissions.json'), 'utf8'));
  assert.deepEqual(renderedDefault, committedJson, 'committed starter policy must match rendered template for target account');
  const createStmt = committedJson.Statement.find((s) => s.Sid === 'CreateOnlyCanonicalTaggedCORV9Policies');
  assert.ok(Array.isArray(createStmt.Resource) && createStmt.Resource.length === 5, 'iam:CreatePolicy must scope 5 canonical policy ARNs in Resource');
  assert.equal(createStmt.Condition?.StringEquals?.['iam:PolicyName'], undefined, 'iam:PolicyName condition key must be absent');
});
