/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Target Resolver & Boundary Validator
 * File           : target-resolver.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, 'config/qualification/aws-target.json');

const REGION_REGEX = /^[a-z]{2}-[a-z]+-\d$/;
const ACCOUNT_REGEX = /^\d{12}$/;

/**
 * Loads and validates the governed AWS qualification target registry.
 */
export function loadAwsTargetsConfig(customPath) {
  const filePath = customPath || CONFIG_PATH;
  if (!fs.existsSync(filePath)) {
    throw new Error(`AWS target configuration missing at ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Invalid JSON in AWS target configuration: ${err.message}`);
  }

  if (config.schemaVersion !== '1.0.0') {
    throw new Error(`Unsupported schemaVersion in AWS target config: ${config.schemaVersion}`);
  }

  if (!Array.isArray(config.targets) || config.targets.length === 0) {
    throw new Error('AWS target configuration must declare at least one target definition');
  }

  for (const t of config.targets) {
    if (!t.id || typeof t.id !== 'string') {
      throw new Error('Target entry missing valid string "id"');
    }
    if (!t.accountId || !ACCOUNT_REGEX.test(t.accountId)) {
      throw new Error(`Target ${t.id} has invalid accountId (must be 12 digits): ${t.accountId}`);
    }
    if (!t.region || !REGION_REGEX.test(t.region)) {
      throw new Error(`Target ${t.id} has invalid region format: ${t.region}`);
    }
    if (!t.executionRoleName || typeof t.executionRoleName !== 'string') {
      throw new Error(`Target ${t.id} missing executionRoleName`);
    }
    if (!Array.isArray(t.allowedActions)) {
      throw new Error(`Target ${t.id} missing allowedActions array`);
    }
    if (!t.residualsPolicy || typeof t.residualsPolicy !== 'object') {
      throw new Error(`Target ${t.id} missing residualsPolicy`);
    }
  }

  return config;
}

/**
 * Resolves a specific AWS qualification target by targetId or environment selection.
 */
export function resolveAwsTarget(targetId = process.env.UGONDU_AWS_TARGET_ID, customPath) {
  const config = loadAwsTargetsConfig(customPath);
  const targets = config.targets;

  if (targetId) {
    const found = targets.find((t) => t.id === targetId);
    if (!found) {
      throw new Error(`AWS target with id "${targetId}" not found in ${customPath || CONFIG_PATH}`);
    }
    return found;
  }

  if (targets.length === 1) {
    return targets[0];
  }

  throw new Error(
    'Multiple AWS targets configured; UGONDU_AWS_TARGET_ID environment variable is required to select target.'
  );
}
