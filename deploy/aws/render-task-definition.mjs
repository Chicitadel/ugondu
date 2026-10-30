#!/usr/bin/env node
/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Deployment / AWS ECS Task Definition Renderer
 * File           : render-task-definition.mjs
 * Version        : 2.0.0
 * Author         : Ignatus Chika Ujomor (Lead Systems Architect) - Air Roofers SASU
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-30
 * Classification : ENTERPRISE | RESTRICTED
 *
 * Governance:
 * - Systems Architecture Governed
 * - Security Reviewed
 * - Fail-Closed Validation Enforced
 * - Secrets Isolation Mandated
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS v4
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE = path.join(here, 'task-definition.ecs.json');

export function renderTaskDefinition({
  templatePath = DEFAULT_TEMPLATE,
  accountId,
  region,
  imageTag,
  environmentName = 'staging',
  portabilityTier = 'AWS_FARGATE',
  dbUrlSecretArn,
  dbUsernameSecretArn,
  dbPasswordSecretArn,
}) {
  if (!/^\d{12}$/.test(accountId ?? '')) {
    throw new Error('AWS_ACCOUNT_ID must be exactly 12 digits.');
  }
  if (!/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(region ?? '')) {
    throw new Error('AWS_REGION must be a valid region identifier such as eu-west-3.');
  }
  if (!/^commit-[a-f0-9]{12,64}$/.test(imageTag ?? '')) {
    throw new Error('IMAGE_TAG must be commit- followed by 12-64 lowercase hexadecimal commit characters.');
  }

  if (!['development', 'staging', 'production'].includes(environmentName)) {
    throw new Error('ENVIRONMENT_NAME must be development, staging, or production.');
  }
  if (!['AWS_EC2', 'AWS_FARGATE'].includes(portabilityTier)) {
    throw new Error('PORTABILITY_TIER must be AWS_EC2 or AWS_FARGATE.');
  }

  const expectedSecretArn = new RegExp(
    '^arn:aws:secretsmanager:' + region + ':' + accountId +
    ':secret:[A-Za-z0-9/_+=.@-]+-[A-Za-z0-9]{6}$',
  );
  const secretArns = [dbUrlSecretArn, dbUsernameSecretArn, dbPasswordSecretArn];
  if (secretArns.some((arn) => !expectedSecretArn.test(arn ?? ''))) {
    throw new Error('DB_URL_SECRET_ARN, DB_USERNAME_SECRET_ARN and DB_PASSWORD_SECRET_ARN must be complete Secrets Manager ARNs for the selected account and region.');
  }

  const environmentAliases = {
    development: ['dev', 'development'],
    staging: ['stage', 'staging'],
    production: ['prod', 'production'],
  };
  const environmentSegments = new Set(['dev', 'development', 'stage', 'staging', 'prod', 'production']);
  for (const arn of secretArns) {
    const resource = (arn ?? '').split(':secret:')[1]?.replace(/-[A-Za-z0-9]{6}$/, '') ?? '';
    const segments = resource.toLowerCase().split(/[\\/_-]+/);
    const declaredEnvironment = segments.find((segment) => environmentSegments.has(segment));
    if (declaredEnvironment && !environmentAliases[environmentName].includes(declaredEnvironment)) {
      throw new Error('Secret ARN environment namespace does not match ENVIRONMENT_NAME.');
    }
  }

  const template = fs.readFileSync(templatePath, 'utf8');
  const rendered = template
    .replaceAll('${AWS_ACCOUNT_ID}', accountId)
    .replaceAll('${AWS_REGION}', region)
    .replaceAll('${IMAGE_TAG}', imageTag)
    .replaceAll('${ENVIRONMENT_NAME}', environmentName)
    .replaceAll('${PORTABILITY_TIER}', portabilityTier)
    .replaceAll('${DB_URL_SECRET_ARN}', dbUrlSecretArn)
    .replaceAll('${DB_USERNAME_SECRET_ARN}', dbUsernameSecretArn)
    .replaceAll('${DB_PASSWORD_SECRET_ARN}', dbPasswordSecretArn);

  if (/\$\{[A-Z0-9_]+\}/.test(rendered)) {
    throw new Error('Unresolved task-definition placeholder remains.');
  }

  let document;
  try {
    document = JSON.parse(rendered);
  } catch (error) {
    throw new Error(`Rendered task definition is not valid JSON: ${error.message}`);
  }

  const requiredCompatibility = portabilityTier === 'AWS_EC2' ? 'EC2' : 'FARGATE';
  if (document.networkMode !== 'awsvpc' || !document.requiresCompatibilities?.includes(requiredCompatibility)) {
    throw new Error(`Task definition must use awsvpc and support the selected ${requiredCompatibility} tier.`);
  }
  if (!document.executionRoleArn?.startsWith(`arn:aws:iam::${accountId}:role/`) ||
      !document.taskRoleArn?.startsWith(`arn:aws:iam::${accountId}:role/`)) {
    throw new Error('Task roles must resolve to the selected AWS account.');
  }
  const container = document.containerDefinitions?.find((item) => item.name === 'backend-api');
  if (!container?.image?.includes(`:${imageTag}`)) {
    throw new Error('Backend image must use the requested commit-derived image tag.');
  }
  if (container.secrets?.some((secret) => !secret.valueFrom || secret.valueFrom.includes('${'))) {
    throw new Error('All container secrets must reference valid Secrets Manager source values.');
  }

  return document;
}

function parseCliArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--template') {
      options.templatePath = argv[i += 1];
    } else if (arg === '--output') {
      options.outputPath = argv[i += 1];
    } else if (arg === '--tier') {
      options.portabilityTier = argv[i += 1];
    } else if (arg === '--env') {
      options.environmentName = argv[i += 1];
    }
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    const cli = parseCliArgs(process.argv.slice(2));
    const rendered = renderTaskDefinition({
      templatePath: cli.templatePath ?? process.env.TASK_DEFINITION_TEMPLATE,
      accountId: process.env.AWS_ACCOUNT_ID,
      region: process.env.AWS_REGION,
      imageTag: process.env.IMAGE_TAG,
      environmentName: cli.environmentName ?? process.env.ENVIRONMENT_NAME,
      portabilityTier: cli.portabilityTier ?? process.env.PORTABILITY_TIER,
      dbUrlSecretArn: process.env.DB_URL_SECRET_ARN,
      dbUsernameSecretArn: process.env.DB_USERNAME_SECRET_ARN,
      dbPasswordSecretArn: process.env.DB_PASSWORD_SECRET_ARN,
    });

    const json = JSON.stringify(rendered, null, 2) + '\n';
    if (cli.outputPath) {
      fs.mkdirSync(path.dirname(path.resolve(cli.outputPath)), { recursive: true });
      fs.writeFileSync(cli.outputPath, json, 'utf8');
    } else {
      process.stdout.write(json);
    }
  } catch (error) {
    process.stderr.write(`render-task-definition failed: ${error.message}\n`);
    process.exit(1);
  }
}
