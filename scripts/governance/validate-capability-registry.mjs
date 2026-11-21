/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Governance Validator — Capability & Product Registry
 * File           : validate-capability-registry.mjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd / Ujomor Systems
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Copyright (c) 2026 Air Roofers Ltd / Ujomor Systems
 * All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');

const REQUIRED_FILES = [
  '.governance/standards/product-registry.json',
  '.governance/product.definition.yaml',
  'config/model-catalog.json',
  'policy-packs/aws/cor/pack.yaml'
];

function validateYamlBasicSyntax(relPath, content, violations) {
  const lines = content.split(/\r?\n/);
  let hasKeyValue = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed === '---' || trimmed === '...') continue;
    if (/^\t/.test(line)) {
      violations.push(`${relPath}:${i + 1} uses tab indentation (invalid YAML)`);
    }
    if (/^[A-Za-z0-9_.-]+\s*:/.test(trimmed) || /^-\s+/.test(trimmed)) {
      hasKeyValue = true;
    }
  }
  if (!hasKeyValue) {
    violations.push(`${relPath} does not contain valid YAML mapping or sequence entries`);
  }
}

function validateProductRegistry(violations) {
  const relPath = '.governance/standards/product-registry.json';
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    violations.push(`Missing required file: ${relPath}`);
    return;
  }

  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (err) {
    violations.push(`Failed to parse ${relPath}: ${err.message}`);
    return;
  }

  if (!Array.isArray(registry.products) || registry.products.length === 0) {
    violations.push(`${relPath} must define a non-empty "products" array`);
    return;
  }

  const seenProductIds = new Set();
  const seenBaseUrls = new Set();
  const seenPorts = new Map();

  for (const product of registry.products) {
    const id = product.productId || product.id;
    if (!id) {
      violations.push(`${relPath} contains a product entry without productId`);
      continue;
    }
    if (seenProductIds.has(id)) {
      violations.push(`Duplicate productId "${id}" in ${relPath}`);
    }
    seenProductIds.add(id);

    const baseUrl = product.endpoints?.baseUrl;
    if (baseUrl) {
      if (seenBaseUrls.has(baseUrl)) {
        violations.push(`Conflicting endpoint baseUrl "${baseUrl}" in ${relPath}`);
      }
      seenBaseUrls.add(baseUrl);

      try {
        const parsedUrl = new URL(baseUrl);
        if (parsedUrl.port) {
          const prev = seenPorts.get(parsedUrl.port);
          if (prev && prev !== id) {
            violations.push(`Conflicting port ${parsedUrl.port} between ${prev} and ${id} in ${relPath}`);
          }
          seenPorts.set(parsedUrl.port, id);
        }
      } catch {
        violations.push(`Invalid endpoint baseUrl "${baseUrl}" for product ${id} in ${relPath}`);
      }
    }
  }
}

function validateProductDefinition(violations) {
  const relPath = '.governance/product.definition.yaml';
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    violations.push(`Missing required file: ${relPath}`);
    return;
  }

  const content = fs.readFileSync(absPath, 'utf8');
  validateYamlBasicSyntax(relPath, content, violations);

  for (const section of ['product:', 'product_boundary:', 'governance:', 'certification:']) {
    if (!content.includes(section)) {
      violations.push(`${relPath} is missing required top-level section "${section}"`);
    }
  }
}

function validateModelCatalog(violations) {
  const relPath = 'config/model-catalog.json';
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    violations.push(`Missing required file: ${relPath}`);
    return;
  }

  let catalog;
  try {
    catalog = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch (err) {
    violations.push(`Failed to parse ${relPath}: ${err.message}`);
    return;
  }

  const models = Array.isArray(catalog)
    ? catalog
    : Array.isArray(catalog.models)
      ? catalog.models
      : Object.values(catalog.models || {});

  const seenModelIds = new Set();
  for (const model of models) {
    if (!model || typeof model !== 'object') continue;
    const modelId = model.id || model.modelId || model.name;
    if (modelId) {
      if (seenModelIds.has(modelId)) {
        violations.push(`Duplicate model ID "${modelId}" in ${relPath}`);
      }
      seenModelIds.add(modelId);
    }
  }
}

function validatePolicyPack(violations) {
  const relPath = 'policy-packs/aws/cor/pack.yaml';
  const absPath = path.join(ROOT, relPath);
  if (!fs.existsSync(absPath)) {
    violations.push(`Missing required file: ${relPath}`);
    return;
  }

  const content = fs.readFileSync(absPath, 'utf8');
  validateYamlBasicSyntax(relPath, content, violations);

  const idMatches = [...content.matchAll(/^\s*-\s*id:\s*['"]?([A-Za-z0-9_.:-]+)['"]?/gm)];
  const seenRuleIds = new Set();
  for (const match of idMatches) {
    const ruleId = match[1];
    if (seenRuleIds.has(ruleId)) {
      violations.push(`Duplicate rule/capability ID "${ruleId}" in ${relPath}`);
    }
    seenRuleIds.add(ruleId);
  }
}

function validateServicePortsAndCapabilities(violations) {
  const composePath = path.join(ROOT, 'docker-compose.yml');
  if (fs.existsSync(composePath)) {
    const content = fs.readFileSync(composePath, 'utf8');
    const portMatches = [...content.matchAll(/-\s*PORT=(\d+)/g)];
    const seenPorts = new Set();
    for (const match of portMatches) {
      const port = match[1];
      if (seenPorts.has(port)) {
        violations.push(`Conflicting service PORT=${port} in docker-compose.yml`);
      }
      seenPorts.add(port);
    }
  }

  const capDefPath = path.join(
    ROOT,
    'server',
    'capabilities',
    'src',
    'capability-registry',
    'CapabilityDefinition.ts'
  );
  if (fs.existsSync(capDefPath)) {
    const content = fs.readFileSync(capDefPath, 'utf8');
    const setBlock = content.match(/CORE_CAPABILITY_IDS[^=]*=\s*new\s+Set\(\[([\s\S]*?)\]\)/);
    if (setBlock) {
      const capIds = [...setBlock[1].matchAll(/['"]([A-Z0-9_]+)['"]/g)].map((m) => m[1]);
      const seenCapIds = new Set();
      for (const capId of capIds) {
        if (seenCapIds.has(capId)) {
          violations.push(`Duplicate capability ID "${capId}" in CORE_CAPABILITY_IDS`);
        }
        seenCapIds.add(capId);
      }
    }
  }
}

export function runCapabilityRegistryValidation() {
  const violations = [];

  validateProductRegistry(violations);
  validateProductDefinition(violations);
  validateModelCatalog(violations);
  validatePolicyPack(violations);
  validateServicePortsAndCapabilities(violations);

  return {
    passed: violations.length === 0,
    checkedFiles: REQUIRED_FILES,
    violations
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = runCapabilityRegistryValidation();
  if (!result.passed) {
    console.error(
      `[FAIL] Capability & registry validation failed with ${result.violations.length} violation(s):`
    );
    for (const violation of result.violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }
  console.log(
    `[PASS] Capability & registry validation: ${result.checkedFiles.length} registries verified with 0 port or ID conflicts.`
  );
}
