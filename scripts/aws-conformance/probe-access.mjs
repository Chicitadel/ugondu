#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Role Assumption & Read-Only Capability Probe
 * File           : probe-access.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Non-mutating: STS session creation and Describe/List/Get calls only
 * - Output is a capability matrix; no credential or session secret is printed
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
import { aws } from './aws-env.mjs';

const REGION = process.env.AWS_REGION || 'eu-west-3';
const short = (s) => (s || '').split('\n')[0].replace(/User: arn:aws:iam::\d+:/, 'User: ').slice(0, 170);
const results = [];
const record = (area, call, r) => {
  const ok = r.status === 0;
  results.push({ area, call, ok });
  console.log(`${ok ? '[ALLOW]' : '[DENY ]'} ${area.padEnd(12)} ${call}${ok ? '' : '  — ' + short(r.stderr)}`);
};

const id = aws(['sts', 'get-caller-identity'], REGION);
const account = id.json?.Account;
console.log(`[INFO] account=${account} region=${REGION}`);

// Role assumption paths the COR pack depends on (session tags are mandatory for the execution role).
for (const role of ['UgonduCORExecutionRole', 'UgonduCORRunner']) {
  const r = aws([
    'sts', 'assume-role',
    '--role-arn', `arn:aws:iam::${account}:role/${role}`,
    '--role-session-name', 'ugondu-conformance-probe',
    '--duration-seconds', '900',
    '--tags', 'Key=UgonduTransactionId,Value=probe', 'Key=UgonduCOR,Value=true'
  ], REGION);
  record('sts', `AssumeRole ${role}`, r);
}

const probes = [
  ['ec2', ['ec2', 'describe-regions', '--region-names', REGION]],
  ['ec2', ['ec2', 'describe-vpcs']],
  ['s3', ['s3api', 'list-buckets']],
  ['rds', ['rds', 'describe-db-instances']],
  ['ecr', ['ecr', 'describe-repositories']],
  ['ecs', ['ecs', 'list-clusters']],
  ['ssm', ['ssm', 'describe-parameters', '--max-results', '1']],
  ['codecommit', ['codecommit', 'list-repositories']],
  ['iam', ['iam', 'get-account-summary']],
  ['kms', ['kms', 'list-keys', '--limit', '1']]
];
for (const [area, args] of probes) record(area, args.slice(0, 2).join(':'), aws(args, REGION));

const allowed = results.filter((r) => r.ok).length;
console.log(`[SUMMARY] ${allowed}/${results.length} probes allowed`);
