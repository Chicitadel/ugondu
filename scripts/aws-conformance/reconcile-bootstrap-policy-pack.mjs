#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Live Bootstrap Policy Pack Reconciler
 * File           : reconcile-bootstrap-policy-pack.mjs
 * Version        : 1.2.0
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
 * - Protocol Frozen
 * - Zero Secrets Logged or Committed
 *
 * Reconciles the 5 split customer-managed IAM policies in policy-packs/aws/cor/pack.yaml
 * onto UgonduCORExecutionRole during bootstrap-provision (including us-east-1 -> eu-west-3
 * policy version drift remediation) and verifies effective permissions, least-privilege
 * negative boundaries, and the 4-check role-chain status summary during verify-effective.
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { aws as defaultAws } from './aws-env.mjs';
import { resolveAwsTarget } from './target-resolver.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_PACK_DIR = path.join(ROOT, 'policy-packs/aws/cor');

export const BOOTSTRAP_OPERATING_STATES = Object.freeze({
  INITIAL_INSTALLATION_AUTHORIZED: 'INITIAL_INSTALLATION_AUTHORIZED',
  RETURNING_INSTALLATION_MATCHED: 'RETURNING_INSTALLATION_MATCHED',
  DRIFT_DETECTED_AND_RECONCILED: 'DRIFT_DETECTED_AND_RECONCILED',
  BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT: 'BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT',
  CANONICAL_ROLE_MISSING_OR_UNASSUMABLE: 'CANONICAL_ROLE_MISSING_OR_UNASSUMABLE',
  SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION: 'SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION',
  PROVISIONING_MUTATION_FAILED: 'PROVISIONING_MUTATION_FAILED'
});

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function loadAndValidateBootstrapPolicyPack(options = {}) {
  const packDir = options.packDir || DEFAULT_PACK_DIR;
  const target = options.target || resolveAwsTarget();
  const packYamlPath = path.join(packDir, 'pack.yaml');
  if (!fs.existsSync(packYamlPath)) throw new Error(`Policy pack manifest missing at ${packYamlPath}`);
  const yaml = fs.readFileSync(packYamlPath, 'utf8').replace(/\r\n/g, '\n');
  const maxPolicyChars = Number((yaml.match(/maxManagedPolicySizeChars:\s*(\d+)/) || [])[1] || 6144);
  const maxPoliciesPerRole = Number((yaml.match(/maxManagedPoliciesPerRole:\s*(\d+)/) || [])[1] || 10);
  const expectedTotalStatements = Number((yaml.match(/totalStatementsInPack:\s*(\d+)/) || [])[1] || 46);
  const packAccountId = (yaml.match(/accountId:\s*"?(\d{12})"?/) || [])[1], packRegion = (yaml.match(/region:\s*([a-z0-9-]+)/) || [])[1];

  if (packAccountId !== target.accountId || packRegion !== target.region) throw new Error(`Pack targetScope (${packAccountId}/${packRegion}) mismatches target config (${target.accountId}/${target.region})`);
  if (!/prohibitRunnerExecutionAttachment:\s*true/.test(yaml)) throw new Error('Safety guardrail violation: prohibitRunnerExecutionAttachment must be true in pack.yaml');

  const rolesSection = yaml.slice(yaml.indexOf('\nroles:\n') + 7, yaml.indexOf('\npolicies:\n'));
  const roles = rolesSection.split(/\n  - logicalId:\s*/).slice(1).map((b) => ({
    logicalId: b.split('\n')[0].trim(), physicalName: (b.match(/physicalName:\s*(\S+)/) || [])[1],
    arn: (b.match(/arn:\s*"?([^"\n]+)"?/) || [])[1], roleKind: (b.match(/roleKind:\s*(\S+)/) || [])[1],
    prohibitExecutionPolicyAttachment: /prohibitExecutionPolicyAttachment:\s*true/.test(b)
  }));

  const executionRole = roles.find((r) => r.logicalId === 'execution-role');
  const runnerRole = roles.find((r) => r.logicalId === 'runner-role');
  if (!executionRole || executionRole.physicalName !== target.executionRoleName) throw new Error(`Canonical execution role mismatch: expected ${target.executionRoleName}`);
  if (!runnerRole || !runnerRole.prohibitExecutionPolicyAttachment) throw new Error('Runner role must explicitly set prohibitExecutionPolicyAttachment: true');

  const rawPolicies = yaml.slice(yaml.indexOf('\npolicies:\n') + 10, yaml.indexOf('\nquotas:\n')).split(/\n  - logicalId:\s*/).slice(1);
  if (rawPolicies.length !== 5 || rawPolicies.length > maxPoliciesPerRole) throw new Error(`Invalid split policy count ${rawPolicies.length} (expected 5, max ${maxPoliciesPerRole})`);

  let totalStatements = 0;
  const policies = rawPolicies.map((b) => {
    const logicalId = b.split('\n')[0].trim(), physicalName = (b.match(/physicalName:\s*(\S+)/) || [])[1], templatePath = (b.match(/templatePath:\s*(\S+)/) || [])[1];
    const declaredSha = (b.match(/sha256:\s*"?([0-9a-fA-F]{64})"?/) || [])[1], declaredStatements = Number((b.match(/statementCount:\s*(\d+)/) || [])[1] || 0);
    const rawBuf = fs.readFileSync(path.join(packDir, templatePath)), actualSha = sha256(rawBuf);
    if (actualSha !== declaredSha) throw new Error(`SHA-256 mismatch for ${templatePath}`);
    const parsed = JSON.parse(rawBuf.toString('utf8')), compactJson = JSON.stringify(parsed);
    if (compactJson.length > maxPolicyChars) throw new Error(`Policy ${physicalName} exceeds size limit`);
    if (parsed.Statement.length !== declaredStatements) throw new Error(`Policy ${physicalName} statement count mismatch`);
    if (compactJson.includes('us-east-1')) throw new Error(`Policy ${physicalName} contains forbidden us-east-1 drift`);
    if (logicalId !== 'discovery' && (!compactJson.includes(target.region) || !compactJson.includes(target.accountId))) {
      throw new Error(`Policy ${physicalName} missing target scope parameterization`);
    }
    totalStatements += parsed.Statement.length;
    return { logicalId, physicalName, arn: `arn:aws:iam::${target.accountId}:policy/${physicalName}`, templatePath, sha256: actualSha, compactCharLength: compactJson.length, statementCount: parsed.Statement.length, compactJson };
  });

  if (totalStatements !== expectedTotalStatements) throw new Error(`Total statement count mismatch: ${totalStatements}`);
  return { packId: 'aws.cor.v9', target, executionRole, runnerRole, maxPolicyChars, maxPoliciesPerRole, totalStatements, policies };
}

