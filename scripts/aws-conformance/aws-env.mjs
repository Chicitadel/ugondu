#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Credential Bootstrap
 * File           : aws-env.mjs
 * Version        : 2.0.0
 * Classification : ENTERPRISE | INTERNAL
 *
 * Uses the AWS CLI default credential provider chain. Credentials must be
 * supplied by OIDC/STS, an approved profile/SSO session, or an instance/task
 * role. This module never reads access-key CSV files or injects static keys.
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
import { spawnSync } from 'node:child_process';

/** Preserve the caller's AWS credential chain; set only non-secret region options. */
export function awsEnv(region = process.env.AWS_REGION || 'eu-west-3') {
  return {
    ...process.env,
    AWS_REGION: region,
    AWS_DEFAULT_REGION: region,
    AWS_PAGER: ''
  };
}

/** Runs the AWS CLI using its standard credential chain; never echoes environment values. */
export function aws(args, region) {
  const r = spawnSync('aws', [...args, '--output', 'json'], {
    env: awsEnv(region),
    encoding: 'utf8',
    shell: false
  });
  let json = null;
  try { json = r.stdout ? JSON.parse(r.stdout) : null; } catch { json = null; }
  return { status: r.status, json, stderr: (r.stderr || '').trim() };
}
