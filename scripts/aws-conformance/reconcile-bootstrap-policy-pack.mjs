#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Live Bootstrap Policy Pack Reconciler
 * File           : reconcile-bootstrap-policy-pack.mjs
 * Version        : 1.0.0
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
 * onto UgonduCORExecutionRole during bootstrap-provision and verifies effective permissions
 * and least-privilege negative boundaries during verify-effective prior to physical COR probes.
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
  SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION: 'SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION'
});

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

export function loadAndValidateBootstrapPolicyPack(options = {}) {
  const packDir = options.packDir || DEFAULT_PACK_DIR;
  const target = options.target || resolveAwsTarget();
  const packYamlPath = path.join(packDir, 'pack.yaml');
  if (!fs.existsSync(packYamlPath)) {
    throw new Error(`Policy pack manifest missing at ${packYamlPath}`);
  }
  const yaml = fs.readFileSync(packYamlPath, 'utf8').replace(/\r\n/g, '\n');
  const maxPolicyChars = Number((yaml.match(/maxManagedPolicySizeChars:\s*(\d+)/) || [])[1] || 6144);
  const maxPoliciesPerRole = Number((yaml.match(/maxManagedPoliciesPerRole:\s*(\d+)/) || [])[1] || 10);
  const expectedTotalStatements = Number((yaml.match(/totalStatementsInPack:\s*(\d+)/) || [])[1] || 46);
  const packAccountId = (yaml.match(/accountId:\s*"?(\d{12})"?/) || [])[1];
  const packRegion = (yaml.match(/region:\s*([a-z0-9-]+)/) || [])[1];
  const prohibitRunnerAttach = /prohibitRunnerExecutionAttachment:\s*true/.test(yaml);

  if (packAccountId !== target.accountId || packRegion !== target.region) {
    throw new Error(`Pack targetScope (${packAccountId}/${packRegion}) mismatches target config (${target.accountId}/${target.region})`);
  }
  if (!prohibitRunnerAttach) {
    throw new Error('Safety guardrail violation: prohibitRunnerExecutionAttachment must be true in pack.yaml');
  }

  const rolesSection = yaml.slice(yaml.indexOf('\nroles:\n') + 7, yaml.indexOf('\npolicies:\n'));
  const roles = rolesSection.split(/\n  - logicalId:\s*/).slice(1).map((block) => ({
    logicalId: block.split('\n')[0].trim(),
    physicalName: (block.match(/physicalName:\s*(\S+)/) || [])[1],
    arn: (block.match(/arn:\s*"?([^"\n]+)"?/) || [])[1],
    roleKind: (block.match(/roleKind:\s*(\S+)/) || [])[1],
    prohibitExecutionPolicyAttachment: /prohibitExecutionPolicyAttachment:\s*true/.test(block)
  }));

  const executionRole = roles.find((r) => r.logicalId === 'execution-role');
  const runnerRole = roles.find((r) => r.logicalId === 'runner-role');
  if (!executionRole || executionRole.physicalName !== target.executionRoleName) {
    throw new Error(`Canonical execution role mismatch: expected ${target.executionRoleName}`);
  }
  if (!runnerRole || !runnerRole.prohibitExecutionPolicyAttachment) {
    throw new Error('Runner role must explicitly set prohibitExecutionPolicyAttachment: true');
  }

  const policiesSection = yaml.slice(yaml.indexOf('\npolicies:\n') + 10, yaml.indexOf('\nquotas:\n'));
  const rawPolicies = policiesSection.split(/\n  - logicalId:\s*/).slice(1);
  if (rawPolicies.length !== 5 || rawPolicies.length > maxPoliciesPerRole) {
    throw new Error(`Invalid split policy count ${rawPolicies.length} (expected 5, max ${maxPoliciesPerRole})`);
  }

  let totalStatements = 0;
  const policies = rawPolicies.map((block) => {
    const logicalId = block.split('\n')[0].trim();
    const physicalName = (block.match(/physicalName:\s*(\S+)/) || [])[1];
    const templatePath = (block.match(/templatePath:\s*(\S+)/) || [])[1];
    const declaredSha = (block.match(/sha256:\s*"?([0-9a-fA-F]{64})"?/) || [])[1];
    const declaredStatements = Number((block.match(/statementCount:\s*(\d+)/) || [])[1] || 0);
    const targetRoleLogicalId = (block.match(/targetRoleLogicalId:\s*(\S+)/) || [])[1];

    if (targetRoleLogicalId !== 'execution-role' || physicalName.includes(runnerRole.physicalName)) {
      throw new Error(`Self-escalation violation: policy ${physicalName} targets non-execution role ${targetRoleLogicalId}`);
    }

    const absPath = path.join(packDir, templatePath);
    const rawBuf = fs.readFileSync(absPath);
    const actualSha = sha256(rawBuf);
    if (actualSha !== declaredSha) {
      throw new Error(`SHA-256 mismatch for ${templatePath}: expected ${declaredSha}, got ${actualSha}`);
    }

    const parsed = JSON.parse(rawBuf.toString('utf8'));
    if (parsed.Version !== '2012-10-17' || !Array.isArray(parsed.Statement)) {
      throw new Error(`Invalid IAM policy structure in ${templatePath}`);
    }
    const compactJson = JSON.stringify(parsed);
    if (compactJson.length > maxPolicyChars) {
      throw new Error(`Policy ${physicalName} compact size ${compactJson.length} exceeds limit ${maxPolicyChars}`);
    }
    if (parsed.Statement.length !== declaredStatements) {
      throw new Error(`Policy ${physicalName} statement count ${parsed.Statement.length} != ${declaredStatements}`);
    }
    if (/\$\{(?:REGION|ACCOUNT_ID)\}/.test(compactJson)) {
      throw new Error(`Policy ${physicalName} contains unresolved template placeholders`);
    }
    if (logicalId !== 'discovery') {
      if (!compactJson.includes(target.region) || !compactJson.includes(target.accountId)) {
        throw new Error(`Policy ${physicalName} missing target scope parameterization (${target.region}/${target.accountId})`);
      }
    }
    totalStatements += parsed.Statement.length;
    return {
      logicalId,
      physicalName,
      arn: `arn:aws:iam::${target.accountId}:policy/${physicalName}`,
      templatePath,
      sha256: actualSha,
      compactCharLength: compactJson.length,
      statementCount: parsed.Statement.length,
      compactJson
    };
  });

  if (totalStatements !== expectedTotalStatements) {
    throw new Error(`Total statement count ${totalStatements} mismatches expected ${expectedTotalStatements}`);
  }

  return {
    packId: 'aws.cor.v9',
    target,
    executionRole,
    runnerRole,
    maxPolicyChars,
    maxPoliciesPerRole,
    totalStatements,
    policies
  };
}