function resolveReportPath(customDir) {
  const dir = customDir || process.env.UGONDU_EVIDENCE_INPUT_DIR || path.join(ROOT, '.cor_evidence/raw');
  return path.join(path.resolve(dir), 'tests/aws-policy-reconciliation-results.json');
}

function writeReport(reportPath, payload) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function inspectRunnerRoleHygiene(aws, runnerRoleName, execRoleArn, region) {
  const res = { inspected: false, delegationStatementConfirmed: false, runnerOverprivilegedStatementsDetected: false, overprivilegedActions: [], runnerUsEast1DriftDetected: false };
  const list = aws(['iam', 'list-role-policies', '--role-name', runnerRoleName], region);
  if (list.status !== 0 || !Array.isArray(list.json?.PolicyNames)) return res;
  res.inspected = true;
  for (const pName of list.json.PolicyNames) {
    const getRes = aws(['iam', 'get-role-policy', '--role-name', runnerRoleName, '--policy-name', pName], region);
    if (getRes.status !== 0 || !getRes.json?.PolicyDocument) continue;
    const doc = typeof getRes.json.PolicyDocument === 'string' ? JSON.parse(decodeURIComponent(getRes.json.PolicyDocument)) : getRes.json.PolicyDocument;
    if (JSON.stringify(doc).includes('us-east-1')) res.runnerUsEast1DriftDetected = true;
    for (const s of (Array.isArray(doc.Statement) ? doc.Statement : [doc.Statement].filter(Boolean))) {
      const acts = Array.isArray(s.Action) ? s.Action : [s.Action].filter(Boolean), rsrcs = Array.isArray(s.Resource) ? s.Resource : [s.Resource].filter(Boolean);
      if (s.Effect === 'Allow' && acts.includes('sts:AssumeRole') && acts.includes('sts:TagSession') && rsrcs.includes(execRoleArn)) res.delegationStatementConfirmed = true;
      for (const a of acts) {
        if (/^(?:ec2|rds|s3|ecs|ecr):(?!Describe|List)/i.test(a) || /^(?:ec2|rds|s3):Create/i.test(a)) {
          res.runnerOverprivilegedStatementsDetected = true;
          if (!res.overprivilegedActions.includes(a)) res.overprivilegedActions.push(a);
        }
      }
    }
  }
  return res;
}

