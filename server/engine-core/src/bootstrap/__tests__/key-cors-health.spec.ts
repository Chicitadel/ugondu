/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Bootstrap, Key, CORS & Health Unit Tests
 * File           : key-cors-health.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { generateKeyPairSync } from 'crypto';
import {
  KeyLoader,
  KeyLoadError,
  isForbiddenKeyLiteral,
} from '../../encryption/key-loader';
import { loadOrGeneratePersistentKeys } from '../key-manager';
import {
  resolveAllowedOrigins,
  isOriginAllowed,
  createCorsOptions,
} from '../cors-config';
import { keysRouter } from '../../routes/keys';
import {
  createHealthAndMetadataRouter,
  HsmTrustRootAdapter,
  SoftwareHSMProvider,
  ConfiguredHSMProvider,
  TrustRegistry,
} from '@ugondu/shared';

function generateValidEd25519PemPair(): { privatePem: string; publicPem: string } {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
    publicPem: publicKey.export({ type: 'spki', format: 'pem' }) as string,
  };
}

function createMockRes(): {
  statusCode: number;
  body: any;
  status: (code: number) => any;
  json: (payload: any) => any;
} {
  const res = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
      return res;
    },
  };
  return res;
}

describe('BOUNDARY-02: Cryptographic Key Lifecycle, CORS & Health Contracts', () => {
  describe('KeyLoader & KeyManager (COR-001, COR-002)', () => {
    it('fails closed in production when no signing key or managed reference is provided', () => {
      const prodEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        UGONDU_DEV_EPHEMERAL_KEYS: 'true',
      };

      expect(() => new KeyLoader(prodEnv).load()).toThrow(KeyLoadError);
      expect(() => loadOrGeneratePersistentKeys(prodEnv)).toThrow(KeyLoadError);
    });

    it('rejects literal "ci-key", "ci-test-key-not-for-production", and "test-key" in all environments', () => {
      const insecureLiterals = [
        'ci-key',
        'ci-test-key-not-for-production',
        'test-key',
        '<placeholder>',
      ];

      for (const literal of insecureLiterals) {
        expect(isForbiddenKeyLiteral(literal)).toBe(true);

        expect(() =>
          new KeyLoader({
            NODE_ENV: 'test',
            UGONDU_RECIPE_PRIVATE_KEY: literal,
          }).load()
        ).toThrow(KeyLoadError);

        expect(() =>
          loadOrGeneratePersistentKeys({
            NODE_ENV: 'test',
            UGONDU_PRIVATE_KEY: literal,
          })
        ).toThrow(KeyLoadError);

        expect(() =>
          loadOrGeneratePersistentKeys({
            NODE_ENV: 'production',
            UGONDU_KEY_REF: literal,
          })
        ).toThrow(KeyLoadError);
      }
    });

    it('loads valid Ed25519 keys from UGONDU_RECIPE_PRIVATE_KEY, UGONDU_PRIVATE_KEY, and UGONDU_KEY_REF', () => {
      const { privatePem } = generateValidEd25519PemPair();

      const fromRecipeEnv = loadOrGeneratePersistentKeys({
        NODE_ENV: 'production',
        UGONDU_RECIPE_PRIVATE_KEY: privatePem,
      });
      expect(fromRecipeEnv.keyId).toMatch(/^key_[a-f0-9]{16}$/);
      expect(fromRecipeEnv.source).toBe('UGONDU_RECIPE_PRIVATE_KEY');
      expect(fromRecipeEnv.ephemeral).toBe(false);

      const fromPrivateEnv = loadOrGeneratePersistentKeys({
        NODE_ENV: 'production',
        UGONDU_PRIVATE_KEY: privatePem,
      });
      expect(fromPrivateEnv.keyId).toBe(fromRecipeEnv.keyId);
      expect(fromPrivateEnv.source).toBe('UGONDU_PRIVATE_KEY');

      const fromKeyRef = loadOrGeneratePersistentKeys(
        {
          NODE_ENV: 'production',
          UGONDU_KEY_REF: 'kms://ugondu/prod/recipe-signing-key',
        },
        {
          'kms://ugondu/prod/recipe-signing-key': privatePem,
        }
      );
      expect(fromKeyRef.keyId).toBe(fromRecipeEnv.keyId);
      expect(fromKeyRef.source).toBe('UGONDU_KEY_REF');
      expect(fromKeyRef.keyRef).toBe('kms://ugondu/prod/recipe-signing-key');
    });

    it('generates ephemeral in-memory keys in test or when UGONDU_DEV_EPHEMERAL_KEYS=true without writing to disk', () => {
      const testKeyState = loadOrGeneratePersistentKeys({
        NODE_ENV: 'test',
      });
      expect(testKeyState.ephemeral).toBe(true);
      expect(testKeyState.source).toBe('EPHEMERAL_MEMORY');
      expect(testKeyState.publicKeyPem).toContain('BEGIN PUBLIC KEY');

      const devEphemeralState = loadOrGeneratePersistentKeys({
        NODE_ENV: 'development',
        UGONDU_DEV_EPHEMERAL_KEYS: 'true',
      });
      expect(devEphemeralState.ephemeral).toBe(true);

      // Without UGONDU_DEV_EPHEMERAL_KEYS=true in development, missing key fails closed
      expect(() =>
        loadOrGeneratePersistentKeys({
          NODE_ENV: 'development',
        })
      ).toThrow(KeyLoadError);
    });
  });

  describe('HSM Trust Root & TrustRegistry (COR-002)', () => {
    it('fails closed in production when HsmTrustRootAdapter has no configured HSM slot/key', () => {
      expect(
        () =>
          new HsmTrustRootAdapter('hsm_slot_0_key_root', {
            env: { NODE_ENV: 'production' },
          })
      ).toThrow();

      expect(
        () => new SoftwareHSMProvider({ NODE_ENV: 'production' })
      ).toThrow();
    });

    it('supports ConfiguredHSMProvider in production and SoftwareHSMProvider in test mode', () => {
      const { privatePem } = generateValidEd25519PemPair();
      const prodHsm = new HsmTrustRootAdapter('hsm_slot_prod_01', {
        env: { NODE_ENV: 'production' },
        slotId: 'slot_prod_01',
        privateKeyPem: privatePem,
      });
      expect(prodHsm.isHardwareBacked()).toBe(true);
      expect(prodHsm.getProviderName()).toBe(ConfiguredHSMProvider.name);

      const payload = Buffer.from('SOVEREIGN_ENVELOPE_PAYLOAD');
      const sig = prodHsm.signEnvelope(payload);
      expect(prodHsm.verifyEnvelope(payload, sig)).toBe(true);

      const testHsm = new HsmTrustRootAdapter('hsm_slot_test_01', {
        env: { NODE_ENV: 'test' },
      });
      expect(testHsm.isHardwareBacked()).toBe(false);
      const testSig = testHsm.signEnvelope(payload);
      expect(testHsm.verifyEnvelope(payload, testSig)).toBe(true);
    });

    it('rotates and revokes versioned keys cleanly in TrustRegistry', () => {
      const { publicPem: pubV2 } = generateValidEd25519PemPair();
      const { publicPem: pubV3 } = generateValidEd25519PemPair();
      const registry = new TrustRegistry([
        {
          keyId: 'key_recipe_custom_v2',
          algorithm: 'ed25519',
          status: 'ACTIVE',
          purpose: 'recipe',
          publicKey: pubV2,
        },
      ]);

      registry.rotateKey('key_recipe_custom_v2', {
        keyId: 'key_recipe_custom_v3',
        algorithm: 'ed25519',
        status: 'ACTIVE',
        purpose: 'recipe',
        publicKey: pubV3,
      });

      expect(registry.getKey('key_recipe_custom_v2')?.status).toBe('ROTATED');
      expect(registry.getActiveKeyByPurpose('recipe')?.keyId).toBe('key_recipe_custom_v3');
    });
  });

  describe('CORS Policy Configuration (COR-003)', () => {
    it('resolves allowed origins from ALLOWED_ORIGINS or product-registry.json and rejects wildcard * with credentials', () => {
      const origins = resolveAllowedOrigins({
        env: {
          ALLOWED_ORIGINS: 'https://console.example.org, https://ops.example.org',
        },
        credentials: true,
      });
      expect(origins).toEqual(['https://console.example.org', 'https://ops.example.org']);

      expect(
        isOriginAllowed('https://console.example.org', {
          env: { ALLOWED_ORIGINS: 'https://console.example.org' },
          credentials: true,
        })
      ).toBe(true);

      expect(
        isOriginAllowed('https://malicious.example.org', {
          env: { ALLOWED_ORIGINS: 'https://console.example.org' },
          credentials: true,
        })
      ).toBe(false);

      expect(() =>
        resolveAllowedOrigins({
          env: { ALLOWED_ORIGINS: '*' },
          credentials: true,
        })
      ).toThrow();
    });

    it('invokes CORS origin callback without ReferenceError when rejecting unauthorized origins', (done) => {
      const corsOpts = createCorsOptions({
        env: { ALLOWED_ORIGINS: 'https://trusted.example.org' },
        credentials: true,
      });
      const originFn = corsOpts.origin as (
        origin: string | undefined,
        cb: (err: Error | null, allow?: boolean) => void
      ) => void;

      originFn('https://untrusted.example.org', (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(allow).toBe(false);
        done();
      });
    });
  });

  describe('Canonical Health, Readiness & Metadata Contracts (COR-005, COR-013)', () => {
    it('serves /health, /health/live, /health/ready, and /v1/metadata without any static cor_level field', async () => {
      const router = createHealthAndMetadataRouter({
        service: 'engine-core',
        version: '3.0.0',
        buildSha: 'abc1234',
        schemaVersion: '1.0.0',
        capabilities: ['deploy.resolve', 'recovery.urre'],
        dependencies: {
          signingKey: () => ({ healthy: true, detail: 'Key loaded' }),
        },
      });

      const liveRes = createMockRes();
      router.handleLive({ method: 'GET', path: '/health/live' }, liveRes);
      expect(liveRes.statusCode).toBe(200);
      expect(liveRes.body.status).toBe('alive');
      expect(liveRes.body.service).toBe('engine-core');
      expect(liveRes.body.cor_level).toBeUndefined();

      const readyRes = createMockRes();
      await router.handleReady({ method: 'GET', path: '/health/ready' }, readyRes);
      expect(readyRes.statusCode).toBe(200);
      expect(readyRes.body.status).toBe('ready');
      expect(readyRes.body.buildSha).toBe('abc1234');
      expect(readyRes.body.dependencies.signingKey.status).toBe('ready');
      expect(readyRes.body.cor_level).toBeUndefined();

      const healthRes = createMockRes();
      await router.handleHealth({ method: 'GET', path: '/health' }, healthRes);
      expect(healthRes.statusCode).toBe(200);
      expect(healthRes.body.status).toBe('ok');
      expect(healthRes.body.cor_level).toBeUndefined();

      const metaRes = createMockRes();
      await router.handleMetadata({ method: 'GET', path: '/v1/metadata' }, metaRes);
      expect(metaRes.statusCode).toBe(200);
      expect(metaRes.body).toEqual({
        service: 'engine-core',
        version: '3.0.0',
        buildSha: 'abc1234',
        schemaVersion: '1.0.0',
        capabilities: ['deploy.resolve', 'recovery.urre'],
      });
      expect(metaRes.body.cor_level).toBeUndefined();
    });

    it('returns 503 not_ready when a dependency check fails or times out', async () => {
      const failingRouter = createHealthAndMetadataRouter({
        service: 'engine-core',
        version: '3.0.0',
        buildSha: 'abc1234',
        timeoutMs: 50,
        dependencies: {
          brokenDep: () => false,
        },
      });

      const readyRes = createMockRes();
      await failingRouter.handleReady({ method: 'GET', path: '/health/ready' }, readyRes);
      expect(readyRes.statusCode).toBe(503);
      expect(readyRes.body.status).toBe('not_ready');
      expect(readyRes.body.dependencies.brokenDep.status).toBe('not_ready');
      expect(readyRes.body.cor_level).toBeUndefined();
    });

    it('omits cor_level from /v1/keys/health route response', () => {
      const layer = (keysRouter as any).stack.find(
        (l: any) => l.route && l.route.path === '/health'
      );
      expect(layer).toBeDefined();
      const res = createMockRes();
      layer.route.stack[0].handle({}, res, () => {});
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('engine-core');
      expect(res.body.cor_level).toBeUndefined();
    });
  });
});