function resolveReportPath(customDir) {
  const dir = customDir || process.env.UGONDU_EVIDENCE_INPUT_DIR || path.join(ROOT, '.cor_evidence/raw');
  return path.join(path.resolve(dir), 'tests/aws-policy-reconciliation-results.json');
}

function writeReport(reportPath, payload) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

export function formatBootstrapRemediationDiagnostic(pack, denialDetail) {
  const roleArn = pack.executionRole.arn;
  const runnerArn = pack.runnerRole.arn;
  const policyNames = pack.policies.map((p) => p.physicalName).join(', ');
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

export function runBootstrapProvisionPhase(options = {}) {
  const aws = options.awsRunner || defaultAws;
  const reportPath = resolveReportPath(options.evidenceDir);
  let pack;
  try {
    pack = loadAndValidateBootstrapPolicyPack(options);
  } catch (err) {
    const failReport = {
      schemaVersion: '1.0.0',
      phase: 'bootstrap-provision',
      operatingState: BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION,
      errorCode: 'UG-BOOTSTRAP-BOUNDARY-VIOLATION',
      status: 'FAIL',
      reason: err.message
    };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const region = options.region || process.env.AWS_REGION || pack.target.region;
  const idRes = aws(['sts', 'get-caller-identity'], region);
  if (idRes.status !== 0 || idRes.json?.Account !== pack.target.accountId || !String(idRes.json?.Arn || '').includes(':assumed-role/')) {
    const failReport = {
      schemaVersion: '1.0.0',
      phase: 'bootstrap-provision',
      operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE,
      errorCode: 'UG-BOOTSTRAP-ROLE-INVALID',
      status: 'FAIL',
      reason: `Invalid caller identity for bootstrap-provision: ${idRes.stderr || idRes.json?.Arn || 'unknown'}`
    };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  if (options.targetRoleOverride && options.targetRoleOverride === pack.runnerRole.physicalName) {
    const failReport = {
      schemaVersion: '1.0.0',
      phase: 'bootstrap-provision',
      operatingState: BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION,
      errorCode: 'UG-BOOTSTRAP-BOUNDARY-VIOLATION',
      status: 'FAIL',
      reason: `Self-escalation prohibited: refusing to attach execution policies to runner role ${pack.runnerRole.physicalName}`
    };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const execRoleName = pack.executionRole.physicalName;
  const listRes = aws(['iam', 'list-attached-role-policies', '--role-name', execRoleName], region);
  let attachedSet = new Set();
  let listConfirmed = false;
  let bootstrapProvisioningDenied = false;
  let denialDetail = '';

  if (listRes.status === 0 && Array.isArray(listRes.json?.AttachedPolicies)) {
    listConfirmed = true;
    attachedSet = new Set(listRes.json.AttachedPolicies.map((p) => p.PolicyName || p.PolicyArn?.split('/').pop()));
  } else if (/NoSuchEntity/i.test(listRes.stderr || '')) {
    const failReport = {
      schemaVersion: '1.0.0',
      phase: 'bootstrap-provision',
      operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE,
      errorCode: 'UG-BOOTSTRAP-ROLE-INVALID',
      status: 'FAIL',
      reason: `Canonical execution role ${execRoleName} does not exist: ${listRes.stderr}`
    };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const alreadyAttachedCount = attachedSet.size;
  const attachedDuringBootstrap = [];

  for (const pol of pack.policies) {
    if (listConfirmed && attachedSet.has(pol.physicalName)) continue;
    let attachRes = aws(['iam', 'attach-role-policy', '--role-name', execRoleName, '--policy-arn', pol.arn], region);
    if (attachRes.status !== 0 && /NoSuchEntity/i.test(attachRes.stderr || '')) {
      const createRes = aws([
        'iam', 'create-policy',
        '--policy-name', pol.physicalName,
        '--policy-document', pol.compactJson,
        '--tags', 'Key=UgonduCOR,Value=true'
      ], region);
      if (createRes.status === 0) {
        attachRes = aws(['iam', 'attach-role-policy', '--role-name', execRoleName, '--policy-arn', pol.arn], region);
      } else {
        attachRes = createRes;
      }
    }
    if (attachRes.status === 0) {
      attachedDuringBootstrap.push(pol.physicalName);
    } else if (/AccessDenied|Access Denied|not authorized/i.test(attachRes.stderr || '')) {
      bootstrapProvisioningDenied = true;
      denialDetail = attachRes.stderr;
      break;
    } else if (/NoSuchEntity/i.test(attachRes.stderr || '')) {
      const failReport = {
        schemaVersion: '1.0.0',
        phase: 'bootstrap-provision',
        operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE,
        errorCode: 'UG-BOOTSTRAP-ROLE-INVALID',
        status: 'FAIL',
        reason: `Canonical role or policy missing during attachment: ${attachRes.stderr}`
      };
      writeReport(reportPath, failReport);
      return { exitCode: 1, report: failReport };
    }
  }

  let preliminaryState = BOOTSTRAP_OPERATING_STATES.RETURNING_INSTALLATION_MATCHED;
  if (!bootstrapProvisioningDenied && attachedDuringBootstrap.length > 0) {
    preliminaryState = (listConfirmed && alreadyAttachedCount > 0 && alreadyAttachedCount < 5)
      ? BOOTSTRAP_OPERATING_STATES.DRIFT_DETECTED_AND_RECONCILED
      : BOOTSTRAP_OPERATING_STATES.INITIAL_INSTALLATION_AUTHORIZED;
  }

  const report = {
    schemaVersion: '1.0.0',
    packId: pack.packId,
    phase: 'bootstrap-provision',
    evaluatedAt: new Date().toISOString(),
    awsAccountId: pack.target.accountId,
    awsRegion: region,
    executionRoleArn: pack.executionRole.arn,
    runnerRoleArn: pack.runnerRole.arn,
    validatedPolicyCount: pack.policies.length,
    totalStatementsVerified: pack.totalStatements,
    alreadyAttachedCount,
    attachedDuringBootstrap,
    bootstrapProvisioningDenied,
    denialDetail: denialDetail || null,
    operatingState: preliminaryState,
    status: 'PRELIMINARY'
  };
  writeReport(reportPath, report);
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
      ...prior,
      schemaVersion: '1.0.0',
      phase: 'verify-effective',
      operatingState: BOOTSTRAP_OPERATING_STATES.CANONICAL_ROLE_MISSING_OR_UNASSUMABLE,
      errorCode: 'UG-BOOTSTRAP-ROLE-INVALID',
      status: 'FAIL',
      reason: `Expected assumed session for ${pack.executionRole.physicalName}, got ${arn || idRes.stderr}`
    };
    writeReport(reportPath, failReport);
    return { exitCode: 1, report: failReport };
  }

  const vpcRes = aws(['ec2', 'describe-vpcs'], region);
  if (vpcRes.status !== 0) {
    const diagnostic = formatBootstrapRemediationDiagnostic(pack, prior.denialDetail || vpcRes.stderr);
    const failReport = {
      ...prior,
      schemaVersion: '1.0.0',
      packId: pack.packId,
      phase: 'verify-effective',
      evaluatedAt: new Date().toISOString(),
      operatingState: BOOTSTRAP_OPERATING_STATES.BOOTSTRAP_AUTHORITY_MISSING_OR_INSUFFICIENT,
      errorCode: 'UG-BOOTSTRAP-AUTH-MISSING',
      status: 'FAIL',
      effectivePermissionsVerified: false,
      diagnostic,
      remediation: {
        missingExecutionRoleArn: pack.executionRole.arn,
        missingPolicies: pack.policies.map((p) => p.physicalName),
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
      ...prior,
      schemaVersion: '1.0.0',
      packId: pack.packId,
      phase: 'verify-effective',
      evaluatedAt: new Date().toISOString(),
      operatingState: BOOTSTRAP_OPERATING_STATES.SECURITY_GUARDRAIL_OR_BOUNDARY_VIOLATION,
      errorCode: 'UG-BOOTSTRAP-BOUNDARY-VIOLATION',
      status: 'FAIL',
      reason: 'Negative boundary violation: iam:ListUsers was not denied on UgonduCORExecutionRole'
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
    ...prior,
    schemaVersion: '1.0.0',
    packId: pack.packId,
    phase: 'verify-effective',
    evaluatedAt: new Date().toISOString(),
    awsAccountId: pack.target.accountId,
    awsRegion: region,
    callerArn: arn,
    operatingState: finalState,
    effectivePermissionsVerified: true,
    negativeBoundaryVerified: true,
    policiesVerified: pack.policies.map((p) => ({ name: p.physicalName, sha256: p.sha256, chars: p.compactCharLength })),
    status: 'PASS'
  };
  writeReport(reportPath, passReport);
  console.log(`[PASS] AWS COR V9 Policy Pack Reconciled & Verified (${finalState})`);
  return { exitCode: 0, report: passReport };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const phaseIdx = process.argv.indexOf('--phase');
  const phase = phaseIdx >= 0 ? process.argv[phaseIdx + 1] : 'verify-effective';
  const res = phase === 'bootstrap-provision' ? runBootstrapProvisionPhase() : runVerifyEffectivePhase();
  process.exit(res.exitCode);
}