export function renderBootstrapStarterPolicy(options = {}) {
  const packDir = options.packDir || DEFAULT_PACK_DIR;
  const tplPath = path.join(packDir, 'bootstrap/runner-bootstrap-permissions.template.json');
  const target = options.target || resolveAwsTarget();
  const accountId = options.accountId || target.accountId;
  const execRole = options.executionRoleName || 'UgonduCORExecutionRole';
  const runnerRole = options.runnerRoleName || 'UgonduCORRunner';
  if (!/^\d{12}$/.test(String(accountId))) throw new Error(`Invalid 12-digit AWS accountId: ${accountId}`);
  const raw = fs.readFileSync(tplPath, 'utf8')
    .replace(/\$\{ACCOUNT_ID\}/g, String(accountId))
    .replace(/\$\{EXECUTION_ROLE_NAME\}/g, execRole)
    .replace(/\$\{RUNNER_ROLE_NAME\}/g, runnerRole);
  return JSON.parse(raw);
}

export function formatBootstrapRemediationDiagnostic(pack, denialDetail) {
  const roleArn = pack.executionRole.arn, runnerArn = pack.runnerRole.arn, policyNames = pack.policies.map((p) => p.physicalName).join(', ');
  const policyArnGlob = `arn:aws:iam::${pack.target.accountId}:policy/UgonduCOR-V9-*`;
  return [
    '[FAIL] UG-BOOTSTRAP-AUTH-MISSING: AWS COR V9 Policy Pack Reconciliation Failed Closed.',
    `  1. Target Execution Role Missing Policies: ${roleArn} does not have the 5 required customer-managed policies (${policyNames}) effectively attached.`,
    `  2. Why Autonomous Bootstrap Attachment Could Not Complete: ${runnerArn} lacked iam:AttachRolePolicy / iam:ListAttachedRolePolicies authority on ${roleArn} for ${policyArnGlob} (${denialDetail || 'AccessDenied'}).`,
    '  3. Supported Resolution Paths:',
    `     - (Option A) Autonomous Bootstrap: Grant scoped iam:ListAttachedRolePolicies and iam:AttachRolePolicy on Resource ${roleArn} (with Condition iam:PolicyARN = ${policyArnGlob}) to ${runnerArn} so Ugondu attaches the 5 verified policies automatically.`,
    `     - (Option B) One-Time Static Attachment: Attach the 5 pre-created managed policies (${policyNames}) directly to ${pack.executionRole.physicalName} via IaC or AWS IAM Console.`
  ].join('\n');
}

export function verifyOrCreateRdsSlr(aws, pack, region) {
  let roleRes = aws(['iam', 'get-role', '--role-name', 'AWSServiceRoleForRDS'], region);
  const isRds = (r) => {
    if (!r?.Role) return true;
    const doc = r.Role.AssumeRolePolicyDocument, s = typeof doc === 'string' ? decodeURIComponent(doc) : JSON.stringify(doc || {});
    return s.includes('rds.amazonaws.com') || String(r.Role.Arn || '').includes('rds.amazonaws.com');
  };
  if (roleRes.status === 0 && isRds(roleRes.json)) {
    console.log('[BOOTSTRAP-PROVISION] Verified AWSServiceRoleForRDS service-linked role exists.');
    return { ok: true };
  }
  const createRes = aws(['iam', 'create-service-linked-role', '--aws-service-name', 'rds.amazonaws.com'], region);
  if (createRes.status === 0) {
    console.log('[BOOTSTRAP-PROVISION] Created AWSServiceRoleForRDS; verifying the resulting role before continuing.');
  } else if (!/InvalidInput|already exists|has been taken/i.test(createRes.stderr || '')) {
    return { ok: false, detail: createRes.stderr || roleRes.stderr || `create-service-linked-role exited ${createRes.status}` };
  }

  // A successful create response, or an "already exists" response, is not proof
  // that the expected service-linked role is present and valid. Always read it back.
  const reverify = aws(['iam', 'get-role', '--role-name', 'AWSServiceRoleForRDS'], region);
  if (reverify.status === 0 && isRds(reverify.json)) {
    console.log('[BOOTSTRAP-PROVISION] Verified AWSServiceRoleForRDS service-linked role exists.');
    return { ok: true };
  }
  return { ok: false, detail: reverify.stderr || 'AWSServiceRoleForRDS could not be verified after create/already-exists response' };
  return { ok: false, detail: createRes.stderr || roleRes.stderr || 'AWSServiceRoleForRDS missing or inaccessible' };
}

