/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Registry Unit Tests
 * File           : registry.spec.ts
 * Version        : 4.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : GOVERNMENT | ENTERPRISE | INTERNAL
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
 * - SOC 2 Type II
 * - OWASP ASVS 5.0
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

import * as path from 'path';
import { ProductRegistry } from '../product-registry';
import { ConfigRegistry, CONFIG_PRECEDENCE_ORDER } from '../config-registry';

describe('BOUNDARY-01: ProductRegistry & ConfigRegistry Authority', () => {
  describe('ProductRegistry Auto-Discovery & Governance Parity', () => {
    const registry = new ProductRegistry();

    it('auto-discovers active product and federated ecosystem products without hardcoding', () => {
      const activeProduct = registry.getProduct();
      expect(activeProduct.productId).toBe('UGONDU');
      expect(activeProduct.id).toBe('ugondu');
      expect(activeProduct.version).toBe('4.0.0');

      const allProducts = registry.discoverAllProducts();
      expect(allProducts.length).toBeGreaterThanOrEqual(9);
      const productIds = allProducts.map((p) => p.productId);
      expect(productIds).toEqual(
        expect.arrayContaining(['EAORCS', 'UGONDU', 'MANDATAG', 'AEROBILL'])
      );
    });

    it('enforces 100% port parity between product-registry.json, product.definition.yaml, and runtime services', () => {
      const expectedPorts: Record<string, number> = {
        engine_core: 4001,
        billing_gateway: 4002,
        plugin_manager: 4003,
        event_bus: 4004,
        repository_adapter: 4005
      };

      const ports = registry.getPorts();
      expect(ports).toEqual(expectedPorts);

      const yamlDef = registry.getYamlDefinition();
      expect(yamlDef).toBeDefined();
      expect(yamlDef?.ports).toEqual(expectedPorts);

      for (const [serviceKey, port] of Object.entries(expectedPorts)) {
        const svcSnake = registry.getServiceConfig(serviceKey);
        const svcKebab = registry.getServiceConfig(serviceKey.replace(/_/g, '-'));
        expect(svcSnake.port).toBe(port);
        expect(svcKebab.port).toBe(port);
        expect(registry.getServiceUrl(serviceKey)).toBe(`http://localhost:${port}`);
        expect(registry.getServiceUrl(serviceKey, '/health/live')).toBe(
          `http://localhost:${port}/health/live`
        );
      }
    });

    it('exposes canonical health contracts, editions, and capabilities', () => {
      const health = registry.getHealthContracts();
      expect(health.liveness).toBe('/health/live');
      expect(health.readiness).toBe('/health/ready');
      expect(health.metadata).toBe('/v1/metadata');

      const editions = registry.getEditions();
      expect(editions).toEqual([
        'community',
        'professional',
        'business',
        'enterprise',
        'sovereign'
      ]);
      expect(registry.getYamlDefinition()?.editions).toEqual(editions);

      const capabilities = registry.getCapabilities();
      expect(capabilities.length).toBeGreaterThanOrEqual(15);
      const capIds = registry.getCapabilityIds();
      expect(capIds).toEqual(
        expect.arrayContaining([
          'SECURITY_KERNEL',
          'COR_EXECUTION_INTEGRITY',
          'ATOMIC_DEPLOYMENT',
          'ROLLBACK',
          'PLUGIN_SANDBOX',
          'ENTERPRISE_GOVERNANCE',
          'SOVEREIGN_ATTESTATION'
        ])
      );
    });

    it('dynamically populates src/catalogue/ugondu.policies.js from product-registry.json', () => {
      const policiesCataloguePath = path.resolve(
        __dirname,
        '../../../../src/catalogue/ugondu.policies.js'
      );
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const catalogue = require(policiesCataloguePath);
      expect(catalogue.product).toBe('ugondu');
      expect(catalogue.displayName).toBe('UGONDU');
      expect(catalogue.version).toBe('4.0.0');
      expect(Array.isArray(catalogue.policies)).toBe(true);
      expect(catalogue.policies.length).toBe(7);
    });
  });

  describe('ConfigRegistry CORS Origin, Environment, Region & Timeout Validation', () => {
    it('enforces exact CORS origin matching and rejects wildcard (*) when credentials are enabled', () => {
      const configRegistry = new ConfigRegistry({
        env: { NODE_ENV: 'production' }
      });

      expect(() =>
        configRegistry.validateCorsPolicy({
          allowedOrigins: ['*'],
          allowCredentials: true,
          environment: 'production'
        })
      ).toThrow(/wildcard origin \(\*\) is prohibited when credentials are enabled/i);

      expect(() =>
        configRegistry.validateCorsPolicy({
          allowedOrigins: ['http://insecure.airroofers.eu'],
          allowCredentials: true,
          environment: 'production'
        })
      ).toThrow(/Insecure HTTP CORS origin/i);

      expect(() =>
        configRegistry.validateCorsPolicy({
          allowedOrigins: ['https://admin.airroofers.eu/subpath'],
          allowCredentials: true,
          environment: 'production'
        })
      ).toThrow(/exact origin without path/i);

      const validCors = configRegistry.validateCorsPolicy({
        allowedOrigins: [
          'https://admin.airroofers.eu',
          'https://governance.airroofers.eu'
        ],
        allowCredentials: true,
        environment: 'production'
      });

      expect(validCors.isOriginAllowed('https://admin.airroofers.eu')).toBe(true);
      expect(validCors.isOriginAllowed('https://evil.airroofers.eu')).toBe(false);
      expect(validCors.isOriginAllowed('https://admin.airroofers.eu/')).toBe(false);
      expect(validCors.isOriginAllowed(null)).toBe(false);
    });

    it('validates runtime environment, deployment region, timeouts, and service URLs', () => {
      const configRegistry = new ConfigRegistry({
        env: {
          NODE_ENV: 'staging',
          UGONDU_REGION: 'eu-central-1',
          UGONDU_HTTP_TIMEOUT_MS: '8000'
        }
      });

      const runtimeConfig = configRegistry.loadRuntimeConfig();
      expect(runtimeConfig.environment).toBe('staging');
      expect(runtimeConfig.region).toBe('eu-central-1');
      expect(runtimeConfig.timeouts.httpTimeoutMs).toBe(8000);
      expect(runtimeConfig.provenance.environment).toBe('ENVIRONMENT_VARIABLE');
      expect(runtimeConfig.provenance.region).toBe('ENVIRONMENT_VARIABLE');
      expect(runtimeConfig.provenance.httpTimeoutMs).toBe('ENVIRONMENT_VARIABLE');
      expect(runtimeConfig.serviceUrls.engine_core).toBe('http://localhost:4001');

      expect(() => configRegistry.validateEnvironment('invalid_env')).toThrow(/Invalid runtime environment/);
      expect(() => configRegistry.validateTimeout(10, 'httpTimeoutMs')).toThrow(/outside governed bounds/);
      expect(() =>
        configRegistry.validateServiceUrl('ftp://localhost:4001', 'engine_core')
      ).toThrow(/Unsupported protocol/);
    });
  });

  describe('ConfigRegistry Secret-Reference Resolution & Provenance Precedence', () => {
    it('validates and resolves secretless-registry://, aws-secrets://, kms://, and env:// references', () => {
      expect(CONFIG_PRECEDENCE_ORDER).toEqual([
        'RUNTIME_OVERRIDE',
        'SECRET_REFERENCE',
        'ENVIRONMENT_VARIABLE',
        'GOVERNANCE_REGISTRY',
        'DEFAULT_FALLBACK'
      ]);

      const configRegistry = new ConfigRegistry({
        env: {
          NODE_ENV: 'production',
          SIGNING_KEY_ENV: 'ed25519-env-secret-material',
          UGONDU_PRIVATE_KEY: 'secretless-registry://ugondu/signing/private-key',
          BILLING_SECRET: 'aws-secrets://prod/ugondu/billing-hmac',
          LEDGER_KMS_KEY: 'kms://alias/ugondu-sovereign-ledger'
        },
        secretStore: {
          'secretless-registry://ugondu/signing/private-key': 'resolved-secretless-key',
          'prod/ugondu/billing-hmac': 'resolved-aws-secret',
          'alias/ugondu-sovereign-ledger': 'resolved-kms-key'
        }
      });

      const secretlessResolved = configRegistry.resolveSecret('UGONDU_PRIVATE_KEY');
      expect(secretlessResolved.value).toBe('resolved-secretless-key');
      expect(secretlessResolved.provenance).toBe('SECRET_REFERENCE');
      expect(secretlessResolved.secretScheme).toBe('secretless-registry://');

      const awsResolved = configRegistry.resolveSecret('BILLING_SECRET');
      expect(awsResolved.value).toBe('resolved-aws-secret');
      expect(awsResolved.secretScheme).toBe('aws-secrets://');

      const kmsResolved = configRegistry.resolveSecret('LEDGER_KMS_KEY');
      expect(kmsResolved.value).toBe('resolved-kms-key');
      expect(kmsResolved.secretScheme).toBe('kms://');

      const envRefResolved = configRegistry.resolveSecret('env://SIGNING_KEY_ENV');
      expect(envRefResolved.value).toBe('ed25519-env-secret-material');
      expect(envRefResolved.secretScheme).toBe('env://');

      // Runtime override takes highest precedence
      configRegistry.setOverride('UGONDU_PRIVATE_KEY', 'override-key-material');
      const overridden = configRegistry.resolveSecret('UGONDU_PRIVATE_KEY');
      expect(overridden.value).toBe('override-key-material');
      expect(overridden.provenance).toBe('RUNTIME_OVERRIDE');
    });

    it('rejects malformed secret schemes, path traversal, and raw plaintext secrets in production', () => {
      expect(() => ConfigRegistry.parseSecretReference('vault://unapproved/secret')).toThrow(
        /Invalid secret reference scheme/
      );
      expect(() =>
        ConfigRegistry.parseSecretReference('secretless-registry://../escaped/secret')
      ).toThrow(/illegal path traversal/);

      const prodRegistry = new ConfigRegistry({
        env: {
          NODE_ENV: 'production',
          RAW_PLAINTEXT_SECRET: 'unprotected_plaintext_value'
        }
      });

      expect(() => prodRegistry.resolveSecret('RAW_PLAINTEXT_SECRET')).toThrow(
        /Plaintext secret value rejected/
      );
    });
  });
});
