/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Governance — Central Product Registry Contract
 * File           : discovery-contract.test.js
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-27
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
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function runContractTests() {
  console.log('Running Central Product Registry Contract Tests (Track T07)...');

  const registryFile = path.join(ROOT, '.governance', 'standards', 'product-registry.json');
  assert.ok(fs.existsSync(registryFile), 'Registry JSON file must exist at .governance/standards/product-registry.json');

  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));

  // 1. Root structure and governance metadata
  assert.strictEqual(registry.standard, 'UAIGOS-3.0.0', 'Must conform to UAIGOS-3.0.0');
  assert.strictEqual(registry.activeProductId, 'UGONDU', 'Active product must be UGONDU');
  assert.ok(Array.isArray(registry.products), 'Registry must declare products array');
  assert.ok(registry.products.length >= 9, 'Registry must declare all federated products (at least 9)');

  // 2. Collision detection across product IDs, base URLs, and ports
  const seenIds = new Set();
  const seenPorts = new Map();
  const seenBaseUrls = new Set();

  for (const product of registry.products) {
    const id = product.productId || product.id;
    assert.ok(id, 'Every product must declare a productId');
    assert.ok(!seenIds.has(id.toUpperCase()), `Duplicate productId '${id}' detected in registry`);
    seenIds.add(id.toUpperCase());

    // Endpoints contract
    assert.ok(product.endpoints, `Product ${id} must declare endpoints`);
    if (product.endpoints.baseUrl) {
      assert.ok(!seenBaseUrls.has(product.endpoints.baseUrl), `Conflicting baseUrl '${product.endpoints.baseUrl}'`);
      seenBaseUrls.add(product.endpoints.baseUrl);
    }

    // Health contract compliance
    if (product.endpoints.health) {
      assert.match(product.endpoints.health, /^\/health/, `Product ${id} health endpoint must start with /health`);
    }

    // Services port contract
    if (product.services && typeof product.services === 'object') {
      for (const [svcName, svcConfig] of Object.entries(product.services)) {
        if (svcConfig.port) {
          const portNum = Number(svcConfig.port);
          assert.ok(portNum > 1024 && portNum <= 65535, `Invalid port ${portNum} for service ${svcName}`);
          if (seenPorts.has(portNum)) {
            const conflict = seenPorts.get(portNum);
            assert.fail(`Port conflict on port ${portNum} between ${conflict.product}/${conflict.service} and ${id}/${svcName}`);
          }
          seenPorts.set(portNum, { product: id, service: svcName });
        }
      }
    }
  }

  // 3. Mandatory Ugondu microservice ports contract (CONST-044)
  const expectedUgonduPorts = {
    engine_core: 4001,
    billing_gateway: 4002,
    plugin_manager: 4003,
    event_bus: 4004,
    repository_adapter: 4005
  };

  const ugonduEntry = registry.products.find(p => (p.productId || p.id).toUpperCase() === 'UGONDU');
  assert.ok(ugonduEntry, 'UGONDU entry must be present in registry');

  for (const [svcName, expectedPort] of Object.entries(expectedUgonduPorts)) {
    const svc = ugonduEntry.services[svcName];
    assert.ok(svc, `Service ${svcName} must be defined in UGONDU registry entry`);
    assert.strictEqual(svc.port, expectedPort, `Service ${svcName} port must be ${expectedPort}`);
    assert.ok(svc.health, `Service ${svcName} must define health contracts`);
    assert.strictEqual(svc.health.liveness, '/health/live', `Service ${svcName} liveness must be /health/live`);
    assert.strictEqual(svc.health.readiness, '/health/ready', `Service ${svcName} readiness must be /health/ready`);
    assert.strictEqual(svc.health.metadata, '/v1/metadata', `Service ${svcName} metadata must be /v1/metadata`);
  }

  // 4. Product definition YAML parity
  const yamlPath = path.join(ROOT, '.governance', 'product.definition.yaml');
  assert.ok(fs.existsSync(yamlPath), 'product.definition.yaml must exist');
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');

  for (const port of [4001, 4002, 4003, 4004, 4005]) {
    assert.ok(yamlContent.includes(String(port)), `product.definition.yaml must contain port ${port}`);
  }

  console.log('✓ All Central Product Registry contract validations passed successfully.');
}

runContractTests();