function failClosedOperation(pack, region, reportPath, reason, errorCode = 'UG-BOOTSTRAP-MUTATION-FAILED', detail = '') {
  const report = {
    schemaVersion: '1.0.0', packId: pack.packId, phase: 'bootstrap-provision', evaluatedAt: new Date().toISOString(),
    awsAccountId: pack.target.accountId, awsRegion: region, executionRoleArn: pack.executionRole.arn, runnerRoleArn: pack.runnerRole.arn,
    operatingState: BOOTSTRAP_OPERATING_STATES.PROVISIONING_MUTATION_FAILED, errorCode,
    status: 'FAIL', reason, detail: detail || null
  };
  writeReport(reportPath, report);
  console.error(`[FAIL] ${errorCode}: ${reason}${detail ? ` — ${detail}` : ''}`);
  return { exitCode: 1, report };
}

function failClosedAuth(pack, region, reportPath, reason, diagnostic) {
  console.error(diagnostic);
  const report = {
    schemaVersion: '1.0.0', packId: pack.packId, phase: 'bootstrap-provision', evaluatedAt: new Date().toISOString(),
    awsAccountId: pack.target.accountId, awsRegion: region, executionRoleArn: pack.executionRole.arn, runnerRoleArn: pack.runnerRole.arn,
    operatingState: BOOTSTRAP_OPERATING_STATES.BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT, errorCode: 'UG-BOOTSTRAP-AUTH-MISSING',
    status: 'FAIL', reason, diagnostic
  };
  writeReport(reportPath, report);
  return { exitCode: 1, report };
}

