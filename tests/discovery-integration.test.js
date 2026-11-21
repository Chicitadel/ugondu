/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Governance — Dynamic Registry Auto-Discovery Integration
 * File           : discovery-integration.test.js
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
const path = require('path');

// Mock i18n if not registered
if (typeof global.__t !== 'function') {
  global.__t = (key) => `[en] ${key}`;
}

const ROOT = path.resolve(__dirname, '..');
const { ProductRegistry } = require('../server/shared/dist/registry/product-registry.js');

function runIntegrationTests() {
  console.log('Running Central Product Registry Dynamic Auto-Discovery Integration Tests (Track T07)...');

  // 1. Dynamic workspace root auto-discovery via upward search
  const registry = new ProductRegistry(ROOT);
  assert.ok(registry, 'ProductRegistry must instantiate cleanly');

  // 2. Active product auto-resolution
  const activeProduct = registry.getProduct();
  assert.strictEqual(activeProduct.productId.toUpperCase(), 'UGONDU', 'Active product must resolve to UGONDU');
  assert.strictEqual(activeProduct.version, '4.0.0', 'Active product version must be 4.0.0');

  // 3. Dynamic service configuration resolution (Ports 4001-4005)
  const services = [
    { id: 'engine_core', port: 4001 },
    { id: 'billing_gateway', port: 4002 },
    { id: 'plugin_manager', port: 4003 },
    { id: 'event_bus', port: 4004 },
    { id: 'repository_adapter', port: 4005 }
  ];

  for (const expected of services) {
    const config = registry.getServiceConfig(expected.id);
    assert.strictEqual(config.port, expected.port, `Service ${expected.id} port must resolve to ${expected.port}`);
    assert.strictEqual(config.serviceId, expected.id, `Service ID must match ${expected.id}`);
    assert.strictEqual(config.health.liveness, '/health/live');
    assert.strictEqual(config.health.readiness, '/health/ready');
    assert.strictEqual(config.health.metadata, '/v1/metadata');

    const url = registry.getServiceUrl(expected.id, '/health');
    assert.strictEqual(url, `http://${config.host}:${expected.port}/health`, `URL must resolve dynamically for ${expected.id}`);
  }

  // 4. Dynamic discovery of all federated ecosystem products
  const allProducts = registry.discoverAllProducts();
  assert.ok(allProducts.length >= 9, 'Must discover at least 9 federated ecosystem products');
  const productIds = allProducts.map(p => p.productId.toUpperCase());
  assert.ok(productIds.includes('UGONDU'), 'Must discover UGONDU');
  assert.ok(productIds.includes('EAORCS'), 'Must discover EAORCS');
  assert.ok(productIds.includes('CONSUNEXIA'), 'Must discover CONSUNEXIA');
  assert.ok(productIds.includes('MANDATAG'), 'Must discover MANDATAG');
  assert.ok(productIds.includes('AEROBILL'), 'Must discover AEROBILL');

  // 5. ADR-0042 Public Projection Gate compliance
  const publicCatalog = registry.getPublicCatalog();
  assert.ok(Array.isArray(publicCatalog), 'Public catalog must be an array');
  const publicIds = publicCatalog.map(p => p.productId.toUpperCase());
  assert.ok(publicIds.includes('UGONDU'), 'UGONDU GA product must be in public catalog');
  assert.strictEqual(publicIds.includes('MANDATAG'), false, 'Internal engine MANDATAG must NOT leak to public catalog');
  assert.strictEqual(publicIds.includes('AEROBILL'), false, 'Internal engine AEROBILL must NOT leak to public catalog');

  // 6. Allowed CORS origins auto-resolution
  const allowedOrigins = registry.getAllowedOrigins();
  assert.ok(Array.isArray(allowedOrigins), 'Allowed origins must be an array');
  assert.ok(allowedOrigins.length > 0, 'Must have at least one allowed origin');
  assert.strictEqual(allowedOrigins.includes('*'), false, 'Wildcard CORS origin must NEVER be allowed with credentials');

  console.log('✓ All Central Product Registry dynamic auto-discovery integration tests passed successfully.');
}

runIntegrationTests();
