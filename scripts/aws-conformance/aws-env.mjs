#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Credential Bootstrap
 * File           : aws-env.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Secrets never printed, logged, persisted, or committed
 *
 * Loads an AWS access-key CSV (path supplied via UGONDU_AWS_TEST_CREDENTIALS_CSV)
 * into the environment of child processes only. Secret values never reach stdout.
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

export function loadAwsCredentialsFromCsv(csvPath) {
  if (!csvPath || !fs.existsSync(csvPath)) {
    throw new Error('UGONDU_AWS_TEST_CREDENTIALS_CSV is not set or the file does not exist');
  }
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = lines[0].replace(/^\uFEFF/, '').split(',').map((h) => h.trim().toLowerCase());
  const row = lines[1].split(',').map((c) => c.trim());
  const idx = (name) => header.indexOf(name);
  const accessKeyId = row[idx('access key id')];
  const secretAccessKey = row[idx('secret access key')];
  if (!accessKeyId || !secretAccessKey) throw new Error('Credential CSV is missing required columns');
  return { accessKeyId, secretAccessKey, userName: row[idx('user name')] };
}

export function awsEnv(region = process.env.AWS_REGION || 'eu-west-3') {
  const c = loadAwsCredentialsFromCsv(process.env.UGONDU_AWS_TEST_CREDENTIALS_CSV);
  return {
    ...process.env,
    AWS_ACCESS_KEY_ID: c.accessKeyId,
    AWS_SECRET_ACCESS_KEY: c.secretAccessKey,
    AWS_REGION: region,
    AWS_DEFAULT_REGION: region,
    AWS_PAGER: ''
  };
}

/** Runs the AWS CLI with injected credentials; returns { status, json, stderr }. Never echoes env. */
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