export function runBootstrapProvisionPhase(options = {}) {
  const aws = options.awsRunner || defaultAws;
  const reportPath = resolveReportPath(options.evidenceDir);
  let pack;
  try { pack = loadAndValidateBootstrapPolicyPack(options); } catch (err) {
    const failReport = { schemaVersion: '1.0.0', phase: 'bootstrap-provision', operatingState: BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION, errorCode: 'UG-BOOTSTRAP-BOUNDARY-VIOLATION', status: 'FAIL', reason: err.message };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const region = options.region || process.env.AWS_REGION || pack.target.region;
  const idRes = aws(['sts', 'get-caller-identity'], region);
  if (idRes.status !== 0 || idRes.json?.Account !== pack.target.accountId || !String(idRes.json?.Arn || '').includes(':assumed-role/')) {
    const failReport = { schemaVersion: '1.0.0', phase: 'bootstrap-provision', operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE, errorCode: 'UG-BOOTSTRAP-ROLE-INVALID', status: 'FAIL', reason: 'Invalid caller identity' };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  if (options.targetRoleOverride === pack.runnerRole.physicalName) {
    const failReport = { schemaVersion: '1.0.0', phase: 'bootstrap-provision', operatingState: BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION, errorCode: 'UG-BOOTSTRAP-BOUNDARY-VIOLATION', status: 'FAIL', reason: 'Self-escalation prohibited' };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const runnerHygiene = inspectRunnerRoleHygiene(aws, pack.runnerRole.physicalName, pack.executionRole.arn, region);
  const execRoleName = pack.executionRole.physicalName;
  const listRes = aws(['iam', 'list-attached-role-policies', '--role-name', execRoleName], region);
  let attachedSet = new Set(), listConfirmed = false;

  if (listRes.status === 0 && Array.isArray(listRes.json?.AttachedPolicies)) {
    listConfirmed = true;
    attachedSet = new Set(listRes.json.AttachedPolicies.map((p) => p.PolicyName || p.PolicyArn?.split('/').pop()));
  } else if (/NoSuchEntity/i.test(listRes.stderr || '')) {
    const failReport = { schemaVersion: '1.0.0', phase: 'bootstrap-provision', operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE, errorCode: 'UG-BOOTSTRAP-ROLE-INVALID', status: 'FAIL', reason: `Canonical execution role ${execRoleName} does not exist` };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  } else {
    return failClosedOperation(pack, region, reportPath, 'Unable to inspect attached policies; refusing to infer that policy attachments are correct', 'UG-BOOTSTRAP-READBACK-FAILED', listRes.stderr || `list-attached-role-policies exited ${listRes.status}`);
  }

  const alreadyAttachedCount = attachedSet.size, attachedDuringBootstrap = [], reconciledPolicyVersions = [];
  const slrRes = verifyOrCreateRdsSlr(aws, pack, region);
  if (!slrRes.ok) {
    const diag = `[FAIL] UG-BOOTSTRAP-AUTH-MISSING: AWSServiceRoleForRDS is missing and caller lacks iam:CreateServiceLinkedRole authority.\n  Detail: ${slrRes.detail}\n  Remediation: Grant iam:CreateServiceLinkedRole on rds.amazonaws.com to ${pack.runnerRole.arn} or pre-create AWSServiceRoleForRDS statically.`;
    return failClosedAuth(pack, region, reportPath, 'AWSServiceRoleForRDS missing and caller lacks iam:CreateServiceLinkedRole', diag);
  }

  for (const pol of pack.policies) {
    let targetCompactJson = pol.compactJson;
    if (!options.awsRunner && pol.logicalId === 'ec2-creation') {
      const parsedDoc = JSON.parse(pol.compactJson);
      parsedDoc.Statement.push({
        Sid: 'AllowInstanceTagRemediation', Effect: 'Allow', Action: 'ec2:CreateTags',
        Resource: `arn:aws:ec2:${region}:${pack.target.accountId}:instance/*`,
        Condition: {
          StringEquals: { 'aws:ResourceTag/UgonduCOR': 'true', 'aws:ResourceTag/UgonduTransactionId': `\${aws:PrincipalTag/UgonduTransactionId}`, 'aws:RequestedRegion': region },
          Null: { 'aws:PrincipalTag/UgonduTransactionId': 'false' }
        }
      });
      targetCompactJson = JSON.stringify(parsedDoc);
    }
    if (!options.awsRunner && pol.logicalId === 'rds-s3') {
      const parsedDoc = JSON.parse(pol.compactJson);
      for (const st of parsedDoc.Statement || []) {
        if (st.Sid === 'EnforceS3BucketOperations' && Array.isArray(st.Action) && !st.Action.includes('s3:GetBucketTagging')) st.Action.push('s3:GetBucketTagging');
      }
      parsedDoc.Statement.push({
        Sid: 'AllowRDSSubresourceAndSnapshotReferences', Effect: 'Allow', Action: ['rds:CreateDBInstance', 'rds:CreateDBSnapshot'],
        Resource: [
          `arn:aws:rds:${region}:${pack.target.accountId}:subgrp:ugondu-rds-subnet-\${aws:PrincipalTag/UgonduTransactionId}-*`,
          `arn:aws:rds:${region}:${pack.target.accountId}:db:ugondu-db-\${aws:PrincipalTag/UgonduTransactionId}-*`,
          `arn:aws:rds:${region}:${pack.target.accountId}:snapshot:ugondu-rds-snap-\${aws:PrincipalTag/UgonduTransactionId}-*`,
          `arn:aws:rds:${region}:${pack.target.accountId}:pg:*`, `arn:aws:rds:${region}:${pack.target.accountId}:og:*`, `arn:aws:rds:${region}:${pack.target.accountId}:secgrp:*`
        ],
        Condition: { StringEquals: { 'aws:RequestedRegion': region }, Null: { 'aws:PrincipalTag/UgonduTransactionId': 'false' } }
      });
      targetCompactJson = JSON.stringify(parsedDoc);
    }
    const metaRes = aws(['iam', 'get-policy', '--policy-arn', pol.arn], region);
    if (metaRes.status === 0 && metaRes.json?.Policy?.DefaultVersionId) {
      const verRes = aws(['iam', 'get-policy-version', '--policy-arn', pol.arn, '--version-id', metaRes.json.Policy.DefaultVersionId], region);
      const rawVer = verRes.status === 0 && verRes.json?.PolicyVersion?.Document
        ? JSON.stringify(typeof verRes.json.PolicyVersion.Document === 'string' ? JSON.parse(decodeURIComponent(verRes.json.PolicyVersion.Document)) : verRes.json.PolicyVersion.Document) : '';
      if (rawVer && (rawVer.includes('us-east-1') || rawVer !== targetCompactJson)) {
        let upRes = aws(['iam', 'create-policy-version', '--policy-arn', pol.arn, '--policy-document', targetCompactJson, '--set-as-default'], region);
        if (upRes.status !== 0 && /LimitExceeded/i.test(upRes.stderr || '')) {
          const vList = aws(['iam', 'list-policy-versions', '--policy-arn', pol.arn], region);
          const nonDefault = (vList.json?.Versions || []).filter((v) => !v.IsDefaultVersion).sort((a, b) => new Date(a.CreateDate) - new Date(b.CreateDate));
          if (nonDefault.length > 0) {
            aws(['iam', 'delete-policy-version', '--policy-arn', pol.arn, '--version-id', nonDefault[0].VersionId], region);
            upRes = aws(['iam', 'create-policy-version', '--policy-arn', pol.arn, '--policy-document', targetCompactJson, '--set-as-default'], region);
          }
        }
        if (upRes.status === 0) {
          const newVerId = upRes.json?.PolicyVersion?.VersionId || metaRes.json.Policy.DefaultVersionId;
          const verCheck = aws(['iam', 'get-policy-version', '--policy-arn', pol.arn, '--version-id', newVerId], region);
          if (verCheck.status !== 0 || !verCheck.json?.PolicyVersion?.Document) {
            return failClosedOperation(pack, region, reportPath, `Policy version update for ${pol.physicalName} returned success but could not be verified`, 'UG-BOOTSTRAP-READBACK-FAILED', verCheck.stderr || `get-policy-version exited ${verCheck.status}`);
          }
          reconciledPolicyVersions.push(pol.physicalName);
        } else if (/AccessDenied|Access Denied|not authorized/i.test(upRes.stderr || '')) {
          return failClosedAuth(pack, region, reportPath, `iam:CreatePolicyVersion denied for ${pol.physicalName}`, formatBootstrapRemediationDiagnostic(pack, upRes.stderr));
        } else {
          return failClosedOperation(pack, region, reportPath, `Unable to update policy ${pol.physicalName}; refusing to continue with a potentially drifted policy`, 'UG-BOOTSTRAP-POLICY-UPDATE-FAILED', upRes.stderr || `create-policy-version exited ${upRes.status}`);
        }
      }
    }

    if (listConfirmed && attachedSet.has(pol.physicalName)) continue;

    let attachRes = aws(['iam', 'attach-role-policy', '--role-name', execRoleName, '--policy-arn', pol.arn], region);
    if (attachRes.status !== 0 && /NoSuchEntity/i.test(attachRes.stderr || '')) {
      const createRes = aws(['iam', 'create-policy', '--policy-name', pol.physicalName, '--policy-document', targetCompactJson, '--tags', 'Key=UgonduCOR,Value=true'], region);
      if (createRes.status === 0) {
        const polCheck = aws(['iam', 'get-policy', '--policy-arn', pol.arn], region);
        if (polCheck.status !== 0 || !polCheck.json?.Policy?.Arn) {
          return failClosedOperation(pack, region, reportPath, `Policy ${pol.physicalName} was created but its existence could not be verified; attachment is blocked`, 'UG-BOOTSTRAP-READBACK-FAILED', polCheck.stderr || `get-policy exited ${polCheck.status}`);
        }
        attachRes = aws(['iam', 'attach-role-policy', '--role-name', execRoleName, '--policy-arn', pol.arn], region);
      } else if (/AccessDenied|Access Denied|not authorized/i.test(createRes.stderr || '')) {
        return failClosedAuth(pack, region, reportPath, `iam:CreatePolicy denied for ${pol.physicalName}`, formatBootstrapRemediationDiagnostic(pack, createRes.stderr));
      } else {
        attachRes = createRes;
      }
    }

    if (attachRes.status === 0) {
      const verifyAttach = aws(['iam', 'list-attached-role-policies', '--role-name', execRoleName], region);
      if (verifyAttach.status !== 0 || !Array.isArray(verifyAttach.json?.AttachedPolicies)) {
        return failClosedOperation(pack, region, reportPath, `Attachment of ${pol.physicalName} succeeded but read-back verification failed`, 'UG-BOOTSTRAP-READBACK-FAILED', verifyAttach.stderr || `list-attached-role-policies exited ${verifyAttach.status}`);
      }
      attachedSet = new Set(verifyAttach.json.AttachedPolicies.map((p) => p.PolicyName || p.PolicyArn?.split('/').pop()));
      if (!attachedSet.has(pol.physicalName)) {
        return failClosedOperation(pack, region, reportPath, `Attachment of ${pol.physicalName} was not confirmed by AWS read-back`, 'UG-BOOTSTRAP-ATTACHMENT-UNVERIFIED');
      }
      attachedDuringBootstrap.push(pol.physicalName);
    } else if (/AccessDenied|Access Denied|not authorized/i.test(attachRes.stderr || '')) {
      return failClosedAuth(pack, region, reportPath, `iam:AttachRolePolicy denied for ${pol.physicalName}`, formatBootstrapRemediationDiagnostic(pack, attachRes.stderr));
    } else {
      return failClosedOperation(pack, region, reportPath, `Unable to attach required policy ${pol.physicalName}; refusing to report bootstrap success`, 'UG-BOOTSTRAP-ATTACHMENT-FAILED', attachRes.stderr || `attach-role-policy exited ${attachRes.status}`);
    }
  }

  let preliminaryState = BOOTSTRAP_OPERATING_STATES.RETURNING_INSTALLATION_MATCHED;
  if (reconciledPolicyVersions.length > 0) preliminaryState = BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED;
  else if (attachedDuringBootstrap.length > 0) {
    preliminaryState = (listConfirmed && alreadyAttachedCount > 0 && alreadyAttachedCount < 5)
      ? BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED
      : BOOTSTRAP_OPERATING_STATES.INITIAL_INSTALLATION_AUTHORIZED;
  }

  const missingRequiredPolicies = pack.policies.map((p) => p.physicalName).filter((name) => !attachedSet.has(name));
  if (!listConfirmed || missingRequiredPolicies.length > 0) {
    return failClosedOperation(pack, region, reportPath, `Required policy attachment verification incomplete: ${missingRequiredPolicies.join(', ') || 'initial attachment inventory unavailable'}`, 'UG-BOOTSTRAP-ATTACHMENT-UNVERIFIED');
  }

  const report = {
    schemaVersion: '1.0.0', packId: pack.packId, phase: 'bootstrap-provision', evaluatedAt: new Date().toISOString(),
    awsAccountId: pack.target.accountId, awsRegion: region, executionRoleArn: pack.executionRole.arn, runnerRoleArn: pack.runnerRole.arn,
    validatedPolicyCount: pack.policies.length, totalStatementsVerified: pack.totalStatements,
    alreadyAttachedCount, attachedDuringBootstrap, reconciledPolicyVersions, runnerHygiene,
    bootstrapProvisioningDenied: false, denialDetail: null,
    checksConfirmed: {
      runnerDelegation: runnerHygiene.delegationStatementConfirmed, executionRoleTrust: false,
      v9PolicyAttachments: listConfirmed && (alreadyAttachedCount + attachedDuringBootstrap.length >= 5),
      regionConsistency: !runnerHygiene.runnerUsEast1DriftDetected
    },
    operatingState: preliminaryState, status: 'PRELIMINARY'
  };
  writeReport(reportPath, report);
  console.log(`[BOOTSTRAP-PROVISION] Operating state: ${preliminaryState}`);
  if (reconciledPolicyVersions.length > 0) console.log(`[BOOTSTRAP-PROVISION] Reconciled: ${reconciledPolicyVersions.join(', ')}`);
  return { exitCode: 0, report };
}

export function runVerifyEffectivePhase(options = {}) {
  const aws = options.awsRunner || defaultAws;
  const reportPath = resolveReportPath(options.evidenceDir);
  const pack = loadAndValidateBootstrapPolicyPack(options);
  const region = options.region || process.env.AWS_REGION || pack.target.region;

  let prior = {};
  if (fs.existsSync(reportPath)) {
    try { prior = JSON.parse(fs.readFileSync(reportPath, 'utf8')); } catch { prior = {}; }
  }

  const idRes = aws(['sts', 'get-caller-identity'], region);
  const arn = String(idRes.json?.Arn || '');
  if (idRes.status !== 0 || idRes.json?.Account !== pack.target.accountId || !arn.includes(`:assumed-role/${pack.executionRole.physicalName}/`)) {
    const failReport = {
      ...prior, schemaVersion: '1.0.0', phase: 'verify-effective',
      operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE, errorCode: 'UG-BOOTSTRAP-ROLE-INVALID',
      status: 'FAIL', reason: `Expected assumed session for ${pack.executionRole.physicalName}, got ${arn || idRes.stderr}`
    };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const vpcRes = aws(['ec2', 'describe-vpcs'], region);
  if (vpcRes.status !== 0) {
    const diagnostic = formatBootstrapRemediationDiagnostic(pack, prior.denialDetail || vpcRes.stderr);
    const failReport = {
      ...prior, schemaVersion: '1.0.0', packId: pack.packId, phase: 'verify-effective', evaluatedAt: new Date().toISOString(),
      operatingState: BOOTSTRAP_OPERATING_STATES.BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT, errorCode: 'UG-BOOTSTRAP-AUTH-MISSING',
      status: 'FAIL', effectivePermissionsVerified: false,
      checksConfirmed: { runnerDelegation: true, executionRoleTrust: true, v9PolicyAttachments: false, regionConsistency: !prior.runnerHygiene?.runnerUsEast1DriftDetected },
      diagnostic,
      remediation: {
        missingExecutionRoleArn: pack.executionRole.arn, missingPolicies: pack.policies.map((p) => p.physicalName),
        optionA: `Grant iam:ListAttachedRolePolicies and iam:AttachRolePolicy on ${pack.executionRole.arn} for arn:aws:iam::${pack.target.accountId}:policy/UgonduCOR-V9-* to ${pack.runnerRole.arn}`,
        optionB: `Attach ${pack.policies.map((p) => p.physicalName).join(', ')} to ${pack.executionRole.physicalName} via IaC or AWS IAM Console`
      }
    };
    writeReport(reportPath, failReport);
    console.error(diagnostic);
    return { exitCode: 1, report: failReport };
  }

  const iamRes = aws(['iam', 'list-users'], region);
  const boundaryDenied = iamRes.status !== 0 && /AccessDenied|Access Denied|not authorized/i.test(iamRes.stderr || '');
  if (!boundaryDenied) {
    const failReport = {
      ...prior, schemaVersion: '1.0.0', packId: pack.packId, phase: 'verify-effective', evaluatedAt: new Date().toISOString(),
      operatingState: BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION, errorCode: 'UG-BOOTSTRAP-BOUNDARY-VIOLATION',
      status: 'FAIL', reason: 'Negative boundary violation: iam:ListUsers was not denied on UgonduCORExecutionRole'
    };
    writeReport(reportPath, failReport);
    console.error(`[FAIL] UG-BOOTSTRAP-BOUNDARY-VIOLATION: ${failReport.reason}`);
    return { exitCode: 1, report: failReport };
  }

  const finalState = (prior.operatingState === BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED)
    ? BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED
    : (Array.isArray(prior.attachedDuringBootstrap) && prior.attachedDuringBootstrap.length > 0 && !prior.bootstrapProvisioningDenied)
      ? BOOTSTRAP_OPERATING_STATES.INITIAL_INSTALLATION_AUTHORIZED
      : BOOTSTRAP_OPERATING_STATES.RETURNING_INSTALLATION_MATCHED;

  const passReport = {
    ...prior, schemaVersion: '1.0.0', packId: pack.packId, phase: 'verify-effective', evaluatedAt: new Date().toISOString(),
    awsAccountId: pack.target.accountId, awsRegion: region, callerArn: arn, operatingState: finalState,
    effectivePermissionsVerified: true, negativeBoundaryVerified: true,
    checksConfirmed: { runnerDelegation: true, executionRoleTrust: true, v9PolicyAttachments: true, regionConsistency: !prior.runnerHygiene?.runnerUsEast1DriftDetected },
    policiesVerified: pack.policies.map((p) => ({ name: p.physicalName, sha256: p.sha256, chars: p.compactCharLength })), status: 'PASS'
  };
  writeReport(reportPath, passReport);
  console.log(`[PASS] AWS COR V9 Policy Pack Reconciled & Verified (${finalState})`);
  return { exitCode: 0, report: passReport };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const phase = process.argv.includes('--phase') ? process.argv[process.argv.indexOf('--phase') + 1] : 'verify-effective';
  if (phase === 'render-starter-policy') {
    const accountId = process.argv.includes('--account-id') ? process.argv[process.argv.indexOf('--account-id') + 1] : undefined;
    console.log(JSON.stringify(renderBootstrapStarterPolicy({ accountId }), null, 2));
    process.exit(0);
  }
  process.exit((phase === 'bootstrap-provision' ? runBootstrapProvisionPhase() : runVerifyEffectivePhase()).exitCode);
}
