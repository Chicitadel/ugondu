#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Read-Only Identity Probe
 * File           : probe-identity.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Read-only: performs no mutating AWS call
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
import { aws } from './aws-env.mjs';

const short = (s) => s.split('\n')[0].slice(0, 200);
const id = aws(['sts', 'get-caller-identity']);
if (id.status !== 0) {
  console.log('[FAIL] sts:GetCallerIdentity —', short(id.stderr));
  process.exit(1);
}
console.log('[INFO] Account :', id.json.Account);
console.log('[INFO] Principal:', id.json.Arn);

const user = id.json.Arn.split('/').pop();
const attached = aws(['iam', 'list-attached-user-policies', '--user-name', user]);
console.log('[INFO] Attached policies:', attached.status === 0
  ? (attached.json.AttachedPolicies.map((p) => p.PolicyName).join(', ') || '(none)')
  : `DENIED — ${short(attached.stderr)}`);

const inline = aws(['iam', 'list-user-policies', '--user-name', user]);
console.log('[INFO] Inline policies  :', inline.status === 0
  ? (inline.json.PolicyNames.join(', ') || '(none)')
  : `DENIED — ${short(inline.stderr)}`);

const role = aws(['iam', 'get-role', '--role-name', 'UgonduCORExecutionRole']);
console.log('[INFO] UgonduCORExecutionRole:', role.status === 0 ? `EXISTS ${role.json.Role.Arn}` : `NOT ACCESSIBLE — ${short(role.stderr)}`);

const sim = aws(['iam', 'simulate-custom-policy', '--policy-input-list', '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":"s3:ListAllMyBuckets","Resource":"*"}]}', '--action-names', 's3:ListAllMyBuckets']);
console.log('[INFO] iam:SimulateCustomPolicy:', sim.status === 0 ? 'AVAILABLE' : `DENIED — ${short(sim.stderr)}`);
